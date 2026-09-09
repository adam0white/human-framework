#!/usr/bin/env python3
"""Independent learning-pilot audit; imports no runner code.

Before unsealing, run only --synthetic. After the source freeze and first run,
pass --results and --projection to check the restricted analytical outputs.
The independent optimization uses scipy.optimize.nnls on a 4,001-point log
grid, then bounded refinement. It never fits against holdout observations.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
import math
from pathlib import Path
import platform

import numpy as np
import scipy
from scipy.optimize import minimize_scalar, nnls


MODELS = ("mean", "recent10", "linear", "exponential", "power1", "power5")
CURVES = ("exponential", "power1", "power5")
PRIMARY = MODELS[:-1]
LOW, HIGH = math.log(1e-4), math.log(10.0)
TRAIN_X = np.arange(30, dtype=float)
ALL_X = np.arange(50, dtype=float)
GRID_COUNT = 4001


def close(actual, expected, label, *, atol=2e-10, rtol=2e-10):
    a, b = np.asarray(actual, dtype=float), np.asarray(expected, dtype=float)
    if a.shape != b.shape or not np.all(np.isfinite(a)) or not np.all(np.isfinite(b)):
        raise AssertionError(f"{label}: shape/nonfinite mismatch")
    if not np.allclose(a, b, atol=atol, rtol=rtol):
        raise AssertionError(f"{label}: maximum absolute difference {float(np.max(np.abs(a-b)))}")


def shape(model, x, log_k=None, *, instantaneous=False):
    if instantaneous:
        return (np.asarray(x) == 0).astype(float)
    k = math.exp(float(log_k))
    if model == "exponential":
        return np.exp(-k * x)
    offset = 1.0 if model == "power1" else 5.0
    return np.power(offset / (np.asarray(x) + offset), k)


def nnls_at(model, y_train, log_k=None, *, instantaneous=False):
    """Independent active-set NNLS, unlike the runner's boundary enumeration."""
    design = np.column_stack((np.ones(30), shape(model, TRAIN_X, log_k, instantaneous=instantaneous)))
    coefficients, _ = nnls(design, y_train, maxiter=1000)
    residual = design @ coefficients - y_train
    return float(residual @ residual), coefficients


def independent_fit(model, y_train):
    y = np.asarray(y_train, dtype=float)
    if y.shape != (30,) or not np.all(np.isfinite(y)) or np.any(y < 0):
        raise AssertionError("Independent fit requires exactly 30 finite nonnegative training observations")
    grid = np.linspace(LOW, HIGH, GRID_COUNT)
    evaluations = [nnls_at(model, y, z) for z in grid]
    errors = np.asarray([item[0] for item in evaluations])
    candidates = [(float(errors[i]), float(grid[i]), "grid") for i in range(GRID_COUNT)]
    refinements = []
    for i in range(1, GRID_COUNT - 1):
        # Every non-strict local minimum that is strictly below a neighbor.
        if errors[i] <= errors[i-1] and errors[i] <= errors[i+1] and (errors[i] < errors[i-1] or errors[i] < errors[i+1]):
            result = minimize_scalar(lambda z: nnls_at(model, y, z)[0], bounds=(grid[i-1], grid[i+1]),
                                     method="bounded", options={"xatol": 1e-10, "maxiter": 100})
            if not result.success or not math.isfinite(float(result.fun)):
                raise AssertionError(f"Independent refinement failed: {model}, index {i}, {result}")
            candidates.append((float(result.fun), float(result.x), "refined"))
            refinements.append({"log_k": float(result.x), "sse": float(result.fun), "success": True})
    instant, _ = nnls_at(model, y, instantaneous=True)
    candidates.append((instant, math.inf, "instantaneous"))
    minimum = min(item[0] for item in candidates)
    tie_tolerance = 1e-10 * (1 + minimum)
    chosen = min((item for item in candidates if item[0] <= minimum + tie_tolerance), key=lambda item: item[1])
    return {
        "minimum_sse": minimum,
        "grid_minimum_sse": float(np.min(errors)),
        "protocol_1001_grid_minimum_sse": float(np.min(errors[::4])),
        "instantaneous_sse": instant,
        "chosen_sse": chosen[0],
        "chosen_log_k": None if math.isinf(chosen[1]) else chosen[1],
        "chosen_kind": chosen[2],
        "refinement_count": len(refinements),
        "all_refinements_successful": True,
    }


