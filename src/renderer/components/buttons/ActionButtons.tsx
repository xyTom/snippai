import React from "react";
import PromptSelect from "../promptSelect";
import { models } from "../../lib/models";
import { ApiKeyButton } from "./ApiKeyButton";
import { RetryButton } from "./RetryButton";
import { CopyImageButton } from "./CopyImageButton";
import { PinButton } from "./PinButton";
import { TrashButton } from "./TrashButton";
import { PromptEditButton } from "./PromptEditButton";
import { CustomPrompt } from "../CustomPromptDialog";
import { AutoResponse } from "../../lib/auto-response";

interface ActionButtonsProps {
  isStickyMode: boolean;
  loading: boolean;
  model: string;
  result: string | null;
  autoResult?: AutoResponse | null;
  displayPrompt?: string;
  handlePreviewPromptChange?: (value: string) => void;
  handleAutoRunPromptChange?: (value: string) => void;
  onError: boolean;
  screenShotResult: string | null;
  handlePromptChange: (value: string) => void;
  customPrompts?: CustomPrompt[];
  promptVersion?: number;
  recoginzeScreenshot: (value: string) => void;
  copyImageToClipboard: () => void;
  imageCopied: boolean;
  pinToScreen: () => void;
  clearScreenshot: () => void;
  openApiKeyDialog: () => void;
  openPromptDialog?: () => void;
  responsivePromptSelect?: boolean;
}

const ActionButtons: React.FC<ActionButtonsProps> = ({
  isStickyMode,
  loading,
  model,
  result,
  autoResult,
  displayPrompt,
  handlePreviewPromptChange,
  handleAutoRunPromptChange,
  onError,
  screenShotResult,
  handlePromptChange,
  customPrompts,
  promptVersion,
  recoginzeScreenshot,
  copyImageToClipboard,
  imageCopied,
  pinToScreen,
  clearScreenshot,
  openApiKeyDialog,
  openPromptDialog,
  responsivePromptSelect,
}) => {
  if (isStickyMode) return null;

  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2 mb-2 justify-center min-h-[40px] items-center">
      <div className="flex items-center">
        <PromptSelect
          handlePromptChange={handlePromptChange}
          handlePreviewPromptChange={handlePreviewPromptChange}
          handleAutoRunPromptChange={handleAutoRunPromptChange}
          autoResult={autoResult}
          displayPrompt={displayPrompt}
          model={model}
          disabled={loading}
          responsiveMode={responsivePromptSelect ?? false}
          customPrompts={customPrompts}
          version={promptVersion}
        />
      </div>
      <div className="flex flex-nowrap gap-2 items-center">
        {openPromptDialog && <PromptEditButton onClick={openPromptDialog} />}
        {(result || onError) && screenShotResult && (
          <RetryButton onClick={() => recoginzeScreenshot(screenShotResult)} />
        )}
        {screenShotResult && <CopyImageButton onClick={copyImageToClipboard} copied={imageCopied} variant="secondary" />}
        {screenShotResult && <PinButton onClick={pinToScreen} />}
        {result && <TrashButton onClick={clearScreenshot} />}
        {models.find((m) => m.value === model)?.requireApiKey && (
          <ApiKeyButton onClick={openApiKeyDialog} />
        )}
      </div>
    </div>
  );
};

export default ActionButtons;
