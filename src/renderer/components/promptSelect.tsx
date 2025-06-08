import React, { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Tabs, TabsList, TabsTrigger } from "../components/ui/tabs";
import { promptOptions } from "../lib/models";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";

export default function PromptSelect(props: {
  handlePromptChange: Function;
  model: string;
  disabled: boolean;
  responsiveMode?: boolean;
}) {
  const { t } = useTranslation();
  const DROPDOWN_SWITCH_WIDTH = 790;
  const options = promptOptions as {
    [key: string]: { value: string; labelKey: string; prompt: string }[];
  };

  const [useDropdown, setUseDropdown] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState(() => {
    const saved = localStorage.getItem("lastPrompt");
    const validPrompts = options[props.model]?.map((p) => p.value) || [];
    return saved && validPrompts.includes(saved)
      ? saved
      : options[props.model][0]?.value || "";
  });

  useEffect(() => {
    localStorage.setItem("lastPrompt", selectedPrompt);
  }, [selectedPrompt]);

  useEffect(() => {
    const saved = localStorage.getItem("lastPrompt");
    const validPrompts = options[props.model]?.map((p) => p.value) || [];
    if (!validPrompts.includes(saved || "")) {
      const fallback = options[props.model][0]?.value || "";
      setSelectedPrompt(fallback);
      localStorage.setItem("lastPrompt", fallback);
      props.handlePromptChange(fallback);
    }
  }, [props.model]);

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
    },
    [props.handlePromptChange]
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
            {options[props.model].map((prompt, index) => (
              <SelectItem
                key={index}
                value={prompt.value}
                className="!text-white hover:bg-[#2a2a2a] focus:bg-[#2a2a2a] data-[state=checked]:bg-[#333] data-[state=checked]:!text-white"
              >
                {t(prompt.labelKey)}
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
            {options[props.model].map((prompt, index) => (
              <TabsTrigger
                disabled={props.disabled}
                key={index}
                value={prompt.value}
              >
                {t(prompt.labelKey)}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}
    </div>
  );
}
