"use client";

import * as React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { useToast } from './ui/use-toast';

// Import custom components
import SettingsNavigation, { SettingsTab, SettingsNavItem } from './settings/SettingsNavigation';
import ShortcutsTab from './settings/ShortcutsTab';
import AboutTab from './settings/AboutTab';
import GeneralTab from './settings/GeneralTab';
import { AppSettings, ShortcutSettings, GeneralSettings } from './settings/ShortcutRecorder';

// Default settings values
const DEFAULT_SETTINGS: AppSettings = {
  shortcuts: {
    screenshot: 'CommandOrControl+Shift+A'
  },
  general: {
    autoCopyToClipboard: true
  }
};

interface SettingsPageProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Settings page component that provides a UI for customizing application settings
 */
const SettingsPage: React.FC<SettingsPageProps> = ({ open, onClose }) => {
  // State management
  const [appSettings, setAppSettings] = React.useState<AppSettings>(DEFAULT_SETTINGS);
  const [activeTab, setActiveTab] = React.useState<SettingsTab>('general');
  const [appVersion, setAppVersion] = React.useState<string>('1.0.0');
  
  const { toast } = useToast();
  
  // Navigation items configuration
  const navItems: SettingsNavItem[] = [
    { id: 'general', label: 'General' },
    { id: 'shortcuts', label: 'Shortcuts' },
    { id: 'about', label: 'About' }
  ];

  /**
   * Load settings when dialog opens
   */
  React.useEffect(() => {
    const loadSettings = async (): Promise<void> => {
      try {
        // Load app settings
        const savedSettings = await window.electronAPI?.getAppSettings();
        if (savedSettings) {
          setAppSettings(savedSettings);
        }
        
        // Load app version
        const version = await window.electronAPI?.getAppVersion();
        if (version) {
          setAppVersion(version);
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
        toast({
          title: "Failed to load settings",
          description: "Unable to load application settings. Please try again later.",
          variant: "destructive"
        });
      }
    };

    if (open) {
      loadSettings();
    }
  }, [open, toast]);

  /**
   * Save settings to storage
   */
  const saveSettings = async (): Promise<void> => {
    try {
      await window.electronAPI?.saveAppSettings(appSettings);
      
      toast({
        title: "Settings saved",
        description: "Application settings have been saved successfully. Restart the application for changes to take effect.",
      });
      onClose();
    } catch (error) {
      console.error('Failed to save application settings:', error);
      toast({
        title: "Save failed",
        description: "Unable to save application settings. Please try again later.",
        variant: "destructive",
      });
    }
  };
  
  /**
   * Update specific settings category
   */
  const updateSettings = <T extends keyof AppSettings>(category: T, newSettings: AppSettings[T]): void => {
    setAppSettings(prevSettings => ({
      ...prevSettings,
      [category]: newSettings
    }));
  };
  
  // Handler functions
  const handleTabChange = (tab: SettingsTab): void => setActiveTab(tab);
  const handleShortcutChange = (newSettings: ShortcutSettings): void => updateSettings('shortcuts', newSettings);
  const handleGeneralChange = (newSettings: GeneralSettings): void => updateSettings('general', newSettings);
  const handleResetShortcuts = (): void => {
    updateSettings('shortcuts', DEFAULT_SETTINGS.shortcuts);
    toast({
      title: "Default settings restored",
      description: "Shortcut settings have been reset to default values.",
    });
  };

  // Don't render anything if dialog is closed
  if (!open) return null;

  // Map tab ID to title
  const getTabTitle = (tab: SettingsTab): string => {
    const titles: Record<SettingsTab, string> = {
      general: 'General Settings',
      shortcuts: 'Shortcut Settings',
      about: 'About'
    };
    return titles[tab];
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden">
        <div className="flex h-[80vh] max-h-[600px]">
          {/* Left navigation sidebar */}
          <SettingsNavigation 
            activeTab={activeTab} 
            navItems={navItems} 
            onTabChange={handleTabChange} 
          />

          {/* Right content area */}
          <div className="flex-1 p-6 overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold">
                {getTabTitle(activeTab)}
              </DialogTitle>
            </DialogHeader>

            {/* Tab content */}
            {activeTab === 'general' && (
              <GeneralTab
                settings={appSettings.general}
                onSettingsChange={handleGeneralChange}
                onSave={saveSettings}
                onCancel={onClose}
              />
            )}

            {activeTab === 'shortcuts' && (
              <ShortcutsTab 
                settings={appSettings.shortcuts}
                onSettingsChange={handleShortcutChange}
                onSave={saveSettings}
                onCancel={onClose}
                onReset={handleResetShortcuts}
              />
            )}

            {activeTab === 'about' && (
              <AboutTab appVersion={appVersion} />
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsPage;
