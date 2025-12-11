#!/usr/bin/env python3
"""
Step 0: Generate Baseline P&L

Generates a P&L from the original input data before any transformations.
This serves as a baseline for comparing changes.

Input: input-data/all-txn-2024-2025.csv
Output: output/pnl_step0.csv
"""

from pathlib import Path
from pnl_generator import generate_pnl

# Paths
SCRIPT_DIR = Path(__file__).parent
BASE_DIR = SCRIPT_DIR.parent
INPUT_FILE = BASE_DIR / "input-data" / "all-txn-2024-2025.csv"
PNL_FILE = BASE_DIR / "output" / "pnl_step0.csv"


def main():
    print("=" * 80)
    print("STEP 0: BASELINE P&L (Original Data)")
    print("=" * 80)
    print(f"\nInput: {INPUT_FILE}")

    # Generate P&L
    PNL_FILE.parent.mkdir(parents=True, exist_ok=True)
    summary = generate_pnl(INPUT_FILE, PNL_FILE)

    print(f"\n{'=' * 80}")


if __name__ == "__main__":
    main()
