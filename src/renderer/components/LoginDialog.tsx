import React from "react";
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from "@/renderer/components/ui/dialog";
import { LoginForm } from "@/renderer/components/login-form";
import { VisuallyHidden } from "@/renderer/components/ui/visually-hidden";

interface LoginDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LoginDialog({ open, onOpenChange }: LoginDialogProps) {
  // 处理登录成功的回调，关闭对话框
  const handleLoginSuccess = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] h-full overflow-y-auto">
        <DialogTitle>
          <VisuallyHidden>Login</VisuallyHidden>
        </DialogTitle>
        <LoginForm className="py-4" onLoginSuccess={handleLoginSuccess} />
      </DialogContent>
    </Dialog>
  );
}
