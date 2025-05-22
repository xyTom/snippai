import { GalleryVerticalEnd, AlertCircle, Info } from "lucide-react";

import { cn } from "@/renderer/lib/utils";
import { Button } from "@/renderer/components/ui/button";
import { Input } from "@/renderer/components/ui/input";
import { Label } from "@/renderer/components/ui/label";
import React, { useState } from "react";
import { useAuth } from "@/renderer/context/AuthContext";
import { useTranslation, Trans } from "react-i18next";

interface LoginFormProps extends React.ComponentPropsWithoutRef<"div"> {
  onLoginSuccess?: () => void;
}

export function LoginForm({
  className,
  onLoginSuccess,
  ...props
}: LoginFormProps) {
  const { signIn, signUp } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const { t } = useTranslation();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      if (isRegistering) {
        // Handle registration
        const errorMessage = await signUp(email, password);
        if (errorMessage) {
          setError(errorMessage);
        } else {
          setSuccessMessage(
            `${t("login_form.registration_successful")}`
          );
          // Reset to login view
          setIsRegistering(false);
        }
      } else {
        // Handle login
        const errorMessage = await signIn(email, password);
        if (errorMessage) {
          setError(errorMessage);
        } else {
          // Login successful, invoke success callback
          if (onLoginSuccess) {
            onLoginSuccess();
          }
        }
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : isRegistering
          ? `${t("login_form.registration_failed")}`
          : `${t("login_form.login_failed")}`
      );
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setIsRegistering(!isRegistering);
    setError(null);
    setSuccessMessage(null);
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <form onSubmit={handleSubmit}>
        <div className="flex flex-col gap-6">
          <div className="flex flex-col items-center gap-2">
            <a
              href="#"
              className="flex flex-col items-center gap-2 font-medium"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-md">
                <GalleryVerticalEnd className="size-6" />
              </div>
              <span className="sr-only">Snippai</span>
            </a>
            <h1 className="text-xl font-bold">{t("login_form.welcome")}</h1>
            <div className="text-center text-sm">
              {isRegistering
                ? `${t("login_form.have_account")} `
                : `${t("login_form.no_account")} `}
              <button
                type="button"
                onClick={toggleMode}
                className="underline underline-offset-4 text-primary"
              >
                {isRegistering ? `${t("login_form.login")}` : `${t("login_form.sign_up")}`}
              </button>
            </div>
          </div>
          <div className="flex flex-col gap-6">
            <div className="grid gap-2">
              <Label htmlFor="email">{t("login_form.email")}</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">{t("login_form.password")}</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading
                ? isRegistering
                  ? `${t("login_form.registering")}`
                  : `${t("login_form.logging_in")}`
                : isRegistering
                ? `${t("login_form.register")}`
                : `${t("login_form.login")}`}
            </Button>
            {error && (
              <div className="flex items-start gap-2 text-red-500 text-sm mt-2 p-2 bg-red-50 border border-red-200 rounded">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
            {successMessage && (
              <div className="flex items-start gap-2 text-green-600 text-sm mt-2 p-2 bg-green-50 border border-green-200 rounded">
                <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}
          </div>
          <div className="relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t after:border-border">
            <span className="relative z-10 bg-background px-2 text-muted-foreground">
              {t("login_form.or")}
            </span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Button variant="outline" className="w-full" disabled>
              {t("login_form.continue_microsoft")}
            </Button>
            <Button variant="outline" className="w-full" disabled>
            {t("login_form.continue_google")}
            </Button>
            <div className="col-span-2 text-center text-xs text-amber-600 flex items-center justify-center gap-1">
              <AlertCircle className="h-3 w-3" />
              <span>{t("login_form.social_not_supported")}</span>
            </div>
          </div>
        </div>
      </form>
      <div className="text-balance text-center text-xs text-muted-foreground [&_a]:underline [&_a]:underline-offset-4 hover:[&_a]:text-primary  ">
        <Trans
          i18nKey="login_form.agree"
          components={[
            <a key="t" href="/terms"/>,
            <a key="p" href="/privacy"/>
          ]}
          values={{
            terms_of_service: t("login_form.terms_of_service"),
            privacy_policy: t("login_form.privacy_policy")
          }}
        />
      </div>
    </div>
  );
}
