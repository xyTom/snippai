import * as React from "react";
import { Switch } from "../ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
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
  disabled?: boolean;
}

interface SettingSelectProps {
  title: string;
  description: string;
  options: { value: string; label: string }[];
  value: LanguageCode;
  onChange: (value: LanguageCode) => void;
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
  disabled = false,
}) => (
  <div className="flex items-center justify-between p-4 rounded-md bg-muted/10">
    <div className="space-y-0.5">
      <h3 className="text-sm font-medium">{title}</h3>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
    <Switch
      id={id}
      checked={checked}
      disabled={disabled}
      onCheckedChange={onChange}
    />
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
}

/**
 * General settings tab component
 */
const GeneralTab: React.FC<GeneralTabProps> = ({
  settings,
  onSettingsChange,
}) => {
  const { t, i18n } = useTranslation();
  const systemScreenshotSupported =
    window.electronAPI?.platform === "darwin" ||
    window.electronAPI?.platform === "win32";

  const handleSettingChange = (key: keyof GeneralSettings, value: boolean) => {
    const nextSettings = {
      ...settings,
      [key]: value,
    };

    if (key === "autoCopyToClipboard" && value) {
      nextSettings.autoCopyResult = false;
    }

    if (key === "autoCopyResult" && value) {
      nextSettings.autoCopyToClipboard = false;
    }

    onSettingsChange({
      ...nextSettings,
    });
  };

  const handleLanguageChange = (value: LanguageCode) => {
    const locale = value === "default" ? navigator.language : value;
    i18n.changeLanguage(locale);
    onSettingsChange({ ...settings, uiLanguage: value });
  };

  return (
    <div className="space-y-6 mt-6" data-testid="settings-general-tab">
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

        <SettingToggle
          id="auto-copy-result"
          title={t("settings.auto_copy_result")}
          description={t("settings.auto_copy_result_description")}
          checked={settings.autoCopyResult}
          onChange={(checked) =>
            handleSettingChange("autoCopyResult", checked)
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

        {/* Hidden from screen capture setting */}
        <SettingToggle
          id="hidden-from-screen-capture"
          title={t("settings.hidden_from_screen_capture")}
          description={t("settings.hidden_from_screen_capture_description")}
          checked={settings.hiddenFromScreenCapture}
          onChange={(checked) =>
            handleSettingChange("hiddenFromScreenCapture", checked)
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

        <SettingToggle
          id="use-system-screenshot"
          title={t("settings.use_system_screenshot")}
          description={
            systemScreenshotSupported
              ? t("settings.use_system_screenshot_description")
              : t("settings.use_system_screenshot_unavailable")
          }
          checked={systemScreenshotSupported && settings.useSystemScreenshot}
          disabled={!systemScreenshotSupported}
          onChange={(checked) => {
            if (systemScreenshotSupported) {
              handleSettingChange("useSystemScreenshot", checked);
            }
          }}
        />
      </div>

    </div>
  );
};

export default GeneralTab;
