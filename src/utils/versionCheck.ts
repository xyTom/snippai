import supabase from './supabase';
import { toast } from '../renderer/components/ui/use-toast';

export interface SoftwareUpdate {
  id: number;
  version_code: number;
  version_name: string;
  min_supported_version: number;
  download_url: string | null;
  release_date: string;
  currentVersion?: string; // Current installed version (added during runtime)
  forceUpdate?: boolean; // Flag for critical updates that must be installed
}

/**
 * Get the current application version
 * Uses window.electronAPI.getAppVersion() to retrieve version from main process
 * @returns Promise with the version info containing code and name
 */
export async function getCurrentVersion(): Promise<{ code: number; name: string } | null> {
  try {
    const versionString = await window.electronAPI?.getAppVersion();
    if (!versionString) return null;
    
    // Parse the version string to extract the version code
    // Assuming version string format is like "1.0.0"
    const versionParts = versionString.split('.');
    // Generate a numeric code from version parts (e.g., 1.0.0 -> 10000, 1.2.3 -> 10203)
    const majorVersion = parseInt(versionParts[0] || '0', 10);
    const minorVersion = parseInt(versionParts[1] || '0', 10);
    const patchVersion = parseInt(versionParts[2] || '0', 10);
    
    const versionCode = majorVersion * 10000 + minorVersion * 100 + patchVersion;
    
    return {
      code: versionCode,
      name: versionString
    };
  } catch (error) {
    console.error('Failed to get app version:', error);
    return null;
  }
}

/**
 * Check if there's a newer version available from the server
 * @returns Promise with the update info or null if no update is available
 */
export async function checkForUpdates(): Promise<SoftwareUpdate | null> {
  try {
    // Get current version first
    const currentVersion = await getCurrentVersion();
    if (!currentVersion) {
      console.error('Could not determine current application version');
      return null;
    }
    
    // Get the latest version from Supabase
    const { data, error } = await supabase
      .from('software_updates')
      .select('*')
      .order('version_code', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      console.error('Error checking for updates:', error);
      return null;
    }

    const latestVersion = data as SoftwareUpdate;
    console.log('Latest version:', latestVersion);
    console.log('Current version:', currentVersion);  

    // Check if there's a newer version available
    if (latestVersion && latestVersion.version_code > currentVersion.code) {
      return {
        ...latestVersion,
        currentVersion: currentVersion.name
      };
    }

    // Check if current version is below minimum supported version
    if (latestVersion && currentVersion.code < latestVersion.min_supported_version) {
      return {
        ...latestVersion,
        currentVersion: currentVersion.name,
        forceUpdate: true
      } as SoftwareUpdate & { currentVersion: string, forceUpdate: boolean };
    }

    return null; // No update available
  } catch (error) {
    console.error('Failed to check for updates:', error);
    return null;
  }
}

/**
 * Show an update notification to the user
 * @param update The update information
 */
export function showUpdateNotification(update: SoftwareUpdate): void {
  const isForceUpdate = 'forceUpdate' in update && (update as any).forceUpdate;
  const currentVersion = (update as any).currentVersion || 'unknown';
  
  // Show a toast notification for the update
  toast({
    title: isForceUpdate ? 'Critical Update Required' : 'Update Available',
    description: isForceUpdate 
      ? `Version ${update.version_name} is required. Your version is no longer supported. ${update.download_url ? 'To download: ' + update.download_url : ''}` 
      : `Version ${update.version_name} is now available. You are using version ${currentVersion}. ${update.download_url ? 'To download: ' + update.download_url : ''}`,
    duration: isForceUpdate ? Infinity : 100000,
    variant: isForceUpdate ? 'destructive' : 'default',
  });
  
  // If there's a download URL and we have the openExternal method available, open it automatically for force updates
  if (isForceUpdate && update.download_url && window.electronAPI?.openExternal) {
    window.electronAPI.openExternal(update.download_url);
  }
}
