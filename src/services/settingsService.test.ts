import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';

const createService = async (options: { isPackaged?: boolean; autoStart?: boolean; setAutoStartThrows?: boolean } = {}) => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'settings-service-'));
  const mockLogger = {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn()
  };
  const mockApp = {
    isPackaged: options.isPackaged ?? true,
    getPath: vi.fn(() => tempDir),
    getLoginItemSettings: vi.fn(() => ({ openAtLogin: options.autoStart ?? false })),
    setLoginItemSettings: vi.fn(() => {
      if (options.setAutoStartThrows) {
        throw new Error('failed');
      }
    })
  } as any;

  vi.resetModules();
  vi.doMock('electron', () => ({ app: mockApp }));
  vi.doMock('../utils/logger', () => ({ logger: mockLogger }));

  const module = await import('./settingsService');
  const service = module.SettingsService.getInstance();

  return { service, tempDir, mockApp, mockLogger };
};

describe('SettingsService', () => {
  let cleanupDirs: string[] = [];

  beforeEach(() => {
    cleanupDirs = [];
  });

  afterEach(() => {
    cleanupDirs.forEach(dir => fs.rmSync(dir, { recursive: true, force: true }));
  });

  it('creates default settings when file is missing', async () => {
    const { service, tempDir, mockApp } = await createService({ autoStart: true });
    cleanupDirs.push(tempDir);

    const settings = service.getSettings();
    expect(settings.general.autoStart).toBe(true);
    expect(settings.general.autoCopyResult).toBe(false);
    expect(settings.shortcuts.pinToScreen).toBe('CommandOrControl+Shift+P');
    expect(settings.llmProviders).toEqual([]);
    expect(fs.existsSync(path.join(tempDir, 'app-settings.json'))).toBe(true);
    expect(mockApp.getPath).toHaveBeenCalledWith('userData');
  });

  it('backs up corrupted settings and restores defaults', async () => {
    const { service, tempDir } = await createService();
    cleanupDirs.push(tempDir);
    const settingsPath = path.join(tempDir, 'app-settings.json');
    fs.writeFileSync(settingsPath, '{bad json');

    const settings = service.getSettings();
    const backupFiles = fs.readdirSync(tempDir).filter(f => f.includes('app-settings.json.backup'));

    expect(settings.general.autoCopyToClipboard).toBe(true);
    expect(backupFiles.length).toBe(1);
  });

  it('merges missing fields and synchronizes autoStart state', async () => {
    const { service, tempDir, mockApp } = await createService({ autoStart: true });
    cleanupDirs.push(tempDir);
    const settingsPath = path.join(tempDir, 'app-settings.json');
    const partial = {
      shortcuts: { screenshot: 'Cmd+S' },
      general: { autoCopyToClipboard: false, autoStart: false }
    };
    fs.writeFileSync(settingsPath, JSON.stringify(partial));

    const settings = service.getSettings();

    expect(settings.general.autoCopyToClipboard).toBe(false);
    expect(settings.general.autoStart).toBe(true);
    expect(settings.general.uiLanguage).toBeDefined();
    expect(mockApp.getLoginItemSettings).toHaveBeenCalled();

    const saved = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    expect(saved.general.autoStart).toBe(true);
  });

  it('repairs malformed settings sections before merging defaults', async () => {
    const { service, tempDir, mockLogger } = await createService();
    cleanupDirs.push(tempDir);
    const settingsPath = path.join(tempDir, 'app-settings.json');
    fs.writeFileSync(
      settingsPath,
      JSON.stringify({
        shortcuts: [],
        general: 'invalid'
      })
    );

    const settings = service.getSettings();
    const saved = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));

    expect(settings.shortcuts.screenshot).toBe('CommandOrControl+Shift+A');
    expect(settings.general.autoCopyToClipboard).toBe(true);
    expect(saved.shortcuts.fullscreenScreenshot).toBe('CommandOrControl+Shift+F');
    expect(saved.shortcuts.pinToScreen).toBe('CommandOrControl+Shift+P');
    expect(saved.general.uiLanguage).toBe('default');
    expect(saved.llmProviders).toEqual([]);
    expect(mockLogger.warn).toHaveBeenCalledWith(
      'Detected malformed shortcuts settings block. Reset to defaults.'
    );
    expect(mockLogger.warn).toHaveBeenCalledWith(
      'Detected malformed general settings block. Reset to defaults.'
    );
  });

  it('repairs malformed provider settings', async () => {
    const { service, tempDir, mockLogger } = await createService();
    cleanupDirs.push(tempDir);
    const settingsPath = path.join(tempDir, 'app-settings.json');
    fs.writeFileSync(
      settingsPath,
      JSON.stringify({
        shortcuts: { screenshot: 'CommandOrControl+Shift+A' },
        general: { autoCopyToClipboard: true, autoStart: false },
        llmProviders: {}
      })
    );

    const settings = service.getSettings();
    expect(settings.llmProviders).toEqual([]);
    expect(mockLogger.warn).toHaveBeenCalledWith(
      'Detected malformed llmProviders settings block. Reset to defaults.'
    );
  });

  it('keeps screenshot and result auto-copy settings mutually exclusive', async () => {
    const { service, tempDir, mockLogger } = await createService();
    cleanupDirs.push(tempDir);
    const settingsPath = path.join(tempDir, 'app-settings.json');
    fs.writeFileSync(
      settingsPath,
      JSON.stringify({
        shortcuts: {
          screenshot: 'CommandOrControl+Shift+A',
          fullscreenScreenshot: 'CommandOrControl+Shift+F',
          hideAllStickyNotes: 'CommandOrControl+Shift+H',
          pinToScreen: 'CommandOrControl+Shift+P',
          disabledShortcuts: {}
        },
        general: {
          autoCopyToClipboard: true,
          autoCopyResult: true,
          autoStart: false,
          uiLanguage: 'default',
          horizontalLayout: false,
          hiddenFromScreenCapture: false,
          useSystemScreenshot: true
        },
        llmProviders: []
      })
    );

    const settings = service.getSettings();

    expect(settings.general.autoCopyToClipboard).toBe(true);
    expect(settings.general.autoCopyResult).toBe(false);
    expect(mockLogger.warn).toHaveBeenCalledWith(
      'Detected mutually enabled auto-copy settings. Kept screenshot auto-copy enabled.'
    );
  });

  it('normalizes mutually enabled auto-copy settings when saving', async () => {
    const { service, tempDir } = await createService();
    cleanupDirs.push(tempDir);
    const settingsPath = path.join(tempDir, 'app-settings.json');
    const settings = service.getSettings();

    settings.general.autoCopyToClipboard = true;
    settings.general.autoCopyResult = true;
    expect(service.saveSettings(settings)).toBe(true);

    const saved = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    expect(saved.general.autoCopyToClipboard).toBe(true);
    expect(saved.general.autoCopyResult).toBe(false);
  });

  it('continues saving when enabling autoStart fails', async () => {
    const { service, tempDir } = await createService({ setAutoStartThrows: true });
    cleanupDirs.push(tempDir);
    const settingsPath = path.join(tempDir, 'app-settings.json');
    const newSettings = service.getSettings();

    newSettings.general.autoStart = true;
    const result = service.saveSettings(newSettings);

    expect(result).toBe(true);
    const saved = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    expect(saved.general.autoStart).toBe(true);
  });

  it('updates nested values and falls back when reading missing paths', async () => {
    const { service, tempDir } = await createService({ autoStart: false });
    cleanupDirs.push(tempDir);

    const updateResult = service.updateSettingValue('general.uiLanguage', 'fr');
    expect(updateResult).toBe(true);

    const language = service.getSettingValue('general.uiLanguage');
    expect(language).toBe('fr');

    const missing = service.getSettingValue('general.nonexistent', 'fallback');
    expect(missing).toBe('fallback');

    fs.rmSync(path.join(tempDir, 'app-settings.json'));
    const defaultValue = service.getSettingValue('general.uiLanguage', 'default-locale');
    expect(defaultValue).toBe('default-locale');
  });
});
