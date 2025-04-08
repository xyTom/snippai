import * as React from 'react';
import { Switch } from "../ui/switch";
import { GeneralSettings } from './ShortcutRecorder';
import { Button } from '../ui/button';
import { Check } from "lucide-react";

interface GeneralTabProps {
  settings: GeneralSettings;
  onSettingsChange: (settings: GeneralSettings) => void;
  onSave: () => Promise<void>;
  onCancel: () => void;
}

/**
 * General settings tab component
 */
const GeneralTab: React.FC<GeneralTabProps> = ({
  settings,
  onSettingsChange,
  onSave,
  onCancel
}) => {
  const handleSettingChange = (key: keyof GeneralSettings, value: boolean) => {
    onSettingsChange({
      ...settings,
      [key]: value
    });
  };

  return (
    <div className="space-y-6 mt-6">
      <div className="space-y-4">
        {/* Auto copy to clipboard setting */}
        <div className="flex items-center justify-between p-4 rounded-md bg-muted/10">
          <div className="space-y-0.5">
            <h3 className="text-sm font-medium">Auto Copy to Clipboard</h3>
            <p className="text-xs text-muted-foreground">
              Automatically copy screenshots to clipboard for easy pasting
            </p>
          </div>
          <Switch 
            id="auto-copy"
            checked={settings.autoCopyToClipboard}
            onCheckedChange={(checked: boolean) => {
              handleSettingChange('autoCopyToClipboard', checked);
            }}
          />
        </div>
      </div>

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

export default GeneralTab;
