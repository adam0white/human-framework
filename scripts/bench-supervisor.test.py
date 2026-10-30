#!/usr/bin/env python3
"""Short stdlib controls. Real process containment controls run only on Linux, before Bench."""
import contextlib
import importlib.util
import io
import json
import os
from pathlib import Path
import signal
import subprocess
import sys
import tempfile
import time
import unittest
from unittest import mock
from types import SimpleNamespace

SCRIPT = Path(__file__).with_name("bench-supervisor.py")
spec = importlib.util.spec_from_file_location("bench_supervisor", SCRIPT)
supervisor = importlib.util.module_from_spec(spec)
spec.loader.exec_module(supervisor)


def completed(code=0, logging="ok"):
    return dict(version=1, reason="complete", finished=True, command_status=code,
                command_signal=None, logging_status=logging, cleanup_status="ok",
                exit_status=code if code else (0 if logging == "ok" else 125), command=["fixture"],
                owned=[dict(pid=123, starttime=456, settled=True)], errors=[], elapsed_seconds=0.1)


class RecordControls(unittest.TestCase):
    def test_proc_stat_comm_and_starttime(self):
        fields = ["S", "42"] + ["0"] * 17 + ["987"]
        self.assertEqual(supervisor.stat_identity("123 (name ) with spaces) " + " ".join(fields)), (42, 987))

    def test_completion_and_reserved_command_codes(self):
        for code in (0, 7, 124, 137):
            self.assertEqual(supervisor.valid_record(completed(code))["exit_status"], code)
        self.assertEqual(supervisor.valid_record(completed(logging="failed"))["exit_status"], 125)

    def test_invalid_records_and_summary_markers(self):
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / "record.json"
            cases = [None, {}, {**completed(), "finished": False}, {**completed(), "command_status": 7},
                     {**completed(), "cleanup_status": "failed"}, {**completed(), "owned": []}, {**completed(), "owned": [None]}]
            for record in cases:
                path.write_text(json.dumps(record))
                with contextlib.redirect_stdout(io.StringIO()) as output:
                    self.assertEqual(supervisor.summary(path), 1)
                self.assertIn("INCOMPLETE", output.getvalue())
            path.unlink()
            with contextlib.redirect_stdout(io.StringIO()):
                self.assertEqual(supervisor.summary(path), 1)
            path.write_text(json.dumps(completed()))
            with contextlib.redirect_stdout(io.StringIO()):
                self.assertEqual(supervisor.summary(path), 1)  # No trusted marker/outcome.

    def test_summary_branch_contract(self):
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / "record.json"
            old = {k: os.environ.get(k) for k in ("TIMING_OUTCOME", "TIMING_FINISHED")}
            try:
                cases = [(completed(), "success", "true", "SUCCESS:"),
                         (completed(7), "failure", "true", "FAILED measurement"),
                         ({**completed(), "finished": False, "reason": "deadline", "exit_status": 124}, "failure", "", "INCOMPLETE: command deadline reached")]
                for record, outcome, marker, text in cases:
                    path.write_text(json.dumps(record))
                    os.environ.update(TIMING_OUTCOME=outcome, TIMING_FINISHED=marker)
                    with contextlib.redirect_stdout(io.StringIO()) as output:
                        self.assertEqual(supervisor.summary(path), 0)
                    self.assertIn(text, output.getvalue())
            finally:
                for key, value in old.items():
                    if value is None:
                        os.environ.pop(key, None)
                    else:
                        os.environ[key] = value

    @unittest.skipIf(sys.platform == "linux", "non-Linux refusal only")
    def test_non_linux_fails_before_spawn(self):
        with tempfile.TemporaryDirectory() as temp:
            p = Path(temp)
            result = subprocess.run([sys.executable, str(SCRIPT), "run", "--log", str(p / "log"), "--record", str(p / "record"), "--", sys.executable, "-c", f"open({str(p / 'launched')!r},'w').close()"], capture_output=True, timeout=3)
            self.assertEqual(result.returncode, 125)
            self.assertFalse((p / "launched").exists())
            self.assertFalse(json.loads((p / "record").read_text())["finished"])


