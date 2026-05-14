import * as React from "react";
import { Check, Pencil, Trash2 } from "lucide-react";
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
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [label, setLabel] = React.useState("");
  const [prompt, setPrompt] = React.useState("");

  const canSave = label.trim() && prompt.trim();

  const resetDraft = () => {
    setEditingId(null);
    setLabel("");
    setPrompt("");
  };

  const editPrompt = (item: CustomPrompt) => {
    setEditingId(item.id);
    setLabel(item.label);
    setPrompt(item.prompt);
  };

  const upsertPrompt = () => {
    if (!canSave) {
      return;
    }

    const nextPrompt = {
      id: editingId ?? crypto.randomUUID(),
      label: label.trim(),
      prompt: prompt.trim(),
    };

    onPromptsChange(
      editingId
        ? prompts.map((item) => (item.id === editingId ? nextPrompt : item))
        : [...prompts, nextPrompt]
    );
    resetDraft();
  };

  const removePrompt = (id: string) => {
    onPromptsChange(prompts.filter((item) => item.id !== id));
    if (editingId === id) {
      resetDraft();
    }
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
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => editPrompt(item)}
                  >
                    <div className="truncate text-sm font-medium">
                      {item.label}
                    </div>
                    <div className="mt-1 line-clamp-3 whitespace-pre-wrap break-words text-xs text-muted-foreground">
                      {item.prompt}
                    </div>
                  </button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => editPrompt(item)}
                    title={t("settings.edit")}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
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
            <div className="flex justify-end gap-2">
              {editingId && (
                <Button variant="outline" size="sm" onClick={resetDraft}>
                  {t("settings.cancel")}
                </Button>
              )}
              <Button size="sm" disabled={!canSave} onClick={upsertPrompt}>
                <Check className="h-4 w-4" />
                {editingId ? t("settings.save") : t("custom_prompts.add")}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CustomPromptDialog;
