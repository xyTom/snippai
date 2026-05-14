import React, { useState, useRef, useEffect } from "react";
import { MathJaxContext } from "better-react-mathjax";
import LoadingSkeleton from "./loadingSkeleton";
import DisplayLatex from "./displayLatex";
import DisplayTextResult from "./displayTextResult";
import TargetLangSelect from "../components/TargetLangSelect";

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
}) => (
  <div className={horizontalLayout ? "h-full flex flex-col" : ""}>
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
        <TargetLangSelect
          loading={loading}
          value={targetLang}
          onChange={onTargetLangChange ?? (() => undefined)}
        />
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

export default ResultDisplay;
