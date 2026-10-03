"""Synthetic-only tests of the frozen empirical pilot; never load study data."""
import hashlib
import importlib.util
import json
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

import numpy as np

SCRIPT = Path(__file__).resolve().parents[1] / "scripts/learning-pilot.py"
if SCRIPT.exists():
    SPEC = importlib.util.spec_from_file_location("learning_pilot", SCRIPT)
    pilot = importlib.util.module_from_spec(SPEC)
    SPEC.loader.exec_module(pilot)
else:
    pilot = None


class NumericalTests(unittest.TestCase):
    def setUp(self):
        self.assertIsNotNone(pilot, "The synthetic pilot implementation must exist")

    def test_exact_exponential_and_power_forecasts(self):
        x = np.arange(50, dtype=float)
        for name, expected in [
            ("exponential", 0.4 + 2.1 * np.exp(-0.12 * x)),
            ("power1", 0.3 + 3.0 * (1 + x) ** -0.65),
            ("power5", 0.7 + 2.0 * (1 + x / 5) ** -0.9),
        ]:
            with self.subTest(name=name):
                fit = pilot.fit_curve(name, expected[:30])
                np.testing.assert_allclose(pilot.predict(fit, x[30:]), expected[30:], atol=2e-6)
                self.assertLess(fit["training_objective_sse"], 1e-9)
                self.assertTrue(fit["refinement"]["all_successful"])

    def test_constant_and_instantaneous_boundaries(self):
        for name in ("exponential", "power1", "power5"):
            with self.subTest(name=name):
                constant = pilot.fit_curve(name, np.full(30, 2.5))
                self.assertTrue(constant["flags"]["amplitude_zero"])
                self.assertFalse(constant["flags"]["nonconstant_finite_shape"])
                np.testing.assert_allclose(pilot.predict(constant, np.arange(50)), 2.5)
                step = pilot.fit_curve(name, np.r_[12.0, np.full(29, 2.0)])
                self.assertEqual(step["parameters"]["shape_boundary"], "instantaneous")
                self.assertIsNone(step["parameters"]["k"])
                np.testing.assert_allclose(pilot.predict(step, np.arange(50)), np.r_[12.0, np.full(49, 2.0)], atol=1e-12)

    def test_signed_worsening_is_retained_and_linear_unclipped_fit(self):
        fits = pilot.fit_models(1 + 0.2 * np.arange(30))
        self.assertAlmostEqual(fits["linear"]["parameters"]["m"], 0.2)
        np.testing.assert_allclose(pilot.predict(fits["linear"], np.arange(30, 50)), 1 + 0.2 * np.arange(30, 50))
        self.assertTrue(fits["exponential"]["flags"]["amplitude_zero"])
        # A valid nonnegative training series whose OLS line goes below zero.
        y = np.r_[np.full(5, 9.0), np.zeros(25)]
        fit = pilot.fit_models(y)["linear"]
        b, m = np.linalg.lstsq(np.c_[np.ones(30), np.arange(30)], y, rcond=None)[0]
        self.assertAlmostEqual(fit["training_objective_sse"], float(np.sum((y - b - m * np.arange(30)) ** 2)))
        pred = pilot.predict(fit, np.arange(50))
        self.assertTrue(np.all(pred >= 0))
        self.assertGreater(abs(fit["training_objective_sse"] - np.sum((y - pred[:30]) ** 2)), 1)

    def test_recent10_objective_uses_only_its_fit_window(self):
        fits = pilot.fit_models(np.r_[np.full(20, 10.0), np.ones(10)])
        recent = fits["recent10"]
        self.assertEqual(recent["parameters"]["value"], 1.0)
        self.assertEqual(recent["training_objective_sse"], 0.0)
        self.assertEqual(recent["objective_tosses"], [21, 30])

    def test_holdout_never_changes_fit_or_forecast(self):
        train = 0.4 + 2 * np.exp(-0.17 * np.arange(30))
        a = pilot.analyze_person("P001", np.r_[train, np.ones(20)])
        b = pilot.analyze_person("P001", np.r_[train, np.arange(20) + 100])
        for name in pilot.ALL_MODELS:
            self.assertEqual(a["models"][name]["fit"], b["models"][name]["fit"])
            self.assertEqual(a["models"][name]["predictions"], b["models"][name]["predictions"])
            self.assertNotEqual(a["models"][name]["losses"]["holdout_rmse"], b["models"][name]["losses"]["holdout_rmse"])
        with self.assertRaises(ValueError):
            pilot.fit_models(np.r_[train, np.ones(20)])

    def test_loss_and_paired_bootstrap_identities(self):
        people = []
        for i, y in enumerate((np.ones(50), 2 + np.arange(50) / 50, 3 * np.exp(-np.arange(50) / 20))):
            people.append(pilot.analyze_person(f"P{i+1:03d}", y))
        summary = pilot.summarize_people(people)
        self.assertEqual(summary, pilot.summarize_people(people))
        names = pilot.ALL_MODELS
        matrix = np.array([[p["models"][n]["losses"]["holdout_rmse"] for n in names] for p in people])
        indices = np.random.Generator(np.random.PCG64(20260908)).integers(0, 3, size=(10000, 3))
        expected_boot = matrix[indices].mean(axis=1)
        for j, name in enumerate(names):
            np.testing.assert_allclose(summary["models"][name]["mean_person_rmse_ci95"], np.quantile(expected_boot[:, j], [0.025, 0.975], method="linear"))
            self.assertAlmostEqual(summary["models"][name]["pooled_rmse"], float(np.sqrt(np.mean(matrix[:, j] ** 2))))
        delta = matrix[:, names.index("exponential")] - matrix[:, names.index("recent10")]
        self.assertAlmostEqual(summary["exponential_paired_differences"]["recent10"]["mean_difference"], float(delta.mean()))

    def test_failed_refinement_and_nonfinite_solver_abort(self):
        class Failed:
            success = False
        decreasing = 0.4 + 2 * np.exp(-0.12 * np.arange(30))
        with patch.object(pilot, "minimize_scalar", return_value=Failed()):
            with self.assertRaises(RuntimeError):
                pilot.fit_curve("exponential", decreasing)
        # Nonfinite unconstrained coefficients must abort, even with a feasible boundary.
        with patch.object(np.linalg, "lstsq", return_value=(np.array([np.nan, np.nan]), None, None, None)):
            with self.assertRaises(ValueError):
                pilot.nonnegative_coefficients(np.exp(-0.1 * np.arange(30)), decreasing)

    def test_plots_and_saved_losses_cover_all_people_without_raw_ids(self):
        people = [pilot.analyze_person("P001", np.ones(50)), pilot.analyze_person("P002", 1 + np.arange(50) / 50)]
        cohort = pilot.analyze_person("cohort_mean", np.mean([p["observed"] for p in people], axis=0))
        with tempfile.TemporaryDirectory() as td:
            out = Path(td)
            result = {"people": people, "cohort_mean_diagnostic": cohort}
            pilot.plot_diagnostics(result, out)
            self.assertTrue((out / "diagnostics.png").read_bytes().startswith(b"\x89PNG\r\n\x1a\n"))
            svg = (out / "diagnostics.svg").read_text()
            self.assertIn("P001", svg)
            self.assertIn("P002", svg)
            hashes_before = {name: pilot.sha256_file(out / name) for name in ("diagnostics.png", "diagnostics.svg")}
            pilot.plot_diagnostics(result, out)
            self.assertEqual(hashes_before, {name: pilot.sha256_file(out / name) for name in hashes_before})
            pilot.write_json(out / "synthetic.json", result)
            self.assertEqual(json.loads((out / "synthetic.json").read_text()), result)


