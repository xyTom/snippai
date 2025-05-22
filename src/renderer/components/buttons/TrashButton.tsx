import React from "react";
import { Button } from "../ui/button";
import { Trash2 } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import { useTranslation } from "react-i18next";

interface TrashButtonProps {
  onClick: () => void;
}

export function TrashButton({ onClick }: TrashButtonProps) {
  const { t } = useTranslation();
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            className="mt-auto"
            variant="destructive"
            size="icon"
            onClick={onClick}
          >
            <Trash2 className="h-10 w-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{t("screenshot.clear_screenshot")}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
