import React from 'react';
import { Button } from "../ui/button";
import { ClipboardCheckIcon, ClipboardCopyIcon } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import { useTranslation } from 'react-i18next';

interface CopyImageButtonProps {
  onClick: () => void;
  copied: boolean;
  variant: 'outline' | 'secondary' | 'destructive';
  className?: string;
}

export function CopyImageButton({ onClick, copied, variant, className }: CopyImageButtonProps) {
  // 判断是否使用小尺寸图标
  const isSmall = className?.includes('h-8') || className?.includes('w-8');
  const {t} = useTranslation()
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            className={`mt-auto ${className || ''}`} 
            variant={variant} 
            size="icon" 
            onClick={onClick}
          >
            {copied ? 
              <ClipboardCheckIcon className={isSmall ? "h-4 w-4" : "h-10 w-5"} /> : 
              <ClipboardCopyIcon className={isSmall ? "h-4 w-4" : "h-10 w-5"} />
            }
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{t('screenshot.copy_screenshot')}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
} 