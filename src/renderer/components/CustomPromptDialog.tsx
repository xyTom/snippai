import * as React from "react";
import { Check, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";

export interface CustomPrompt {
  id: string;
  label: string;
  prompt: string;
}

interface CustomPromptDialogProps {
  open: boolean;
  prompts: CustomPrompt[];
  onOpenChange: (open: boolean) => void;
  onPromptsChange: (prompts: CustomPrompt[]) => void;
}

const CustomPromptDialog: React.FC<CustomPromptDialogProps> = ({
  open,
  prompts,
  onOpenChange,
  onPromptsChange,
}) => {
  const { t } = useTranslation();
  const [label, setLabel] = React.useState("");
  const [prompt, setPrompt] = React.useState("");

  const canSave = label.trim() && prompt.trim();

  const addPrompt = () => {
    if (!canSave) {
      return;
    }

    onPromptsChange([
      ...prompts,
      {
        id: crypto.randomUUID(),
        label: label.trim(),
        prompt: prompt.trim(),
      },
    ]);
    setLabel("");
    setPrompt("");
  };

  const removePrompt = (id: string) => {
    onPromptsChange(prompts.filter((item) => item.id !== id));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("custom_prompts.title")}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-5">
          <div className="max-h-[260px] space-y-3 overflow-y-auto pr-1">
            {prompts.map((item) => (
              <div
                key={item.id}
                className="rounded-md border border-border bg-muted/10 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">
                      {item.label}
                    </div>
                    <div className="mt-1 line-clamp-3 whitespace-pre-wrap break-words text-xs text-muted-foreground">
                      {item.prompt}
                    </div>
                  </div>
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => removePrompt(item.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            {prompts.length === 0 && (
              <div className="rounded-md border border-dashed border-border p-5 text-center text-sm text-muted-foreground">
                {t("custom_prompts.empty")}
              </div>
            )}
          </div>

          <div className="grid gap-3 border-t border-border pt-4">
            <div className="grid gap-2">
              <Label htmlFor="custom-prompt-label">
                {t("custom_prompts.label")}
              </Label>
              <Input
                id="custom-prompt-label"
                value={label}
                onChange={(event) => setLabel(event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="custom-prompt-text">
                {t("custom_prompts.prompt")}
              </Label>
              <Textarea
                id="custom-prompt-text"
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                className="min-h-[120px]"
              />
            </div>
            <div className="flex justify-end">
              <Button size="sm" disabled={!canSave} onClick={addPrompt}>
                <Check className="h-4 w-4" />
                {t("custom_prompts.add")}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CustomPromptDialog;
