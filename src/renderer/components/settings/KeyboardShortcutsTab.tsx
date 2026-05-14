import * as React from 'react';
import { Button } from '../ui/button';
import { Switch } from '../ui/switch';
import { useToast } from '../ui/use-toast';
import { useTranslation } from 'react-i18next';

// Import renamed component
import KeyboardShortcutInput from './KeyboardShortcutInput';

// Shared shortcut definitions & helpers
import type { ShortcutDefinition } from '../../../shared/shortcuts';
import {
  SHORTCUT_DEFINITIONS,
  ShortcutAction,
  hasShortcutConflict,
} from '../../../shared/shortcuts';

// Import types
import { ShortcutSettings } from '../../types/settings';

interface KeyboardShortcutsTabProps {
  settings: ShortcutSettings;
  onSettingsChange: (settings: ShortcutSettings) => void;
  onReset?: () => void; // Optional reset functionality
}

/**
 * Keyboard shortcuts configuration tab component
 */
const KeyboardShortcutsTab: React.FC<KeyboardShortcutsTabProps> = ({
  settings,
  onSettingsChange,
  onReset
}) => {
  const { toast } = useToast();
  const { t } = useTranslation();

  const acceleratorSettings = React.useMemo(() => {
    return SHORTCUT_DEFINITIONS.reduce((acc, def) => {
      acc[def.key] = settings[def.key];
      return acc;
    }, {} as Record<ShortcutAction, string>);
  }, [settings]);

  const handleShortcutChange = (key: ShortcutAction, value: string) => {
    // Conflict detection
    if (hasShortcutConflict(acceleratorSettings, value, key)) {
      toast({
        title: t("settings.shortcut_conflict", {shortcut: value}),
        description: t("settings.shortcut_conflict_description", {shortcut: value}),
        variant: 'destructive',
      });
      return;
    }
    
    onSettingsChange({
      ...settings,
      [key]: value,
    });
  };

  const handleShortcutEnabledChange = (key: ShortcutAction, enabled: boolean) => {
    onSettingsChange({
      ...settings,
      disabledShortcuts: {
        ...settings.disabledShortcuts,
        [key]: !enabled,
      },
    });
  };
  
  // 为单个快捷键提供重置功能
  const handleResetSingleShortcut = (key: ShortcutAction) => {
    const defaultValue = SHORTCUT_DEFINITIONS.find(def => def.key === key)?.defaultAccelerator;
    if (defaultValue) {
      onSettingsChange({
        ...settings,
        [key]: defaultValue,
      });
      toast({
        title: t('settings.shortcut_default_restored'),
        description: `${t('settings.shortcut_default_restored_description')}`,
      });
    }
  };

  return (
    <div className="space-y-6 mt-6">
      {SHORTCUT_DEFINITIONS.map((def: ShortcutDefinition) => {
        const disabled = settings.disabledShortcuts?.[def.key] === true;

        return (
          <div key={def.key} className={`space-y-3 rounded-md bg-muted/10 p-4 ${disabled ? 'opacity-60' : ''}`}>
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{t(def.label)}</div>
                <div className="text-xs text-muted-foreground">
                  {disabled ? t('settings.shortcut_disabled') : t('settings.shortcut_enabled')}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-xs text-muted-foreground">{t('settings.shortcut_enabled')}</span>
                <Switch
                  checked={!disabled}
                  aria-label={t('settings.toggle_shortcut')}
                  onCheckedChange={(checked) =>
                    handleShortcutEnabledChange(def.key, checked)
                  }
                />
              </div>
            </div>
            <KeyboardShortcutInput
              shortcutKey={def.key}
              shortcuts={acceleratorSettings}
              label={`${t(def.label)}`}
              value={settings[def.key] as string}
              onChange={handleShortcutChange}
              onReset={() => handleResetSingleShortcut(def.key)}
              disabled={disabled}
              showLabel={false}
            />
          </div>
        );
      })}

      <div className="pt-2 flex justify-end">
        {onReset && (
          <Button variant="outline" onClick={onReset} size="sm">
            {t('settings.reset_all')}
          </Button>
        )}
      </div>
    </div>
  );
};

export default KeyboardShortcutsTab;
