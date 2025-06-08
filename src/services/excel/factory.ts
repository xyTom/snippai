import { ExcelExportService } from './types';
import { XLSXExportService } from './xlsxService';

export class ExcelExportServiceFactory {
  private static instance: ExcelExportService;

  static getService(): ExcelExportService {
    if (!this.instance) {
      this.instance = new XLSXExportService();
    }
    return this.instance;
  }

  static setService(service: ExcelExportService) {
    this.instance = service;
  }
} 