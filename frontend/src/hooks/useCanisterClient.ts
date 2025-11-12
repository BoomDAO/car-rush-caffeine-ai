import { useQuery } from '@tanstack/react-query';
import { createCanisterClient, isUserAuthenticated } from '../lib/canisterClient';
import type { backendInterface } from '../backend';

/**
 * Custom hook to manage the canister client instance.
 * Creates a new client when the user's authentication status changes.
 */
export function useCanisterClient() {
  const clientQuery = useQuery<backendInterface | null>({
    queryKey: ['canister-client'],
    queryFn: async () => {
      const isAuthenticated = await isUserAuthenticated();
      
      if (!isAuthenticated) {
        console.log('[useCanisterClient] User is not authenticated, returning null');
        return null;
      }

      console.log('[useCanisterClient] Creating authenticated canister client');
      const client = await createCanisterClient();
      return client;
    },
    staleTime: Infinity,
    retry: false,
  });

  return {
    client: clientQuery.data || null,
    isLoading: clientQuery.isLoading,
    isError: clientQuery.isError,
    error: clientQuery.error,
  };
}
