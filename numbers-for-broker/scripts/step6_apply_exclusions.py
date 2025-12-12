#!/usr/bin/env python3
"""
Step 6: Apply Exclusions

Removes transactions listed in the exclusions.csv file from the P&L.
Exclusions are matched by date, vendor, memo substring, account code, and amount.

Input: output/all-txn-2024-2025-transformed.csv
Output: output/all-txn-2024-2025-final.csv
"""

import re
from pathlib import Path
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass

from pnl_generator import generate_pnl

# Paths
SCRIPT_DIR = Path(__file__).parent
BASE_DIR = SCRIPT_DIR.parent
INPUT_FILE = BASE_DIR / "output" / "all-txn-2024-2025-transformed.csv"
EXCLUSIONS_FILE = BASE_DIR / "reference-data" / "exclusions.csv"
OUTPUT_FILE = BASE_DIR / "output" / "all-txn-2024-2025-final.csv"
PNL_FILE = BASE_DIR / "output" / "pnl_step6.csv"


@dataclass
class Exclusion:
    date: str  # MM/DD/YYYY
    vendor: str
    memo: str
    account: str
    account_code: str
    amount: float
    category: str
    justification: str
    matched: bool = False


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


def normalize_date(date_str: str) -> str:
    """Normalize date to MM/DD/YYYY format."""
    # Handle both M/D/YYYY and MM/DD/YYYY
    match = re.match(r'^(\d{1,2})/(\d{1,2})/(\d{4})$', date_str.strip())
    if match:
        month = int(match.group(1))
        day = int(match.group(2))
        year = match.group(3)
        return f"{month:02d}/{day:02d}/{year}"
    return date_str.strip()


def load_exclusions(filepath: Path) -> List[Exclusion]:
    """Load exclusions from CSV file."""
    exclusions = []

    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.read().split('\n')

    # Skip header
    for line in lines[1:]:
        if not line.strip():
            continue

        parts = parse_csv_line(line)
        if len(parts) < 7:
            continue

        date = normalize_date(parts[0])
        vendor = parts[1].strip()
        memo = parts[2].strip()
        account = parts[3].strip()
        account_code = parts[4].strip()
        amount = parse_amount(parts[5])
        category = parts[6].strip() if len(parts) > 6 else ""
        justification = parts[7].strip() if len(parts) > 7 else ""

        exclusions.append(Exclusion(
            date=date,
            vendor=vendor,
            memo=memo,
            account=account,
            account_code=account_code,
            amount=amount,
            category=category,
            justification=justification
        ))

    return exclusions


def normalize_string(s: str) -> str:
    """Normalize string for comparison - lowercase, remove extra spaces."""
    return ' '.join(s.lower().split())


def memo_matches(txn_memo: str, excl_memo: str) -> bool:
    """Check if transaction memo matches exclusion memo.

    The exclusion memo may be a substring or simplified version of the transaction memo.
    """
    if not excl_memo:
        return True  # Empty exclusion memo matches anything

    txn_norm = normalize_string(txn_memo)
    excl_norm = normalize_string(excl_memo)

    # Direct substring match
    if excl_norm in txn_norm:
        return True

    # Try matching key parts (first 20 chars normalized)
    if len(excl_norm) >= 10:
        excl_prefix = excl_norm[:20]
        if excl_prefix in txn_norm:
            return True

    return False


def vendor_matches(txn_vendor: str, excl_vendor: str) -> bool:
    """Check if transaction vendor matches exclusion vendor."""
    if not excl_vendor:
        return True  # Empty exclusion vendor matches anything

    txn_norm = normalize_string(txn_vendor)
    excl_norm = normalize_string(excl_vendor)

    # Exact match
    if txn_norm == excl_norm:
        return True

    # Substring match (either direction)
    if excl_norm in txn_norm or txn_norm in excl_norm:
        return True

    return False


def amount_matches(txn_amount: float, excl_amount: float) -> bool:
    """Check if transaction amount matches exclusion amount.

    Exclusion amounts are typically positive, but transaction amounts
    can be negative (expenses) or positive (in expense sections, debits are positive).
    """
    # Match absolute values with small tolerance for rounding
    return abs(abs(txn_amount) - abs(excl_amount)) < 0.02


def find_matching_exclusion(
    date: str,
    vendor: str,
    memo: str,
    amount: float,
    section_code: str,
    exclusions: List[Exclusion]
) -> Optional[Exclusion]:
    """Find an exclusion that matches the transaction.

    First tries exact account code match, then tries matching without account code
    for cases where the exclusion file has the wrong account categorization.
    """

    # First pass: try exact account code match
    for excl in exclusions:
        if excl.matched:
            continue

        if excl.account_code != section_code:
            continue

        if excl.date != date:
            continue

        if not amount_matches(amount, excl.amount):
            continue

        if not vendor_matches(vendor, excl.vendor):
            continue

        if not memo_matches(memo, excl.memo):
            continue

        return excl

    # Second pass: try without account code match (for misclassified exclusions)
    # Only match if we're in a P&L expense section (6xxx)
    if section_code.startswith("6"):
        for excl in exclusions:
            if excl.matched:
                continue

            # Skip if exclusion's account code doesn't start with 6 (expense accounts)
            if not excl.account_code.startswith("6"):
                continue

            if excl.date != date:
                continue

            if not amount_matches(amount, excl.amount):
                continue

            if not vendor_matches(vendor, excl.vendor):
                continue

            if not memo_matches(memo, excl.memo):
                continue

            return excl

    return None


