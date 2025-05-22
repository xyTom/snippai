import React from 'react';
import { Button } from "../ui/button";
import { RotateCw } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";

interface RetryButtonProps {
  onClick: () => void;
}

export function RetryButton({ onClick }: RetryButtonProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button className="mt-auto" variant="secondary" size="icon" onClick={onClick}>
            <RotateCw className="h-10 w-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Retry</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
} 