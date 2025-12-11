#!/usr/bin/env python3
"""
P&L Generator Module

Shared module for generating P&L reports from transaction data.
Used by all pipeline steps to generate intermediate P&L reports.
"""

import re
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass


@dataclass
class AccountConfig:
    display_name: str
    category: str
    order: int
    subcategory: Optional[str] = None


# Define all P&L accounts
PNL_ACCOUNTS: Dict[str, AccountConfig] = {
    # Income (4xxx)
    "4000": AccountConfig("4000 Sales", "Income", 1),
    "4010": AccountConfig("4010 Discounts", "Income", 2),
    "4020": AccountConfig("4020 Refunds", "Income", 3),
    "4030": AccountConfig("4030 Shipping Income", "Income", 4),
    "4040": AccountConfig("4040 Chargebacks", "Income", 5),

    # Cost of Goods Sold (5xxx)
    "5000": AccountConfig("5000 Cost of Goods Sold", "Cost of Goods Sold", 10),
    "5010": AccountConfig("5010 Inbound Freight & Shipping", "Cost of Goods Sold", 11),
    "5030": AccountConfig("5030 Inventory Adjustment", "Cost of Goods Sold", 12),
    "5040": AccountConfig("5040 Inventory Shrinkage", "Cost of Goods Sold", 13),
    "5050": AccountConfig("5050 COGS - Other", "Cost of Goods Sold", 14),

    # Expenses - Cost of Sales (6000-6099)
    "6010": AccountConfig("6010 Outbound Shipping & Delivery", "Expenses", 20, "6000 Cost of Sales"),
    "6020": AccountConfig("6020 3PL Expense", "Expenses", 21, "6000 Cost of Sales"),
    "6035": AccountConfig("6035 Packaging Supplies", "Expenses", 22, "6000 Cost of Sales"),
    "6040": AccountConfig("6040 Storage", "Expenses", 23, "6000 Cost of Sales"),
    "6055": AccountConfig("6055 Amazon Seller Fees", "Expenses", 24, "6000 Cost of Sales"),
    "6057": AccountConfig("6057 Amazon Shipping Fees", "Expenses", 25, "6000 Cost of Sales"),
    "6065": AccountConfig("6065 Shopify Merchant Fees", "Expenses", 26, "6000 Cost of Sales"),
    "6070": AccountConfig("6070 Shopify Selling Apps", "Expenses", 27, "6000 Cost of Sales"),
    "6075": AccountConfig("6075 Other Merchant Processing Fees", "Expenses", 28, "6000 Cost of Sales"),

    # Expenses - Advertising & Marketing (6100-6199)
    "6100": AccountConfig("6100 Advertising & Marketing", "Expenses", 30, "6100 Advertising & Marketing"),
    "6110": AccountConfig("6110 Paid Advertising", "Expenses", 31, "6100 Advertising & Marketing"),
    "6120": AccountConfig("6120 Affiliate Marketing Expense", "Expenses", 32, "6100 Advertising & Marketing"),
    "6125": AccountConfig("6125 Affiliate Recruitment", "Expenses", 33, "6100 Advertising & Marketing"),
    "6130": AccountConfig("6130 Marketing Contractors and Agencies", "Expenses", 34, "6100 Advertising & Marketing"),
    "6140": AccountConfig("6140 Advertising Software & Apps", "Expenses", 35, "6100 Advertising & Marketing"),
    "6145": AccountConfig("6145 Creatives", "Expenses", 36, "6100 Advertising & Marketing"),
    "6150": AccountConfig("6150 Other Adv & Marketing Expense", "Expenses", 37, "6100 Advertising & Marketing"),

    # Expenses - Other (6200+)
    "6210": AccountConfig("6210 Bank Charges & Fees", "Expenses", 40),
    "6240": AccountConfig("6240 Contractors", "Expenses", 41),
    "6250": AccountConfig("6250 Dues & Subscriptions", "Expenses", 42),
    "6260": AccountConfig("6260 Education & Training", "Expenses", 43),
    "6290": AccountConfig("6290 Insurance", "Expenses", 44),
    "6300": AccountConfig("6300 Legal & Professional Services", "Expenses", 45),
    "6320": AccountConfig("6320 Professional Expenses", "Expenses", 46),
    "6330": AccountConfig("6330 Accounting Prof Services", "Expenses", 47),
    "6340": AccountConfig("6340 Meals & Entertainment", "Expenses", 48),
    "6360": AccountConfig("6360 Other General & Admin Expense", "Expenses", 49),
    "6375": AccountConfig("6375 Software & Apps", "Expenses", 50),
    "6390": AccountConfig("6390 Product Development", "Expenses", 51),
    "6410": AccountConfig("6410 Rent & Lease", "Expenses", 52),
    "6450": AccountConfig("6450 Taxes & Licenses", "Expenses", 53),
    "6470": AccountConfig("6470 Travel", "Expenses", 54),
    "6495": AccountConfig("6495 Discretionary Spending Expense", "Expenses", 55),

    # Other Income (7xxx)
    "7000": AccountConfig("7000 Interest Income", "Other Income", 60),
    "7010": AccountConfig("7010 Other Miscellaneous Income", "Other Income", 61),

    # Other Expenses (8xxx)
    "8005": AccountConfig("8005 Depreciation", "Other Expenses", 70),
}

MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
]


def get_month_columns() -> List[str]:
    """Generate month column headers for 2024 and 2025."""
    cols = []
    for m in range(12):
        cols.append(f"{MONTHS[m]} 2024")
    for m in range(11):
        cols.append(f"{MONTHS[m]} 2025")
    return cols


def parse_csv_line(line: str) -> List[str]:
    """Parse a CSV line handling quoted fields."""
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


def parse_date(date_str: str) -> Optional[Tuple[int, int]]:
    """Parse MM/DD/YYYY date string, return (year, month) or None."""
    match = re.match(r'^(\d{2})/(\d{2})/(\d{4})$', date_str)
    if not match:
        return None
    month = int(match.group(1)) - 1
    year = int(match.group(3))
    return (year, month)


def get_month_index(year: int, month: int) -> Optional[int]:
    """Get month column index (0-22) for Jan 2024 - Nov 2025."""
    if year == 2024:
        return month
    if year == 2025 and month <= 10:
        return 12 + month
    return None


def parse_amount(amount_str: str) -> float:
    """Parse amount string to float."""
    if not amount_str or amount_str.strip() == "":
        return 0.0
    cleaned = re.sub(r'["$,]', '', amount_str).strip()
    try:
        return float(cleaned)
    except ValueError:
        return 0.0


def format_number(num: float) -> str:
    """Format number for display."""
    if num == 0:
        return ""
    is_negative = num < 0
    abs_num = abs(num)
    formatted = f"{abs_num:,.2f}"
    return f"-{formatted}" if is_negative else formatted


def format_for_csv(num: float) -> str:
    """Format number for CSV output."""
    formatted = format_number(num)
    if formatted == "":
        return ""
    if "," in formatted:
        return f'"{formatted}"'
    return formatted


