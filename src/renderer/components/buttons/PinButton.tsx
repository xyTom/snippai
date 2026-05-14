import React from 'react';
import { Button } from "../ui/button";
import { Pin } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import { useTranslation } from 'react-i18next';

interface PinButtonProps {
  onClick: () => void;
}

export function PinButton({ onClick }: PinButtonProps) {
  const {t} = useTranslation()
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            data-testid="pin-button"
            className="mt-auto"
            variant="secondary"
            size="icon"
            onClick={onClick}
          >
            <Pin className="h-10 w-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{t('screenshot.pin_to_screen')}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
