#!/usr/bin/env python3
"""
Step 2: Apply Reclassifications

Moves misclassified transactions to their correct accounts based on rules.
This script actually moves transactions between sections in the CSV.

Input: output/step1_november_revenue.csv
Output: output/step2_reclassified.csv
"""

import re
from pathlib import Path
from typing import List, Dict, Tuple
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

    # 6120 -> 6130: Elena Bastyte (branding work, not affiliate)
    ("6120", "6130", lambda line: "Elena Bastyte" in line),

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

    # 6145 -> 6140: CREATORHUNTER.IO, MAKEUGC.AI (software, not creatives)
    ("6145", "6140", lambda line: "CREATORHUNTER" in line or "MAKEUGC" in line),
]


# Section headers for each account
SECTION_HEADERS = {
    "6100": "6100 Advertising & Marketing",
    "6110": "6110 Paid Advertising",
    "6120": "6120 Affiliate Marketing Expense",
    "6125": "6125 Affiliate Recruitment",
    "6130": "6130 Marketing Contractors and Agencies",
    "6140": "6140 Advertising Software & Apps",
    "6145": "6145 Creatives",
    "6240": "6240 Contractors",
    "6330": "6330 Accounting Prof Services",
    "6340": "6340 Meals & Entertainment",
    "6360": "6360 Other General & Admin Expense",
    "6375": "6375 Software & Apps",
    "6390": "6390 Product Development",
    "6470": "6470 Travel",
    "6495": "6495 Discretionary Spending Expense",
}


def parse_sections(lines: List[str]) -> Tuple[List[str], Dict[str, List[str]], List[str]]:
    """
    Parse file into header, sections dict, and footer.
    Returns: (header_lines, sections_dict, footer_lines)
    """
    header_lines = []
    sections: Dict[str, List[str]] = defaultdict(list)
    footer_lines = []

    current_section = None
    in_header = True

    for line in lines:
        trimmed = line.strip()

        # Check for section header (starts with 4-digit code)
        section_match = re.match(r'^(\d{4})\s+[^,]', trimmed)
        if section_match:
            in_header = False
            current_section = section_match.group(1)
            sections[current_section].append(line)
            continue

        # Check for total line (ends section)
        if trimmed.startswith("Total for "):
            if current_section:
                sections[current_section].append(line)
            current_section = None
            continue

        # Check for footer (after all sections)
        if not in_header and current_section is None and trimmed and not trimmed.startswith(","):
            # This could be a non-section line like a report footer
            footer_lines.append(line)
            continue

        if in_header:
            header_lines.append(line)
        elif current_section:
            sections[current_section].append(line)
        else:
            # Between sections or end of file
            footer_lines.append(line)

    return header_lines, dict(sections), footer_lines


def apply_reclassifications(sections: Dict[str, List[str]]) -> Dict[str, List[str]]:
    """
    Apply reclassification rules by moving transactions between sections.
    """
    reclassification_counts = defaultdict(int)
    transactions_to_move: List[Tuple[str, str, str]] = []  # (from_section, to_section, line)

    # First pass: identify transactions to move
    for section_code, section_lines in sections.items():
        new_section_lines = []

        for line in section_lines:
            # Keep section headers and totals
            if not line.strip().startswith(","):
                new_section_lines.append(line)
                continue

            # Check if this transaction should be reclassified
            moved = False
            for from_code, to_code, criteria in RECLASSIFICATIONS:
                if section_code == from_code and criteria(line):
                    transactions_to_move.append((from_code, to_code, line))
                    reclassification_counts[f"{from_code} -> {to_code}"] += 1
                    moved = True
                    break

            if not moved:
                new_section_lines.append(line)

        sections[section_code] = new_section_lines

    # Second pass: add transactions to their new sections
    for from_code, to_code, line in transactions_to_move:
        if to_code not in sections:
            # Create new section
            header = SECTION_HEADERS.get(to_code, f"{to_code} Unknown")
            sections[to_code] = [f"{header},,,,,,,,,"]

        # Find insertion point (before Total line if exists)
        section_lines = sections[to_code]
        insert_idx = len(section_lines)
        for i, l in enumerate(section_lines):
            if l.strip().startswith("Total for "):
                insert_idx = i
                break

        section_lines.insert(insert_idx, line)

    print("\nReclassifications applied:")
    for key, count in sorted(reclassification_counts.items()):
        print(f"  {key}: {count} transactions")
    print(f"\nTotal reclassified: {sum(reclassification_counts.values())}")

    return sections


def rebuild_file(header_lines: List[str], sections: Dict[str, List[str]], footer_lines: List[str]) -> List[str]:
    """
    Rebuild the file from header, sections, and footer.
    Sections are output in account code order.
    """
    output_lines = header_lines.copy()

    # Sort sections by account code
    for code in sorted(sections.keys()):
        section_lines = sections[code]

        # Ensure section has a header
        has_header = any(not l.strip().startswith(",") and not l.strip().startswith("Total")
                        for l in section_lines)
        if not has_header and code in SECTION_HEADERS:
            section_lines.insert(0, f"{SECTION_HEADERS[code]},,,,,,,,,")

        output_lines.extend(section_lines)

    output_lines.extend(footer_lines)

    return output_lines


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

    # Parse into sections
    header_lines, sections, footer_lines = parse_sections(lines)
    print(f"Found {len(sections)} sections")

    # Apply reclassifications
    sections = apply_reclassifications(sections)

    # Rebuild file
    output_lines = rebuild_file(header_lines, sections, footer_lines)

    # Write output
    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        f.write('\n'.join(output_lines))

    print(f"\nOutput written to: {OUTPUT_FILE}")
    print(f"Total lines: {len(output_lines)}")

    # Generate P&L
    generate_pnl(OUTPUT_FILE, PNL_FILE)

    print(f"\n{'=' * 80}")


if __name__ == "__main__":
    main()
