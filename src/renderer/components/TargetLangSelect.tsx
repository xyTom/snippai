"use client";

import React, { useState, useEffect } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "../components/ui/popover";
import {
  Command,
  CommandInput,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "../components/ui/command";
import { Button } from "../components/ui/button";
import { cn } from "../lib/utils";

const LANG_LABEL_MAP: Record<string, string> = {
  en: "English",
  es: "Español",
  ja: "日本語",
  ko: "한국어",
  "zh-cn": "中文（简体）",
  "zh-tw": "中文（繁體）",
  fr: "Français",
  de: "Deutsch",
  pt: "Português",
  it: "Italiano",
  ru: "Русский",
  ar: "العربية",
  hi: "हिन्दी",
  default: `Default（${
    typeof window !== "undefined"
      ? localStorage.getItem("language") || "Default"
      : "Default"
  }）`,
};

const getLangDisplayName = (code: string | undefined): string => {
  if (!code) return "Select…";
  const key = code.toLowerCase();
  return LANG_LABEL_MAP[key] ?? key;
};

// Props
interface TargetLangSelectProps {
  loading?: boolean;
  value: string | undefined;
  onChange: (val: string) => void;
}

const TargetLangSelect: React.FC<TargetLangSelectProps> = ({
  loading = false,
  value,
  onChange,
}) => {
  const [open, setOpen] = useState(false);

  const staticLangs = React.useMemo(
    () => [
      { code: "en", label: "English" },
      { code: "es", label: "Español" },
      { code: "ja", label: "日本語" },
      { code: "ko", label: "한국어" },
      { code: "zh-CN", label: "中文（简体）" },
      { code: "zh-TW", label: "中文（繁體）" },
      { code: "fr", label: "Français" },
      { code: "de", label: "Deutsch" },
      { code: "pt", label: "Português" },
      { code: "it", label: "Italiano" },
      { code: "ru", label: "Русский" },
      { code: "ar", label: "العربية" },
      { code: "hi", label: "हिन्दी" },
    ],
    []
  );

  const langs = React.useMemo(
    () => [
      {
        code: "default",
        label: `Default（${localStorage.getItem("language") || "Default"}）`,
      },
      ...staticLangs,
    ],
    [staticLangs]
  );

  useEffect(() => {
    localStorage.setItem("targetLang", value || "");
  }, [value]);

  // Render
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          disabled={loading}
          aria-expanded={open}
          className="w-[180px] justify-between"
        >
          {getLangDisplayName(value)}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="start"
        className="w-[180px] p-0 dark"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <Command>
          <CommandInput placeholder="Search language…" />
          <CommandList className="overflow-y-auto max-h-[30vh]">
            <CommandEmpty>No language found.</CommandEmpty>
            <CommandGroup>
              {langs.map((lang) => (
                <CommandItem
                  key={lang.code}
                  value={lang.code}
                  onSelect={(current) => {
                    onChange(current);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === lang.code ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {lang.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default TargetLangSelect;
