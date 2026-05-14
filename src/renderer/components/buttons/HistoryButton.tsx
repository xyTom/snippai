"use client";

import React from "react";
import { History } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "../ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";

interface HistoryButtonProps {
  onClick: () => void;
}

export function HistoryButton({ onClick }: HistoryButtonProps) {
  const { t } = useTranslation();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="mt-auto"
            onClick={onClick}
          >
            <History className="h-5 w-5" />
            <span className="sr-only">{t("history.title")}</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{t("history.title")}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
