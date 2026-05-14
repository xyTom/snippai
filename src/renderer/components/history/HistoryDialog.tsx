import { Copy, RotateCcw, Trash2 } from "lucide-react";
import React from "react";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { SnipHistoryItem, clearSnipHistory, deleteSnipHistoryItem, fetchSnipHistory } from "@/utils/history";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "../ui/dialog";

interface HistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRestore: (item: SnipHistoryItem) => void;
}

const base64ToBlob = (base64: string): Blob => {
  const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
  return new Blob([bytes], { type: "image/png" });
};

export function HistoryDialog({
  open,
  onOpenChange,
  onRestore,
}: HistoryDialogProps) {
  const { t } = useTranslation();
  const [items, setItems] = useState<SnipHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      setItems(await fetchSnipHistory());
    } catch (err) {
      console.error("Failed to load screenshot history:", err);
      setError(t("history.load_failed"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (open) {
      void loadHistory();
    }
  }, [loadHistory, open]);

  const copyItem = async (item: SnipHistoryItem) => {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": base64ToBlob(item.imageBase64) }),
      ]);
    } catch (err) {
      console.error("Failed to copy history item:", err);
      setError(t("history.copy_failed"));
    }
  };

  const deleteItem = async (id: string) => {
    try {
      await deleteSnipHistoryItem(id);
      setItems((current) => current.filter((item) => item.id !== id));
    } catch (err) {
      console.error("Failed to delete history item:", err);
      setError(t("history.delete_failed"));
    }
  };

  const clearItems = async () => {
    try {
      await clearSnipHistory();
      setItems([]);
    } catch (err) {
      console.error("Failed to clear screenshot history:", err);
      setError(t("history.clear_failed"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-3xl overflow-hidden">
        <DialogTitle>{t("history.title")}</DialogTitle>
        <DialogDescription>{t("history.description")}</DialogDescription>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="mt-2 max-h-[60vh] overflow-y-auto pr-1">
          {loading ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              {t("history.loading")}
            </div>
          ) : items.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              {t("history.empty")}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="rounded-md border border-border bg-muted/10 p-3"
                >
                  <img
                    src={`data:image/png;base64,${item.imageBase64}`}
                    alt={t("history.item_alt")}
                    className="mb-3 h-36 w-full rounded-sm object-contain bg-black/30"
                  />
                  <div className="mb-3 space-y-1 text-xs text-muted-foreground">
                    <div>{new Date(item.createdAt).toLocaleString()}</div>
                    <div>
                      {item.model} / {item.prompt}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      onClick={() => onRestore(item)}
                    >
                      <RotateCcw className="h-4 w-4" />
                      {t("history.restore")}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      onClick={() => void copyItem(item)}
                    >
                      <Copy className="h-4 w-4" />
                      {t("history.copy")}
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => void deleteItem(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">{t("history.delete")}</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => void clearItems()}
            disabled={items.length === 0}
          >
            {t("history.clear")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
