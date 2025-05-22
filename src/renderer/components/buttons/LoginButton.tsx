import React from "react";
import { Button } from "@/renderer/components/ui/button";
import { UserIcon } from "lucide-react";

interface LoginButtonProps {
  onClick: () => void;
}

export function LoginButton({ onClick }: LoginButtonProps) {
  return (
    <Button 
      variant="ghost" 
      size="sm" 
      className="flex items-center gap-1 text-sm hover:bg-gray-700/50" 
      onClick={onClick}
    >
      <UserIcon className="h-4 w-4" />
      <span>Login</span>
    </Button>
  );
}
