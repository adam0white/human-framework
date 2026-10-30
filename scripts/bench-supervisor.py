#!/usr/bin/env python3
"""Bound only the informational benchmark command; Linux /proc + subreaper required."""
import argparse
import ctypes
import json
import math
import os
from pathlib import Path
import selectors
import signal
import sys
import time

REASONS = {"complete", "deadline", "signal", "command_signal", "lingering_children", "supervisor", "cleanup"}


def stat_identity(text):
    # comm may contain spaces or ')'; starttime is field 22, after comm field 2.
    fields = text[text.rindex(")") + 2:].split()
    return int(fields[1]), int(fields[19])


def identity(pid):
    try:
        return stat_identity(Path(f"/proc/{pid}/stat").read_text())
    except FileNotFoundError:
        return None


def subreaper():
    if sys.platform != "linux" or not hasattr(os, "pidfd_open") or not hasattr(signal, "pidfd_send_signal"):
        raise RuntimeError("Linux subreaper and /proc required; no child launched")
    libc = ctypes.CDLL(None, use_errno=True)
    value = ctypes.c_int()
    if libc.prctl(36, 1, 0, 0, 0) or libc.prctl(37, ctypes.byref(value), 0, 0, 0) or value.value != 1:
        raise RuntimeError("Cannot establish Linux child subreaper")


def children(pid):
    return [int(p) for p in Path(f"/proc/{pid}/task/{pid}/children").read_text().split()]


def valid_record(record):
    if not isinstance(record, dict) or type(record.get("version")) is not int or record.get("version") != 1:
        raise ValueError("missing/invalid supervisor record")
    if record.get("reason") not in REASONS or type(record.get("finished")) is not bool:
        raise ValueError("invalid completion record")
    if record.get("logging_status") not in ("ok", "failed") or record.get("cleanup_status") not in ("ok", "failed"):
        raise ValueError("invalid component status")
    for key in ("exit_status", "command_status"):
        if record.get(key) is not None and (type(record[key]) is not int or not 0 <= record[key] <= 255):
            raise ValueError("invalid numeric status")
    signum = record.get("command_signal")
    if signum is not None and (type(signum) is not int or not 1 <= signum <= 64):
        raise ValueError("invalid signal")
    if not isinstance(record.get("command"), list) or not record["command"] or not all(isinstance(s, str) for s in record["command"]):
        raise ValueError("invalid command record")
    if not isinstance(record.get("owned"), list) or not isinstance(record.get("errors"), list):
        raise ValueError("missing component receipts")
    for receipt in record["owned"]:
        if not isinstance(receipt, dict) or type(receipt.get("pid")) is not int or receipt["pid"] <= 0 or type(receipt.get("starttime")) is not int or receipt["starttime"] <= 0 or type(receipt.get("settled")) is not bool:
            raise ValueError("invalid owned-identity receipt")
    if not all(isinstance(error, str) for error in record["errors"]):
        raise ValueError("invalid error receipts")
    elapsed = record.get("elapsed_seconds")
    if type(elapsed) not in (int, float) or not math.isfinite(elapsed) or elapsed < 0:
        raise ValueError("invalid elapsed record")
    if record["finished"] != (record["reason"] == "complete"):
        raise ValueError("contradictory completion reason")
    if record["finished"] and (record["command_status"] is None or record["cleanup_status"] != "ok" or signum is not None or not record["owned"] or not all(r.get("settled") is True for r in record["owned"])):
        raise ValueError("contradictory finished record")
    if record["cleanup_status"] != "ok":
        expected = 125
    elif record["reason"] == "deadline":
        expected = 124
    elif not record["finished"]:
        expected = 125
    elif record["command_status"] != 0:
        expected = record["command_status"]
    else:
        expected = 0 if record["logging_status"] == "ok" else 125
    if record.get("exit_status") != expected:
        raise ValueError("inconsistent component/exit status")
    return record


