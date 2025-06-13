import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  useRef,
  ReactNode,
} from "react";
import { Session, User } from "@supabase/supabase-js";
import supabase from "@/utils/supabase";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signInWithMagicLink: (email: string) => Promise<null | string>;
  signOut: () => Promise<void>;
  onAuthSuccess?: () => void;
  setOnAuthSuccess: (callback: (() => void) | undefined) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [onAuthSuccess, setOnAuthSuccess] = useState<(() => void) | undefined>();

  // 使用 ref 来保存最新的回调函数，避免 useEffect 重新运行
  const onAuthSuccessRef = useRef<(() => void) | undefined>();
  onAuthSuccessRef.current = onAuthSuccess;

  // Initial fetch and listener
  useEffect(() => {
    const fetchSession = async () => {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();
      if (error) console.error("Failed to get session", error);
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    };

    fetchSession();

    // Subscribe to auth state changes
    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event, session);
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      // Handle successful authentication (both SIGNED_IN and TOKEN_REFRESHED with new session)
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session && !user) {
        console.log('User successfully authenticated via auth state change:', event);
        // Trigger auth success callback if set
        if (onAuthSuccessRef.current) {
          console.log('Triggering auth success callback for auth state change');
          onAuthSuccessRef.current();
          setOnAuthSuccess(undefined); // Clear the callback after use
        }
      }
    });

    // Handle deep link auth callback
    const handleAuthCallback = async (authData: any) => {
      console.log('Received auth callback:', authData);

      try {
        let accessToken: string | null = null;
        let refreshToken: string | null = null;

        // First, try to get tokens from search parameters (query string)
        if (authData.searchParams) {
          accessToken = authData.searchParams.access_token;
          refreshToken = authData.searchParams.refresh_token;
          console.log('Found tokens in search params:', { accessToken: !!accessToken, refreshToken: !!refreshToken });
        }

        // If not found in search params, try hash fragment
        if (!accessToken && authData.hash) {
          const hash = authData.hash.startsWith('#') ? authData.hash.slice(1) : authData.hash;
          const hashParams = new URLSearchParams(hash);
          accessToken = hashParams.get('access_token');
          refreshToken = hashParams.get('refresh_token');
          console.log('Found tokens in hash:', { accessToken: !!accessToken, refreshToken: !!refreshToken });
        }

        // If we have auth tokens, set the session
        if (accessToken && refreshToken) {
          console.log('Setting session with tokens');
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });

          if (error) {
            console.error('Error setting session:', error);
          } else {
            console.log('Successfully authenticated via magic link');
            setSession(data.session);
            setUser(data.session?.user ?? null);

            // Manually trigger auth success callback for deep link authentication
            if (onAuthSuccessRef.current) {
              console.log('Triggering auth success callback for deep link authentication');
              onAuthSuccessRef.current();
              setOnAuthSuccess(undefined); // Clear the callback after use
            }
          }
        } else {
          console.warn('No access token or refresh token found in auth callback');
          console.log('Available data:', authData);
        }
      } catch (error) {
        console.error('Error handling auth callback:', error);
      }
    };

    // Register auth callback handler
    window.electronAPI?.onAuthCallback(handleAuthCallback);

    return () => {
      subscription.subscription.unsubscribe();
      window.electronAPI?.removeListener('auth-callback', handleAuthCallback);
    };
  }, []); // 移除 onAuthSuccess 依赖，因为我们使用 ref



  const signInWithMagicLink = useCallback(async (email: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          // Use our custom URL scheme for the redirect
          emailRedirectTo: 'snippai://auth/callback'
        }
      });
      setLoading(false);
      return error ? error.message : null;
    } catch (err) {
      setLoading(false);
      return err instanceof Error ? err.message : 'Failed to send magic link';
    }
  }, []);

  const signOut = useCallback(async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setLoading(false);
  }, []);

  const value: AuthContextValue = {
    user,
    session,
    loading,
    signInWithMagicLink,
    signOut,
    onAuthSuccess,
    setOnAuthSuccess,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
