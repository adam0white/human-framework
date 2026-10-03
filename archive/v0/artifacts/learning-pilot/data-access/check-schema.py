#!/usr/bin/env python3
"""Administrative checks only; intentionally no model fits or dose-wise outcomes."""
import collections
import csv
import hashlib
import json
import math
from pathlib import Path

BASE = Path(__file__).resolve().parent
RAW = ["00.exp1a-raw-batch1.csv", "02.exp1a-raw-batch2.csv"]


def missing(value):
    return value in ("", "NA") or value.endswith("_NULL")


def main():
    manifest = json.loads((BASE / "download-manifest.json").read_text())
    for item in manifest:
        body = (BASE / item["file"]).read_bytes()
        assert len(body) == item["bytes"], item["file"]
        assert hashlib.sha256(body).hexdigest() == item["sha256"], item["file"]
        assert item["sha256"] == item["osf_sha256"], item["file"]
    metadata = json.loads((BASE / "metadata-manifest.json").read_text())
    for item in metadata:
        body = (BASE / item["file"]).read_bytes()
        assert len(body) == item["bytes"], item["file"]
        assert hashlib.sha256(body).hexdigest() == item["sha256"], item["file"]
    reports, subjects = [], set()
    for name in RAW:
        with (BASE / "originals" / name).open() as stream:
            reader = csv.DictReader(stream)
            rows = list(reader)
            headers = reader.fieldnames
        tosses = [row for row in rows if row["condition"] == "main"]
        groups = collections.defaultdict(list)
        for row in tosses:
            groups[row["unique_id"]].append(row)
        bad_order = sum(
            [(int(row["trial_num"]) - 1) * 5 + int(row["which_throw"]) + 1
             for row in group] != list(range(1, 51))
            for group in groups.values()
        )
        numeric = ["distance_from_radius", "arrow_V_stopping_x", "arrow_V_stopping_y",
                   "board_center_x", "board_center_y", "board_outerRing_radius",
                   "board_bullseye_radius", "strength_duration",
                   "arrow_H_moving_duration", "trial_duration"]
        report = {
            "file": name,
            "headers": headers,
            "all_rows": len(rows),
            "conditions": dict(collections.Counter(row["condition"] for row in rows)),
            "participants": len(groups),
            "main_rows": len(tosses),
            "main_rows_per_participant": dict(collections.Counter(map(len, groups.values()))),
            "participants_with_order_other_than_1_to_50": bad_order,
            "duplicate_participant_ids_between_batches": len(subjects & set(groups)),
            "main_trial_num_values": sorted({int(row["trial_num"]) for row in tosses}),
            "main_which_throw_values": sorted({int(row["which_throw"]) for row in tosses}),
            "finite_numeric_counts": {
                column: sum(not missing(row[column]) and math.isfinite(float(row[column]))
                            for row in tosses) for column in numeric
            },
            "negative_distance_rows": sum(float(row["distance_from_radius"]) < 0 for row in tosses),
            "distance_matches_euclidean_coordinates_rows": sum(
                math.isclose(float(row["distance_from_radius"]), math.hypot(
                    float(row["arrow_V_stopping_x"]) - float(row["board_center_x"]),
                    float(row["arrow_V_stopping_y"]) - float(row["board_center_y"])),
                    rel_tol=1e-12, abs_tol=1e-9) for row in tosses
            ),
            "task_geometry_values": {
                column: sorted({float(row[column]) for row in tosses})
                for column in ["board_outerRing_radius", "board_bullseye_radius",
                               "H_animation_speed_time", "up_distance_unit"]
            },
            "startTrialTime_missing_by_within_block_throw": {
                str(i): sum(missing(row["startTrialTime"]) for row in tosses
                            if int(row["which_throw"]) == i) for i in range(5)
            },
            "record_id_strictly_increasing_within_participant": all(
                all(int(b["id"]) > int(a["id"]) for a, b in zip(group, group[1:]))
                for group in groups.values()
            ),
            "all_main_unique_ids_have_WLL_prefix": all(
                row["unique_id"].startswith("WLL-") for row in tosses
            ),
            "direct_platform_id_columns_absent": not any(
                column.lower() in {"workerid", "workerid_fromurl", "prolific_pid", "hitid", "study_id"}
                for column in headers
            ),
        }
        reports.append(report)
        subjects.update(groups)
    result = {
        "scope": "Administrative schema, completeness, chronology and measurement-identity checks only; no fitted models, outcome summaries by dose, trend plots, or learning-based exclusions.",
        "downloaded_originals_verified": len(manifest),
        "metadata_snapshots_verified": len(metadata),
        "total_participants": len(subjects),
        "total_main_toss_rows": sum(report["main_rows"] for report in reports),
        "reports": reports,
    }
    (BASE / "schema-checks.json").write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps({key: value for key, value in result.items() if key != "reports"}, indent=2))


if __name__ == "__main__":
    main()
