#!/bin/bash

# =============================================================================
# SPICY CUBES P&L DATA UPDATE SCRIPT
# =============================================================================
#
# This script processes fresh transaction data from QuickBooks and applies
# all necessary adjustments for the P&L viewer.
#
# TRANSFORMATIONS APPLIED:
# 1. Reclassifications - Move misclassified transactions to correct accounts
# 2. Removals - Remove personal expenses (Amazon Cobra health insurance)
# 3. November Revenue - Add Shopify sales journal entries for November
# 4. Nov/Dec Affiliate Replacement - Replace with data from nov-dec-payouts.csv
# 5. Affiliate Date Shift - Move ALL affiliate payments to prior month
# 6. Shipping Smoothing - Spread 3PL/shipping costs pro-rata by revenue (Jan-Sep)
#
# PREREQUISITES:
# 1. Export "Transaction Detail by Account" report from QuickBooks
#    - Date range: Jan 1 - Nov 30, 2025
#    - All accounts
#    - Export as CSV
#
# 2. Save the export as: public/all-txn-original.csv
#
# =============================================================================

set -e  # Exit on any error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
PUBLIC_DIR="$PROJECT_DIR/public"

echo "=============================================================="
echo "SPICY CUBES P&L DATA UPDATE"
echo "=============================================================="
echo ""

# Check if source file exists
if [ ! -f "$PUBLIC_DIR/all-txn-original.csv" ]; then
    echo "ERROR: Source file not found!"
    echo "Please save your QuickBooks export as:"
    echo "  $PUBLIC_DIR/all-txn-original.csv"
    exit 1
fi

# Step 1: Copy original to working file
echo "Step 1: Copying original CSV to working file..."
cp "$PUBLIC_DIR/all-txn-original.csv" "$PUBLIC_DIR/all-txn.csv"
echo "  Done."
echo ""

# Step 2: Apply reclassifications and removals
echo "Step 2: Applying reclassifications and removals..."
npx tsx "$SCRIPT_DIR/apply-adjustments.ts"
echo ""

# Step 3: Add November Shopify revenue journal entries
echo "Step 3: Adding November Shopify revenue journal entries..."
npx tsx "$SCRIPT_DIR/add-november-revenue.ts"
echo ""

# Step 4: Replace Nov/Dec affiliate payouts with data from nov-dec-payouts.csv
echo "Step 4: Replacing Nov/Dec affiliate payouts with corrected data..."
npx tsx "$SCRIPT_DIR/replace-nov-dec-affiliates.ts"
echo ""

# Step 5: Shift affiliate payment dates to prior month
echo "Step 5: Shifting ALL affiliate payment dates to prior month..."
npx tsx "$SCRIPT_DIR/shift-affiliate-dates.ts"
echo ""

# Step 6: Smooth 3PL and shipping costs pro-rata by revenue (Jan-Sep)
echo "Step 6: Smoothing 3PL/shipping costs pro-rata by revenue (Jan-Sep)..."
npx tsx "$SCRIPT_DIR/smooth-shipping.ts"
echo ""

# Step 7: Summary
echo "=============================================================="
echo "DATA UPDATE COMPLETE"
echo "=============================================================="
echo ""
echo "Output file: $PUBLIC_DIR/all-txn.csv"
echo ""
echo "TRANSFORMATIONS APPLIED:"
echo "  1. Reclassifications (misclassified expenses moved to correct accounts)"
echo "  2. Removals (personal expenses like Amazon Cobra)"
echo "  3. November Shopify revenue journal entries added"
echo "  4. Affiliate dates shifted to prior month (expense matching)"
echo "  5. 3PL/shipping smoothed pro-rata by revenue (Jan-Sep)"
echo ""
echo "RUNTIME ADJUSTMENTS (applied by web app, not CSV):"
echo "  - Exclusions: 230 items ($136k) from exclusions.csv"
echo "  - December filtered out (not shown in P&L)"
echo ""
echo "REMAINING MANUAL STEPS:"
echo ""
echo "1. EXCLUSIONS (if any new exclusions needed):"
echo "   - Edit: $PUBLIC_DIR/exclusions.csv"
echo "   - Format: Date,Vendor,Memo,Account,Account Code,Amount,Category,Justification"
echo "   - The web app will auto-match exclusions to transactions"
echo ""
echo "2. VERIFY:"
echo "   - Run: npm run dev"
echo "   - Check totals match expected values"
echo "   - Toggle between Summary and Detailed views"
echo "   - Expand Exclusions section to verify matches"
echo ""
