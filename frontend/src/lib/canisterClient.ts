import { HttpAgent, Actor } from '@dfinity/agent';
import { AuthClient } from '@dfinity/auth-client';
import { idlFactory } from '../backend.idl';
import type { backendInterface } from '../backend';

const CANISTER_ID = 'msukf-oyaaa-aaaap-an5lq-cai';
const IS_LOCAL = process.env.DFX_NETWORK !== 'ic';
const HOST = IS_LOCAL ? 'http://localhost:4943' : 'https://ic0.app';

/**
 * Creates an authenticated agent using the user's identity from AuthClient.
 * This agent will sign all canister calls with the user's principal.
 */
async function getAgent(): Promise<HttpAgent> {
  const authClient = await AuthClient.create();
  const identity = authClient.getIdentity();
  
  const agent = new HttpAgent({
    host: HOST,
    identity,
  });

  // Fetch root key for local development
  if (IS_LOCAL) {
    await agent.fetchRootKey().catch((err) => {
      console.warn('Unable to fetch root key. Check to ensure that your local replica is running');
      console.error(err);
    });
  }

  return agent;
}

/**
 * Creates an actor for the backend canister with the authenticated agent.
 * All calls through this actor will be signed with the user's principal.
 */
export async function createCanisterClient(): Promise<backendInterface> {
  const agent = await getAgent();
  
  const actor = Actor.createActor<backendInterface>(idlFactory, {
    agent,
    canisterId: CANISTER_ID,
  });

  return actor;
}

/**
 * Checks if the user is authenticated and not anonymous.
 * Returns true if the user can make authenticated canister calls.
 */
export async function isUserAuthenticated(): Promise<boolean> {
  try {
    const authClient = await AuthClient.create();
    const identity = authClient.getIdentity();
    const principal = identity.getPrincipal();
    
    // Check if principal is anonymous
    return !principal.isAnonymous() && principal.toString() !== '2vxsx-fae';
  } catch (error) {
    console.error('[canisterClient] Error checking authentication:', error);
    return false;
  }
}
