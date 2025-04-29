import * as React from 'react';
import { Check } from "lucide-react";
import { Button } from '../ui/button';
import { useToast } from '../ui/use-toast';

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

  const handleShortcutChange = (key: ShortcutAction, value: string) => {
    // Conflict detection
    if (hasShortcutConflict(settings, value, key)) {
      const conflictAction = getConflictingAction(settings, value, key);
      toast({
        title: 'Shortcut conflict',
        description: `The shortcut ${value} conflicts with ${getShortcutLabel(conflictAction!)}.`,
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
        title: "Default shortcut restored",
        description: `${getShortcutLabel(key)} shortcut has been reset to default.`,
      });
    }
  };

  return (
    <div className="space-y-6 mt-6">
      {SHORTCUT_DEFINITIONS.map((def: ShortcutDefinition) => (
        <KeyboardShortcutInput
          key={def.key}
          shortcutKey={def.key}
          label={`${def.label} Shortcut`}
          value={settings[def.key] as string}
          onChange={handleShortcutChange}
          onReset={() => handleResetSingleShortcut(def.key)}
        />
      ))}

      <div className="pt-4 flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel} size="sm">Cancel</Button>
        <Button onClick={onSave} size="sm" className="gap-1">
          <Check className="h-4 w-4" />
          Save
        </Button>
      </div>
    </div>
  );
};

export default KeyboardShortcutsTab;
