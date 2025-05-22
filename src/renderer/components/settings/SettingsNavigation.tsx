"use client";

import * as React from 'react';
import { cn } from "../../lib/utils";
import { useTranslation } from 'react-i18next';
/**
 * Available settings tabs
 */
export type SettingsTab = 'general' | 'shortcuts' | 'about';

/**
 * Interface for a settings navigation item
 */
export interface SettingsNavItem {
  id: SettingsTab;
  label: string;
  icon?: React.ReactNode;
}

interface SettingsNavigationProps {
  activeTab: SettingsTab;
  navItems: SettingsNavItem[];
  onTabChange: (tab: SettingsTab) => void;
}

/**
 * Settings navigation sidebar component
 */
const SettingsNavigation: React.FC<SettingsNavigationProps> = ({
  activeTab,
  navItems,
  onTabChange
}) => {
  const { t } = useTranslation();
  return (
    <div className="w-48 bg-muted/30 border-r border-border p-4 flex flex-col">
      <h2 className="text-lg font-semibold mb-6">{t('settings.title')}</h2>
      <nav className="space-y-1 flex-1">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={cn(
              "w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center gap-2",
              activeTab === item.id ? "bg-primary text-primary-foreground" : "hover:bg-muted"
            )}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </nav>
    </div>
  );
};

export default SettingsNavigation;
