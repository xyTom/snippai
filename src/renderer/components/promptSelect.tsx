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

export default function PromptSelect(props: {
  handlePromptChange: (value: string) => void;
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

  const handleChange = useCallback(
    (value: string) => {
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
    [props.handlePromptChange, props.model, posthog]
  );

  return (
    <div className="w-full">
      {useDropdown ? (
        <Select
          disabled={props.disabled}
          value={selectedPrompt}
          onValueChange={handleChange}
        >
          <SelectTrigger className="w-[180px] bg-[#2a2a2a] text-white border border-[#3a3a3a] hover:bg-[#3a3a3a]">
            <SelectValue placeholder="Select a prompt" />
          </SelectTrigger>

          <SelectContent className="bg-[#1e1e1e] text-white border border-[#2a2a2a]">
            {allOptions.map((prompt, index) => (
              <SelectItem
                key={index}
                value={prompt.value}
                className="!text-white hover:bg-[#2a2a2a] focus:bg-[#2a2a2a] data-[state=checked]:bg-[#333] data-[state=checked]:!text-white"
              >
                {prompt.value.startsWith("custom:")
                  ? prompt.labelKey
                  : t(prompt.labelKey)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <Tabs
          value={selectedPrompt}
          onValueChange={(value) => handleChange(value)}
        >
          <TabsList>
            {allOptions.map((prompt, index) => (
              <TabsTrigger
                disabled={props.disabled}
                key={index}
                value={prompt.value}
              >
                {prompt.value.startsWith("custom:")
                  ? prompt.labelKey
                  : t(prompt.labelKey)}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}
    </div>
  );
}
