import * as React from 'react';
import { Switch } from "../ui/switch";
import { Button } from '../ui/button';
import { Check } from "lucide-react";

// Import types
import { GeneralSettings } from '../../types/settings';

// Reusable setting toggle component
interface SettingToggleProps {
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  id: string;
}

/**
 * Reusable setting toggle component with consistent styling
 */
const SettingToggle: React.FC<SettingToggleProps> = ({
  title,
  description,
  checked,
  onChange,
  id
}) => (
  <div className="flex items-center justify-between p-4 rounded-md bg-muted/10">
    <div className="space-y-0.5">
      <h3 className="text-sm font-medium">{title}</h3>
      <p className="text-xs text-muted-foreground">
        {description}
      </p>
    </div>
    <Switch 
      id={id}
      checked={checked}
      onCheckedChange={onChange}
    />
  </div>
);

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
        <SettingToggle
          id="auto-copy"
          title="Auto Copy to Clipboard"
          description="Automatically copy screenshots to clipboard for easy pasting"
          checked={settings.autoCopyToClipboard}
          onChange={(checked) => handleSettingChange('autoCopyToClipboard', checked)}
        />
        
        {/* Auto start setting */}
        <SettingToggle
          id="auto-start"
          title="Auto Start"
          description="Set the application to start automatically when the system boots"
          checked={settings.autoStart}
          onChange={(checked) => handleSettingChange('autoStart', checked)}
        />
        
        {/* Layout setting */}
        <SettingToggle
          id="horizontal-layout"
          title="Horizontal Layout"
          description="Display screenshot and results side by side instead of top to bottom"
          checked={settings.horizontalLayout}
          onChange={(checked) => handleSettingChange('horizontalLayout', checked)}
        />
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
