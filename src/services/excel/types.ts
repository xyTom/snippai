export interface TableData {
  headers: string[];
  rows: string[][];
}

export interface ExportResult {
  success: boolean;
  cancelled?: boolean;
  fileName?: string;
  error?: string;
}

export interface ExcelExportService {
  exportTables(tables: TableData[], fileName: string): Promise<ExportResult>;
}

export interface ExcelExportOptions {
  fileName: string;
  sheetName?: string;
} 