def apply_exclusions(lines: List[str], exclusions: List[Exclusion]) -> Tuple[List[str], Dict[str, float]]:
    """Remove excluded transactions from the transaction list."""

    new_lines = []
    current_section_code = ""
    removed_count = 0
    removed_by_category: Dict[str, float] = {}

    for line in lines:
        trimmed = line.strip()

        # Check for section header (e.g., "6140 Advertising Software & Apps,,,,,,,,,")
        section_match = re.match(r'^(\d{4})\s+[^,]*,,,,,,,,,', trimmed)
        if section_match:
            current_section_code = section_match.group(1)
            new_lines.append(line)
            continue

        # Check for Total line
        if line.startswith("Total for "):
            new_lines.append(line)
            continue

        # Only process transaction lines in P&L sections (4xxx-8xxx)
        if not current_section_code or not current_section_code[0] in "45678":
            new_lines.append(line)
            continue

        # Parse transaction line
        if not line.startswith(","):
            new_lines.append(line)
            continue

        parts = parse_csv_line(line)
        if len(parts) < 9:
            new_lines.append(line)
            continue

        date_str = parts[1].strip()
        date_match = re.match(r'^(\d{2})/(\d{2})/(\d{4})$', date_str)
        if not date_match:
            new_lines.append(line)
            continue

        date = normalize_date(date_str)
        vendor = parts[4].strip()  # Name column
        memo = parts[6].strip()    # Memo/Description column
        amount = parse_amount(parts[8])

        # Check if this transaction should be excluded
        matching_excl = find_matching_exclusion(
            date, vendor, memo, amount, current_section_code, exclusions
        )

        if matching_excl:
            matching_excl.matched = True
            removed_count += 1

            # Track by category
            category = matching_excl.category
            if category not in removed_by_category:
                removed_by_category[category] = 0.0
            removed_by_category[category] += abs(amount)

            # Skip this line (don't add to new_lines)
            continue

        new_lines.append(line)

    print(f"\nRemoved {removed_count} transactions")

    # Report unmatched exclusions
    unmatched = [e for e in exclusions if not e.matched]
    if unmatched:
        print(f"\nWARNING: {len(unmatched)} exclusions could not be matched:")
        for e in unmatched[:10]:  # Show first 10
            print(f"  - {e.date} | {e.vendor} | ${e.amount:.2f} | {e.account_code}")
        if len(unmatched) > 10:
            print(f"  ... and {len(unmatched) - 10} more")

    return new_lines, removed_by_category


def main():
    print("=" * 80)
    print("STEP 6: APPLY EXCLUSIONS")
    print("=" * 80)
    print(f"\nInput:      {INPUT_FILE}")
    print(f"Exclusions: {EXCLUSIONS_FILE}")
    print(f"Output:     {OUTPUT_FILE}")

    # Load exclusions
    exclusions = load_exclusions(EXCLUSIONS_FILE)
    print(f"\nLoaded {len(exclusions)} exclusions")

    # Summarize exclusions by category
    by_category: Dict[str, Tuple[int, float]] = {}
    for e in exclusions:
        if e.category not in by_category:
            by_category[e.category] = (0, 0.0)
        count, total = by_category[e.category]
        by_category[e.category] = (count + 1, total + e.amount)

    print("\nExclusions by category:")
    for cat, (count, total) in sorted(by_category.items()):
        print(f"  {cat}: {count} items, ${total:,.2f}")

    # Read input file
    with open(INPUT_FILE, 'r', encoding='utf-8') as f:
        content = f.read()

    lines = content.split('\n')
    print(f"\nLoaded {len(lines)} lines from input file")

    # Apply exclusions
    new_lines, removed_by_category = apply_exclusions(lines, exclusions)

    # Report what was removed
    if removed_by_category:
        print("\nRemoved amounts by category:")
        total_removed = 0.0
        for cat, amount in sorted(removed_by_category.items()):
            print(f"  {cat}: ${amount:,.2f}")
            total_removed += amount
        print(f"  TOTAL: ${total_removed:,.2f}")

    # Write output
    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        f.write('\n'.join(new_lines))

    print(f"\nOutput written to: {OUTPUT_FILE}")
    print(f"Total lines: {len(new_lines)}")

    # Generate P&L
    generate_pnl(OUTPUT_FILE, PNL_FILE)

    print(f"\n{'=' * 80}")


if __name__ == "__main__":
    main()
