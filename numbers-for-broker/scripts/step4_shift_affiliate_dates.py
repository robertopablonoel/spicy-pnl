#!/usr/bin/env python3
"""
Step 4: Shift Affiliate Dates

Shifts affiliate payment dates to the prior month to match expenses
with the revenue they generated.

Exceptions (not shifted):
- January 2024 transactions
- December 2024 transactions after the 15th

Input: output/step3_affiliates_replaced.csv
Output: output/step4_dates_shifted.csv
"""

import re
from pathlib import Path
from typing import List, Optional
from datetime import datetime

from pnl_generator import generate_pnl

# Paths
SCRIPT_DIR = Path(__file__).parent
BASE_DIR = SCRIPT_DIR.parent
INPUT_FILE = BASE_DIR / "output" / "step3_affiliates_replaced.csv"
OUTPUT_FILE = BASE_DIR / "output" / "step4_dates_shifted.csv"
PNL_FILE = BASE_DIR / "output" / "pnl_step4.csv"


def parse_date(date_str: str) -> Optional[datetime]:
    """Parse MM/DD/YYYY date string."""
    if not date_str:
        return None
    try:
        return datetime.strptime(date_str.strip(), "%m/%d/%Y")
    except ValueError:
        return None


def format_date(dt: datetime) -> str:
    """Format datetime to MM/DD/YYYY."""
    return dt.strftime("%m/%d/%Y")


def shift_date_back_one_month(dt: datetime) -> datetime:
    """Shift a date back by one month."""
    if dt.month == 1:
        return dt.replace(year=dt.year - 1, month=12)
    else:
        # Handle end-of-month edge cases
        new_month = dt.month - 1
        try:
            return dt.replace(month=new_month)
        except ValueError:
            # Day doesn't exist in previous month, use last day
            if new_month in (4, 6, 9, 11):
                return dt.replace(month=new_month, day=30)
            elif new_month == 2:
                if dt.year % 4 == 0 and (dt.year % 100 != 0 or dt.year % 400 == 0):
                    return dt.replace(month=new_month, day=29)
                else:
                    return dt.replace(month=new_month, day=28)
            else:
                return dt.replace(month=new_month, day=31)


def shift_affiliate_dates(lines: List[str]) -> List[str]:
    """Shift affiliate payment dates to prior month with exceptions."""
    print("\nExceptions (not shifted):")
    print("  - January 2024 transactions")
    print("  - December 2024 transactions after the 15th")

    new_lines = []
    shifted_count = 0
    skipped_jan_2024 = 0
    skipped_dec_2024_late = 0
    current_section_code = ""

    for line in lines:
        trimmed = line.strip()

        # Check for section header
        section_match = re.match(r'^(\d{4})\s+[^,]*,,,,,,,,,', trimmed)
        if section_match:
            current_section_code = section_match.group(1)
            new_lines.append(line)
            continue

        # Check if this is an affiliate transaction
        # Either in 6120/6125 section OR has affiliate account reference in line
        is_in_affiliate_section = current_section_code in ("6120", "6125")
        has_affiliate_ref = "6120 Affiliate" in line or "6125 Affiliate" in line
        is_affiliate = is_in_affiliate_section or has_affiliate_ref

        if not is_affiliate:
            new_lines.append(line)
            continue

        # Parse date
        date_match = re.match(r'^,(\d{2}/\d{2}/\d{4}),', line)
        if not date_match:
            new_lines.append(line)
            continue

        date_str = date_match.group(1)
        dt = parse_date(date_str)

        if not dt:
            new_lines.append(line)
            continue

        # Check exceptions
        # Exception 1: January 2024 - don't shift
        if dt.year == 2024 and dt.month == 1:
            new_lines.append(line)
            skipped_jan_2024 += 1
            continue

        # Exception 2: December 2024 after the 15th - don't shift
        if dt.year == 2024 and dt.month == 12 and dt.day > 15:
            new_lines.append(line)
            skipped_dec_2024_late += 1
            continue

        # Shift the date back one month
        new_dt = shift_date_back_one_month(dt)
        new_date_str = format_date(new_dt)

        # Replace the date in the line
        new_line = line.replace(f",{date_str},", f",{new_date_str},", 1)
        new_lines.append(new_line)
        shifted_count += 1

    print(f"\nShifted {shifted_count} affiliate transactions to prior month")
    print(f"Skipped {skipped_jan_2024} January 2024 transactions")
    print(f"Skipped {skipped_dec_2024_late} December 2024 (after 15th) transactions")

    return new_lines


def main():
    print("=" * 80)
    print("STEP 4: SHIFT AFFILIATE DATES")
    print("=" * 80)
    print(f"\nInput:  {INPUT_FILE}")
    print(f"Output: {OUTPUT_FILE}")

    # Read input file
    with open(INPUT_FILE, 'r', encoding='utf-8') as f:
        content = f.read()

    lines = content.split('\n')
    print(f"\nLoaded {len(lines)} lines from input file")

    # Run transformation
    lines = shift_affiliate_dates(lines)

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
