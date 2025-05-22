import React from "react";
import { Button } from "@/renderer/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/renderer/components/ui/dropdown-menu";
import { useAuth } from "@/renderer/context/AuthContext";
import { UserIcon, LogOut } from "lucide-react";

export function UserMenuButton() {
  const { user, signOut } = useAuth();
  
  // 如果没有用户，不显示任何内容
  if (!user) {
    return null;
  }

  // 处理登出逻辑
  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="flex items-center gap-1 text-sm hover:bg-gray-700/50"
        >
          <UserIcon className="h-4 w-4" />
          <span className="max-w-[100px] truncate">{user.email?.split('@')[0]}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>My Account</DropdownMenuLabel>
        <DropdownMenuItem className="flex flex-col items-start">
          <span className="text-xs text-muted-foreground truncate max-w-[200px]">{user.email}</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut} className="text-red-500 focus:text-red-500 cursor-pointer">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
