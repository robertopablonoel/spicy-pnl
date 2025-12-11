#!/usr/bin/env python3
"""
Step 5: Smooth Shipping Costs

Spreads shipping costs (6010, 6020, 6035) pro-rata by revenue
across Dec 2024 - Sep 2025.

Input: output/step4_dates_shifted.csv
Output: output/all-txn-2024-2025-transformed.csv
"""

import re
from pathlib import Path
from typing import List
from collections import defaultdict

from pnl_generator import generate_pnl

# Paths
SCRIPT_DIR = Path(__file__).parent
BASE_DIR = SCRIPT_DIR.parent
INPUT_FILE = BASE_DIR / "output" / "step4_dates_shifted.csv"
OUTPUT_FILE = BASE_DIR / "output" / "all-txn-2024-2025-transformed.csv"
PNL_FILE = BASE_DIR / "output" / "pnl_step5.csv"


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


def smooth_shipping(lines: List[str]) -> List[str]:
    """Spread shipping costs pro-rata by revenue across Dec 2024 - Sep 2025."""

    # First pass: calculate monthly revenue and shipping totals
    monthly_revenue = defaultdict(float)
    monthly_shipping = defaultdict(float)
    # Only smooth 6010 - 6020 and 6035 stay as-is
    shipping_accounts = ["6010"]
    revenue_accounts = ["4000", "4030"]  # Sales and Shipping Income

    # Track current section
    current_section_code = ""

    for line in lines:
        trimmed = line.strip()

        # Check for section header (e.g., "4000 Sales,,,,,,,,,")
        section_match = re.match(r'^(\d{4})\s+[^,]*,,,,,,,,,', trimmed)
        if section_match:
            current_section_code = section_match.group(1)
            continue

        date_match = re.match(r'^,(\d{2})/\d{2}/(\d{4}),', line)
        if not date_match:
            continue

        month = int(date_match.group(1))
        year = int(date_match.group(2))

        # Only process Dec 2024 through Sep 2025 for smoothing
        if year == 2024 and month == 12:
            month_key = "12/2024"
        elif year == 2025 and 1 <= month <= 9:
            month_key = f"{month:02d}/2025"
        else:
            continue

        # Parse columns - amount is in column 8
        parts = parse_csv_line(line)
        if len(parts) < 9:
            continue

        amount = parse_amount(parts[8])  # Amount is in column 8 (keep sign for reversals)

        # Check if in a revenue section (4000 Sales, 4030 Shipping Income)
        if current_section_code in revenue_accounts:
            monthly_revenue[month_key] += amount

        # Check if in a shipping section (6010, 6020, 6035)
        if current_section_code in shipping_accounts:
            monthly_shipping[month_key] += amount

    # Calculate total revenue and shipping for smoothing period
    months_to_smooth = ["12/2024"] + [f"{m:02d}/2025" for m in range(1, 10)]
    total_revenue = sum(monthly_revenue[m] for m in months_to_smooth)
    total_shipping = sum(monthly_shipping[m] for m in months_to_smooth)

    if total_revenue == 0:
        print("Warning: No revenue found for smoothing period")
        return lines

    # Calculate pro-rata shipping for each month
    smoothed_shipping = {}
    for month_key in months_to_smooth:
        revenue = monthly_revenue[month_key]
        proportion = revenue / total_revenue if total_revenue > 0 else 0
        smoothed_shipping[month_key] = total_shipping * proportion

    print("\nBefore vs After Smoothing:")
    print(f"{'Month':<12} {'Revenue':>15} {'Original Ship':>15} {'Smoothed Ship':>15}")
    print("-" * 60)
    for month_key in months_to_smooth:
        rev = monthly_revenue[month_key]
        orig = monthly_shipping[month_key]
        smooth = smoothed_shipping[month_key]
        print(f"{month_key:<12} ${rev:>13,.0f} ${orig:>13,.0f} ${smooth:>13,.0f}")
    print("-" * 60)
    print(f"{'TOTAL':<12} ${total_revenue:>13,.0f} ${total_shipping:>13,.0f} ${total_shipping:>13,.0f}")

    # Second pass: remove original shipping transactions and add smoothed ones
    new_lines = []
    removed_count = 0
    added_smoothed = False
    current_section_code = ""

    for line in lines:
        trimmed = line.strip()

        # Check for section header
        section_match = re.match(r'^(\d{4})\s+[^,]*,,,,,,,,,', trimmed)
        if section_match:
            current_section_code = section_match.group(1)

            # Check for 6010 section header to add smoothed entries
            if current_section_code == "6010" and not added_smoothed:
                new_lines.append(line)

                # Add smoothed shipping entries
                for month_key in months_to_smooth:
                    amount = smoothed_shipping[month_key]
                    if amount > 0:
                        month, year = month_key.split("/")
                        # Use last day of month
                        if month == "12":
                            date_str = f"12/31/{year}"
                        elif month in ["04", "06", "09", "11"]:
                            date_str = f"{month}/30/{year}"
                        elif month == "02":
                            date_str = f"02/28/{year}"
                        else:
                            date_str = f"{month}/31/{year}"

                        entry = f',{date_str},Journal Entry,SHIPPING_SMOOTH,,Shipping,Pro-rata shipping allocation,6010 Outbound Shipping & Delivery,{amount:.2f},'
                        new_lines.append(entry)

                added_smoothed = True
                continue

            new_lines.append(line)
            continue

        # Check if this is a shipping transaction to remove
        # Either in a shipping section OR has shipping account reference
        is_in_shipping_section = current_section_code in shipping_accounts
        has_shipping_ref = any(f"{acc} " in line or f":{acc}" in line for acc in shipping_accounts)
        is_shipping = is_in_shipping_section or has_shipping_ref

        if is_shipping:
            date_match = re.match(r'^,(\d{2})/\d{2}/(\d{4}),', line)
            if date_match:
                month = int(date_match.group(1))
                year = int(date_match.group(2))

                # Remove if in smoothing period
                if (year == 2024 and month == 12) or (year == 2025 and 1 <= month <= 9):
                    removed_count += 1
                    continue

        new_lines.append(line)

    print(f"\nRemoved {removed_count} original shipping transactions")
    print(f"Added {len(months_to_smooth)} smoothed shipping entries")

    return new_lines


def main():
    print("=" * 80)
    print("STEP 5: SMOOTH SHIPPING COSTS")
    print("=" * 80)
    print(f"\nInput:  {INPUT_FILE}")
    print(f"Output: {OUTPUT_FILE}")

    # Read input file
    with open(INPUT_FILE, 'r', encoding='utf-8') as f:
        content = f.read()

    lines = content.split('\n')
    print(f"\nLoaded {len(lines)} lines from input file")

    # Run transformation
    lines = smooth_shipping(lines)

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
