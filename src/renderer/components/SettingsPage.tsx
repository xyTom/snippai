"use client";

import * as React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { useToast } from './ui/use-toast';

// Import custom components
import SettingsNavigation, { SettingsTab, SettingsNavItem } from './settings/SettingsNavigation';
import KeyboardShortcutsTab from './settings/KeyboardShortcutsTab';
import AboutTab from './settings/AboutTab';
import GeneralTab from './settings/GeneralTab';

import { useTranslation } from 'react-i18next';

// Import types
import { AppSettings, ShortcutsRecord, GeneralSettings, DEFAULT_SHORTCUT_SETTINGS } from '../types/settings';

// Default settings values
const DEFAULT_SETTINGS: AppSettings = {
  shortcuts: { ...DEFAULT_SHORTCUT_SETTINGS },
  general: {
    autoCopyToClipboard: true,
    autoStart: false,
    horizontalLayout: false,
    uiLanguage: 'default',
    hiddenFromScreenCapture: false
  }
};

interface SettingsPageProps {
  open: boolean;
  onClose: () => void;
  onCloseSave: () => void; // onClose function for the saveSettings function (just close without reverting the language)
  onSettingsUpdate?: (settings: AppSettings) => void;
}

/**
 * Settings page component that provides a UI for customizing application settings
 */
const SettingsPage: React.FC<SettingsPageProps> = ({ open, onClose, onCloseSave, onSettingsUpdate }) => {
  // State management
  const [appSettings, setAppSettings] = React.useState<AppSettings>(DEFAULT_SETTINGS);
  const [activeTab, setActiveTab] = React.useState<SettingsTab>('general');
  const [appVersion, setAppVersion] = React.useState<string>('1.0.0');
  const { t } = useTranslation();
  
  const { toast } = useToast();
  
  // Navigation items configuration
  const navItems: SettingsNavItem[] = [
    { id: 'general', label: t('settings.general') },
    { id: 'shortcuts', label:  t('settings.shortcuts') },
    { id: 'about', label:  t('settings.about') }
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
          title: t('settings.loading_failed'),
          description: t('settings.loading_failed_description'),
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
        title: t('settings.saved'),
        description: t('settings.saved_description'),
      });
      onCloseSave();
    } catch (error) {
      console.error('Failed to save application settings:', error);
      toast({
        title: t('settings.save_failed'),
        description: t('settings.save_failed_description'),
        variant: "destructive",
      });
    }
  };
  
  /**
   * Update specific settings category
   */
  const updateSettings = <T extends keyof AppSettings>(category: T, newSettings: AppSettings[T]): void => {
    setAppSettings((prevSettings: AppSettings) => {
      const updatedSettings = {
        ...prevSettings,
        [category]: newSettings
      };
      
      // Notify parent component about settings changes
      if (onSettingsUpdate) {
        onSettingsUpdate(updatedSettings);
      }
      
      return updatedSettings;
    });
  };
  
  // Handler functions
  const handleTabChange = (tab: SettingsTab): void => setActiveTab(tab);
  const handleShortcutChange = (newSettings: ShortcutsRecord): void => updateSettings('shortcuts', newSettings);
  const handleGeneralChange = (newSettings: GeneralSettings): void => updateSettings('general', newSettings);
  const handleResetShortcuts = (): void => {
    updateSettings('shortcuts', { ...DEFAULT_SHORTCUT_SETTINGS });
    toast({
      title: t("settings.defaults_restored"),
      description: t("settings.defaults_shortcut_restored_description"),
    });
  };

  // Don't render anything if dialog is closed
  if (!open) return null;

  // Map tab ID to title
  const getTabTitle = (tab: SettingsTab): string => {
    const titles: Record<SettingsTab, string> = {
      general: t('settings.general_settings'),
      shortcuts: t('settings.shortcuts'),
      about: t('settings.about')
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
              <KeyboardShortcutsTab 
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
