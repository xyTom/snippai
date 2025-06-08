export interface TableData {
  headers: string[];
  rows: string[][];
}

export interface ExcelExportService {
  exportTables(tables: TableData[], fileName: string): Promise<void>;
}

export interface ExcelExportOptions {
  fileName: string;
  sheetName?: string;
} 