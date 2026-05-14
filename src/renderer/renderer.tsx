/**
 * This file will automatically be loaded by vite and run in the "renderer" context.
 * To learn more about the differences between the "main" and the "renderer" context in
 * Electron, visit:
 *
 * https://electronjs.org/docs/tutorial/application-architecture#main-and-renderer-processes
 *
 * By default, Node.js integration in this file is disabled. When enabling Node.js integration
 * in a renderer process, please be aware of potential security implications. You can read
 * more about security risks here:
 *
 * https://electronjs.org/docs/tutorial/security
 *
 * To enable Node.js integration in this file, open up `main.ts` and enable the `nodeIntegration`
 * flag:
 *
 * ```
 *  // Create the browser window.
 *  mainWindow = new BrowserWindow({
 *    width: 800,
 *    height: 600,
 *    webPreferences: {
 *      nodeIntegration: true
 *    }
 *  });
 * ```
 */

import './index.css';
import App from './App'
import React from 'react'
import ReactDOM from 'react-dom/client'
import * as Sentry from "@sentry/electron/renderer";
import { AuthProvider } from './context/AuthContext';
import '../utils/i18next'
import { PostHogProvider } from 'posthog-js/react'

const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,

    integrations: [
      Sentry.replayIntegration({
        maskAllText: false,
      }),
    ],
    replaysSessionSampleRate: import.meta.env.DEV ? 1.0 : 0.1,
    replaysOnErrorSampleRate: 1.0,
  });
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
      <PostHogProvider
        apiKey={import.meta.env.VITE_PUBLIC_POSTHOG_KEY}
        options={{
          api_host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST,
          capture_exceptions: true,
          debug: import.meta.env.MODE === "development",
        }}
      >
        <AuthProvider>
          <App />
        </AuthProvider>
      </PostHogProvider>
    </React.StrictMode>,
  )
  
console.log('👋 This message is being logged by "renderer.ts", included via Vite');
