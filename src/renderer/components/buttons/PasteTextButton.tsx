import React from "react";
import { ClipboardPaste } from "lucide-react";
import { Button } from "../ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import { useTranslation } from "react-i18next";

interface PasteTextButtonProps {
  onClick: () => void;
}

export function PasteTextButton({ onClick }: PasteTextButtonProps) {
  const { t } = useTranslation();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button className="mt-auto" variant="secondary" size="icon" onClick={onClick}>
            <ClipboardPaste className="h-10 w-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{t("text_input.paste")}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
