#!/usr/bin/env python3
"""Frozen secondary-analysis pilot. Importing this module never reads study data.

Real fitting is available only through --freeze committed-manifest --out new-dir.
The modeling API accepts thirty training outcomes, never held-out outcomes.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import io
import json
import math
from pathlib import Path
import platform
import subprocess
import sys

import numpy as np
import scipy
from scipy.optimize import minimize_scalar

PRIMARY_MODELS = ("mean", "recent10", "linear", "exponential", "power1")
ALL_MODELS = PRIMARY_MODELS + ("power5",)
CURVED_MODELS = ("exponential", "power1", "power5")
K_MIN, K_MAX = 1e-4, 10.0
LOG_GRID = np.linspace(math.log(K_MIN), math.log(K_MAX), 1001)
BOOTSTRAP_SEED, BOOTSTRAP_REPLICATES = 20260908, 10000
PROTOCOL_PATH = "docs/learning-pilot-protocol.md"
PROTOCOL_SHA256 = "1dd92ae266ee29b38023518366df7a50cf5aef8b997cb6bf089b95206006cfae"
REQUIRED_SOURCE_PATHS = {"scripts/learning-pilot.py", "tests/learning_pilot_test.py"}
RAW_SHA256 = {
    "00.exp1a-raw-batch1.csv": "25b454aa2cbe878f0db25d3c054c545cbc867829c861d74ef826155a9eb8c7a3",
    "02.exp1a-raw-batch2.csv": "53322c18dc906de306798a4c24e20acc2f683ad44bc571d6bf9d954aa8828cee",
}


def finite_vector(values, length=None):
    y = np.asarray(values, dtype=float)
    if y.ndim != 1 or (length is not None and len(y) != length) or not np.all(np.isfinite(y)):
        raise ValueError("Expected a finite vector of the specified length")
    return y


def training_vector(values):
    y = finite_vector(values, 30)
    if np.any(y < 0):
        raise ValueError("Training errors must be nonnegative")
    return y


def shape_values(model, x, k=None, instantaneous=False):
    x = finite_vector(x)
    if np.any(x < 0) or model not in CURVED_MODELS:
        raise ValueError("Invalid shape model or exposure")
    if instantaneous:
        return (x == 0).astype(float)
    if k is None or not math.isfinite(k) or not K_MIN <= k <= K_MAX:
        raise ValueError("Finite shape parameter outside frozen bounds")
    if model == "exponential":
        return np.exp(-k * x)
    offset = 1.0 if model == "power1" else 5.0
    return (offset / (x + offset)) ** k


def nonnegative_coefficients(g, y):
    """Exact two-column NNLS active sets: feasible OLS and both boundaries."""
    g, y = finite_vector(g), finite_vector(y)
    if len(g) != len(y) or not len(y):
        raise ValueError("Incompatible coefficient vectors")
    design = np.column_stack((np.ones(len(y)), g))
    b, a = np.linalg.lstsq(design, y, rcond=None)[0]
    if not math.isfinite(b) or not math.isfinite(a):
        raise ValueError("Nonfinite unconstrained coefficient solution")
    candidates = [(max(0.0, float(np.mean(y))), 0.0)]
    denominator = float(g @ g)
    if denominator > 0:
        candidates.append((0.0, max(0.0, float(g @ y) / denominator)))
    if b >= 0 and a >= 0:
        candidates.append((float(b), float(a)))
    evaluated = []
    for b, a in candidates:
        residual = y - (b + a * g)
        sse = float(residual @ residual)
        if not all(math.isfinite(v) for v in (b, a, sse)):
            raise ValueError("Nonfinite coefficient solution")
        evaluated.append({"b": b, "a": a, "sse": sse})
    return min(evaluated, key=lambda item: item["sse"])


def _finite_shape(log_k):
    if log_k == LOG_GRID[0]:
        return K_MIN
    if log_k == LOG_GRID[-1]:
        return K_MAX
    return float(math.exp(log_k))


def fit_curve(model, training):
    y = training_vector(training)
    x = np.arange(30, dtype=float)

    def candidate(log_k):
        k = _finite_shape(float(log_k))
        result = nonnegative_coefficients(shape_values(model, x, k), y)
        return {**result, "k": k, "log_k": float(log_k), "shape_boundary": "finite"}

    grid = [candidate(log_k) for log_k in LOG_GRID]
    candidates = list(grid)
    refinements = []
    for i in range(1, len(grid) - 1):
        left, current, right = (grid[j]["sse"] for j in (i - 1, i, i + 1))
        if current <= left and current <= right and (current < left or current < right):
            result = minimize_scalar(lambda log_k: candidate(log_k)["sse"],
                                     bounds=(LOG_GRID[i - 1], LOG_GRID[i + 1]),
                                     method="bounded", options={"xatol": 1e-10, "maxiter": 100})
            if not result.success or not math.isfinite(result.x) or not math.isfinite(result.fun):
                raise RuntimeError("Curved-model scalar refinement failed")
            refined = candidate(result.x)
            candidates.append(refined)
            refinements.append({"grid_index": i, "log_bounds": [float(LOG_GRID[i - 1]), float(LOG_GRID[i + 1])],
                                "log_k": float(result.x), "sse": refined["sse"],
                                "success": True, "nit": int(result.nit), "nfev": int(result.nfev)})
    instantaneous = nonnegative_coefficients(shape_values(model, x, instantaneous=True), y)
    candidates.append({**instantaneous, "k": None, "log_k": None, "shape_boundary": "instantaneous"})
    minimum_sse = min(c["sse"] for c in candidates)
    tolerance = 1e-10 * (1 + minimum_sse)
    admissible = [c for c in candidates if c["sse"] <= minimum_sse + tolerance]
    chosen = min(admissible, key=lambda c: math.inf if c["k"] is None else c["k"])
    instant = chosen["shape_boundary"] == "instantaneous"
    parameters = {k: chosen[k] for k in ("b", "a", "k", "shape_boundary")}
    if model.startswith("power"):
        parameters["offset"] = 1.0 if model == "power1" else 5.0
    fit = {"model": model, "parameters": parameters,
           "training_objective_sse": chosen["sse"],
           "grid_minimum_sse": min(c["sse"] for c in grid),
           "candidate_minimum_sse": minimum_sse, "selection_sse_tolerance": tolerance,
           "refinement": {"count": len(refinements), "all_successful": True, "results": refinements},
           "flags": {"amplitude_zero": chosen["a"] == 0.0, "asymptote_zero": chosen["b"] == 0.0,
                     "shape_lower_bound": chosen["k"] == K_MIN, "shape_upper_bound": chosen["k"] == K_MAX,
                     "instantaneous": instant, "nonconstant_finite_shape": chosen["a"] > 0 and not instant}}
    predict(fit, np.arange(50, dtype=float))  # Abort even on nonfinite future predictions.
    return fit


def fit_models(training):
    """Thirty errors only: no fit path receives holdout values or other people."""
    y = training_vector(training)
    x = np.arange(30, dtype=float)
    fits = {}
    for name in ("mean", "recent10"):
        fitted_y = y if name == "mean" else y[-10:]
        value = float(np.mean(fitted_y))
        residual = fitted_y - value
        fits[name] = {"model": name, "parameters": {"value": value},
                      "training_objective_sse": float(residual @ residual),
                      "objective": "constant_least_squares_on_fit_window",
                      "objective_tosses": [1 if name == "mean" else 21, 30]}
    b, m = np.linalg.lstsq(np.column_stack((np.ones(30), x)), y, rcond=None)[0]
    residual = y - (b + m * x)
    fits["linear"] = {"model": "linear", "parameters": {"b": float(b), "m": float(m)},
                      "training_objective_sse": float(residual @ residual),
                      "objective": "unclipped_ordinary_least_squares"}
    for model in CURVED_MODELS:
        fits[model] = fit_curve(model, y)
    for fit in fits.values():
        if not math.isfinite(fit["training_objective_sse"]):
            raise ValueError("Nonfinite fitting objective")
        predict(fit, np.arange(50, dtype=float))
    return fits


def predict(fit, exposure):
    x = finite_vector(exposure)
    if np.any(x < 0):
        raise ValueError("Negative prior-throw exposure")
    name, p = fit["model"], fit["parameters"]
    if name in ("mean", "recent10"):
        values = np.full(len(x), p["value"])
    elif name == "linear":
        values = np.maximum(0.0, p["b"] + p["m"] * x)
    else:
        values = p["b"] + p["a"] * shape_values(name, x, p["k"], p["shape_boundary"] == "instantaneous")
    return finite_vector(values, len(x))


def analyze_person(analysis_id, observations):
    observed = finite_vector(observations, 50)
    if np.any(observed < 0):
        raise ValueError("Observed errors must be nonnegative")
    fits = fit_models(observed[:30].copy())
    models = {}
    for name, fit in fits.items():
        predictions = predict(fit, np.arange(50, dtype=float))
        train_residual, test_residual = observed[:30] - predictions[:30], observed[30:] - predictions[30:]
        losses = {"training_rmse": float(np.sqrt(np.mean(train_residual ** 2))),
                  "holdout_rmse": float(np.sqrt(np.mean(test_residual ** 2))),
                  "holdout_mae": float(np.mean(np.abs(test_residual))),
                  "holdout_sse": float(test_residual @ test_residual)}
        if not all(math.isfinite(v) for v in losses.values()):
            raise ValueError("Nonfinite model loss")
        models[name] = {"fit": fit, "predictions": predictions.tolist(), "losses": losses}
    return {"analysis_id": analysis_id, "observed": observed.tolist(), "models": models}


def summarize_people(people):
    n = len(people)
    if n < 1:
        raise ValueError("No people to summarize")
    rmse = np.array([[p["models"][name]["losses"]["holdout_rmse"] for name in ALL_MODELS] for p in people])
    indices = np.random.Generator(np.random.PCG64(BOOTSTRAP_SEED)).integers(0, n, size=(BOOTSTRAP_REPLICATES, n))
    boot_means = rmse[indices].mean(axis=1)
    models = {}
    for j, name in enumerate(ALL_MODELS):
        losses = [p["models"][name]["losses"] for p in people]
        models[name] = {"sensitivity_only": name == "power5",
                        "mean_person_rmse": float(np.mean(rmse[:, j])),
                        "median_person_rmse": float(np.median(rmse[:, j])),
                        "mean_person_mae": float(np.mean([v["holdout_mae"] for v in losses])),
                        "pooled_rmse": float(np.sqrt(np.sum([v["holdout_sse"] for v in losses]) / (n * 20))),
                        "mean_person_training_rmse": float(np.mean([v["training_rmse"] for v in losses])),
                        "mean_person_rmse_ci95": np.quantile(boot_means[:, j], [0.025, 0.975], method="linear").tolist()}
    paired = {}
    exponential_index = ALL_MODELS.index("exponential")
    for j, name in enumerate(ALL_MODELS):
        if name == "exponential":
            continue
        differences = rmse[:, exponential_index] - rmse[:, j]
        boot_difference = boot_means[:, exponential_index] - boot_means[:, j]
        paired[name] = {"sensitivity_only": name == "power5", "mean_difference": float(np.mean(differences)),
                        "ci95": np.quantile(boot_difference, [0.025, 0.975], method="linear").tolist(),
                        "lower": int(np.sum(differences < -1e-12)), "tied": int(np.sum(np.abs(differences) <= 1e-12)),
                        "higher": int(np.sum(differences > 1e-12)), "person_differences": differences.tolist()}
    return {"sampling_units": n, "models": models,
            "primary_ranking": sorted(PRIMARY_MODELS, key=lambda name: models[name]["mean_person_rmse"]),
            "exponential_paired_differences": paired,
            "bootstrap": {"generator": "PCG64", "seed": BOOTSTRAP_SEED, "replicates": BOOTSTRAP_REPLICATES,
                          "index_draw": "integers(0,n,size=(10000,n))", "quantile_method": "linear",
                          "interval_type": "descriptive participant percentile 95%"}}


def _integer(text):
    number = float(text)
    if not math.isfinite(number) or not number.is_integer():
        raise ValueError("Noninteger chronology field")
    return int(number)


def project_batches(batches, expected_participants=55):
    """Project only frozen modeling fields; raw ID is hashed then discarded."""
    participants, seen_batches = {}, set()
    for filename, rows in batches:
        if filename in seen_batches:
            raise ValueError("Duplicate raw batch")
        seen_batches.add(filename)
        for row in rows:
            if row.get("condition") != "main":
                continue
            try:
                identity = row["unique_id"]
                if not isinstance(identity, str) or not identity.strip():
                    raise ValueError("Missing study identifier")
                trial, throw = _integer(row["trial_num"]), _integer(row["which_throw"])
                if not 1 <= trial <= 10 or not 0 <= throw <= 4:
                    raise ValueError("Chronology field outside expected range")
                toss = (trial - 1) * 5 + throw + 1
                distance, radius = float(row["distance_from_radius"]), float(row["board_outerRing_radius"])
                if not math.isfinite(distance) or not math.isfinite(radius) or distance < 0 or radius <= 0:
                    raise ValueError("Invalid distance or target radius")
                error = distance / radius
                if not math.isfinite(error):
                    raise ValueError("Nonfinite normalized error")
                key = hashlib.sha256((filename + ":" + identity).encode("utf-8")).hexdigest()
            except (KeyError, TypeError, OverflowError) as exc:
                raise ValueError("Raw main-row schema assertion failed") from exc
            outcomes = participants.setdefault(key, {})
            if toss in outcomes:
                raise ValueError("Duplicate participant toss position")
            outcomes[toss] = error
    if len(participants) != expected_participants:
        raise ValueError("Unexpected participant count")
    projection = []
    for i, key in enumerate(sorted(participants), start=1):
        outcomes = participants[key]
        if set(outcomes) != set(range(1, 51)):
            raise ValueError("Participant toss positions are not complete 1 through 50")
        projection.append({"analysis_id": f"P{i:03d}", "normalized_error": [outcomes[t] for t in range(1, 51)]})
    return projection


def sha256_file(path):
    digest = hashlib.sha256()
    with Path(path).open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def resolve_repo_path(root, relative):
    if not isinstance(relative, str) or Path(relative).is_absolute():
        raise ValueError("Freeze paths must be repository-relative")
    root = Path(root).resolve()
    path = (root / relative).resolve()
    if not path.is_relative_to(root):
        raise ValueError("Freeze path escapes repository")
    return path


def verify_entries(entries, root):
    seen = set()
    for entry in entries:
        path = resolve_repo_path(root, entry["path"])
        if path in seen:
            raise ValueError("Duplicate freeze file entry")
        seen.add(path)
        expected = entry["sha256"]
        if not isinstance(expected, str) or len(expected) != 64 or sha256_file(path) != expected:
            raise ValueError("Frozen file SHA-256 mismatch: " + entry["path"])


def verify_manifest(manifest, root):
    if manifest.get("schema_version") != 1:
        raise ValueError("Unsupported freeze schema")
    files, data, protocol = manifest.get("files", []), manifest.get("data", []), manifest.get("protocol", {})
    if not REQUIRED_SOURCE_PATHS.issubset({entry["path"] for entry in files}):
        raise ValueError("Freeze omits required executable source or synthetic tests")
    if protocol.get("path") != PROTOCOL_PATH or protocol.get("sha256") != PROTOCOL_SHA256:
        raise ValueError("Freeze protocol identity mismatch")
    if len(data) != 2 or {Path(entry["path"]).name: entry["sha256"] for entry in data} != RAW_SHA256:
        raise ValueError("Freeze must bind both exact original version-1 raw batches")
    verify_entries(files, root)
    verify_entries([protocol], root)
    verify_entries(data, root)


def verify_committed_freeze(path, manifest, root):
    relative = Path(path).resolve().relative_to(root).as_posix()
    recorded = subprocess.run(["git", "show", "HEAD:" + relative], cwd=root, check=True, capture_output=True).stdout
    if recorded != Path(path).read_bytes():
        raise ValueError("Freeze manifest is not committed unchanged at HEAD")
    commit = manifest.get("implementation_commit")
    if not isinstance(commit, str) or not commit:
        raise ValueError("Freeze lacks implementation commit")
    for entry in manifest["files"]:
        blob = subprocess.run(["git", "show", commit + ":" + entry["path"]], cwd=root, check=True, capture_output=True).stdout
        if hashlib.sha256(blob).hexdigest() != entry["sha256"]:
            raise ValueError("Implementation commit does not match source freeze")


def load_projection(manifest, root):
    # Must remain callable only after verify_manifest in the command-line path.
    batches = []
    for entry in sorted(manifest["data"], key=lambda item: Path(item["path"]).name):
        path = resolve_repo_path(root, entry["path"])
        raw_bytes = path.read_bytes()
        if hashlib.sha256(raw_bytes).hexdigest() != entry["sha256"]:
            raise ValueError("Raw source changed after freeze verification")
        with io.StringIO(raw_bytes.decode("utf-8-sig"), newline="") as handle:
            reader = csv.DictReader(handle)
            required = {"condition", "unique_id", "trial_num", "which_throw", "distance_from_radius", "board_outerRing_radius"}
            if not required.issubset(reader.fieldnames or ()):
                raise ValueError("Raw CSV lacks required modeling columns")
            # Retain no questionnaire, demographic, score, timestamp or free-text fields.
            rows = [{key: row[key] for key in required} for row in reader]
        batches.append((path.name, rows))
    return project_batches(batches)


def reserve_output_directory(path):
    Path(path).mkdir(parents=True, exist_ok=False)


def write_json(path, value):
    Path(path).write_text(json.dumps(value, indent=2, sort_keys=True, allow_nan=False) + "\n", encoding="utf-8")


def plot_diagnostics(result, out):
    import matplotlib
    matplotlib.use("Agg")
    matplotlib.rcParams["svg.hashsalt"] = "human-learning-pilot-v1"
    import matplotlib.pyplot as plt

    fig, axes = plt.subplots(2, 1, figsize=(12, 10), constrained_layout=True)
    cohort = result["cohort_mean_diagnostic"]
    axes[0].plot(np.arange(1, 51), cohort["observed"], color="black", linewidth=1.5, marker=".", label="Observed cohort mean")
    for name in ALL_MODELS:
        axes[0].plot(np.arange(31, 51), cohort["models"][name]["predictions"][30:],
                     linestyle="--" if name == "power5" else "-", label=name + (" (sensitivity)" if name == "power5" else ""))
    axes[0].axvline(30.5, color="gray", linestyle=":")
    axes[0].set(title="Cohort mean diagnostic: separate from individual forecast comparison", xlabel="Throw", ylabel="Center error / outer target radius")
    axes[0].legend(ncol=3, fontsize=9)
    people = result["people"]
    positions = np.arange(len(people))
    for name in ALL_MODELS:
        if name == "recent10":
            continue
        differences = [p["models"][name]["losses"]["holdout_rmse"] - p["models"]["recent10"]["losses"]["holdout_rmse"] for p in people]
        axes[1].plot(positions, differences, linestyle="none", marker="o" if name == "exponential" else ".", markersize=5, alpha=0.8,
                     label=name + (" (sensitivity)" if name == "power5" else ""))
    axes[1].axhline(0, color="black", linewidth=1)
    axes[1].set(title="Every participant: held-out RMSE difference from recent10", xlabel="Analysis ID (hashed-ID order)", ylabel="Model RMSE minus recent10 RMSE")
    axes[1].set_xticks(positions, [p["analysis_id"] for p in people], rotation=90, fontsize=6)
    axes[1].legend(ncol=3, fontsize=9)
    fig.savefig(Path(out) / "diagnostics.png", dpi=160, metadata={"Software": "Frozen human-learning-pilot-v1"})
    fig.savefig(Path(out) / "diagnostics.svg", metadata={"Date": None, "Creator": "Frozen human-learning-pilot-v1"})
    plt.close(fig)


def execute(manifest, freeze_path, root, out):
    projection = load_projection(manifest, root)
    people = [analyze_person(p["analysis_id"], p["normalized_error"]) for p in projection]
    observed_mean = np.mean([p["normalized_error"] for p in projection], axis=0)
    cohort = analyze_person("cohort_mean", observed_mean)
    cohort.pop("analysis_id")
    cohort["interpretation"] = "Prediction of a cohort mean, not individual performance; excluded from primary ranking"
    import matplotlib
    result = {"schema_version": 1,
              "metadata": {"freeze_sha256": sha256_file(freeze_path), "freeze": manifest,
                           "environment": {"python": platform.python_version(), "numpy": np.__version__,
                                           "scipy": scipy.__version__, "matplotlib": matplotlib.__version__},
                           "units": "center error / outer target radius", "exposure_units": "completed main throws",
                           "training_tosses": [1, 30], "holdout_tosses": [31, 50],
                           "primary_models": list(PRIMARY_MODELS), "sensitivity_models": ["power5"],
                           "analysis": "Secondary analysis; known published outcome; all participant outputs private"},
              "people": people, "summary": summarize_people(people), "cohort_mean_diagnostic": cohort}
    with (Path(out) / "projection.csv").open("w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle, lineterminator="\n")
        writer.writerow(("analysis_id", "toss", "prior_throws", "normalized_error"))
        for p in projection:
            for toss, error in enumerate(p["normalized_error"], start=1):
                writer.writerow((p["analysis_id"], toss, toss - 1, repr(error)))
    write_json(Path(out) / "results.json", result)
    plot_diagnostics(result, out)
    write_json(Path(out) / "artifact-hashes.json", {name: sha256_file(Path(out) / name)
                                                    for name in ("projection.csv", "results.json", "diagnostics.png", "diagnostics.svg")})


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--freeze", required=True, type=Path)
    parser.add_argument("--out", required=True, type=Path)
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1]
    if args.out.exists():
        raise FileExistsError("Result directory already exists; frozen evidence cannot be overwritten")
    manifest = json.loads(args.freeze.read_text(encoding="utf-8"))
    verify_manifest(manifest, root)
    verify_committed_freeze(args.freeze, manifest, root)
    reserve_output_directory(args.out)
    try:
        execute(manifest, args.freeze, root, args.out)
    except Exception as exc:
        write_json(args.out / "failure.json", {"error_type": type(exc).__name__, "message": str(exc),
                                              "status": "Aborted; retain this directory before any correction or rerun"})
        raise
    print("Frozen pilot artifacts written; independent verification is still required.")


if __name__ == "__main__":
    main()
