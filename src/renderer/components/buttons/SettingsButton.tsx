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
            <Settings className="h-5 w-5" />
            <span className="sr-only">Settings</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Settings</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
