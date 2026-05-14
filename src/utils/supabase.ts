import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

type DisabledSessionResult = Promise<{ data: { session: null }; error: null }>;
type DisabledSetSessionResult = Promise<{
  data: { session: null; user: null };
  error: Error;
}>;
type DisabledErrorResult = Promise<{ data: null; error: Error }>;
type DisabledSignOutResult = Promise<{ error: null }>;
type DisabledUpdateResult = Promise<{ data: null; error: null }>;

type DisabledSupabaseClient = {
  auth: {
    getSession: () => DisabledSessionResult;
    onAuthStateChange: () => {
      data: { subscription: { unsubscribe: () => void } };
    };
    setSession: () => DisabledSetSessionResult;
    signInWithOtp: () => DisabledErrorResult;
    signOut: () => DisabledSignOutResult;
  };
  from: () => {
    select: () => {
      order: () => {
        limit: () => {
          single: () => DisabledUpdateResult;
        };
      };
    };
  };
};

const createDisabledSupabaseClient = (): SupabaseClient => {
  const client: DisabledSupabaseClient = {
    auth: {
      getSession: async () => ({
        data: { session: null },
        error: null,
      }),
      onAuthStateChange: () => ({
        data: {
          subscription: {
            unsubscribe: (): void => undefined,
          },
        },
      }),
      setSession: async () => ({
        data: { session: null, user: null },
        error: new Error('Supabase is not configured'),
      }),
      signInWithOtp: async () => ({
        data: null,
        error: new Error('Supabase is not configured'),
      }),
      signOut: async () => ({ error: null }),
    },
    from: () => ({
      select: () => ({
        order: () => ({
          limit: () => ({
            single: async () => ({
              data: null,
              error: null,
            }),
          }),
        }),
      }),
    }),
  };

  return client as unknown as SupabaseClient;
};

const hasSupabaseConfig = supabaseUrl.trim() !== '' && supabaseKey.trim() !== '';
const supabase = hasSupabaseConfig
  ? createClient(supabaseUrl, supabaseKey)
  : createDisabledSupabaseClient();

export default supabase
;
