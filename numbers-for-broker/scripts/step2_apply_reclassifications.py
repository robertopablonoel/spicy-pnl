#!/usr/bin/env python3
"""
Step 2: Apply Reclassifications

Moves misclassified transactions to their correct accounts based on rules.

Input: output/step1_november_revenue.csv
Output: output/step2_reclassified.csv
"""

import re
from pathlib import Path
from typing import List
from collections import defaultdict

from pnl_generator import generate_pnl

# Paths
SCRIPT_DIR = Path(__file__).parent
BASE_DIR = SCRIPT_DIR.parent
INPUT_FILE = BASE_DIR / "output" / "step1_november_revenue.csv"
OUTPUT_FILE = BASE_DIR / "output" / "step2_reclassified.csv"
PNL_FILE = BASE_DIR / "output" / "pnl_step2.csv"


# Reclassification rules: (from_account, to_account, criteria_function)
RECLASSIFICATIONS = [
    # 6120 -> 6125: $30 payments, Yvel, Gabriella (affiliate recruitment)
    ("6120", "6125", lambda line: "$30" in line or "30.00" in line or "Yvel" in line or "Gabriella" in line),

    # 6495 -> 6140: eBay (phone farm equipment)
    ("6495", "6140", lambda line: "eBay" in line.lower() or "ebay" in line),

    # 6495 -> 6470: Somos Hospitality (business lodging)
    ("6495", "6470", lambda line: "Somos Hospitality" in line),

    # 6375 -> 6330: Zamp (sales tax compliance)
    ("6375", "6330", lambda line: "Zamp" in line or "ZAMP" in line),

    # 6390 -> 6120: Luisa Mariana (affiliate payment)
    ("6390", "6120", lambda line: "Luisa Mariana" in line),

    # 6390 -> 6375: SPICY CUBES, Amazon test (QA testing)
    ("6390", "6375", lambda line: "SPICY CUBES" in line or "Amazon test" in line.lower()),

    # 6340 -> 6470: All meals -> travel
    ("6340", "6470", lambda line: True),  # All 6340 transactions

    # 6360 -> 6240: Deel, Craigslist (contractor mgmt)
    ("6360", "6240", lambda line: "Deel" in line or "Craigslist" in line or "CRAIGSLIST" in line),

    # 6240 -> 6140: Creator Contact (software)
    ("6240", "6140", lambda line: "Creator Contact" in line),

    # 6240 -> 6330: Catching Numbers (accountant)
    ("6240", "6330", lambda line: "Catching Numbers" in line),

    # 6100 -> 6110: Facebook/Facebk (paid ads)
    ("6100", "6110", lambda line: "Facebook" in line or "Facebk" in line or "FACEBK" in line),

    # 6100 -> 6120: Zelle, PayPal (affiliate payments)
    ("6100", "6120", lambda line: "Zelle" in line or "PayPal" in line or "PAYPAL" in line),
]


# Common account names for replacement
ACCOUNT_NAMES = {
    "6100": "6100 Advertising & Marketing",
    "6110": "6100 Advertising & Marketing:6110 Paid Advertising",
    "6120": "6100 Advertising & Marketing:6120 Affiliate Marketing Expense",
    "6125": "6100 Advertising & Marketing:6125 Affiliate Recruitment",
    "6140": "6100 Advertising & Marketing:6140 Advertising Software & Apps",
    "6240": "6240 Contractors",
    "6330": "6330 Accounting Prof Services",
    "6340": "6340 Meals & Entertainment",
    "6360": "6360 Other General & Admin Expense",
    "6375": "6375 Software & Apps",
    "6390": "6390 Product Development",
    "6470": "6470 Travel",
    "6495": "6495 Discretionary Spending Expense",
}


def reclassify_line(line: str, from_code: str, to_code: str) -> str:
    """Change account code in a line from from_code to to_code."""
    if from_code in ACCOUNT_NAMES and to_code in ACCOUNT_NAMES:
        line = line.replace(ACCOUNT_NAMES[from_code], ACCOUNT_NAMES[to_code])
    return line


def apply_reclassifications(lines: List[str]) -> List[str]:
    """Apply all reclassification rules to transactions."""
    new_lines = []
    current_section = ""
    reclassification_counts = defaultdict(int)

    for line in lines:
        trimmed = line.strip()

        # Track current section
        section_match = re.match(r'^(\d{4})\s+[^,]', trimmed)
        if section_match:
            current_section = section_match.group(1)
            new_lines.append(line)
            continue

        # Check if line matches any reclassification rule
        reclassified = False
        for from_code, to_code, criteria in RECLASSIFICATIONS:
            # Check if line is in the from_code section or references from_code
            in_section = current_section == from_code
            has_account_ref = f":{from_code} " in line or f":{from_code}," in line

            if (in_section or has_account_ref) and criteria(line):
                new_line = reclassify_line(line, from_code, to_code)
                new_lines.append(new_line)
                reclassification_counts[f"{from_code} -> {to_code}"] += 1
                reclassified = True
                break

        if not reclassified:
            new_lines.append(line)

    print("\nReclassifications applied:")
    for key, count in sorted(reclassification_counts.items()):
        print(f"  {key}: {count} transactions")
    print(f"\nTotal reclassified: {sum(reclassification_counts.values())}")

    return new_lines


def main():
    print("=" * 80)
    print("STEP 2: APPLY RECLASSIFICATIONS")
    print("=" * 80)
    print(f"\nInput:  {INPUT_FILE}")
    print(f"Output: {OUTPUT_FILE}")

    # Read input file
    with open(INPUT_FILE, 'r', encoding='utf-8') as f:
        content = f.read()

    lines = content.split('\n')
    print(f"\nLoaded {len(lines)} lines from input file")

    # Run transformation
    lines = apply_reclassifications(lines)

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
