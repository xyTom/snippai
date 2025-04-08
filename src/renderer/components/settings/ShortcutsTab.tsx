import * as React from 'react';
import { Check } from "lucide-react";
import { Button } from '../ui/button';
import { Switch } from "../ui/switch";
import { Label } from '../ui/label';
import ShortcutRecorder, { ShortcutSettings } from './ShortcutRecorder';
import { useToast } from '../ui/use-toast';

interface ShortcutsTabProps {
  settings: ShortcutSettings;
  onSettingsChange: (settings: ShortcutSettings) => void;
  onSave: () => Promise<void>;
  onCancel: () => void;
  onReset?: () => void; // Optional reset functionality
}

/**
 * Shortcuts settings tab component
 */
const ShortcutsTab: React.FC<ShortcutsTabProps> = ({
  settings,
  onSettingsChange,
  onSave,
  onCancel,
  onReset
}) => {
  const { toast } = useToast();

  const handleShortcutChange = (key: keyof ShortcutSettings, value: string) => {
    onSettingsChange({
      ...settings,
      [key]: value
    });
  };

  return (
    <div className="space-y-6 mt-6">
      <ShortcutRecorder
        shortcutKey="screenshot"
        label="Screenshot Shortcut"
        value={settings.screenshot}
        onChange={handleShortcutChange}
        onReset={onReset}
      />



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

export default ShortcutsTab;