def predicted(model, parameters):
    if model in ("mean", "recent10"):
        return np.full(50, float(parameters["value"]))
    if model == "linear":
        return np.maximum(0, float(parameters["b"]) + float(parameters["m"]) * ALL_X)
    a, b = float(parameters["a"]), float(parameters["b"])
    if not math.isfinite(a) or not math.isfinite(b) or a < 0 or b < 0:
        raise AssertionError("Curved amplitudes/asymptotes must be finite and nonnegative")
    boundary = parameters["shape_boundary"]
    if boundary == "instantaneous":
        if parameters.get("k") is not None:
            raise AssertionError("Instantaneous boundary cannot be recorded as a finite rate")
        g = shape(model, ALL_X, instantaneous=True)
    elif boundary == "finite":
        k = float(parameters["k"])
        if not 1e-4 * (1-1e-12) <= k <= 10 * (1+1e-12):
            raise AssertionError("Finite shape lies outside prespecified bounds")
        g = shape(model, ALL_X, math.log(k))
    else:
        raise AssertionError("Unknown shape boundary")
    if model.startswith("power"):
        close(parameters["offset"], 1 if model == "power1" else 5, "fixed power offset", atol=0, rtol=0)
    return b + a * g


def loss_values(y, predictions):
    training_residual = predictions[:30] - y[:30]
    held_residual = predictions[30:] - y[30:]
    held_sse = float(held_residual @ held_residual)
    return {"training_rmse": float(np.sqrt(np.mean(training_residual**2))),
            "holdout_rmse": math.sqrt(held_sse/20),
            "holdout_mae": float(np.mean(np.abs(held_residual))), "holdout_sse": held_sse}


