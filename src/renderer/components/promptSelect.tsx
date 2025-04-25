import React, { useEffect, useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "../components/ui/tabs";
import { promptOptions } from "../lib/models";

export default function PromptSelect(props: {
  handlePromptChange: Function;
  model: string;
  disabled: boolean;
  responsiveMode?: boolean; 
}) {
  const options = promptOptions as {
    [key: string]: { value: string; label: string; prompt: string }[];
  };

  const [useDropdown, setUseDropdown] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState(
    options[props.model][0]?.value || ""
  );

  useEffect(() => {
    const updateWidth = () => {
      const width = window.innerWidth;
      if (props.responsiveMode) {
        setUseDropdown(width < 780);
      } else {
        setUseDropdown(false); 
      }
    };

    updateWidth();

    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, [props.responsiveMode]);

  const handleChange = (value: string) => {
    setSelectedPrompt(value);
    props.handlePromptChange(value);
  };

  return (
    <div className="w-full">
      {useDropdown ? (
        <select
          disabled={props.disabled}
          value={selectedPrompt}
          onChange={(e) => handleChange(e.target.value)}
          className="border border-gray-300 rounded px-2 py-1 text-sm"
        >
          {options[props.model].map((prompt, index) => (
            <option key={index} value={prompt.value}>
              {prompt.label}
            </option>
          ))}
        </select>
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
                {prompt.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}
    </div>
  );
}