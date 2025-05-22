import React from "react";
import { Button } from "@/renderer/components/ui/button";
import { UserIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

interface LoginButtonProps {
  onClick: () => void;
}

export function LoginButton({ onClick }: LoginButtonProps) {
  const {t} = useTranslation()
  return (
    <Button 
      variant="ghost" 
      size="sm" 
      className="flex items-center gap-1 text-sm hover:bg-gray-700/50" 
      onClick={onClick}
    >
      <UserIcon className="h-4 w-4" />
      <span>{t('login')}</span>
    </Button>
  );
}
