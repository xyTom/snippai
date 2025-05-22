import * as React from "react";
import { Switch } from "../ui/switch";
import { Button } from "../ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";

// Import types
import { GeneralSettings } from "../../types/settings";
import { LanguageCode } from "@/utils/i18next";

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
  id,
}) => (
  <div className="flex items-center justify-between p-4 rounded-md bg-muted/10">
    <div className="space-y-0.5">
      <h3 className="text-sm font-medium">{title}</h3>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
    <Switch id={id} checked={checked} onCheckedChange={onChange} />
  </div>
);

const languageOptions = [
  { value: "default", label: "Default (System)" },
  { value: "en", label: "English" },
  { value: "es", label: "Español" },
  { value: "ja", label: "日本語" },
  { value: "ko", label: "한국어" },
  { value: "zh-CN", label: "中文（简体）" },
  { value: "zh-TW", label: "中文（繁體）" },
];

interface SettingSelectProps {
  title: string;
  description: string;
  options: { value: string; label: string }[];
  value: LanguageCode;
  onChange: (value: LanguageCode) => void;
  id: string;
}

/**
 * Reusable setting select component
 */
const SettingSelect: React.FC<SettingSelectProps> = ({
  title,
  description,
  options,
  value,
  onChange,
  id,
}) => (
  <div className="flex items-center justify-between p-4 rounded-md bg-muted/10">
    <div className="space-y-0.5">
      <h3 className="text-sm font-medium">{title}</h3>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger id={id} className="w-[180px]">
        <SelectValue placeholder="Language" />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
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
  onCancel,
}) => {
  const { t, i18n } = useTranslation();

  const handleSettingChange = (key: keyof GeneralSettings, value: boolean) => {
    onSettingsChange({
      ...settings,
      [key]: value,
    });
  };

  // This is to revert the language back to the previous one, in case the user presses the Cancel button
  const previousLanguage = React.useRef(i18n.language);

  const handleLanguageChange = (value: LanguageCode) => {
    const locale = value === "default" ? navigator.language : value;
    i18n.changeLanguage(locale);
    onSettingsChange({ ...settings, uiLanguage: value });
  };

  const handleCancel = () => {
    i18n.changeLanguage(previousLanguage.current);
    onCancel();
  };

  return (
    <div className="space-y-6 mt-6">
      <div className="space-y-4">
        {/* Auto copy to clipboard setting */}
        <SettingToggle
          id="auto-copy"
          title={t("settings.auto_copy")}
          description={t("settings.auto_copy_description")}
          checked={settings.autoCopyToClipboard}
          onChange={(checked) =>
            handleSettingChange("autoCopyToClipboard", checked)
          }
        />

        {/* Auto start setting */}
        <SettingToggle
          id="auto-start"
          title={t("settings.auto_start")}
          description={t("settings.auto_start_description")}
          checked={settings.autoStart}
          onChange={(checked) => handleSettingChange("autoStart", checked)}
        />

        {/* Layout setting */}
        <SettingToggle
          id="horizontal-layout"
          title={t("settings.horizontal_layout")}
          description={t("settings.horizontal_layout_description")}
          checked={settings.horizontalLayout}
          onChange={(checked) =>
            handleSettingChange("horizontalLayout", checked)
          }
        />

        {/* UI language setting */}
        <SettingSelect
          id="ui-language"
          title={t("settings.ui_language")}
          description={t("settings.ui_language_description")}
          options={languageOptions}
          value={settings.uiLanguage}
          onChange={(value: LanguageCode) => {
            handleLanguageChange(value);
          }}
        />
      </div>

      <div className="pt-4 flex justify-end gap-2">
        <Button variant="outline" onClick={handleCancel} size="sm">
          {t("settings.cancel")}
        </Button>
        <Button onClick={onSave} size="sm" className="gap-1">
          <Check className="h-4 w-4" />
          {t("settings.save")}
        </Button>
      </div>
    </div>
  );
};

export default GeneralTab;
