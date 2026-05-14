import * as React from "react";
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Switch } from "../ui/switch";
import { LLMProvider } from "../../types/settings";

interface LLMProvidersTabProps {
  providers: LLMProvider[];
  onProvidersChange: (providers: LLMProvider[]) => void;
}

interface ProviderDraft {
  id?: string;
  name: string;
  baseURL: string;
  apiKey: string;
  orgId: string;
  models: string;
}

const emptyDraft = (): ProviderDraft => ({
  name: "",
  baseURL: "https://api.openai.com",
  apiKey: "",
  orgId: "",
  models: "gpt-4o",
});

const toModelList = (value: string): string[] =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const toDraft = (provider: LLMProvider): ProviderDraft => ({
  id: provider.id,
  name: provider.name,
  baseURL: provider.baseURL,
  apiKey: provider.apiKey,
  orgId: provider.orgId ?? "",
  models: provider.models.join(", "),
});

const toProvider = (draft: ProviderDraft, previous?: LLMProvider): LLMProvider => ({
  id: draft.id || crypto.randomUUID(),
  name: draft.name.trim() || draft.baseURL.trim(),
  baseURL: draft.baseURL.trim().replace(/\/$/, ""),
  apiKey: draft.apiKey.trim(),
  orgId: draft.orgId.trim() || undefined,
  models: toModelList(draft.models),
  enabled: previous?.enabled ?? true,
});

const isDraftValid = (draft: ProviderDraft): boolean =>
  Boolean(draft.baseURL.trim() && toModelList(draft.models).length);

const LLMProvidersTab: React.FC<LLMProvidersTabProps> = ({
  providers,
  onProvidersChange,
}) => {
  const { t } = useTranslation();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<ProviderDraft>(emptyDraft);

  const openCreateDialog = () => {
    setDraft(emptyDraft());
    setDialogOpen(true);
  };

  const openEditDialog = (provider: LLMProvider) => {
    setDraft(toDraft(provider));
    setDialogOpen(true);
  };

  const updateDraft = (key: keyof ProviderDraft, value: string) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const upsertProvider = () => {
    if (!isDraftValid(draft)) {
      return;
    }

    const existing = providers.find((provider) => provider.id === draft.id);
    const nextProvider = toProvider(draft, existing);
    const nextProviders = existing
      ? providers.map((provider) =>
          provider.id === nextProvider.id ? nextProvider : provider
        )
      : [...providers, nextProvider];

    onProvidersChange(nextProviders);
    setDialogOpen(false);
  };

  const setEnabled = (id: string, enabled: boolean) => {
    onProvidersChange(
      providers.map((provider) =>
        provider.id === id ? { ...provider, enabled } : provider
      )
    );
  };

  const removeProvider = (id: string) => {
    onProvidersChange(providers.filter((provider) => provider.id !== id));
  };

  const moveProvider = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= providers.length) {
      return;
    }

    const nextProviders = [...providers];
    const [provider] = nextProviders.splice(index, 1);
    nextProviders.splice(targetIndex, 0, provider);
    onProvidersChange(nextProviders);
  };

  return (
    <div className="space-y-5 mt-6">
      <div className="space-y-3">
        {providers.map((provider, index) => (
          <div
            key={provider.id}
            className="rounded-md border border-border bg-muted/10 p-4"
          >
            <div className="flex items-start justify-between gap-4">
              <button
                type="button"
                className="min-w-0 flex-1 text-left"
                onClick={() => openEditDialog(provider)}
              >
                <div className="truncate text-sm font-medium">
                  {provider.name}
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  {provider.baseURL}
                </div>
                <div className="mt-1 truncate text-xs text-muted-foreground">
                  {provider.models.join(", ")}
                </div>
              </button>
              <div className="flex shrink-0 items-center gap-2">
                <Switch
                  checked={provider.enabled}
                  aria-label={t("settings.llm_provider_enabled")}
                  onCheckedChange={(checked) =>
                    setEnabled(provider.id, checked)
                  }
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => openEditDialog(provider)}
                  title={t("settings.llm_provider_edit")}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  disabled={index === 0}
                  onClick={() => moveProvider(index, -1)}
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  disabled={index === providers.length - 1}
                  onClick={() => moveProvider(index, 1)}
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={() => removeProvider(provider.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}

        {providers.length === 0 && (
          <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            {t("settings.llm_provider_empty")}
          </div>
        )}
      </div>

      <div className="pt-2 flex justify-start">
        <Button variant="outline" onClick={openCreateDialog} size="sm">
          <Plus className="h-4 w-4" />
          {t("settings.llm_provider_add")}
        </Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {draft.id
                ? t("settings.llm_provider_edit")
                : t("settings.llm_provider_add")}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="provider-name">
                {t("settings.llm_provider_name")}
              </Label>
              <Input
                id="provider-name"
                value={draft.name}
                onChange={(event) => updateDraft("name", event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="provider-base-url">
                {t("settings.llm_provider_base_url")}
              </Label>
              <Input
                id="provider-base-url"
                value={draft.baseURL}
                onChange={(event) =>
                  updateDraft("baseURL", event.target.value)
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="provider-api-key">
                {t("settings.llm_provider_api_key")}
              </Label>
              <Input
                id="provider-api-key"
                type="password"
                placeholder={t("settings.optional")}
                value={draft.apiKey}
                onChange={(event) => updateDraft("apiKey", event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="provider-org-id">
                {t("settings.llm_provider_org_id")}
              </Label>
              <Input
                id="provider-org-id"
                value={draft.orgId}
                onChange={(event) => updateDraft("orgId", event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="provider-models">
                {t("settings.llm_provider_models")}
              </Label>
              <Input
                id="provider-models"
                value={draft.models}
                onChange={(event) => updateDraft("models", event.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDialogOpen(false)}
              >
                {t("settings.cancel")}
              </Button>
              <Button
                size="sm"
                disabled={!isDraftValid(draft)}
                onClick={upsertProvider}
              >
                {t("settings.save")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LLMProvidersTab;