def audit_model(model, observed, detail, label):
    fit, parameters = detail["fit"], detail["fit"]["parameters"]
    if fit["model"] != model:
        raise AssertionError(f"{label}: model identity mismatch")
    predictions = predicted(model, parameters)
    close(detail["predictions"], predictions, f"{label} predictions")
    loss = loss_values(observed, predictions)
    for name, value in loss.items():
        close(detail["losses"][name], value, f"{label} {name}")
    train = observed[:30]
    numerical = None
    if model in ("mean", "recent10"):
        if fit["objective_tosses"] != ([1, 30] if model == "mean" else [21, 30]):
            raise AssertionError(f"{label}: mean estimate window has changed")
        if fit["objective"] != "constant_least_squares_on_fit_window":
            raise AssertionError(f"{label}: mean fitting objective mislabeled")
        close(parameters["value"], np.mean(train if model == "mean" else train[-10:]), f"{label} training mean")
        fitted_residual = predictions[:30]-train
        objective = float(np.sum((fitted_residual if model == "mean" else fitted_residual[-10:])**2))
    elif model == "linear":
        if fit["objective"] != "unclipped_ordinary_least_squares":
            raise AssertionError(f"{label}: linear fitting objective mislabeled")
        # Centering gives a different numerical path from a design-matrix OLS.
        centered = TRAIN_X - np.mean(TRAIN_X)
        slope = float(centered @ (train - np.mean(train)) / (centered @ centered))
        intercept = float(np.mean(train) - slope*np.mean(TRAIN_X))
        close([parameters["b"], parameters["m"]], [intercept, slope], f"{label} unconstrained OLS")
        objective = float(np.sum((intercept + slope*TRAIN_X - train)**2))
    else:
        objective = float(np.sum((predictions[:30]-train)**2))
        numerical = independent_fit(model, train)
        close(fit["grid_minimum_sse"], numerical["protocol_1001_grid_minimum_sse"], f"{label} 1001-grid minimum", atol=2e-8, rtol=2e-9)
        minimum = numerical["minimum_sse"]
        # Permit only the protocol's objective tie plus numerical error, not a
        # substantive objective loss. Rates need not match in degenerate fits.
        allowed = 1e-10*(1+minimum) + 2e-8 + 2e-9*abs(minimum)
        if abs(float(fit["candidate_minimum_sse"]) - minimum) > allowed:
            raise AssertionError(f"{label}: candidate minimum differs from denser independent search")
        if objective < minimum-allowed or objective > minimum+allowed:
            raise AssertionError(f"{label}: chosen training SSE outside independent optimum tolerance")
        a, b = float(parameters["a"]), float(parameters["b"])
        flags = fit["flags"]
        if bool(flags["amplitude_zero"]) != (a == 0) or bool(flags["asymptote_zero"]) != (b == 0):
            raise AssertionError(f"{label}: coefficient boundary flags disagree")
        instantaneous = parameters["shape_boundary"] == "instantaneous"
        if bool(flags["instantaneous"]) != instantaneous:
            raise AssertionError(f"{label}: instantaneous flag disagrees")
        if instantaneous and (flags["shape_lower_bound"] or flags["shape_upper_bound"]):
            raise AssertionError(f"{label}: instantaneous boundary mislabeled finite bound")
        if not instantaneous:
            if bool(flags["shape_lower_bound"]) != (parameters["k"] == 1e-4) or bool(flags["shape_upper_bound"]) != (parameters["k"] == 10):
                raise AssertionError(f"{label}: finite shape-boundary flag disagrees")
        if bool(flags["nonconstant_finite_shape"]) != (a > 0 and not instantaneous):
            raise AssertionError(f"{label}: nonconstant finite-shape flag disagrees")
        close(fit["selection_sse_tolerance"], 1e-10*(1+float(fit["candidate_minimum_sse"])), f"{label} selection tolerance")
        refinement = fit["refinement"]
        if not refinement["all_successful"] or refinement["count"] != len(refinement["results"]):
            raise AssertionError(f"{label}: failed/missing runner refinements")
        for result in refinement["results"]:
            if not result["success"]:
                raise AssertionError(f"{label}: runner refinement failure")
            grid_index = result["grid_index"]
            protocol_grid = np.linspace(LOW, HIGH, 1001)
            if not isinstance(grid_index, int) or not 1 <= grid_index <= 999:
                raise AssertionError(f"{label}: invalid refinement grid index")
            if not protocol_grid[grid_index-1] <= result["log_k"] <= protocol_grid[grid_index+1] or not 0 <= result["nit"] <= 100:
                raise AssertionError(f"{label}: refinement escaped its training-grid bracket or iteration cap")
            close(result["log_bounds"], [protocol_grid[grid_index-1], protocol_grid[grid_index+1]], f"{label} refinement bracket")
            rebuilt, _ = nnls_at(model, train, float(result["log_k"]))
            close(result["sse"], rebuilt, f"{label} reported refinement SSE", atol=2e-8, rtol=2e-9)
    close(fit["training_objective_sse"], objective, f"{label} raw training objective")
    return predictions, loss, numerical


def load_projection(path):
    with open(path, newline="") as file:
        reader = csv.DictReader(file)
        if reader.fieldnames != ["analysis_id", "toss", "prior_throws", "normalized_error"]:
            raise AssertionError("Read only the four-column restricted analytical projection")
        rows = list(reader)
    if len(rows) != 55*50:
        raise AssertionError("Projection must retain all 55 participants and 50 throws")
    people = {}
    for row in rows:
        identity = row["analysis_id"]
        toss, prior = int(row["toss"]), int(row["prior_throws"])
        value = float(row["normalized_error"])
        if not 1 <= toss <= 50 or prior != toss-1 or not math.isfinite(value) or value < 0:
            raise AssertionError("Invalid projection chronology or observation")
        if toss in people.setdefault(identity, {}):
            raise AssertionError("Duplicate participant throw")
        people[identity][toss] = value
    expected = [f"P{i:03d}" for i in range(1, 56)]
    if sorted(people) != expected or any(sorted(p) != list(range(1, 51)) for p in people.values()):
        raise AssertionError("Missing participant or throw; no exclusion is permitted")
    return {identity: np.asarray([people[identity][t] for t in range(1, 51)]) for identity in expected}