def synthetic_rows(unique_id="synthetic"):
    return [{"condition": "main", "unique_id": unique_id, "trial_num": str((t - 1) // 5 + 1),
             "which_throw": str((t - 1) % 5), "distance_from_radius": str(t),
             "board_outerRing_radius": "2", "private_free_text": "must never survive"} for t in range(1, 51)]


class DataGuardsTests(unittest.TestCase):
    def setUp(self):
        self.assertIsNotNone(pilot, "The synthetic pilot implementation must exist")

    def test_chronology_normalization_namespace_hash_and_restricted_projection(self):
        a, b = synthetic_rows("same"), synthetic_rows("same")
        result = pilot.project_batches([("b.csv", list(reversed(b))), ("a.csv", a)], expected_participants=2)
        self.assertEqual([p["analysis_id"] for p in result], ["P001", "P002"])
        self.assertEqual(result[0]["normalized_error"], (np.arange(1, 51) / 2).tolist())
        ordered = sorted(["a.csv:same", "b.csv:same"], key=lambda s: hashlib.sha256(s.encode()).hexdigest())
        altered = synthetic_rows("same")
        for row in altered:
            row["distance_from_radius"] = "200"
        result = pilot.project_batches([("a.csv", a), ("b.csv", altered)], expected_participants=2)
        self.assertEqual(result[ordered.index("b.csv:same")]["normalized_error"], [100.0] * 50)
        self.assertEqual(set(result[0]), {"analysis_id", "normalized_error"})
        ignored = {"condition": "keyboard"}
        self.assertEqual(len(pilot.project_batches([("a.csv", a + [ignored])], expected_participants=1)), 1)

    def test_schema_failures_abort_instead_of_dropping(self):
        mutations = [lambda rows: rows.pop(), lambda rows: rows.append(rows[0]),
                     lambda rows: rows[0].update(distance_from_radius="nan"),
                     lambda rows: rows[0].update(board_outerRing_radius="0"),
                     lambda rows: rows[0].update(distance_from_radius="-1"),
                     lambda rows: rows[0].update(which_throw="5"),
                     lambda rows: rows[0].update(trial_num="1.2"),
                     lambda rows: rows[0].update(unique_id="")]
        for mutate in mutations:
            rows = synthetic_rows()
            mutate(rows)
            with self.assertRaises(ValueError):
                pilot.project_batches([("a.csv", rows)], expected_participants=1)

    def test_hash_checks_and_manifest_required_entries(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            path = root / "sample.txt"
            path.write_text("synthetic")
            valid = {"path": "sample.txt", "sha256": hashlib.sha256(b"synthetic").hexdigest()}
            pilot.verify_entries([valid], root)
            path.write_text("changed")
            with self.assertRaises(ValueError):
                pilot.verify_entries([valid], root)
            with self.assertRaises(ValueError):
                pilot.verify_entries([{"path": "../sample.txt", "sha256": "0" * 64}], root)
            with self.assertRaises(ValueError):
                pilot.verify_manifest({"schema_version": 1, "files": [], "data": []}, root)

    def test_existing_evidence_directory_is_never_overwritten(self):
        with tempfile.TemporaryDirectory() as td:
            path = Path(td)
            marker = path / "preserved.txt"
            marker.write_text("initial evidence")
            with self.assertRaises(FileExistsError):
                pilot.reserve_output_directory(path)
            self.assertEqual(marker.read_text(), "initial evidence")

    def test_manifest_binds_each_required_source_protocol_and_raw_identity(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            files = []
            for name in sorted(pilot.REQUIRED_SOURCE_PATHS):
                path = root / name
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_text("synthetic source " + name)
                files.append({"path": name, "sha256": pilot.sha256_file(path)})
            protocol = root / pilot.PROTOCOL_PATH
            protocol.parent.mkdir(parents=True, exist_ok=True)
            protocol.write_text("synthetic protocol")
            data = []
            for i, name in enumerate(pilot.RAW_SHA256):
                (root / name).write_text(f"synthetic batch {i}")
                data.append({"path": name, "sha256": pilot.sha256_file(root / name)})
            manifest = {"schema_version": 1, "files": files, "data": data,
                        "protocol": {"path": pilot.PROTOCOL_PATH, "sha256": pilot.sha256_file(protocol)}}
            with patch.object(pilot, "PROTOCOL_SHA256", manifest["protocol"]["sha256"]), \
                 patch.object(pilot, "RAW_SHA256", {entry["path"]: entry["sha256"] for entry in data}):
                pilot.verify_manifest(manifest, root)
                for field in ("files", "data"):
                    altered = {**manifest, field: manifest[field][:-1]}
                    with self.assertRaises(ValueError):
                        pilot.verify_manifest(altered, root)
                (root / files[0]["path"]).write_text("modified implementation")
                with self.assertRaises(ValueError):
                    pilot.verify_manifest(manifest, root)

    def test_uncommitted_freeze_is_refused_by_git_guard(self):
        root = SCRIPT.parents[1]
        with tempfile.TemporaryDirectory(dir=root) as td:
            freeze = Path(td) / "uncommitted-freeze.json"
            freeze.write_text("{}")
            with self.assertRaises(subprocess.CalledProcessError):
                pilot.verify_committed_freeze(freeze, {}, root)


if __name__ == "__main__":
    unittest.main()
