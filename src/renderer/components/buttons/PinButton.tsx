import React from 'react';
import { Button } from "../ui/button";
import { Pin } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";

interface PinButtonProps {
  onClick: () => void;
}

export function PinButton({ onClick }: PinButtonProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button className="mt-auto" variant="secondary" size="icon" onClick={onClick}>
            <Pin className="h-10 w-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Pin to screen</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
} 