import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { SoftwareUpdate } from './versionCheck';
import { checkForUpdates, getCurrentVersion, showUpdateNotification } from './versionCheck';
import { toast } from '../renderer/components/ui/use-toast';

const supabaseResponse = vi.hoisted(() => ({ data: null as any, error: null as any }));

vi.mock('./supabase', () => {
  const response = supabaseResponse;

  return {
    default: {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve(response))
            }))
          }))
        }))
      }))
    }
  };
});

vi.mock('../renderer/components/ui/use-toast', () => ({
  toast: vi.fn()
}));

const createUpdate = (overrides: Partial<SoftwareUpdate> = {}): SoftwareUpdate => ({
  id: 1,
  version_code: 10002,
  version_name: '1.0.2',
  min_supported_version: 9999,
  download_url: 'https://example.com',
  release_date: '2024-01-01',
  ...overrides
});

beforeEach(() => {
  window.electronAPI = {
    getAppVersion: vi.fn().mockResolvedValue('1.0.0'),
    openExternal: vi.fn()
  };
  vi.clearAllMocks();
  supabaseResponse.data = null;
  supabaseResponse.error = null;
});

afterEach(() => {
  delete window.electronAPI;
});

describe('getCurrentVersion', () => {
  it('parses semantic versions into numeric codes', async () => {
    const version = await getCurrentVersion();
    expect(window.electronAPI?.getAppVersion).toHaveBeenCalled();
    expect(version).toEqual({ code: 10000, name: '1.0.0' });
  });

  it('returns null when version string is missing', async () => {
    window.electronAPI = {
      getAppVersion: vi.fn().mockResolvedValue('')
    };
    const version = await getCurrentVersion();
    expect(version).toBeNull();
  });

  it('handles errors from electron API', async () => {
    window.electronAPI = {
      getAppVersion: vi.fn().mockRejectedValue(new Error('boom'))
    };
    const version = await getCurrentVersion();
    expect(version).toBeNull();
  });
});

describe('checkForUpdates', () => {
  it('returns update info when a newer version exists', async () => {
    supabaseResponse.data = createUpdate();
    supabaseResponse.error = null;
    const update = await checkForUpdates();
    expect(update).toMatchObject({
      version_name: '1.0.2',
      currentVersion: '1.0.0'
    });
  });

  it('returns null when on latest version', async () => {
    supabaseResponse.data = createUpdate({ version_code: 10000 });
    supabaseResponse.error = null;
    const update = await checkForUpdates();
    expect(update).toBeNull();
  });

  it('flags force update when current version is below minimum', async () => {
    supabaseResponse.data = createUpdate({ version_code: 10000, min_supported_version: 10001 });
    supabaseResponse.error = null;
    const update = await checkForUpdates();
    expect(update).toMatchObject({ forceUpdate: true, currentVersion: '1.0.0' });
  });

  it('returns null on supabase errors', async () => {
    supabaseResponse.data = null;
    supabaseResponse.error = new Error('supabase failure');
    const update = await checkForUpdates();
    expect(update).toBeNull();
  });
});

describe('showUpdateNotification', () => {
  it('uses standard variant for optional updates', () => {
    const update = createUpdate({ version_name: '1.0.3' });
    showUpdateNotification(update);
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Update Available',
        description: expect.stringContaining('1.0.3'),
        variant: 'default',
        duration: 100000
      })
    );
    expect(window.electronAPI?.openExternal).not.toHaveBeenCalled();
  });

  it('marks destructive variant and opens link on force updates', () => {
    const update = createUpdate({ forceUpdate: true, version_name: '2.0.0' }) as SoftwareUpdate;
    showUpdateNotification(update);
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Critical Update Required',
        description: expect.stringContaining('2.0.0'),
        variant: 'destructive',
        duration: Infinity
      })
    );
    expect(window.electronAPI?.openExternal).toHaveBeenCalledWith('https://example.com');
  });
});
