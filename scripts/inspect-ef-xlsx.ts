import ExcelJS from 'exceljs';

async function main() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile('/Users/robertonoel/Desktop/repos/spicy-pnl/public/pnl-clean.xlsx');

  console.log('All sheets:', workbook.worksheets.map(s => s.name));

  const sheet = workbook.worksheets[0];
  console.log('Sheet name:', sheet.name);
  console.log('');

  // Print first 50 rows with their values and styles
  for (let r = 1; r <= 50; r++) {
    const row = sheet.getRow(r);
    const cells: string[] = [];
    for (let c = 1; c <= 5; c++) {
      const cell = row.getCell(c);
      const val = cell.value?.toString() || '';
      cells.push(val.substring(0, 25).padEnd(25));
    }
    const fill = row.getCell(1).fill as any;
    const font = row.getCell(1).font;
    const fillColor = fill?.type === 'pattern' ? fill.fgColor?.argb : '';
    const fontBold = font?.bold ? 'BOLD' : '';
    const fontSize = font?.size || '';
    const fontColor = font?.color?.argb || '';
    console.log(`R${r.toString().padStart(2)}: ${cells.join('|')} | fill:${fillColor || 'none'} ${fontBold} sz:${fontSize} fontColor:${fontColor}`);
  }
  console.log('');
  console.log('Column widths:');
  for (let c = 1; c <= 20; c++) {
    console.log(`  Col ${c}: ${sheet.getColumn(c).width}`);
  }
}

main();
