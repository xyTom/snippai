import React, { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Tabs, TabsList, TabsTrigger } from "../components/ui/tabs";
import { getPromptOptions, PromptOption } from "../lib/models";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { usePostHog } from "posthog-js/react";
import { CustomPrompt } from "./CustomPromptDialog";
import { AutoCandidate, AutoResponse } from "../lib/auto-response";

function PromptLabel({
  label,
  candidate,
  primary,
  activeAuto,
}: {
  label: string;
  candidate?: AutoCandidate;
  primary: boolean;
  activeAuto: boolean;
}) {
  const confidenceClass = !candidate
    ? ""
    : candidate.confidence >= 0.75
      ? "bg-green-500"
      : candidate.confidence >= 0.5
        ? "bg-yellow-500"
        : "bg-red-500";

  return (
    <span className="relative inline-flex min-w-0 items-center">
      <span className="truncate">{label}</span>
      {candidate && (
        <span
          className={`absolute -right-1 -top-1 h-1.5 w-1.5 rounded-full ${confidenceClass} ${
            primary ? "ring-1 ring-[#4f8cff]" : ""
          }`}
        />
      )}
      {activeAuto && (
        <span className="absolute -right-1 -top-1 h-1.5 w-1.5 rounded-full bg-[#4f8cff]" />
      )}
    </span>
  );
}

export default function PromptSelect(props: {
  handlePromptChange: (value: string) => void;
  handlePreviewPromptChange?: (value: string) => void;
  handleAutoRunPromptChange?: (value: string) => void;
  autoResult?: AutoResponse | null;
  displayPrompt?: string;
  model: string;
  disabled: boolean;
  responsiveMode?: boolean;
  customPrompts?: CustomPrompt[];
  version?: number;
}) {
  const { t } = useTranslation();
  const posthog = usePostHog();
  const DROPDOWN_SWITCH_WIDTH = 790;
  const options = getPromptOptions(props.model);
  const customOptions: PromptOption[] = (props.customPrompts ?? []).map(
    (item) => ({
      value: `custom:${item.id}`,
      labelKey: item.label,
      prompt: item.prompt,
    })
  );
  const allOptions = [...options, ...customOptions];

  const [useDropdown, setUseDropdown] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState(() => {
    const saved = localStorage.getItem("lastPrompt");
    const validPrompts = allOptions.map((p) => p.value);
    return saved && validPrompts.includes(saved)
      ? saved
      : allOptions[0]?.value || "";
  });

  useEffect(() => {
    localStorage.setItem("lastPrompt", selectedPrompt);
  }, [selectedPrompt]);

  useEffect(() => {
    const saved = localStorage.getItem("lastPrompt");
    const validPrompts = allOptions.map((p) => p.value);
    if (!validPrompts.includes(saved || "")) {
      const fallback = allOptions[0]?.value || "";
      setSelectedPrompt(fallback);
      localStorage.setItem("lastPrompt", fallback);
      props.handlePromptChange(fallback);
    }
  }, [props.model, props.version]);

  useEffect(() => {
    props.handlePromptChange(selectedPrompt);
  }, []);

  useEffect(() => {
    const updateWidth = () => {
      const width = window.innerWidth;
      if (props.responsiveMode) {
        setUseDropdown(width < DROPDOWN_SWITCH_WIDTH);
      } else {
        setUseDropdown(false);
      }
    };

    updateWidth();

    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, [props.responsiveMode]);

  const hasAutoResult = !!props.autoResult?.candidates?.length;
  const isAutoLocked = selectedPrompt === "Auto" && hasAutoResult;
  const uiValue =
    isAutoLocked && props.displayPrompt && props.displayPrompt !== "Auto"
      ? props.displayPrompt
      : selectedPrompt;

  const handleChange = useCallback(
    (value: string) => {
      if (isAutoLocked && value === "Auto") {
        const primaryAction = props.autoResult?.primaryAction;
        if (primaryAction) {
          props.handlePreviewPromptChange?.(primaryAction);
        }
        return;
      }

      if (isAutoLocked && value !== "Auto") {
        const candidate = props.autoResult?.candidates?.find(
          (item) => item.action === value
        );

        if (candidate) {
          props.handlePreviewPromptChange?.(value);
        } else {
          props.handleAutoRunPromptChange?.(value);
        }
        return;
      }

      setSelectedPrompt(value);
      props.handlePromptChange(value);
      try {
        posthog?.capture("prompt_selected", {
          prompt: value,
          model: props.model,
        });
      } catch (e) {
        console.error(e);
      }
    },
    [
      isAutoLocked,
      props.autoResult,
      props.handlePreviewPromptChange,
      props.handleAutoRunPromptChange,
      props.handlePromptChange,
      props.model,
      posthog,
    ]
  );

  const handleDoubleClick = useCallback(
    (value: string) => {
      if (!isAutoLocked || value === "Auto") {
        return;
      }

      setSelectedPrompt(value);
      props.handlePromptChange(value);
    },
    [isAutoLocked, props.handlePromptChange]
  );

  const renderPromptLabel = useCallback(
    (prompt: PromptOption) => {
      const candidate = props.autoResult?.candidates?.find(
        (item) => item.action === prompt.value
      );
      const label = prompt.value.startsWith("custom:")
        ? prompt.labelKey
        : t(prompt.labelKey);

      return (
        <PromptLabel
          label={label}
          candidate={candidate}
          primary={props.autoResult?.primaryAction === prompt.value}
          activeAuto={prompt.value === "Auto" && isAutoLocked}
        />
      );
    },
    [isAutoLocked, props.autoResult, t]
  );

  return (
    <div className="w-full">
      {useDropdown ? (
        <Select
          disabled={props.disabled}
          value={uiValue}
          onValueChange={handleChange}
        >
          <SelectTrigger
            data-testid="prompt-selector"
            className={`w-[180px] bg-[#2a2a2a] text-white border border-[#3a3a3a] hover:bg-[#3a3a3a] ${
              isAutoLocked ? "ring-1 ring-[#4f8cff]" : ""
            }`}
          >
            <SelectValue placeholder="Select a prompt" />
          </SelectTrigger>

          <SelectContent className="bg-[#1e1e1e] text-white border border-[#2a2a2a]">
            {allOptions.map((prompt, index) => (
              <SelectItem
                key={index}
                value={prompt.value}
                className="!text-white hover:bg-[#2a2a2a] focus:bg-[#2a2a2a] data-[state=checked]:bg-[#333] data-[state=checked]:!text-white"
              >
                {renderPromptLabel(prompt)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <Tabs
          data-testid="prompt-selector"
          value={uiValue}
          onValueChange={(value) => handleChange(value)}
        >
          <TabsList className={isAutoLocked ? "ring-1 ring-[#4f8cff]" : ""}>
            {allOptions.map((prompt, index) => (
              <TabsTrigger
                disabled={props.disabled}
                key={index}
                value={prompt.value}
                onDoubleClick={() => handleDoubleClick(prompt.value)}
                title={
                  isAutoLocked && prompt.value !== "Auto"
                    ? "Double-click to lock this mode"
                    : undefined
                }
              >
                {renderPromptLabel(prompt)}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}
    </div>
  );
}
