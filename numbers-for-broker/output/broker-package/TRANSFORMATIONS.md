# Spicy Cubes P&L Transformations

This document explains the adjustments made to the raw QuickBooks export to produce an accurate P&L.

## Overview

The raw data (`1_raw_transactions.csv`) was exported from QuickBooks covering January 2024 through November 2025. Several transformations were applied to correct timing issues, fix misclassifications, and ensure expenses are properly matched to the revenue periods they relate to.

---

## Transformation 1: Add November 2025 Revenue

**What:** Added November 2025 Shopify sales data (revenue, discounts, refunds, shipping income, and cost of goods sold).

**Why:** The QuickBooks export was pulled before our accountant had logged November's Shopify revenue. This data was added manually from Shopify reports to complete the picture.

---

## Transformation 2: Account Reclassifications

**What:** Moved 456 transactions to their correct expense categories.

**Why:** QuickBooks auto-categorization and some manual entries placed transactions in incorrect accounts. Examples include:

- **Paid Advertising (66 transactions):** Facebook ad spend was categorized under general marketing instead of paid advertising
- **Affiliate Marketing (78 transactions):** PayPal, Zelle, UPS Store, Vintage Paper, and Printful payments for affiliate-related activities were miscategorized
- **Affiliate Recruitment (244 transactions):** $30 referral bonuses and recruitment payments were mixed with general affiliate marketing
- **Marketing Contractors:** Elena Bastyte branding work was incorrectly tagged as affiliate marketing
- **Software & Apps (12 transactions):** Railway hosting was categorized as travel expense
- **Accounting Services (15 transactions):** LedgerGurus and Zamp payments were in generic contractor or software categories
- **Travel (10 transactions):** Meals during business travel and other travel-related expenses were scattered across categories

These reclassifications don't change the total expenses—they just ensure each expense category accurately reflects actual spending.

---

## Transformation 3: Replace November & December 2025 Affiliate Payouts

**What:** Replaced affiliate payment transactions for November and December 2025 with data from our internal tracking spreadsheet.

**Why:** Our accountant hadn't yet logged the most recent affiliate payments in QuickBooks. Rather than reconcile incomplete data, we removed whatever was in QuickBooks for these months and inserted the accurate payout data we track in Google Sheets.

---

## Transformation 4: Shift Affiliate Expenses to Earning Period

**What:** Moved affiliate marketing expenses from the month they were paid to the month the affiliate actually earned the commission.

**Why:** We pay creators on the 1st of each month (sometimes a few days later) for work they did the previous month. For accurate P&L matching, affiliate expenses should appear in the month the sales occurred, not when payment was made.

**Exceptions:**
- **January 2024:** Not shifted because this was our first month of sales—there were no prior-month commissions to pay.
- **December 2024:** Not shifted because we paid creators at the end of December (rather than early January) to capture the tax deduction in 2024.

---

## Transformation 5: Smooth Shipping Costs by Revenue

**What:** Redistributed shipping expenses across months proportionally based on each month's revenue share.

**Why:** We experienced inventory stockouts during several months, which forced us to presell products. This pushed shipping invoices into later months when we finally fulfilled those orders. The raw data shows shipping costs lumped into months when invoices arrived, not when the related sales occurred.

By smoothing shipping costs based on revenue, we match shipping expenses to the months that generated the sales—providing a more accurate picture of true monthly profitability.

**Note:** Total shipping expense remains unchanged; this only affects the month-by-month allocation.

---

## Summary

| Transformation | Purpose |
|----------------|---------|
| Add November Revenue | Complete the data (accountant hadn't logged yet) |
| Reclassifications | Fix auto-categorization errors |
| Replace Nov/Dec Affiliates | Use accurate internal tracking data |
| Shift Affiliate Dates | Match expenses to earning period |
| Smooth Shipping | Match shipping costs to sales months |

These transformations produce `2_transformed_transactions.csv` and `2_transformed_pnl.csv`.
