import * as XLSX from 'xlsx';
import { ExcelExportService, TableData, ExportResult } from './types';

export class XLSXExportService implements ExcelExportService {
  async exportTables(tables: TableData[], fileName: string): Promise<ExportResult> {
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

    return await this.downloadWorkbook(workbook, fileName, tables);
  }

  private isValidTable(table: TableData): boolean {
    // Allow empty tables
    return table.headers.length > 0;
  }

  private async downloadWorkbook(workbook: XLSX.WorkBook, fileName: string, tables: TableData[]): Promise<ExportResult> {
    // check if the current environment is electron
    if (typeof window !== 'undefined' && window.electronAPI?.exportExcelTables) {
      try {
        // use the excel export function of the main process
        const result = await window.electronAPI.exportExcelTables({
          tables: tables,
          defaultFileName: fileName
        });

        if (result.success) {
          console.log(`Excel file exported successfully: ${result.fileName}`);
          return {
            success: true,
            fileName: result.fileName
          };
        } else if (result.cancelled) {
          console.log('Excel export cancelled by user');
          return {
            success: false,
            cancelled: true
          };
        } else {
          throw new Error(result.error || 'Unknown error occurred during export');
        }
      } catch (error) {
        console.error('Failed to export via main process:', error);
        // fallback to browser download
        return this.fallbackBrowserDownload(workbook, fileName);
      }
    } else {
      // fallback to browser download
      return this.fallbackBrowserDownload(workbook, fileName);
    }
  }

  private fallbackBrowserDownload(workbook: XLSX.WorkBook, fileName: string): ExportResult {
    try {
      const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbout], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      
      document.body.appendChild(link);
      link.click();
      
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      return {
        success: true,
        fileName: fileName
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
} 