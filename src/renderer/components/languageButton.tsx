import React from "react"
import { Button } from "../components/ui/button"
import { Globe } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../components/ui/tooltip"

export function LanguageButton(props: { onClick: () => void, language: string }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline" size="icon" className="mt-auto" onClick={props.onClick}>
            <Globe className="h-10 w-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Current Language: {props.language}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
} 