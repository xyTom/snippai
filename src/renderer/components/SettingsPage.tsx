"use client";

import * as React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { useToast } from './ui/use-toast';

// Import custom components
import SettingsNavigation, { SettingsTab, SettingsNavItem } from './settings/SettingsNavigation';
import KeyboardShortcutsTab from './settings/KeyboardShortcutsTab';
import AboutTab from './settings/AboutTab';
import GeneralTab from './settings/GeneralTab';
import LLMProvidersTab from './settings/LLMProvidersTab';

import { useTranslation } from 'react-i18next';

// Import types
import { AppSettings, ShortcutsRecord, GeneralSettings, DEFAULT_SHORTCUT_SETTINGS } from '../types/settings';

// Default settings values
const DEFAULT_SETTINGS: AppSettings = {
  shortcuts: { ...DEFAULT_SHORTCUT_SETTINGS },
  general: {
    autoCopyToClipboard: true,
    autoCopyResult: false,
    autoStart: false,
    horizontalLayout: false,
    uiLanguage: 'default',
    hiddenFromScreenCapture: false,
    useSystemScreenshot: true
  },
  llmProviders: []
};

interface SettingsPageProps {
  open: boolean;
  onClose: () => void;
  onSettingsUpdate?: (settings: AppSettings) => void;
}

/**
 * Settings page component that provides a UI for customizing application settings
 */
const SettingsPage: React.FC<SettingsPageProps> = ({ open, onClose, onSettingsUpdate }) => {
  // State management
  const [appSettings, setAppSettings] = React.useState<AppSettings>(DEFAULT_SETTINGS);
  const appSettingsRef = React.useRef<AppSettings>(DEFAULT_SETTINGS);
  const [activeTab, setActiveTab] = React.useState<SettingsTab>('general');
  const [appVersion, setAppVersion] = React.useState<string>('1.0.0');
  const { t } = useTranslation();
  
  const { toast } = useToast();
  
  // Navigation items configuration
  const navItems: SettingsNavItem[] = [
    { id: 'general', label: t('settings.general') },
    { id: 'shortcuts', label:  t('settings.shortcuts') },
    { id: 'llmProviders', label: t('settings.llm_providers') },
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
          console.log('[SettingsPage] Loaded settings:', savedSettings);
          console.log('[SettingsPage] llmProviders count:', savedSettings.llmProviders?.length);
          appSettingsRef.current = savedSettings;
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
  const saveSettings = async (settings: AppSettings): Promise<boolean> => {
    try {
      console.log('[SettingsPage] Saving settings, llmProviders:', settings.llmProviders?.length);
      await window.electronAPI?.saveAppSettings(settings);
      console.log('[SettingsPage] Settings saved successfully');
      return true;
    } catch (error) {
      console.error('[SettingsPage] Failed to save application settings:', error);
      return false;
    }
  };
  
  /**
   * Update specific settings category
   */
  const updateSettings = <T extends keyof AppSettings>(category: T, newSettings: AppSettings[T]): void => {
    const updatedSettings = {
      ...appSettingsRef.current,
      [category]: newSettings
    };

    appSettingsRef.current = updatedSettings;
    setAppSettings(updatedSettings);
    onSettingsUpdate?.(updatedSettings);
    // Save settings and handle errors
    void saveSettings(updatedSettings).then((success) => {
      if (!success) {
        toast({
          title: t("settings.save_failed"),
          description: t("settings.save_failed_description"),
          variant: "destructive",
        });
      }
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
      llmProviders: t('settings.llm_providers'),
      about: t('settings.about')
    };
    return titles[tab];
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) {
          onClose();
        }
      }}
    >
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
              />
            )}

            {activeTab === 'shortcuts' && (
              <KeyboardShortcutsTab 
                settings={appSettings.shortcuts}
                onSettingsChange={handleShortcutChange}
                onReset={handleResetShortcuts}
              />
            )}

            {activeTab === 'llmProviders' && (
              <LLMProvidersTab
                providers={appSettings.llmProviders}
                onProvidersChange={(providers) =>
                  updateSettings('llmProviders', providers)
                }
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
