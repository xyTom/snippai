import * as XLSX from 'xlsx';
import { ExcelExportService, TableData } from './types';

export class XLSXExportService implements ExcelExportService {
  async exportTables(tables: TableData[], fileName: string): Promise<void> {
    const workbook = XLSX.utils.book_new();

    tables.forEach((table, index) => {
      if (!this.isValidTable(table)) return;

      const worksheetData = [
        table.headers,
        ...table.rows
      ];

      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
      const sheetName = `Table${index + 1}`;
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    });

    await this.downloadWorkbook(workbook, fileName);
  }

  private isValidTable(table: TableData): boolean {
    // Allow empty tables
    return table.headers.length > 0;
  }

  private async downloadWorkbook(workbook: XLSX.WorkBook, fileName: string): Promise<void> {
    const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/octet-stream' });
    
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    
    document.body.appendChild(link);
    link.click();
    
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
} 