@unittest.skipUnless(sys.platform == "linux", "actual Linux subreaper/pidfd controls, not macOS qualification")
class LinuxProcessControls(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        import resource
        resource.setrlimit(resource.RLIMIT_CORE, (0, 0))
        supervisor.subreaper()  # Adopt a failed supervisor's fixture descendants for exact-PID cleanup.

    def tearDown(self):
        # Safety net for a failed control: only this test process's actual adopted children.
        remaining = []
        until = time.monotonic() + 1
        while time.monotonic() < until:
            remaining = supervisor.children(os.getpid())
            if not remaining:
                break
            for pid in remaining:
                before = supervisor.identity(pid)
                try:
                    fd = os.pidfd_open(pid)
                except ProcessLookupError:
                    continue
                try:
                    if before is not None and supervisor.identity(pid) == before:
                        signal.pidfd_send_signal(fd, signal.SIGKILL)
                finally:
                    os.close(fd)
                try:
                    os.waitpid(pid, os.WNOHANG)
                except ChildProcessError:
                    pass
            time.sleep(0.01)
        self.assertFalse(supervisor.children(os.getpid()), "fixture containment failed")

    def fixture(self, code, *, deadline=2, log=None, external_signal=None, missing_command=False, hold_console=False):
        with tempfile.TemporaryDirectory() as temp:
            p = Path(temp)
            output = p / "output"
            command = ["/nonexistent/bench-command"] if missing_command else [sys.executable, "-c", code]
            argv = [sys.executable, str(SCRIPT), "run", "--deadline", str(deadline), "--term-grace", "0.15", "--cleanup", "0.5", "--log", log or str(p / "log"), "--record", str(p / "record"), "--", *command]
            started = time.monotonic()
            proc = subprocess.Popen(argv, stdout=subprocess.PIPE, stderr=subprocess.PIPE, env={**os.environ, "GITHUB_OUTPUT": str(output)})
            root_identity = supervisor.identity(proc.pid)
            if external_signal:
                time.sleep(0.15)
                fd = os.pidfd_open(proc.pid)
                try:
                    self.assertEqual(supervisor.identity(proc.pid), root_identity)
                    signal.pidfd_send_signal(fd, external_signal)
                finally:
                    os.close(fd)
            try:
                if hold_console:
                    proc.wait(timeout=6)  # Deliberately do not drain the supervisor console pipe.
                stdout, stderr = proc.communicate(timeout=6)
            except subprocess.TimeoutExpired:
                fd = os.pidfd_open(proc.pid)
                try:
                    if supervisor.identity(proc.pid) == root_identity:
                        signal.pidfd_send_signal(fd, signal.SIGKILL)
                finally:
                    os.close(fd)
                proc.communicate(timeout=1)
                self.fail("supervisor exceeded fixture's bounded execution")
            elapsed = time.monotonic() - started
            self.assertLess(elapsed, 6)
            self.assertFalse(supervisor.children(os.getpid()), "supervisor left an untracked adopted fixture process")
            record = supervisor.valid_record(json.loads((p / "record").read_text()))
            self.assertEqual(proc.returncode, record["exit_status"], (stdout, stderr))
            self.assertEqual(output.read_text() if output.exists() else "", "finished=true\n" if record["finished"] else "")
            for receipt in record["owned"]:
                current = supervisor.identity(receipt["pid"])
                self.assertTrue(current is None or current[1] != receipt["starttime"], receipt)
            print(json.dumps(dict(control=code, elapsed=elapsed, record=record)), flush=True)
            return record, (p / "log").read_bytes() if (p / "log").exists() else b""

    def test_normal_and_reserved_exits_preserve_all_output(self):
        for code in (0, 7, 124, 137):
            record, log = self.fixture(f"import sys; print('real output'); sys.exit({code})")
            self.assertTrue(record["finished"])
            self.assertEqual(record["exit_status"], code)
            self.assertEqual(log, b"real output\n")
        record, log = self.fixture("import os; os.write(1,b'x'*300000)")
        self.assertTrue(record["finished"])
        self.assertEqual(len(log), 300000)

    def test_deadline_and_term_ignoring_descendant(self):
        record, _ = self.fixture("import signal,time; signal.signal(signal.SIGTERM,signal.SIG_IGN); print('partial',flush=True); time.sleep(10)", deadline=0.2)
        self.assertFalse(record["finished"])
        self.assertEqual(record["reason"], "deadline")
        self.assertEqual(record["exit_status"], 124)
        self.assertIn(signal.SIGKILL, record["owned"][0]["signals"])

    def test_npm_like_grandchild_and_fast_parent_adoption(self):
        leaf = "import signal,time;signal.signal(signal.SIGTERM,signal.SIG_IGN);print('leaf',flush=True);time.sleep(10)"
        middle = f"import subprocess,sys;subprocess.Popen([sys.executable,'-c',{leaf!r}])"
        root = f"import subprocess,sys,time;subprocess.Popen([sys.executable,'-c',{middle!r}]);time.sleep(.15)"
        record, _ = self.fixture(root)
        self.assertFalse(record["finished"])
        self.assertEqual(record["reason"], "lingering_children")
        self.assertGreaterEqual(len(record["owned"]), 3)
        self.assertEqual(record["cleanup_status"], "ok")

    def test_fast_parent_child_closing_output_still_requires_cleanup(self):
        code = "import os,time;pid=os.fork();os._exit(0) if pid else None;os.close(1);os.close(2);time.sleep(10)"
        record, _ = self.fixture(code)
        self.assertFalse(record["finished"])
        self.assertEqual(record["reason"], "lingering_children")
        self.assertGreaterEqual(len(record["owned"]), 2)

    def test_external_term_and_command_signals_are_incomplete(self):
        for signum in (signal.SIGTERM, signal.SIGINT, signal.SIGHUP):
            record, _ = self.fixture("import time;time.sleep(10)", external_signal=signum)
            self.assertEqual(record["reason"], "signal")
            self.assertFalse(record["finished"])
        for signum in (signal.SIGKILL, signal.SIGSEGV):
            record, _ = self.fixture(f"import os,signal;os.kill(os.getpid(),{int(signum)})")
            self.assertEqual(record["reason"], "command_signal")
            self.assertEqual(record["command_signal"], signum)
            self.assertFalse(record["finished"])

    def test_logging_failure_alone_and_overlapping_deadline(self):
        record, _ = self.fixture("print('not preserved')", log="/dev/full")
        self.assertEqual(record["logging_status"], "failed")
        self.assertTrue(record["finished"])
        self.assertNotEqual(record["exit_status"], 0)
        record, _ = self.fixture("import time;print('partial',flush=True);time.sleep(10)", deadline=0.2, log="/dev/full")
        self.assertEqual(record["logging_status"], "failed")
        self.assertEqual(record["reason"], "deadline")
        self.assertEqual(record["exit_status"], 124)
        self.assertFalse(record["finished"])

    def test_console_backpressure_is_bounded_incomplete(self):
        record, _ = self.fixture("import os\nwhile True: os.write(1,b'x'*65536)", deadline=0.2, hold_console=True)
        self.assertEqual(record["reason"], "deadline")
        self.assertFalse(record["finished"])
        self.assertEqual(record["logging_status"], "failed")
        self.assertEqual(record["cleanup_status"], "failed")
        self.assertEqual(record["exit_status"], 125)

    def test_unknown_containment_fails_closed_and_cleans_known_child(self):
        # Labelled unit fault: inject one /proc discovery failure after a real child starts.
        original = supervisor.children
        calls = 0

        def discovery(pid):
            nonlocal calls
            calls += 1
            if calls == 2:
                raise PermissionError("TEST ONLY proc discovery fault")
            return original(pid)

        with tempfile.TemporaryDirectory() as temp:
            p = Path(temp)
            args = SimpleNamespace(log=str(p / "log"), record=str(p / "record"), deadline=1,
                                   term_grace=0.15, cleanup=0.5,
                                   command=[sys.executable, "-c", "import time;time.sleep(10)"])
            with mock.patch.object(supervisor, "children", discovery):
                self.assertEqual(supervisor.run(args), 125)
            record = supervisor.valid_record(json.loads((p / "record").read_text()))
            self.assertFalse(record["finished"])
            self.assertEqual(record["cleanup_status"], "failed")
            self.assertTrue(all(r["settled"] for r in record["owned"]))
            self.assertTrue(any("TEST ONLY" in e for e in record["errors"]))

    def late_adoption_fixture(self, cleanup):
        # TEST ONLY scheduling hooks; all fork/adoption/wait/signal operations are real Linux.
        # P is held until its child scan, then forks C, closes C's output and exits before settle.
        with tempfile.TemporaryDirectory() as temp:
            p = Path(temp)
            go_read, go_write = os.pipe()
            os.set_inheritable(go_read, True)
            parent_file, child_file = p / "parent", p / "child"
            code = f"""
import os,signal,time
from pathlib import Path
parent=Path({str(parent_file)!r});child=Path({str(child_file)!r})
pid=os.fork()
if pid:
    while not parent.exists(): time.sleep(.001)
    os._exit(0)
signal.signal(signal.SIGTERM,signal.SIG_IGN)
parent.write_text(str(os.getpid()))
os.read({go_read},1)
ready,ack=os.pipe()
pid=os.fork()
if pid:
    child.write_text(str(pid))
    os.read(ready,1)
    os._exit(0)
signal.signal(signal.SIGTERM,signal.SIG_DFL)
os.close(1);os.close(2)
os.write(ack,b'c')
time.sleep(10)
"""
            state = dict(root=None, root_reaped=False, armed=False, term=False, triggered=False)
            original_children, original_wait = supervisor.children, os.waitpid
            original_spawn, original_send = os.posix_spawnp, signal.pidfd_send_signal

            def spawn(*args, **kwargs):
                state["root"] = original_spawn(*args, **kwargs)
                return state["root"]

            def wait(pid, flags):
                result = original_wait(pid, flags)
                if pid == state["root"] and result[0]:
                    state["root_reaped"] = True
                if parent_file.exists() and pid == int(parent_file.read_text()) and not result[0] and state["root_reaped"]:
                    # The next P scan is the post-root discover, before its final settle.
                    state["armed"] = True
                return result

            def send(fd, signum, *args):
                if signum == signal.SIGTERM and not state["term"]:
                    state["term"] = True
                    state["armed"] = False  # Force the next loop's second scan for cleanup mode.
                return original_send(fd, signum, *args)

            def discover(pid):
                snapshot = original_children(pid)
                if parent_file.exists() and pid == int(parent_file.read_text()) and state["armed"] and not state["triggered"] and (not cleanup or state["term"]):
                    self.assertEqual(snapshot, [])
                    self.assertTrue(state["root_reaped"])
                    state["triggered"] = True
                    os.write(go_write, b'g')
                    until = time.monotonic() + 1
                    while time.monotonic() < until:
                        stat = Path(f"/proc/{pid}/stat").read_text()
                        if stat[stat.rindex(")") + 2:].split()[0] == "Z":
                            break  # Do not reap P here: the following real settle must do so.
                        time.sleep(.001)
                    else:
                        raise RuntimeError("TEST ONLY late-fork schedule failed to reach P zombie")
                    child = int(child_file.read_text())
                    state["child"] = (child, supervisor.identity(child)[1])
                return snapshot  # The pre-fork empty child scan, followed by the actual final reap.

            args = SimpleNamespace(log=str(p / "log"), record=str(p / "record"), deadline=2,
                                   term_grace=0.15, cleanup=0.5, command=[sys.executable, "-c", code])
            try:
                with mock.patch.object(supervisor, "children", discover), mock.patch.object(os, "waitpid", wait), mock.patch.object(os, "posix_spawnp", spawn), mock.patch.object(signal, "pidfd_send_signal", send), mock.patch.dict(os.environ, {"GITHUB_OUTPUT": str(p / "output")}):
                    status = supervisor.run(args)
                record = supervisor.valid_record(json.loads((p / "record").read_text()))
                self.assertTrue(state["triggered"], "late-adoption schedule was not exercised")
                self.assertFalse(record["finished"], record)
                self.assertNotEqual(status, 0)
                self.assertEqual(record["cleanup_status"], "ok", record)
                child, starttime = state["child"]
                self.assertTrue(any(r["pid"] == child and r["starttime"] == starttime for r in record["owned"]))
                current = supervisor.identity(child)
                self.assertTrue(current is None or current[1] != starttime, "late child survived")
                self.assertFalse(original_children(os.getpid()), "actual subreaper children survived")
                self.assertFalse((p / "output").read_text() if (p / "output").exists() else "")
                print(json.dumps(dict(control="late adoption after scan before settle", cleanup=cleanup, state=state, record=record)), flush=True)
            finally:
                os.close(go_read)
                os.close(go_write)

    def test_late_adoption_normal_completion_decision(self):
        self.late_adoption_fixture(cleanup=False)

    def test_late_adoption_termination_cleanup_decision(self):
        self.late_adoption_fixture(cleanup=True)

    def test_wrapper_launch_failure_is_incomplete(self):
        record, _ = self.fixture("", missing_command=True)
        self.assertEqual(record["reason"], "supervisor")
        self.assertFalse(record["finished"])
        self.assertEqual(record["exit_status"], 125)


if __name__ == "__main__":
    unittest.main(verbosity=2)
