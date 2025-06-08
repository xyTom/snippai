import { TableData } from '../excel/types';

export class MarkdownTableParser {
  // Detect separator line of tables (|---| / |:---:| / |:---| / |---:|)
  private static readonly SEPARATOR_REGEX = /^\|[-:\s|]+\|\s*$/gm;

  static parseTables(text: string): TableData[] {
    if (!text) return [];

    const tables: TableData[] = [];
    const lines = text.split('\n');
    let foundSeparator = false;
    let tableStartIndex = -1;
    let lastSeparatorIndex = -1;

    // Find separator lines of tables
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Check if is a separator line
      if (this.SEPARATOR_REGEX.test(line)) {
        if (!foundSeparator) {
          foundSeparator = true;
          tableStartIndex = i - 1; // Line before separator line is the header
          lastSeparatorIndex = i;
        } else {
          if (tableStartIndex >= 0) {
            // Process previous table
            const tableLines = lines.slice(tableStartIndex, i - 1);
            const tableData = this.processTable(tableLines);
            if (tableData) {
              tables.push(tableData);
            }
          }
          // Update start index of new table
          if (i > 0) {
            tableStartIndex = i - 1;
          }
          lastSeparatorIndex = i;
        }
        // Reset lastIndex of regex
        this.SEPARATOR_REGEX.lastIndex = 0;
      }
    }

    // Process last table
    if (tableStartIndex >= 0) {
      const tableLines = lines.slice(tableStartIndex);
      const tableData = this.processTable(tableLines);
      if (tableData) {
        tables.push(tableData);
      }
    }

    return tables;
  }

  private static processTable(tableLines: string[]): TableData | null {
    // Need at least header and separator line
    if (tableLines.length < 2) return null;

    const separatorIndex = tableLines.findIndex(line => 
      this.SEPARATOR_REGEX.test(line.trim())
    );
    if (separatorIndex === -1) return null;

    const headers = tableLines[0]
      .split('|')
      .slice(1, -1)
      .map(cell => cell.trim());

    const rows = tableLines.slice(separatorIndex + 1)
      .filter(line => line.trim() && line.startsWith('|'))
      .map(line => 
        line
          .split('|')
          .slice(1, -1)
          .map(cell => cell.trim())
      );

    return { 
      headers, 
      rows: rows.length > 0 ? rows : []
    };
  }
} 