import { app } from 'electron';
import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger';
import { AppSettings } from '../renderer/types/settings';

/**
 * Centralized settings service for managing application settings
 * Provides a unified interface for reading, writing, and managing default settings
 */
export class SettingsService {
  private static instance: SettingsService;
  private readonly settingsPath: string;

  private constructor() {
    const userDataPath = app.getPath('userData');
    this.settingsPath = path.join(userDataPath, 'app-settings.json');
    
    // Ensure settings directory exists
    const settingsDir = path.dirname(this.settingsPath);
    if (!fs.existsSync(settingsDir)) {
      fs.mkdirSync(settingsDir, { recursive: true });
    }
  }

  /**
   * Get singleton instance of SettingsService
   */
  public static getInstance(): SettingsService {
    if (!SettingsService.instance) {
      SettingsService.instance = new SettingsService();
    }
    return SettingsService.instance;
  }

  /**
   * Creates default settings object
   */
  private createDefaultSettings(): AppSettings {
    return {
      shortcuts: {
        screenshot: 'CommandOrControl+Shift+A',
        fullscreenScreenshot: 'CommandOrControl+Shift+F',
        hideAllStickyNotes: 'CommandOrControl+Shift+H'
      },
      general: {
        autoCopyToClipboard: true,
        autoStart: this.getAutoStartStatus(),
        uiLanguage: 'default',
        horizontalLayout: false,
        hiddenFromScreenCapture: false,
        useSystemScreenshot: true
      }
    };
  }

  /**
   * Gets application auto-start status
   */
  private getAutoStartStatus(): boolean {
    // Development environment always returns false
    if (!app.isPackaged) {
      return false;
    }
    
    try {
      return app.getLoginItemSettings().openAtLogin;
    } catch (error) {
      logger.error('Error getting auto-start status:', error);
      return false;
    }
  }

  /**
   * Sets application auto-start status
   */
  public setAutoStart(enable: boolean): boolean {
    // Development environment simulation
    if (!app.isPackaged) {
      logger.info(`[DEV] Auto-start would be ${enable ? 'enabled' : 'disabled'} in packaged app`);
      return true;
    }

    try {
      const currentState = app.getLoginItemSettings();
      
      // If current state matches target state, no need to change
      if (currentState.openAtLogin === enable) {
        return true;
      }
      
      // Set auto-start
      app.setLoginItemSettings({
        openAtLogin: enable
      });
      
      logger.info(`Auto-start ${enable ? 'enabled' : 'disabled'} successfully`);
      return true;
    } catch (error) {
      logger.error('Error setting auto-start:', error);
      return false;
    }
  }

  /**
   * Deep merge strategy to handle nested properties
   */
  private mergeDefaultsRecursive(target: Record<string, any>, defaults: Record<string, any>): boolean {
    let settingsChanged = false;
    
    Object.keys(defaults).forEach(key => {
      // If property doesn't exist in target, add it
      if (target[key] === undefined) {
        target[key] = defaults[key];
        settingsChanged = true;
        logger.info(`Added missing setting: ${key}`);
        return;
      }
      
      // If both are objects, recurse
      if (
        typeof defaults[key] === 'object' && 
        defaults[key] !== null &&
        typeof target[key] === 'object' && 
        target[key] !== null &&
        !Array.isArray(defaults[key]) && 
        !Array.isArray(target[key])
      ) {
        const nestedChanged = this.mergeDefaultsRecursive(target[key], defaults[key]);
        settingsChanged = settingsChanged || nestedChanged;
      }
    });
    
    return settingsChanged;
  }

  private isPlainObject(value: unknown): value is Record<string, any> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  private cloneDefaults<T>(value: T): T {
    return JSON.parse(JSON.stringify(value));
  }

  private normalizeSettingsShape(
    savedSettings: Record<string, any>,
    defaultSettings: AppSettings
  ): boolean {
    let settingsChanged = false;
    const objectSections = ['shortcuts', 'general'] as const;

    objectSections.forEach((section) => {
      if (!this.isPlainObject(savedSettings[section])) {
        savedSettings[section] = this.cloneDefaults(defaultSettings[section]);
        settingsChanged = true;
        logger.warn(`Detected malformed ${section} settings block. Reset to defaults.`);
      }
    });

    return settingsChanged;
  }