def verify(results_path, projection_path):
    payload = json.loads(Path(results_path).read_text())
    if payload["schema_version"] != 1:
        raise AssertionError("Unsupported pilot result schema")
    metadata = payload["metadata"]
    if metadata["training_tosses"] != [1, 30] or metadata["holdout_tosses"] != [31, 50] or metadata["exposure_units"] != "completed main throws":
        raise AssertionError("Frozen split/exposure units have changed")
    if metadata["primary_models"] != list(PRIMARY) or metadata["sensitivity_models"] != ["power5"]:
        raise AssertionError("Primary/sensitivity model identity changed")
    projection = load_projection(projection_path)
    people = payload["people"]
    if [p["analysis_id"] for p in people] != list(projection):
        raise AssertionError("Result IDs must match all projection IDs in order")
    losses = {model: [] for model in MODELS}
    numerical = []
    for person in people:
        identity = person["analysis_id"]
        observed = np.asarray(person["observed"], dtype=float)
        close(observed, projection[identity], f"{identity} projection", atol=0, rtol=0)
        if set(person["models"]) != set(MODELS):
            raise AssertionError("Missing model, sensitivity or adverse participant")
        for model in MODELS:
            _, loss, check = audit_model(model, observed, person["models"][model], f"{identity}/{model}")
            losses[model].append(loss)
            if check is not None:
                numerical.append({"analysis_id": identity, "model": model, **check})
    n = len(people)
    if payload["summary"]["sampling_units"] != n:
        raise AssertionError("Bootstrap sampling units must be participants")
    bootstrap = payload["summary"]["bootstrap"]
    if (bootstrap["generator"], bootstrap["seed"], bootstrap["replicates"], bootstrap["quantile_method"]) != ("PCG64", 20260908, 10000, "linear"):
        raise AssertionError("Frozen bootstrap specification changed")
    indices = np.random.Generator(np.random.PCG64(20260908)).integers(0, n, size=(10000, n))
    rmse = {model: np.asarray([v["holdout_rmse"] for v in losses[model]]) for model in MODELS}
    for model in MODELS:
        report = payload["summary"]["models"][model]
        if bool(report["sensitivity_only"]) != (model == "power5"):
            raise AssertionError("Power-offset sensitivity has been relabeled")
        expected = {"mean_person_rmse": float(np.mean(rmse[model])),
                    "median_person_rmse": float(np.median(rmse[model])),
                    "mean_person_mae": float(np.mean([v["holdout_mae"] for v in losses[model]])),
                    "pooled_rmse": float(np.sqrt(np.mean([v["holdout_sse"]/20 for v in losses[model]]))),
                    "mean_person_training_rmse": float(np.mean([v["training_rmse"] for v in losses[model]])),
                    "mean_person_rmse_ci95": np.quantile(np.mean(rmse[model][indices], axis=1), [.025, .975], method="linear")}
        for key, value in expected.items():
            close(report[key], value, f"summary/{model}/{key}")
    rank = sorted(PRIMARY, key=lambda model: float(np.mean(rmse[model])))
    if payload["summary"]["primary_ranking"] != rank:
        raise AssertionError("Descriptive primary ranking or sensitivity separation is incorrect")
    controls = payload["summary"]["exponential_paired_differences"]
    if set(controls) != set(MODELS)-{"exponential"}:
        raise AssertionError("A paired control has been omitted")
    for model, report in controls.items():
        difference = rmse["exponential"] - rmse[model]
        close(report["person_differences"], difference, f"paired/{model}/all-person differences")
        close(report["mean_difference"], np.mean(difference), f"paired/{model}/mean")
        close(report["ci95"], np.quantile(np.mean(difference[indices], axis=1), [.025, .975], method="linear"), f"paired/{model}/bootstrap")
        counts = {"lower": int(np.sum(difference < -1e-12)), "tied": int(np.sum(np.abs(difference) <= 1e-12)), "higher": int(np.sum(difference > 1e-12))}
        for key, count in counts.items():
            if report[key] != count:
                raise AssertionError(f"paired/{model}/{key} count mismatch")
        if bool(report["sensitivity_only"]) != (model == "power5"):
            raise AssertionError("Paired power5 sensitivity relabeled")
    cohort = payload["cohort_mean_diagnostic"]
    if set(cohort["models"]) != set(MODELS):
        raise AssertionError("Cohort diagnostic omitted a model")
    observed_mean = np.mean(np.vstack(list(projection.values())), axis=0)
    close(cohort["observed"], observed_mean, "cohort observed means")
    for model in MODELS:
        _, _, check = audit_model(model, observed_mean, cohort["models"][model], f"cohort/{model}")
        if check is not None:
            numerical.append({"analysis_id": "cohort-mean-diagnostic", "model": model, **check})
    return {"status": "passed", "participants": n, "throws_per_participant": 50, "training_throws": 30,
            "holdout_throws": 20, "models": list(MODELS), "sensitivity_only": ["power5"],
            "independent_grid_count": GRID_COUNT, "independent_optimizer": "scipy.optimize.nnls + bounded minimize_scalar",
            "bootstrap": {"generator": "PCG64", "seed": 20260908, "resamples": 10000, "quantile_method": "linear"},
            "inputs": {"results_sha256": hashlib.sha256(Path(results_path).read_bytes()).hexdigest(),
                       "projection_sha256": hashlib.sha256(Path(projection_path).read_bytes()).hexdigest()},
            "numerical_checks": numerical,
            "scope": "Restricted projection, every prediction and loss, participant bootstrap, cohort diagnostic and training-only numerical fits. No raw-data measurement or identity-projection verification."}