def summary(path):
    try:
        r = valid_record(json.loads(Path(path).read_text()))
        marker = os.environ.get("TIMING_FINISHED", "")
        outcome = os.environ.get("TIMING_OUTCOME", "")
        if marker != ("true" if r["finished"] else "") or outcome != ("success" if r["exit_status"] == 0 else "failure"):
            raise ValueError("step outputs/outcome do not match a complete trusted record")
        if r["finished"] and r["exit_status"] == 0 and outcome == "success":
            print("SUCCESS: timing command, logging and owned-child cleanup completed successfully.")
        elif r["finished"]:
            print("FAILED measurement: completed command/logging failure. No performance pass.")
        elif r["reason"] == "deadline":
            print("INCOMPLETE: command deadline reached; Watch 50-year/full benchmark measurement did not complete. No performance pass.")
        else:
            print(f"INCOMPLETE: supervisor reason {r['reason']}; no completed measurement. No performance pass.")
        print(f"Components: command={r['command_status']}, signal={r.get('command_signal')}, logging={r['logging_status']}, cleanup={r['cleanup_status']}, supervisor={r['exit_status']}.")
        print("Partial results only; they do not qualify the full benchmark.")
        return 0
    except (OSError, ValueError, TypeError, KeyError) as error:
        print(f"INCOMPLETE: missing/invalid supervision evidence ({error}). No performance pass.")
        return 1