  /**
   * Get complete application settings with robust error handling
   * Implements auto-recovery for corrupted config files
   */
  public getSettings(): AppSettings {
    const defaultSettings = this.createDefaultSettings();

    try {
      // If settings file does not exist, create it with defaults
      if (!fs.existsSync(this.settingsPath)) {
        logger.info('Settings file not found, creating default settings');
        try {
          fs.writeFileSync(this.settingsPath, JSON.stringify(defaultSettings, null, 2));
          logger.info('Default settings file created successfully');
        } catch (writeError) {
          logger.error('Failed to create default settings file:', writeError);
          // Continue with in-memory defaults even if write fails
        }
        return defaultSettings;
      }
      
      // Read and parse existing settings file
      let data: string;
      try {
        data = fs.readFileSync(this.settingsPath, 'utf8');
      } catch (readError) {
        logger.error('Error reading settings file:', readError);
        // Attempt to recreate the settings file
        try {
          fs.writeFileSync(this.settingsPath, JSON.stringify(defaultSettings, null, 2));
          logger.info('Recreated settings file after read error');
        } catch (writeError) {
          logger.error('Failed to recreate settings file after read error:', writeError);
        }
        return defaultSettings;
      }
      
      // Parse JSON and handle syntax errors
      let savedSettings: any;
      try {
        savedSettings = JSON.parse(data);
        
        // Validate parsed data has expected structure
        if (typeof savedSettings !== 'object' || savedSettings === null) {
          throw new Error('Settings file does not contain a valid object');
        }
      } catch (parseError) {
        logger.error('Error parsing settings file, using defaults:', parseError);
        // Backup corrupted file for potential recovery/debugging
        try {
          const backupPath = `${this.settingsPath}.backup.${Date.now()}`;
          fs.writeFileSync(backupPath, data);
          logger.info(`Backed up corrupted settings file to: ${backupPath}`);
          
          // Recreate with defaults
          fs.writeFileSync(this.settingsPath, JSON.stringify(defaultSettings, null, 2));
          logger.info('Recreated settings file with defaults after parse error');
        } catch (backupError) {
          logger.error('Failed to backup/recreate corrupted settings file:', backupError);
        }
        return defaultSettings;
      }
      
      let settingsChanged = this.normalizeSettingsShape(savedSettings, defaultSettings);

      // Deep merge with defaults and track changes
      settingsChanged = this.mergeDefaultsRecursive(savedSettings, defaultSettings) || settingsChanged;
      
      // Special handling for autoStart property - sync with actual system state
      const actualAutoStartStatus = this.getAutoStartStatus();
      if (savedSettings.general.autoStart !== actualAutoStartStatus) {
        savedSettings.general.autoStart = actualAutoStartStatus;
        settingsChanged = true;
        logger.info(`Updated autoStart setting to match system state: ${actualAutoStartStatus}`);
      }
      
      // Save settings if they were changed or additions were made
      if (settingsChanged) {
        try {
          fs.writeFileSync(this.settingsPath, JSON.stringify(savedSettings, null, 2));
          logger.info('Settings automatically updated with missing default values');
        } catch (writeError) {
          logger.error('Failed to save updated settings:', writeError);
          // Continue with in-memory updated settings even if write fails
        }
      }
      
      return savedSettings as AppSettings;
      
    } catch (error) {
      // Handle any unexpected errors
      logger.error('Unexpected error in settings handling:', error);
      
      // Always return valid settings even in case of error
      return defaultSettings;
    }
  }

  /**
   * Save complete application settings
   */
  public saveSettings(settings: AppSettings): boolean {
    try {
      // Validate data integrity
      if (
        !this.isPlainObject(settings) ||
        !this.isPlainObject(settings.shortcuts) ||
        !this.isPlainObject(settings.general)
      ) {
        logger.error('Invalid settings data received');
        return false;
      }

      // Handle auto-start setting
      if (settings.general && typeof settings.general.autoStart === 'boolean') {
        const success = this.setAutoStart(settings.general.autoStart);
        if (!success) {
          logger.warn('Failed to set auto-start, but will continue saving settings');
        }
      }
      
      // Write settings file
      fs.writeFileSync(this.settingsPath, JSON.stringify(settings, null, 2));
      
      logger.info('Settings saved successfully');
      return true;
    } catch (error) {
      logger.error('Error saving app settings:', error);
      return false;
    }
  }

  /**
   * Get a specific setting value using dot notation path
   * @param path - The dot-notation path to the setting (e.g., 'general.autoCopyToClipboard')
   * @param defaultValue - The default value to return if the setting is not found
   */
  public getSettingValue(path: string, defaultValue: any = null): any {
    try {
      if (!fs.existsSync(this.settingsPath)) {
        return defaultValue;
      }
      
      const data = fs.readFileSync(this.settingsPath, 'utf8');
      const settings = JSON.parse(data);
      
      // Handle dot notation path (e.g., 'general.autoCopyToClipboard')
      const parts = path.split('.');
      let current = settings;
      
      for (const part of parts) {
        if (current === undefined || current === null) {
          return defaultValue;
        }
        current = current[part];
      }
      
      return current !== undefined ? current : defaultValue;
    } catch (error) {
      logger.error(`Error getting setting value for ${path}:`, error);
      return defaultValue;
    }
  }

  /**
   * Update a specific setting value using dot notation path
   * @param path - The dot-notation path to the setting
   * @param value - The new value to set
   */
  public updateSettingValue(path: string, value: any): boolean {
    try {
      const settings = this.getSettings();
      const parts = path.split('.');
      let current = settings as any;
      
      // Navigate to the parent object
      for (let i = 0; i < parts.length - 1; i++) {
        if (current[parts[i]] === undefined) {
          current[parts[i]] = {};
        }
        current = current[parts[i]];
      }
      
      // Set the final value
      current[parts[parts.length - 1]] = value;
      
      return this.saveSettings(settings);
    } catch (error) {
      logger.error(`Error updating setting value for ${path}:`, error);
      return false;
    }
  }
}

// Export singleton instance
export const settingsService = SettingsService.getInstance();
