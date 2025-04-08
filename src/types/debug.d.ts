/**
 * Type declarations for debug module
 */
declare module 'debug' {
  /**
   * Debug instance interface
   */
  interface Debugger {
    (message: string, ...args: any[]): void;
    enabled: boolean;
    namespace: string;
    extend: (namespace: string) => Debugger;
    log: (...args: any[]) => void;
    color: string;
  }

  /**
   * Create a debugger with the given namespace
   */
  function debug(namespace: string): Debugger;
  
  namespace debug {
    export const log: (...args: any[]) => void;
    export const formatters: Record<string, (v: any) => string>;
  }

  export = debug;
}

// Re-export the Debugger interface for use in other files
declare global {
  interface DebuggerType {
    (message: string, ...args: any[]): void;
    enabled: boolean;
    namespace: string;
    extend: (namespace: string) => DebuggerType;
    log: (...args: any[]) => void;
    color: string;
  }
}
