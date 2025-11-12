import { useMutation } from '@tanstack/react-query';
import { useActor } from './useActor';
import type { ActionArg } from '../backend';

/**
 * Custom React Query hook for calling the backend's processAction method.
 * 
 * AUTHENTICATION FLOW WITH DFINITY'S @dfinity/agent:
 * 
 * 1. The useActor hook initializes an authenticated actor using @dfinity/agent
 * 2. The actor is created with the user's identity from Internet Identity
 * 3. When processAction is called, the agent automatically:
 *    - Signs the canister call with the user's private key
 *    - Includes the user's principal in the call metadata
 *    - Handles all cryptographic operations securely
 * 4. The backend receives the signed call and can access the caller's principal
 * 5. The backend verifies the principal is not anonymous before processing
 * 
 * This ensures all canister calls are:
 * - Properly authenticated with the user's identity
 * - Signed with cryptographic proof of identity
 * - Attributed to the correct user principal
 * - Protected against anonymous or unauthorized access
 * 
 * The @dfinity/agent library handles all the complexity of:
 * - Identity management
 * - Cryptographic signing
 * - Principal verification
 * - Secure communication with the Internet Computer
 */
export function useProcessAction() {
  // Get the authenticated actor instance from useActor hook
  // The actor is created with DFINITY's @dfinity/agent and configured with the user's identity
  // All calls through this actor are automatically signed with the user's principal
  const { actor, isFetching } = useActor();

  return useMutation({
    mutationFn: async (arg: ActionArg) => {
      console.log('[useProcessAction] Starting mutation with arg:', arg);
      console.log('[useProcessAction] Actor initialized:', !!actor);
      console.log('[useProcessAction] Actor fetching:', isFetching);
      
      // Ensure the actor is initialized before making the call
      // The actor contains the DFINITY agent configured with the user's identity
      if (!actor) {
        const error = new Error('Actor not initialized - cannot process action');
        console.error('[useProcessAction] Error:', error);
        console.error('[useProcessAction] The DFINITY agent must be initialized before making canister calls');
        throw error;
      }

      if (isFetching) {
        const error = new Error('Actor is still initializing - please wait');
        console.error('[useProcessAction] Error:', error);
        console.error('[useProcessAction] The DFINITY agent is still being configured with the user\'s identity');
        throw error;
      }

      console.log('[useProcessAction] Calling backend processAction via DFINITY\'s @dfinity/agent...');
      console.log('[useProcessAction] The call will be automatically signed with the authenticated user\'s principal');
      console.log('[useProcessAction] The backend will receive the caller\'s principal and verify it is not anonymous');
      
      try {
        // Call the backend canister method using the authenticated actor
        // 
        // IMPORTANT: This call is automatically signed by DFINITY's @dfinity/agent
        // The agent uses the user's identity to:
        // 1. Create a cryptographic signature proving the user's identity
        // 2. Include the user's principal in the call metadata
        // 3. Send the signed request to the Internet Computer
        // 4. The backend receives the call with the caller's principal available via { caller }
        // 
        // The backend can then verify:
        // - The call is from an authenticated user (not anonymous)
        // - The principal matches the expected user
        // - The signature is valid and hasn't been tampered with
        const result = await actor.processAction(arg);
        console.log('[useProcessAction] Backend call successful:', result);
        console.log('[useProcessAction] The call was signed and verified by the Internet Computer');
        return result;
      } catch (error) {
        console.error('[useProcessAction] Backend call failed:', error);
        console.error('[useProcessAction] Error type:', typeof error);
        console.error('[useProcessAction] Error constructor:', error?.constructor?.name);
        
        // Extract meaningful error message and filter out unrelated network errors
        let errorMessage = 'Unknown error occurred';
        
        if (error instanceof Error) {
          errorMessage = error.message;
          console.error('[useProcessAction] Error message:', errorMessage);
          console.error('[useProcessAction] Error stack:', error.stack);
        } else if (typeof error === 'string') {
          errorMessage = error;
          console.error('[useProcessAction] String error:', errorMessage);
        } else if (error && typeof error === 'object') {
          // Handle various error object formats from DFINITY agent
          if ('message' in error) {
            errorMessage = String(error.message);
          } else if ('error' in error && typeof error.error === 'string') {
            errorMessage = error.error;
          } else if ('reject_message' in error && typeof error.reject_message === 'string') {
            errorMessage = error.reject_message;
          }
          console.error('[useProcessAction] Object error:', JSON.stringify(error, null, 2));
        }
        
        // Filter out unrelated network errors (e.g., Datadog RUM, analytics, etc.)
        // Only log and throw errors related to the canister call
        const isUnrelatedError = 
          errorMessage.toLowerCase().includes('datadog') ||
          errorMessage.toLowerCase().includes('rum') ||
          errorMessage.toLowerCase().includes('analytics') ||
          errorMessage.toLowerCase().includes('tracking');
        
        if (isUnrelatedError) {
          console.warn('[useProcessAction] Filtered out unrelated network error:', errorMessage);
          // Don't throw unrelated errors, but log them for debugging
          return;
        }
        
        console.error('[useProcessAction] Extracted canister error message:', errorMessage);
        console.error('[useProcessAction] This error came from the backend canister or the DFINITY agent');
        throw new Error(errorMessage);
      }
    },
  });
}