def synthetic():
    results = []
    cases = [("constant", np.full(30, 2.0), CURVES),
             ("exponential", .4 + 2.2*np.exp(-.13*TRAIN_X), ("exponential",)),
             ("power1", .2 + 1.7*(1+TRAIN_X)**(-.7), ("power1",)),
             ("power5", .2 + 1.7*(1+TRAIN_X/5)**(-1.1), ("power5",)),
             ("worsening", .3 + .02*TRAIN_X, CURVES),
             ("instantaneous", .4 + 2.2*(TRAIN_X == 0), CURVES)]
    for name, y, models in cases:
        for model in models:
            fit = independent_fit(model, y)
            expected = float(np.sum((y-np.mean(y))**2)) if name == "worsening" else 0.0
            close(fit["minimum_sse"], expected, f"synthetic/{name}/{model}", atol=1e-9, rtol=1e-9)
            results.append({"case": name, "model": model, **fit})
    # Check the clipped predictor and the separate, unrestricted OLS objective.
    linear_y = 1.0 - .025*ALL_X
    linear_prediction = predicted("linear", {"b": 1.0, "m": -.025})
    assert np.any(linear_y[30:] < 0) and np.all(linear_prediction >= 0)
    close(linear_prediction[:30], linear_y[:30], "synthetic OLS training unchanged")
    # Predictions depend only on fixed parameters; held-out values affect losses,
    # never the independent training-only optimization interface.
    y1 = np.r_[np.full(30, 2.), np.full(20, 0.)]
    y2 = np.r_[y1[:30], np.full(20, 100.)]
    assert np.array_equal(y1[:30], y2[:30])
    assert loss_values(y1, np.full(50, 2.))["holdout_rmse"] != loss_values(y2, np.full(50, 2.))["holdout_rmse"]
    return {"status": "passed", "scope": "synthetic only; no participant observations loaded", "numerical_checks": results}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--synthetic", action="store_true")
    parser.add_argument("--results", type=Path)
    parser.add_argument("--projection", type=Path)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    if args.synthetic:
        if args.results or args.projection:
            parser.error("Synthetic checks cannot load participant output")
        report = synthetic()
    else:
        if not args.results or not args.projection:
            parser.error("Use --synthetic, or pass both --results and --projection after release to verification")
        report = verify(args.results, args.projection)
    report["verifier_sha256"] = hashlib.sha256(Path(__file__).read_bytes()).hexdigest()
    report["environment"] = {"python": platform.python_version(), "numpy": np.__version__, "scipy": scipy.__version__}
    text = json.dumps(report, indent=2, allow_nan=False) + "\n"
    if args.output:
        with args.output.open("x") as file:
            file.write(text)
    print(text)


if __name__ == "__main__":
    main()