def run(args):
    # A failed new invocation must never leave an old successful record available.
    Path(args.record).unlink(missing_ok=True)
    started = time.monotonic()
    record = dict(version=1, reason="supervisor", finished=False, command_status=None,
                  command_signal=None, logging_status="ok", cleanup_status="ok", exit_status=125,
                  command=args.command, owned=[], errors=[])
    owned = {}  # (PID, Linux starttime) -> receipt. Never signal a PID without rechecking both.
    pidfds = {}
    root = None
    root_done = False
    deadline = None
    eof = False
    console = bytearray()
    console_failed = False
    file_failed = False
    output_until = None
    stdout_blocking = None
    pipe = None
    logfile = None
    term_at = None
    kill_at = None
    interrupted = []
    handlers = {}
    selector = selectors.DefaultSelector()

    def interrupted_by(signum, _frame):
        interrupted.append(signum)

    def add(pid, parent):
        current = identity(pid)
        if current is None:
            return
        if current[0] != parent:
            return  # Parent changed; the next subreaper/descendant scan must establish ownership.
        key = (pid, current[1])
        if key not in owned:
            if len(owned) >= 512:
                raise RuntimeError("containment identity limit exceeded")
            try:
                fd = os.pidfd_open(pid)
            except ProcessLookupError:
                return
            after = identity(pid)
            if after is None or after != current:
                os.close(fd)
                return
            pidfds[key] = fd
            receipt = dict(pid=pid, starttime=current[1], parent=parent, signals=[], settled=False)
            owned[key] = receipt
            record["owned"].append(receipt)

    def discover():
        # Adoption catches fast-parent/double-fork races without a global process scan.
        for pid in children(os.getpid()):
            add(pid, os.getpid())
        queue = list(owned)
        visited = set()
        while queue:
            key = queue.pop()
            if key in visited:
                continue
            visited.add(key)
            current = identity(key[0])
            if current is None or current[1] != key[1]:
                continue
            try:
                descendants = children(key[0])
            except FileNotFoundError:
                continue
            # Recheck the parent identity after reading children, before accepting ancestry.
            after = identity(key[0])
            if after is None or after[1] != key[1]:
                continue
            for pid in descendants:
                add(pid, key[0])
            queue.extend(k for k in owned if k not in visited)

    def settle():
        nonlocal root_done
        for key, receipt in owned.items():
            if receipt["settled"]:
                continue
            current = identity(key[0])
            if current is None or current[1] != key[1]:
                receipt["settled"] = True
                receipt["settlement"] = "no longer this identity; not signalled"
                continue
            try:
                pid, status = os.waitpid(key[0], os.WNOHANG)
            except ChildProcessError:
                continue  # Still owned by its live parent; adoption/reaping may follow.
            if pid:
                receipt["settled"] = True
                receipt["wait_status"] = status
                if key[0] == root:
                    root_done = True
                    if os.WIFEXITED(status):
                        record["command_status"] = os.WEXITSTATUS(status)
                    else:
                        record["command_signal"] = os.WTERMSIG(status)
                        record["command_status"] = 128 + os.WTERMSIG(status)
                if os.WIFSIGNALED(status) and term_at is None:
                    record["reason"] = "command_signal"

    def quiescent():
        # Call after the last reap. A settled receipt set alone misses newly adopted children.
        if any(not receipt["settled"] for receipt in owned.values()):
            return False
        direct = children(os.getpid())
        for pid in direct:
            add(pid, os.getpid())
        return not direct

    def send(signum):
        for key, receipt in owned.items():
            if receipt["settled"] or signum in receipt["signals"]:
                continue
            current = identity(key[0])
            if current is not None and current[1] == key[1]:
                try:
                    signal.pidfd_send_signal(pidfds[key], signum)
                    receipt["signals"].append(signum)
                except ProcessLookupError:
                    pass

    def drain():
        nonlocal eof, console_failed, file_failed
        if console and not console_failed:
            try:
                count = os.write(1, console)
                del console[:count]
            except BlockingIOError:
                pass
            except OSError as error:
                console_failed = True
                record["logging_status"] = "failed"
                record["errors"].append(f"console: {error}; undelivered bytes={len(console)}")
                console.clear()
        if len(console) >= 1048576:
            return False  # Bounded buffer; deadline remains active under console backpressure.
        progressed = False
        for _key, _events in selector.select(0):
            progressed = True
            # A bounded read per loop keeps a chatty command from starving supervision.
            try:
                data = os.read(pipe, 65536)
            except BlockingIOError:
                continue
            if not data:
                eof = True
                selector.unregister(pipe)
            else:
                if not console_failed:
                    console.extend(data)
                if logfile is None or file_failed:
                    continue
                try:
                    view = memoryview(data)
                    while view:
                        count = os.write(logfile, view)
                        if count <= 0:
                            raise OSError("log write made no progress")
                        view = view[count:]
                except OSError as error:
                    file_failed = True
                    record["logging_status"] = "failed"
                    record["errors"].append(f"log: {error}")
        return progressed

    try:
        subreaper()  # Fail closed before spawning on macOS or without /proc/adoption.
        children(os.getpid())
        fd = os.pidfd_open(os.getpid())
        os.close(fd)
        stdout_blocking = os.get_blocking(1)
        os.set_blocking(1, False)
        handlers[signal.SIGCHLD] = signal.signal(signal.SIGCHLD, signal.SIG_DFL)
        for signum in (signal.SIGTERM, signal.SIGINT, signal.SIGHUP):
            handlers[signum] = signal.signal(signum, interrupted_by)
        try:
            logfile = os.open(args.log, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
        except OSError:
            record["logging_status"] = "failed"
            raise
        pipe, writer = os.pipe2(os.O_CLOEXEC)
        os.set_blocking(pipe, False)
        selector.register(pipe, selectors.EVENT_READ)
        try:
            root = os.posix_spawnp(args.command[0], args.command, os.environ,
                                  file_actions=[(os.POSIX_SPAWN_DUP2, writer, 1), (os.POSIX_SPAWN_DUP2, writer, 2),
                                                (os.POSIX_SPAWN_CLOSE, pipe), (os.POSIX_SPAWN_CLOSE, writer)])
        finally:
            os.close(writer)
        add(root, os.getpid())
        if not owned:
            raise RuntimeError("Cannot establish spawned child identity")
        deadline = time.monotonic() + args.deadline
        while True:
            discover()
            settle()
            if root_done:
                # Re-discover after root reaping; quiescent() also checks after the last reap.
                discover()
                settle()
            progressed = drain()
            now = time.monotonic()
            active = any(not r["settled"] for r in owned.values())
            if term_at is None:
                if interrupted:
                    record["reason"] = "signal"
                    record["received_signals"] = interrupted[:]
                elif record["reason"] == "command_signal":
                    pass
                elif root_done and eof and not console and quiescent():
                    record["reason"] = "complete"
                    record["finished"] = True
                    break
                elif now >= deadline:
                    record["reason"] = "deadline"
                elif root_done and not active and eof and console:
                    if output_until is None:
                        output_until = now + args.cleanup
                    if now < output_until:
                        time.sleep(0.02)
                        continue
                    record["reason"] = "cleanup"
                    record["logging_status"] = "failed"
                    record["cleanup_status"] = "failed"
                    record["errors"].append(f"console not settled within output cleanup bound; bytes={len(console)}")
                    break
                elif root_done and (active or not progressed):
                    record["reason"] = "lingering_children"
                else:
                    time.sleep(0.02)
                    continue
                term_at = now
            send(signal.SIGTERM)
            if now >= term_at + args.term_grace:
                if kill_at is None:
                    kill_at = now
                send(signal.SIGKILL)
            if eof and not console and quiescent():
                break
            if kill_at is not None and now >= kill_at + args.cleanup:
                record["cleanup_status"] = "failed"
                if console:
                    record["logging_status"] = "failed"
                record["errors"].append("owned children or output/logging pipe not settled within cleanup bound")
                break
            time.sleep(0.02)
    except Exception as error:
        record["errors"].append(f"supervisor: {error}")
        # Containment errors never become permission to signal an unverified PID.
        record["cleanup_status"] = "failed"
        if record["reason"] not in ("deadline", "signal", "command_signal"):
            record["reason"] = "supervisor"
        # Still attempt bounded exact-identity cleanup for identities already established.
        if term_at is None:
            term_at = min(time.monotonic(), deadline) if deadline is not None else time.monotonic()
        escalation = term_at + args.term_grace
        until = (kill_at if kill_at is not None else escalation) + args.cleanup
        while owned and time.monotonic() < until:
            try:
                try:
                    discover()
                except Exception as discovery_error:
                    record["errors"].append(f"containment unknown: {discovery_error}")
                settle()
                send(signal.SIGKILL if time.monotonic() >= escalation else signal.SIGTERM)
                if pipe is not None:
                    drain()
                if eof and not console and quiescent():
                    break
            except Exception as cleanup_error:
                record["errors"].append(f"cleanup: {cleanup_error}")
                break
            time.sleep(0.02)
    finally:
        if console or (pipe is not None and not eof):
            record["logging_status"] = "failed"
            record["errors"].append("output did not completely settle; no logging success")
        selector.close()
        for fd in pidfds.values():
            os.close(fd)
        if pipe is not None:
            os.close(pipe)
        if logfile is not None:
            try:
                try:
                    os.fsync(logfile)
                finally:
                    os.close(logfile)
            except OSError as error:
                record["logging_status"] = "failed"
                record["errors"].append(f"log close: {error}")
        if stdout_blocking is not None:
            os.set_blocking(1, stdout_blocking)
        for signum, handler in handlers.items():
            signal.signal(signum, handler)
    if interrupted and record["finished"]:
        record["reason"] = "signal"
        record["finished"] = False
        record["received_signals"] = interrupted[:]
    if record["cleanup_status"] != "ok":
        record["finished"] = False
        if record["reason"] == "complete":
            record["reason"] = "cleanup"
        record["exit_status"] = 125
    elif record["reason"] == "deadline":
        record["exit_status"] = 124
    elif not record["finished"]:
        record["exit_status"] = 125
    elif record["command_status"] != 0:
        record["exit_status"] = record["command_status"]
    elif record["logging_status"] != "ok":
        record["exit_status"] = 125
    else:
        record["exit_status"] = 0
    record["elapsed_seconds"] = time.monotonic() - started
    valid_record(record)
    # No completion output until the record is atomically written and all components settled.
    path = Path(args.record)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(record, indent=2) + "\n")
    temporary.replace(path)
    if os.environ.get("GITHUB_OUTPUT"):
        with open(os.environ["GITHUB_OUTPUT"], "a") as output:
            if record["finished"]:
                output.write("finished=true\n")
    return record["exit_status"]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="mode", required=True)
    report = commands.add_parser("summary")
    report.add_argument("record")
    command = commands.add_parser("run")
    command.add_argument("--deadline", type=float, default=960)
    command.add_argument("--term-grace", type=float, default=10)
    command.add_argument("--cleanup", type=float, default=10)
    command.add_argument("--log", required=True)
    command.add_argument("--record", required=True)
    command.add_argument("command", nargs=argparse.REMAINDER)
    args = parser.parse_args()
    if args.mode == "summary":
        return summary(args.record)
    if args.command[:1] == ["--"]:
        args.command = args.command[1:]
    if not args.command or any(not math.isfinite(v) or v <= 0 for v in (args.deadline, args.term_grace, args.cleanup)):
        parser.error("positive finite bounds and an explicit command required")
    try:
        return run(args)
    except (OSError, ValueError) as error:
        print(f"INCOMPLETE: supervisor evidence/setup failure: {error}", file=sys.stderr)
        return 125


if __name__ == "__main__":
    sys.exit(main())
