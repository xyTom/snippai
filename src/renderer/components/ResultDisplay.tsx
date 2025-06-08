import React, { useState, useRef, useEffect } from "react";
import { MathJaxContext } from "better-react-mathjax";
import LoadingSkeleton from "./loadingSkeleton";
import DisplayLatex from "./displayLatex";
import DisplayTextResult from "./displayTextResult";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Input } from "../components/ui/input";

const getLangDisplayName = (code: string | undefined): string => {
  switch (code) {
    case "en":
      return "English";
    case "es":
      return "Español";
    case "ja":
      return "日本語";
    case "ko":
      return "한국어";
    case "zh-CN":
      return "中文（简体）";
    case "zh-TW":
      return "中文（繁體）";
    case "fr":
      return "Français";
    case "de":
      return "Deutsch";
    case "pt":
      return "Português";
    case "it":
      return "Italiano";
    case "ru":
      return "Русский";
    case "ar":
      return "العربية";
    case "hi":
      return "हिन्दी";
    case "default":
      return `Default（${localStorage.getItem("language") || "Default"}）`;
    default:
      return code || "";
  }
};

interface ResultDisplayProps {
  loading: boolean;
  result: string | null;
  prompt: string;
  handleTextChange: (text: string) => void;
  isStickyMode?: boolean;
  horizontalLayout?: boolean;
  targetLang?: string;
  onTargetLangChange?: (lang: string) => void;
}

const ResultDisplay: React.FC<ResultDisplayProps> = ({
  loading,
  result,
  prompt,
  handleTextChange,
  isStickyMode,
  horizontalLayout,
  targetLang,
  onTargetLangChange,
}) => {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [side, setSide] = useState<"top" | "bottom">("bottom");
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const handleOpenChange = (o: boolean) => {
    if (loading) return;
    setOpen(o);
    if (o && triggerRef.current) {
      const { top, bottom } = triggerRef.current.getBoundingClientRect();
      const above = top;
      const below = window.innerHeight - bottom;
      setSide(above > below ? "top" : "bottom");
    } else if (!o) {
      setSearch("");
    }
  };

  useEffect(() => {
    if (open && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [open]);

  const staticLangs = React.useMemo(
    () => [
      { code: "en", name: "English" },
      { code: "es", name: "Español" },
      { code: "ja", name: "日本語" },
      { code: "ko", name: "한국어" },
      { code: "zh-CN", name: "中文（简体）" },
      { code: "zh-TW", name: "中文（繁體）" },
      { code: "fr", name: "Français" },
      { code: "de", name: "Deutsch" },
      { code: "pt", name: "Português" },
      { code: "it", name: "Italiano" },
      { code: "ru", name: "Русский" },
      { code: "ar", name: "العربية" },
      { code: "hi", name: "हिन्दी" },
    ],
    []
  );

  const langs = [
    {
      code: "default",
      name: `Default（${localStorage.getItem("language") || "Default"}）`,
    },
    ...staticLangs,
  ];

  const filtered = langs.filter((l) =>
    l.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className={horizontalLayout ? "h-full flex flex-col" : ""}>
      {/* 语言选择 */}
      {prompt === "Translate" && (
        <div className="mb-3 flex justify-end items-center space-x-2 w-full z-10 relative">
          <button
            type="button"
            disabled
            className="w-[180px] h-8 bg-[#2a2a2a] text-gray-500 border border-[#3a3a3a] rounded-md px-3 text-sm cursor-not-allowed select-none"
          >
            Auto-detect
          </button>

          <span className="text-white text-lg select-none">⇄</span>

          <Select
            value={targetLang}
            open={open}
            onOpenChange={handleOpenChange}
            onValueChange={(val) => {
              localStorage.setItem("targetLang", val);
              onTargetLangChange?.(val);
            }}
          >
            <SelectTrigger
              ref={triggerRef}
              disabled={loading}
              className={`w-[180px] h-8 rounded-md px-3 text-sm border ${
                loading
                  ? "bg-[#3a3a3a] text-gray-500 border-[#3a3a3a] cursor-not-allowed"
                  : "bg-[#2a2a2a] text-white border-[#3a3a3a] hover:bg-[#3a3a3a]"
              }`}
            >
              <SelectValue className="truncate text-left pr-6">
                {getLangDisplayName(targetLang)}
              </SelectValue>
            </SelectTrigger>

            <SelectContent
              side={side}
              position="popper"
              avoidCollisions={false}
              className="w-[var(--radix-select-trigger-width)] bg-[#1e1e1e] text-white border border-[#2a2a2a] text-sm p-0"
              onKeyDown={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 z-10 bg-[#1e1e1e] p-1 border-b border-[#2a2a2a]">
                <Input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    requestAnimationFrame(() =>
                      searchInputRef.current?.focus()
                    );
                  }}
                  placeholder="Search language..."
                  className="w-full h-8 text-sm bg-white text-black rounded-md px-2 box-border"
                  onMouseDown={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                  ref={searchInputRef}
                />
              </div>

              <div className="max-h-56 overflow-y-auto">
                {filtered.map((l) => (
                  <SelectItem key={l.code} value={l.code}>
                    {l.name}
                  </SelectItem>
                ))}
              </div>
            </SelectContent>
          </Select>
        </div>
      )}

      {loading && (
        <div className="flex-1 h-full">
          <LoadingSkeleton />
        </div>
      )}

      <MathJaxContext
        version={3}
        config={{
          loader: { load: ["[tex]/html"] },
          tex: {
            packages: { "[+]": ["html"] },
            inlineMath: [
              ["$", "$"],
              ["\\(", "\\)"],
            ],
            displayMath: [
              ["$$", "$$"],
              ["\\[", "\\]"],
              ["```latex", "```"],
            ],
          },
        }}
      >
        {result && prompt === "Formula" && <DisplayLatex latex={result} />}
      </MathJaxContext>

      {result && (
        <DisplayTextResult
          text={result}
          onTextChange={handleTextChange}
          isStickyMode={isStickyMode}
          horizontalLayout={horizontalLayout}
        />
      )}
    </div>
  );
};

export default ResultDisplay;
