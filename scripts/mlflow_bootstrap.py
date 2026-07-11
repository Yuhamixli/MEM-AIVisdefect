#!/usr/bin/env python3
"""MLflow experiment bootstrap template for MEM-AIVisdefect.

Usage:
  pip install mlflow
  python scripts/mlflow_bootstrap.py --name EXP-20260711-001 --model yolov8n
"""

from __future__ import annotations

import argparse
from datetime import date


def main() -> None:
    parser = argparse.ArgumentParser(description="Start an MLflow run skeleton")
    parser.add_argument("--name", required=True, help="Experiment run name, e.g. EXP-YYYYMMDD-001")
    parser.add_argument("--model", default="yolov8n")
    parser.add_argument("--dataset", default="DS-v0.1")
    parser.add_argument("--tracking-uri", default="./mlruns")
    args = parser.parse_args()

    try:
        import mlflow
    except ImportError as exc:
        raise SystemExit("mlflow not installed. Run: pip install mlflow") from exc

    mlflow.set_tracking_uri(args.tracking_uri)
    mlflow.set_experiment("MEM-AIVisdefect")

    with mlflow.start_run(run_name=args.name):
        mlflow.log_param("model", args.model)
        mlflow.log_param("dataset_version", args.dataset)
        mlflow.log_param("date", date.today().isoformat())
        # Placeholder metrics — replace after real training
        mlflow.log_metric("mAP50", 0.0)
        mlflow.log_metric("DR", 0.0)
        mlflow.log_metric("FPR", 0.0)
        mlflow.log_metric("FPS", 0.0)
        print(f"Started MLflow run: {args.name}")
        print(f"Tracking URI: {args.tracking_uri}")
        print("Replace placeholder metrics after training.")


if __name__ == "__main__":
    main()