def generate_pnl(input_file: Path, output_file: Path, silent: bool = False) -> Dict[str, float]:
    """
    Generate P&L report from transaction data.

    Returns dict with summary totals.
    """
    with open(input_file, 'r', encoding='utf-8') as f:
        content = f.read()
    lines = content.split('\n')

    month_cols = get_month_columns()
    num_months = len(month_cols)

    # Data: account_code -> list of monthly amounts
    data: Dict[str, List[float]] = {}
    for code in PNL_ACCOUNTS:
        data[code] = [0.0] * num_months

    # Parse transactions
    current_account_code: Optional[str] = None

    for line in lines:
        section_match = re.match(r'^(\d{4})\s+[^,]', line)
        if section_match:
            code = section_match.group(1)
            current_account_code = code if code in PNL_ACCOUNTS else None
            continue

        if line.startswith("Total for "):
            current_account_code = None
            continue

        if current_account_code and line.startswith(","):
            fields = parse_csv_line(line)
            if len(fields) < 9:
                continue

            date_str = fields[1]
            amount_str = fields[8]

            if not date_str or not amount_str:
                continue

            date_parts = parse_date(date_str)
            if not date_parts:
                continue

            year, month = date_parts
            month_idx = get_month_index(year, month)
            if month_idx is None:
                continue

            amount = parse_amount(amount_str)
            data[current_account_code][month_idx] += amount

    # Generate output
    output: List[str] = []
    empty_cols = "," * (num_months + 1)

    output.append(f"Profit and Loss by Month{empty_cols}")
    output.append(f"And Company (Spicy Cubes){empty_cols}")
    output.append(f'"January 1, 2024-November 30, 2025"{empty_cols}')
    output.append("")
    output.append(f"Distribution account,{','.join(month_cols)},Total")

    def output_account_row(code: str) -> List[float]:
        config = PNL_ACCOUNTS[code]
        row_data = data[code]
        row_total = sum(row_data)
        if row_total != 0 or any(v != 0 for v in row_data):
            formatted = [format_for_csv(v) for v in row_data]
            output.append(f"{config.display_name},{','.join(formatted)},{format_for_csv(row_total)}")
        return row_data

    def output_total(label: str, totals: List[float], is_dollar: bool = True):
        total_sum = sum(totals)
        formatted = [format_for_csv(v) for v in totals]
        if is_dollar:
            if total_sum < 0:
                formatted_sum = f'"-${format_number(abs(total_sum))}"'
            else:
                formatted_sum = f'"${format_number(total_sum)}"'
        else:
            formatted_sum = format_for_csv(total_sum)
        output.append(f"{label},{','.join(formatted)},{formatted_sum}")

    def add_arrays(a: List[float], b: List[float]) -> List[float]:
        return [x + y for x, y in zip(a, b)]

    def subtract_arrays(a: List[float], b: List[float]) -> List[float]:
        return [x - y for x, y in zip(a, b)]

    # Income
    output.append(f"Income{empty_cols}")
    income_accounts = ["4000", "4010", "4020", "4030", "4040"]
    income_total = [0.0] * num_months
    for code in income_accounts:
        income_total = add_arrays(income_total, output_account_row(code))
    output_total("Total for Income", income_total)

    # COGS
    output.append(f"Cost of Goods Sold{empty_cols}")
    cogs_accounts = ["5000", "5010", "5030", "5040", "5050"]
    cogs_total = [0.0] * num_months
    for code in cogs_accounts:
        cogs_total = add_arrays(cogs_total, output_account_row(code))
    output_total("Total for Cost of Goods Sold", cogs_total)

    # Gross Profit
    gross_profit = subtract_arrays(income_total, cogs_total)
    output_total("Gross Profit", gross_profit)

    # Expenses
    output.append(f"Expenses{empty_cols}")
    output.append(f"6000 Cost of Sales{empty_cols}")

    cost_of_sales_accounts = ["6010", "6020", "6035", "6040", "6055", "6057", "6065", "6070", "6075"]
    cost_of_sales_total = [0.0] * num_months
    for code in cost_of_sales_accounts:
        cost_of_sales_total = add_arrays(cost_of_sales_total, output_account_row(code))
    output_total("Total for 6000 Cost of Sales", cost_of_sales_total)

    advertising_accounts = ["6100", "6110", "6120", "6125", "6130", "6140", "6145", "6150"]
    advertising_total = [0.0] * num_months
    for code in advertising_accounts:
        advertising_total = add_arrays(advertising_total, output_account_row(code))
    output_total("Total for 6100 Advertising & Marketing", advertising_total)

    other_expense_accounts = [
        "6210", "6240", "6250", "6260", "6290", "6300", "6320", "6330",
        "6340", "6360", "6375", "6390", "6410", "6450", "6470", "6495"
    ]
    other_expense_total = [0.0] * num_months
    for code in other_expense_accounts:
        other_expense_total = add_arrays(other_expense_total, output_account_row(code))

    expenses_total = add_arrays(add_arrays(cost_of_sales_total, advertising_total), other_expense_total)
    output_total("Total for Expenses", expenses_total)

    # Net Operating Income
    net_operating_income = subtract_arrays(gross_profit, expenses_total)
    output_total("Net Operating Income", net_operating_income)

    # Other Income
    output.append(f"Other Income{empty_cols}")
    other_income_accounts = ["7000", "7010"]
    other_income_total = [0.0] * num_months
    for code in other_income_accounts:
        other_income_total = add_arrays(other_income_total, output_account_row(code))
    output_total("Total for Other Income", other_income_total)

    # Other Expenses
    output.append(f"Other Expenses{empty_cols}")
    other_expenses_accounts = ["8005"]
    other_expenses_total = [0.0] * num_months
    for code in other_expenses_accounts:
        other_expenses_total = add_arrays(other_expenses_total, output_account_row(code))
    output_total("Total for Other Expenses", other_expenses_total)

    # Net Other Income
    net_other_income = subtract_arrays(other_income_total, other_expenses_total)
    output_total("Net Other Income", net_other_income)

    # Net Income
    net_income = add_arrays(net_operating_income, net_other_income)
    output_total("Net Income", net_income)

    # Footer
    output.append("")
    output.append("")
    now = datetime.now()
    timestamp = now.strftime("%A, %B %d, %Y %I:%M %p")
    output.append(f'"Accrual Basis {timestamp}"{empty_cols}')
    output.append("")

    # Write output
    output_file.parent.mkdir(parents=True, exist_ok=True)
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write('\n'.join(output))

    summary = {
        "income": sum(income_total),
        "cogs": sum(cogs_total),
        "gross_profit": sum(gross_profit),
        "expenses": sum(expenses_total),
        "net_income": sum(net_income),
    }

    if not silent:
        print(f"\n  P&L generated: {output_file.name}")
        print(f"    Net Income: ${summary['net_income']:,.2f}")

    return summary
