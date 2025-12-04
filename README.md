# P&L Viewer

Interactive Profit & Loss statement viewer for investor presentations.

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) - password is `spicypeach`

## Updating Data from QuickBooks

### 1. Export from QuickBooks

Export "Transaction Detail by Account" report:
- Date range: Jan 1 - Nov 30, 2025
- All accounts
- Export as CSV
- Save as: `public/all-txn-original.csv`

### 2. Run the Update Script

```bash
./scripts/update-data.sh
```

This applies all transformations automatically.

## Data Transformations

The following adjustments are applied to the raw QuickBooks export:

### 1. Reclassifications (`apply-adjustments.ts`)

Moves misclassified transactions to correct accounts:

| From | To | Criteria | Reason |
|------|-----|----------|--------|
| 6120 | 6125 | $30 payments, Yvel, Gabriella | Affiliate recruitment |
| 6495 | 6140 | eBay | Phone farm equipment |
| 6495 | 6470 | Somos Hospitality | Business lodging |
| 6375 | 6330 | Zamp | Sales tax compliance |
| 6390 | 6120 | Luisa Mariana | Affiliate payment |
| 6390 | 6375 | SPICY CUBES, Amazon test | QA testing |
| 6340 | 6470 | All | Travel meals |
| 6360 | 6240 | Deel, Craigslist | Contractor mgmt |
| 6240 | 6140 | Creator Contact | Software |
| 6240 | 6330 | Catching Numbers | Accountant |
| 6100 | 6110 | Facebook/Facebk | Paid ads |
| 6100 | 6120 | Zelle, PayPal | Affiliate payments |

Also removes: Amazon Cobra (personal health insurance)

### 2. Affiliate Date Shift (`shift-affiliate-dates.ts`)

Shifts ALL affiliate payments (6120, 6125) to the prior month.

**Rationale:** Affiliate payments are made for work done in the prior month. A payment on March 15th is for February sales, so shifting it to February provides better expense/revenue matching.

### 3. Shipping Smoothing (`smooth-shipping.ts`)

Spreads 3PL and shipping costs (6010, 6020, 6035) pro-rata by revenue across January-September.

**Rationale:** Shipping costs are often paid in lump sums but should be matched to the revenue they supported. Pro-rata allocation based on monthly revenue provides a more accurate picture.

### 4. Runtime Adjustments (in web app)

These are NOT applied to the CSV, but handled at runtime:

- **Exclusions:** 230 items (~$136k) from `public/exclusions.csv` are tagged and shown separately
- **December filter:** December transactions are hidden from the P&L display

## Exclusions

Non-recurring and owner-related expenses are tracked in `public/exclusions.csv`:

| Category | Description |
|----------|-------------|
| Personal | Owner personal expenses |
| Discretionary | Owner discretionary spending |
| Owner Travel/Education/Tools | Owner-specific costs |
| Legal | One-time legal expenses |
| M&A Process | Sale/brokerage costs |
| One-Time COGS | Lab testing, rush fees |
| One-Time Project | Video production, AI project |
| Terminated Agency/Contractor | Discontinued services |

Format: `Date,Vendor,Memo,Account,Account Code,Amount,Category,Justification`

The web app auto-matches exclusions to transactions by date, amount, and account code.

## Project Structure

```
public/
  all-txn-original.csv    # Raw QuickBooks export
  all-txn.csv             # Transformed data (used by app)
  exclusions.csv          # Exclusions with justifications

scripts/
  update-data.sh          # Main update script
  apply-adjustments.ts    # Reclassifications & removals
  shift-affiliate-dates.ts # Affiliate date shifting
  smooth-shipping.ts      # 3PL/shipping pro-rata smoothing

src/
  app/                    # Next.js app
  components/pnl/         # P&L viewer components
  context/PLContext.tsx   # State management
  lib/calculations.ts     # P&L calculations
  lib/csvParser.ts        # CSV parsing
```

## Views

- **Summary View:** Simplified aggregation (KH Brokers format)
- **Detailed View:** Full chart of accounts with drill-down

Both views support expanding rows to see individual transactions.
