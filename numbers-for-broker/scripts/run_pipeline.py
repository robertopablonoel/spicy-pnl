#!/usr/bin/env python3
"""
Run the complete P&L transformation pipeline.

This script runs all 5 transformation steps in sequence:
1. Add November Shopify revenue
2. Apply reclassifications
3. Replace Nov/Dec affiliate payouts
4. Shift affiliate dates
5. Smooth shipping costs

Usage: python3 run_pipeline.py
"""

import subprocess
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent

STEPS = [
    ("step0_baseline_pnl.py", "Baseline P&L (Original Data)"),
    ("step1_add_november_revenue.py", "Add November Shopify Revenue"),
    ("step2_apply_reclassifications.py", "Apply Reclassifications"),
    ("step3_replace_nov_dec_affiliates.py", "Replace Nov/Dec Affiliate Payouts"),
    ("step4_shift_affiliate_dates.py", "Shift Affiliate Dates"),
    ("step5_smooth_shipping.py", "Smooth Shipping Costs"),
]


def main():
    print("=" * 80)
    print("SPICY CUBES P&L TRANSFORMATION PIPELINE")
    print("=" * 80)
    print(f"\nRunning {len(STEPS)} transformation steps...\n")

    for i, (script, description) in enumerate(STEPS, 1):
        print(f"\n{'#' * 80}")
        print(f"# STEP {i}/{len(STEPS)}: {description}")
        print(f"{'#' * 80}\n")

        script_path = SCRIPT_DIR / script
        result = subprocess.run(
            [sys.executable, str(script_path)],
            capture_output=False
        )

        if result.returncode != 0:
            print(f"\nERROR: Step {i} failed with return code {result.returncode}")
            sys.exit(1)

    print("\n" + "=" * 80)
    print("PIPELINE COMPLETE")
    print("=" * 80)
    print("\nOutputs:")
    print("  Transformed data: output/all-txn-2024-2025-transformed.csv")
    print("\nP&L Reports (one per step):")
    print("  pnl_step0.csv - Baseline (original data)")
    print("  pnl_step1.csv - After November revenue")
    print("  pnl_step2.csv - After reclassifications")
    print("  pnl_step3.csv - After affiliate replacement")
    print("  pnl_step4.csv - After date shifting")
    print("  pnl_step5.csv - Final (after shipping smoothing)")


if __name__ == "__main__":
    main()
