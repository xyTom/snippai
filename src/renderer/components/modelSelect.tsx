"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"

import { cn } from "../lib/utils"
import { Button } from "../components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "../components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../components/ui/popover"
import { models } from "../lib/models"
import { LLMProvider } from "../types/settings"
import { useTranslation } from "react-i18next"
import { usePostHog } from "posthog-js/react"

export default function ModelSelect(props:{
  handleModelChange: (value: string) => void;
  providers?: LLMProvider[];
}) {
  const [open, setOpen] = React.useState(false)
  const {t} = useTranslation();
  const posthog = usePostHog();
  const allModels = React.useMemo(() => {
    const providerModels = (props.providers ?? [])
      .filter((provider) => provider.enabled)
      .flatMap((provider) =>
        provider.models.map((modelName) => ({
          value: `provider:${provider.id}:${modelName}`,
          label: `${modelName} (${provider.name})`,
        }))
      );

    console.log('[ModelSelect] allModels computed:', [...models, ...providerModels].length, 'total');
    console.log('[ModelSelect] providers:', props.providers);
    console.log('[ModelSelect] providerModels:', providerModels);

    return [...models, ...providerModels];
  }, [props.providers]);

  //read the model from local storage
  const savedModel = localStorage.getItem("model")
  const initialModel = savedModel && allModels.find((m) => m.value === savedModel)
    ? savedModel
    : "auto"
  const [value, setValue] = React.useState(initialModel)
  const selectedLabel =
    allModels.find((model) => model.value === value)?.label ?? "";

  React.useEffect(() => {
    const saved = localStorage.getItem("model");
    if (saved && allModels.find((item) => item.value === saved)) {
      setValue(saved);
      return;
    }

    setValue((current) =>
      allModels.find((item) => item.value === current) ? current : "auto"
    );
  }, [allModels]);
  
  //when the model is updated, update the parent state
  React.useEffect(() => {
    if (!value) {
      setValue(initialModel)
    }
    props.handleModelChange(value)
    //save the model to local storage
    localStorage.setItem("model", value)
  }, [value])


  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          data-testid="model-selector"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[220px] justify-between gap-2"
          title={selectedLabel}
        >
          <span className="min-w-0 flex-1 truncate text-left">
            {selectedLabel}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[260px] p-0 dark">
        <Command>
          <CommandInput placeholder={`${t("search_model")}`} />
          <CommandEmpty>{t("no_model_found")}</CommandEmpty>
          <CommandGroup>
            {allModels.map((model) => (
              <CommandItem
                key={model.value}
                value={model.value}
                className="min-w-0"
                onSelect={() => {
                  setValue(model.value)
                  setOpen(false)
                  try {
                    posthog?.capture("model_selected", { model: model.value })
                  } catch (e) {
                    console.error(e);
                  }
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    value === model.value ? "opacity-100" : "opacity-0"
                  )}
                />
                <span className="min-w-0 truncate" title={model.label}>
                  {model.label}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
