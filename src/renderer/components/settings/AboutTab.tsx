import * as React from 'react';
import { useTranslation } from 'react-i18next';

interface AboutTabProps {
  appVersion: string;
}

/**
 * About tab component
 */
const AboutTab: React.FC<AboutTabProps> = ({ appVersion }) => {
  const { t } = useTranslation();
  return (
    <div className="space-y-6 mt-6">
      <div className="p-4 rounded-md bg-muted/10 space-y-4">
        <div className="space-y-2">
          <h3 className="text-sm font-medium">{t('settings.about_version')}</h3>
          <div className="flex items-center bg-muted gap-2 p-2 rounded text-sm">
            <span className="font-mono">{appVersion}</span>
          </div>
        </div>
        
        <div className="space-y-2">
          <h3 className="text-sm font-medium">{t('settings.about_snippai')}</h3>
          <p className="text-sm text-muted-foreground">
            {t('settings.about_snippai_description')}
          </p>
        </div>
        
        <div className="space-y-2">
          <h3 className="text-sm font-medium">{t('settings.about_copyright')}</h3>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Snippai. {t('settings.about_copyright_all_rights_reserved')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default AboutTab;
