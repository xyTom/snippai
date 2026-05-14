import React from "react";
import { useTranslation } from "react-i18next";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
import {
  AUTO_ACTIONS,
  type AutoAction,
  type AutoResponse,
} from "../lib/auto-response";

const labelKeys: Record<AutoAction, string> = {
  Text: "text",
  Formula: "formula",
  Table: "table",
  Code: "code",
  Solve: "solve",
  Image: "image",
  Color: "color",
  Translate: "translate",
  Calendar: "calendar_prompt",
};

interface AutoCandidateTabsProps {
  autoResult: AutoResponse;
  selectedAction: AutoAction;
  disabled?: boolean;
  onSelect: (action: AutoAction) => void;
}

export default function AutoCandidateTabs({
  autoResult,
  selectedAction,
  disabled = false,
  onSelect,
}: AutoCandidateTabsProps) {
  const { t } = useTranslation();
  const candidateActions = new Set(
    autoResult.candidates.map((candidate) => candidate.action)
  );

  return (
    <div className="w-full px-4 pb-2 flex justify-center">
      <Tabs
        value={selectedAction}
        onValueChange={(value) => onSelect(value as AutoAction)}
      >
        <TabsList data-testid="auto-candidate-tabs" className="flex flex-wrap h-auto">
          {AUTO_ACTIONS.map((action) => (
            <TabsTrigger
              key={action}
              value={action}
              disabled={disabled}
              data-testid={`auto-action-${action.toLowerCase()}`}
              className={candidateActions.has(action) ? "" : "opacity-70"}
            >
              {t(labelKeys[action])}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </div>
  );
}
