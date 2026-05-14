"use client";

import * as React from 'react';
import { Button } from "../ui/button";
import { Settings } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import { useTranslation } from 'react-i18next';

/**
 * Props for the SettingsButton component
 */
interface SettingsButtonProps {
  /** Callback function triggered when the button is clicked */
  onClick: () => void;
}

/**
 * Settings button component with tooltip
 */
export function SettingsButton({ onClick }: SettingsButtonProps) {
  const { t } = useTranslation();
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            data-testid="settings-button"
            variant="outline"
            size="icon"
            className="mt-auto"
            onClick={onClick}
          >
            <Settings className="h-5 w-5" />
            <span className="sr-only">{t("settings.title")}</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{t("settings.title")}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
