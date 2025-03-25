import React from 'react';
import { Button } from "../ui/button";
import { KeyRound } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";

interface ApiKeyButtonProps {
  onClick: () => void;
}

export function ApiKeyButton({ onClick }: ApiKeyButtonProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline" size="icon" className="mt-auto" onClick={onClick}>
            <KeyRound className="h-10 w-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Edit API Key</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
} 