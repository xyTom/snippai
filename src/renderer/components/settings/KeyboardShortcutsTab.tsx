import * as React from 'react';
import { Check } from "lucide-react";
import { Button } from '../ui/button';
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
  getConflictingAction,
  getShortcutLabel,
} from '../../../shared/shortcuts';

// Import types
import { ShortcutSettings } from '../../types/settings';

interface KeyboardShortcutsTabProps {
  settings: ShortcutSettings;
  onSettingsChange: (settings: ShortcutSettings) => void;
  onSave: () => Promise<void>;
  onCancel: () => void;
  onReset?: () => void; // Optional reset functionality
}

/**
 * Keyboard shortcuts configuration tab component
 */
const KeyboardShortcutsTab: React.FC<KeyboardShortcutsTabProps> = ({
  settings,
  onSettingsChange,
  onSave,
  onCancel,
  onReset
}) => {
  const { toast } = useToast();
  const { t } = useTranslation();

  const handleShortcutChange = (key: ShortcutAction, value: string) => {
    // Conflict detection
    if (hasShortcutConflict(settings, value, key)) {
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
      {SHORTCUT_DEFINITIONS.map((def: ShortcutDefinition) => (
        <KeyboardShortcutInput
          key={def.key}
          shortcutKey={def.key}
          shortcuts={settings}
          label={`${t(def.label)}`}
          value={settings[def.key] as string}
          onChange={handleShortcutChange}
          onReset={() => handleResetSingleShortcut(def.key)}
        />
      ))}

      <div className="pt-4 flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel} size="sm">{t('settings.cancel')}</Button>
        <Button onClick={onSave} size="sm" className="gap-1">
          <Check className="h-4 w-4" />
          {t('settings.save')}
        </Button>
      </div>
    </div>
  );
};

export default KeyboardShortcutsTab;
