#!/usr/bin/env python3
"""
Step 3: Replace Nov/Dec Affiliate Payouts

Removes existing Nov/Dec 2025 affiliate transactions and replaces them
with accurate payout data from nov-dec-payouts.csv.

Input: output/step2_reclassified.csv
Output: output/step3_affiliates_replaced.csv
"""

import re
from pathlib import Path
from typing import List, Dict, Tuple

from pnl_generator import generate_pnl

# Paths
SCRIPT_DIR = Path(__file__).parent
BASE_DIR = SCRIPT_DIR.parent
INPUT_FILE = BASE_DIR / "output" / "step2_reclassified.csv"
OUTPUT_FILE = BASE_DIR / "output" / "step3_affiliates_replaced.csv"
PNL_FILE = BASE_DIR / "output" / "pnl_step3.csv"
NOV_DEC_PAYOUTS_FILE = BASE_DIR / "reference-data" / "nov-dec-payouts.csv"


def parse_csv_line(line: str) -> List[str]:
    """Parse a CSV line handling quoted fields with commas."""
    result = []
    current = ""
    in_quotes = False

    for char in line:
        if char == '"':
            in_quotes = not in_quotes
        elif char == ',' and not in_quotes:
            result.append(current.strip())
            current = ""
        else:
            current += char
    result.append(current.strip())
    return result


def parse_amount(s: str) -> float:
    """Parse amount string to float."""
    if not s:
        return 0.0
    cleaned = re.sub(r'[$,"\s]', '', s)
    try:
        return float(cleaned)
    except ValueError:
        return 0.0


def load_nov_dec_payouts() -> Tuple[List[Dict], List[Dict]]:
    """Load November and December payouts from CSV."""
    nov_payouts = []
    dec_payouts = []

    with open(NOV_DEC_PAYOUTS_FILE, 'r') as f:
        content = f.read()

    lines = content.strip().split('\n')
    current_month = ""

    for line in lines:
        parts = parse_csv_line(line)
        if not parts or not parts[0]:
            continue

        # Check for month header (11/01/2024 or 12/01/2024)
        date_match = re.match(r'^(\d{2})/\d{2}/(\d{4})$', parts[0])
        if date_match:
            current_month = date_match.group(1)
            continue

        # Skip headers
        if 'retainer' in parts[0].lower():
            continue

        # Get total (column 10)
        if len(parts) > 10:
            total = parse_amount(parts[10])
            if total > 0:
                payout = {"name": parts[0], "total": total}
                if current_month == "11":
                    nov_payouts.append(payout)
                elif current_month == "12":
                    dec_payouts.append(payout)

    return nov_payouts, dec_payouts


def replace_nov_dec_affiliates(lines: List[str]) -> List[str]:
    """Remove Nov/Dec 2025 affiliate transactions and replace with payout data."""
    nov_payouts, dec_payouts = load_nov_dec_payouts()

    nov_total = sum(p["total"] for p in nov_payouts)
    dec_total = sum(p["total"] for p in dec_payouts)

    print(f"\nNovember payouts: {len(nov_payouts)} creators, total: ${nov_total:,.2f}")
    print(f"December payouts: {len(dec_payouts)} creators, total: ${dec_total:,.2f}")

    new_lines = []
    current_section_code = ""
    removed_nov = 0
    removed_dec = 0
    added_payouts = False

    for line in lines:
        trimmed = line.strip()

        # Check for section header
        section_match = re.match(r'^(\d{4})\s+[^,]*,,,,,,,,,', trimmed)
        if section_match:
            current_section_code = section_match.group(1)
            new_lines.append(line)

            # After 6120 section header, add replacement entries (only once)
            if current_section_code == "6120" and not added_payouts:
                # Add November payouts (dated 11/30/2025)
                for payout in nov_payouts:
                    entry = f',11/30/2025,Journal Entry,NOV_PAYOUT,,{payout["name"]},Affiliate payout (Nov 2025),6120 Affiliate Marketing Expense,{payout["total"]:.2f},'
                    new_lines.append(entry)

                # Add December payouts (dated 12/31/2025)
                for payout in dec_payouts:
                    entry = f',12/31/2025,Journal Entry,DEC_PAYOUT,,{payout["name"]},Affiliate payout (Dec 2025),6120 Affiliate Marketing Expense,{payout["total"]:.2f},'
                    new_lines.append(entry)

                added_payouts = True
            continue

        # Check if this is a Nov/Dec 2025 transaction in the 6120 section to remove
        # Remove ALL transactions in 6120 section for Nov/Dec 2025
        if current_section_code == "6120":
            date_match = re.match(r'^,(\d{2})/\d{2}/(\d{4}),', line)
            if date_match:
                month = date_match.group(1)
                year = date_match.group(2)

                # Remove Nov/Dec 2025 transactions (they'll be replaced)
                if year == "2025" and month in ("11", "12"):
                    if month == "11":
                        removed_nov += 1
                    else:
                        removed_dec += 1
                    continue  # Skip this line

        new_lines.append(line)

    print(f"\nRemoved {removed_nov} November 2025 affiliate transactions")
    print(f"Removed {removed_dec} December 2025 affiliate transactions")
    print(f"Added {len(nov_payouts)} November payout entries")
    print(f"Added {len(dec_payouts)} December payout entries")

    return new_lines


def main():
    print("=" * 80)
    print("STEP 3: REPLACE NOV/DEC AFFILIATE PAYOUTS")
    print("=" * 80)
    print(f"\nInput:  {INPUT_FILE}")
    print(f"Output: {OUTPUT_FILE}")

    # Read input file
    with open(INPUT_FILE, 'r', encoding='utf-8') as f:
        content = f.read()

    lines = content.split('\n')
    print(f"\nLoaded {len(lines)} lines from input file")

    # Run transformation
    lines = replace_nov_dec_affiliates(lines)

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
