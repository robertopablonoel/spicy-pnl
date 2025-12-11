#!/usr/bin/env python3
"""
Step 1: Add November Shopify Revenue

Adds November 2025 Shopify journal entries for sales, discounts, refunds,
shipping income, and COGS.

Input: input-data/all-txn-2024-2025.csv
Output: output/step1_november_revenue.csv
"""

import re
from pathlib import Path
from typing import List

from pnl_generator import generate_pnl

# Paths
SCRIPT_DIR = Path(__file__).parent
BASE_DIR = SCRIPT_DIR.parent
INPUT_FILE = BASE_DIR / "input-data" / "all-txn-2024-2025.csv"
OUTPUT_FILE = BASE_DIR / "output" / "step1_november_revenue.csv"
PNL_FILE = BASE_DIR / "output" / "pnl_step1.csv"


# November Shopify journal entries
NOVEMBER_ENTRIES = [
    {"account": "4000 Sales", "memo": "Shopify Sales", "amount": 598732.40},
    {"account": "4010 Discounts", "memo": "Shopify Discounts", "amount": -143321.35},
    {"account": "4020 Refunds", "memo": "Shopify Returns", "amount": -19982.96},
    {"account": "4030 Shipping Income", "memo": "Shopify Shipping Income", "amount": 39659.04},
    {"account": "5000 Cost of Goods Sold", "memo": "Shopify COGS", "amount": 85199.62},
]


def add_november_revenue(lines: List[str]) -> List[str]:
    """Add November Shopify journal entries after matching account section headers."""
    new_lines = []
    added_accounts = set()
    entries_added = 0

    for line in lines:
        new_lines.append(line)
        trimmed = line.strip()

        # Check for section headers
        for entry in NOVEMBER_ENTRIES:
            if trimmed.startswith(entry["account"] + ",") and entry["account"] not in added_accounts:
                # Add journal entry after section header
                journal_line = f',11/30/2025,Journal Entry,2025_11_Shopify,,Shopify,{entry["memo"]},,{entry["amount"]:.2f},0.00'
                new_lines.append(journal_line)
                added_accounts.add(entry["account"])
                entries_added += 1
                print(f"  Added: {entry['account']}: {entry['memo']} = ${entry['amount']:,.2f}")

    print(f"\nTotal entries added: {entries_added}")
    return new_lines


def main():
    print("=" * 80)
    print("STEP 1: ADD NOVEMBER SHOPIFY REVENUE")
    print("=" * 80)
    print(f"\nInput:  {INPUT_FILE}")
    print(f"Output: {OUTPUT_FILE}")

    # Read input file
    with open(INPUT_FILE, 'r', encoding='utf-8') as f:
        content = f.read()

    lines = content.split('\n')
    print(f"\nLoaded {len(lines)} lines from input file\n")

    # Run transformation
    lines = add_november_revenue(lines)

    # Write output
    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))

    print(f"\nOutput written to: {OUTPUT_FILE}")
    print(f"Total lines: {len(lines)}")

    # Generate P&L
    generate_pnl(OUTPUT_FILE, PNL_FILE)

    print(f"\n{'=' * 80}")


if __name__ == "__main__":
    main()
