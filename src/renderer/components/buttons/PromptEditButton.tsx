import React from "react";
import { ListPlus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "../ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";

interface PromptEditButtonProps {
  onClick: () => void;
}

export function PromptEditButton({ onClick }: PromptEditButtonProps) {
  const { t } = useTranslation();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button className="mt-auto" variant="secondary" size="icon" onClick={onClick}>
            <ListPlus className="h-10 w-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{t("custom_prompts.manage")}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
