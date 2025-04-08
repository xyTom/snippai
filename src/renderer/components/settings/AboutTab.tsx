import * as React from 'react';

interface AboutTabProps {
  appVersion: string;
}

/**
 * About tab component
 */
const AboutTab: React.FC<AboutTabProps> = ({ appVersion }) => {
  return (
    <div className="space-y-6 mt-6">
      <div className="p-4 rounded-md bg-muted/10 space-y-4">
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Application Version</h3>
          <div className="flex items-center bg-muted gap-2 p-2 rounded text-sm">
            <span className="font-mono">{appVersion}</span>
          </div>
        </div>
        
        <div className="space-y-2">
          <h3 className="text-sm font-medium">About Snippai</h3>
          <p className="text-sm text-muted-foreground">
            Snippai is an intelligent screenshot recognition tool that helps you quickly analyze and understand screenshot content.
            With powerful AI models, Snippai can recognize text, code, and diagrams in screenshots, and provide relevant analysis and explanations.
          </p>
        </div>
        
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Copyright</h3>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Snippai. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AboutTab;
