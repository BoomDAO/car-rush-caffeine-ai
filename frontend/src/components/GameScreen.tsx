import { useRef, useState, useEffect } from 'react';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { Button } from './ui/button';
import { LogOut, Pause, Play, RotateCcw, Copy, Check, Loader2 } from 'lucide-react';
import { useGameLoop } from '../hooks/useGameLoop';
import { useProcessAction } from '../hooks/useQueries';
import { useActor } from '../hooks/useActor';
import { toast } from 'sonner';

export function GameScreen() {
  const { clear, identity } = useInternetIdentity();
  
  // Initialize the backend actor with DFINITY's @dfinity/agent library
  // The actor is configured with the authenticated user's identity from Internet Identity
  // All canister calls made through this actor are automatically signed with the user's principal
  const { actor, isFetching: isActorFetching } = useActor();
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showProcessActionTile, setShowProcessActionTile] = useState(false);
  const [processActionError, setProcessActionError] = useState<string | null>(null);
  
  // Track if the action has been triggered to prevent multiple calls
  const actionTriggeredRef = useRef(false);
  
  // Get the mutation hook for calling processAction
  // This uses DFINITY's @dfinity/agent to make authenticated canister calls
  // The agent automatically signs all calls with the user's principal
  const processActionMutation = useProcessAction();

  /**
   * Callback triggered when the score reaches 300 coins.
   * 
   * AUTHENTICATION FLOW:
   * 1. Verify the user has a valid authenticated identity (not anonymous)
   * 2. Check that the DFINITY actor is initialized and ready
   * 3. Extract the user's principal from the authenticated identity
   * 4. Call the backend's processAction method via DFINITY's agent
   * 5. The agent automatically signs the call with the user's principal
   * 6. The backend verifies the principal is not anonymous before processing
   * 
   * This ensures all canister calls are properly authenticated and attributed
   * to the correct user, preventing anonymous or unauthorized access.
   */
  const handleScoreThresholdReached = () => {
    console.log('=== SCORE THRESHOLD REACHED (300 COINS) ===');
    console.log('[GameScreen] Score threshold reached (300 coins)');
    console.log('[GameScreen] Action already triggered?', actionTriggeredRef.current);
    
    // Prevent multiple triggers - only call processAction once when score reaches 300
    if (actionTriggeredRef.current) {
      console.log('[GameScreen] Action already triggered, skipping to prevent duplicate calls');
      return;
    }

    // Mark as triggered immediately to prevent race conditions
    actionTriggeredRef.current = true;
    console.log('[GameScreen] Marked action as triggered');

    // Show the notification tile in the UI
    setShowProcessActionTile(true);
    setProcessActionError(null);

    // STEP 1: Verify user has an authenticated identity
    if (!identity) {
      const errorMsg = 'User identity not found. Please log in again.';
      console.error('[GameScreen] Error:', errorMsg);
      console.error('[GameScreen] Cannot make authenticated call without identity');
      setProcessActionError(errorMsg);
      toast.error(errorMsg);
      return;
    }

    // STEP 2: Extract and verify the user's principal is not anonymous
    // The anonymous principal is "2vxsx-fae" which indicates an unauthenticated user
    const principal = identity.getPrincipal();
    const principalText = principal.toString();
    console.log('[GameScreen] User principal:', principalText);
    
    // Check if the principal is anonymous before making the canister call
    // This prevents unnecessary network calls and provides immediate user feedback
    if (principal.isAnonymous() || principalText === '2vxsx-fae') {
      const errorMsg = 'Anonymous users cannot process actions. Please log in with Internet Identity.';
      console.error('[GameScreen] Error:', errorMsg);
      console.error('[GameScreen] Anonymous principal detected:', principalText);
      console.error('[GameScreen] The backend will reject this call, so we prevent it here');
      setProcessActionError(errorMsg);
      toast.error(errorMsg, {
        duration: 5000,
        description: 'You must be authenticated to perform this action.'
      });
      return;
    }
    
    console.log('[GameScreen] Principal is authenticated (not anonymous)');
    console.log('[GameScreen] This principal will be used to sign the canister call');

    // STEP 3: Validate that the DFINITY actor is ready before making the call
    console.log('[GameScreen] Actor ready?', !!actor);
    console.log('[GameScreen] Actor fetching?', isActorFetching);
    
    if (!actor) {
      const errorMsg = 'Backend actor not initialized. Please wait and try again.';
      console.error('[GameScreen] Error:', errorMsg);
      console.error('[GameScreen] The DFINITY agent has not been initialized yet');
      setProcessActionError(errorMsg);
      toast.error(errorMsg);
      return;
    }

    if (isActorFetching) {
      const errorMsg = 'Backend actor is still initializing. Please wait.';
      console.error('[GameScreen] Error:', errorMsg);
      console.error('[GameScreen] The DFINITY agent is still being configured');
      setProcessActionError(errorMsg);
      toast.error(errorMsg);
      return;
    }

    console.log('[GameScreen] All validations passed, calling processAction...');
    console.log('[GameScreen] Calling backend canister via DFINITY\'s @dfinity/agent');
    console.log('[GameScreen] Call will be signed with authenticated principal:', principalText);

    // STEP 4: Call the backend processAction method using DFINITY's @dfinity/agent
    // The call is automatically signed with the user's principal by the agent
    // The backend will verify the principal is not anonymous before processing
    processActionMutation.mutate(
      {
        actionId: 'car_rush_won',
        fields: [],
      },
      {
        onSuccess: () => {
          console.log('=== PROCESS ACTION SUCCESS ===');
          console.log('[GameScreen] processAction completed successfully');
          console.log('[GameScreen] Backend canister call was successful');
          console.log('[GameScreen] The call was signed with principal:', principalText);
          toast.success('Action processed successfully!', {
            description: 'Your achievement has been recorded on the blockchain.'
          });
        },
        onError: (error) => {
          console.log('=== PROCESS ACTION ERROR ===');
          const errorMessage = error instanceof Error ? error.message : 'Failed to process action';
          console.error('[GameScreen] processAction failed with error:', error);
          console.error('[GameScreen] Error message:', errorMessage);
          console.error('[GameScreen] Error type:', typeof error);
          console.error('[GameScreen] Error constructor:', error?.constructor?.name);
          
          // Log detailed error information for debugging
          if (error instanceof Error) {
            console.error('[GameScreen] Error stack:', error.stack);
          }
          console.error('[GameScreen] Full error details:', JSON.stringify(error, null, 2));
          
          // Display the error in the UI
          setProcessActionError(errorMessage);
          toast.error(`Failed to process action: ${errorMessage}`, {
            duration: 5000,
            description: 'Please try again or contact support if the issue persists.'
          });
        },
      }
    );
  };

  const { score, speed, resetGame } = useGameLoop(
    canvasRef,
    isPaused,
    isGameOver,
    setIsGameOver,
    handleScoreThresholdReached // Pass the callback to trigger at score 300
  );

  const handlePauseToggle = () => {
    if (!isGameOver) {
      setIsPaused(!isPaused);
    }
  };

  const handleReset = () => {
    console.log('[GameScreen] Resetting game');
    setIsGameOver(false);
    setIsPaused(false);
    setShowProcessActionTile(false);
    setProcessActionError(null);
    actionTriggeredRef.current = false;
    processActionMutation.reset();
    resetGame();
  };

  const principal = identity?.getPrincipal().toString() || '';
  const shortPrincipal = principal ? `${principal.slice(0, 8)}...${principal.slice(-4)}` : '';

  const handleCopyPrincipal = async () => {
    if (principal) {
      try {
        await navigator.clipboard.writeText(principal);
        setCopied(true);
        toast.success('Principal ID copied to clipboard');
        setTimeout(() => setCopied(false), 2000);
      } catch (error) {
        console.error('[GameScreen] Failed to copy principal:', error);
        toast.error('Failed to copy principal ID');
      }
    }
  };

  const isWinner = score >= 20000;

  // Log actor status changes for debugging
  useEffect(() => {
    console.log('[GameScreen] Actor status changed - Ready:', !!actor, 'Fetching:', isActorFetching);
    if (actor) {
      console.log('[GameScreen] DFINITY actor is ready for authenticated calls');
      console.log('[GameScreen] All calls will be signed with the user\'s principal');
    }
  }, [actor, isActorFetching]);

  // Log identity changes for debugging authentication flow
  useEffect(() => {
    if (identity) {
      const principal = identity.getPrincipal();
      console.log('[GameScreen] Identity loaded - Principal:', principal.toString());
      console.log('[GameScreen] Is anonymous?', principal.isAnonymous());
      if (principal.isAnonymous()) {
        console.warn('[GameScreen] WARNING: User is anonymous and cannot call processAction');
      }
    }
  }, [identity]);

  return (
    <div className="relative flex h-screen flex-col bg-gradient-to-b from-game-sky to-game-dark overflow-hidden">
      {/* Header */}
      <header className="relative z-20 flex items-center justify-between px-6 py-4 bg-black/30 backdrop-blur-sm border-b border-white/10">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <img src="/assets/generated/icp-logo.dim_100x100.png" alt="ICP" className="h-10 w-10" />
            <img src="/assets/generated/boom-dao-logo.dim_120x40.png" alt="BOOM DAO" className="h-7" />
          </div>
          <div className="h-8 w-px bg-white/20" />
          <h1 className="text-2xl font-black text-white tracking-tight">Car Rush</h1>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-sm text-white/70">
            Player: <span className="font-mono text-white">{shortPrincipal}</span>
          </div>
          <Button
            onClick={clear}
            variant="outline"
            size="sm"
            className="bg-white/10 border-white/20 text-white hover:bg-white/20"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </header>

      {/* Game Stats */}
      <div className="absolute top-24 left-6 z-20 space-y-3">
        <div className="bg-black/50 backdrop-blur-md rounded-xl px-6 py-4 border border-white/20 shadow-2xl">
          <div className="text-sm text-white/70 mb-1">Score</div>
          <div className="text-4xl font-black text-game-coin">{score}</div>
        </div>
        <div className="bg-black/50 backdrop-blur-md rounded-xl px-6 py-4 border border-white/20 shadow-2xl">
          <div className="text-sm text-white/70 mb-1">Speed</div>
          <div className="text-3xl font-black text-game-boost">{speed.toFixed(1)}</div>
        </div>
      </div>

      {/* Process Action Notification Tile - Shows status of backend canister call */}
      {showProcessActionTile && (
        <div className="absolute top-24 right-6 z-20 w-80">
          <div className="bg-black/50 backdrop-blur-md rounded-xl px-6 py-4 border border-white/20 shadow-2xl">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                {processActionMutation.isPending && (
                  <Loader2 className="h-5 w-5 text-game-boost animate-spin flex-shrink-0 mt-0.5" />
                )}
                {processActionMutation.isSuccess && (
                  <Check className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                )}
                {processActionMutation.isError && (
                  <div className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5 text-xl">✕</div>
                )}
                <div className="flex-1">
                  <div className="text-sm font-semibold text-white mb-1">
                    Milestone Reached: 300 Coins!
                  </div>
                  {processActionMutation.isPending && (
                    <div className="text-xs text-white/70">
                      Processing action on blockchain...
                    </div>
                  )}
                  {processActionMutation.isSuccess && (
                    <div className="text-xs text-green-400">
                      Action processed successfully!
                    </div>
                  )}
                  {processActionMutation.isError && processActionError && (
                    <div className="text-xs text-red-400 break-words">
                      Error: {processActionError}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Game Controls - Moved down when notification tile is visible */}
      <div className={`absolute right-6 z-20 flex flex-col gap-3 transition-all duration-300 ${showProcessActionTile ? 'top-[280px]' : 'top-24'}`}>
        <Button
          onClick={handlePauseToggle}
          disabled={isGameOver}
          size="lg"
          className="bg-black/50 backdrop-blur-md border border-white/20 text-white hover:bg-black/70 shadow-2xl"
        >
          {isPaused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
        </Button>
        <Button
          onClick={handleReset}
          size="lg"
          className="bg-black/50 backdrop-blur-md border border-white/20 text-white hover:bg-black/70 shadow-2xl"
        >
          <RotateCcw className="h-5 w-5" />
        </Button>
      </div>

      {/* Canvas */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="relative">
          <canvas
            ref={canvasRef}
            width={800}
            height={600}
            className="rounded-2xl shadow-2xl border-4 border-white/20 bg-game-road"
            tabIndex={0}
          />
          
          {/* Pause Overlay */}
          {isPaused && !isGameOver && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm rounded-2xl">
              <div className="text-center space-y-4">
                <Pause className="h-20 w-20 text-white mx-auto" />
                <h2 className="text-4xl font-black text-white">Paused</h2>
                <p className="text-white/70">Press the play button to continue</p>
              </div>
            </div>
          )}

          {/* Game Over Overlay */}
          {isGameOver && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm rounded-2xl">
              <div className="text-center space-y-6 px-8">
                {isWinner ? (
                  <>
                    <h2 className="text-5xl font-black text-game-boost">You Win! 🎉</h2>
                    <div className="space-y-2">
                      <p className="text-2xl text-white/90">Congratulations!</p>
                      <p className="text-6xl font-black text-game-coin">{score}</p>
                      <p className="text-lg text-white/70">You reached the maximum score!</p>
                    </div>
                  </>
                ) : (
                  <>
                    <h2 className="text-5xl font-black text-white">Game Over!</h2>
                    <div className="space-y-2">
                      <p className="text-2xl text-white/90">Final Score</p>
                      <p className="text-6xl font-black text-game-coin">{score}</p>
                    </div>
                  </>
                )}
                <Button
                  onClick={handleReset}
                  size="lg"
                  className="bg-game-boost hover:bg-game-boost/90 text-white text-xl px-8 py-6"
                >
                  <RotateCcw className="mr-3 h-6 w-6" />
                  Play Again
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Principal ID Display - Bottom Corner */}
      <div className="absolute bottom-16 left-6 z-20">
        <div className="bg-black/50 backdrop-blur-md rounded-xl px-4 py-3 border border-white/20 shadow-2xl">
          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <div className="text-xs text-white/50 mb-1">Principal ID</div>
              <div className="font-mono text-xs text-white/90 break-all max-w-[300px]">
                {principal}
              </div>
            </div>
            <Button
              onClick={handleCopyPrincipal}
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 text-white/70 hover:text-white hover:bg-white/10 flex-shrink-0"
              title="Copy Principal ID"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="relative z-20 px-6 py-4 bg-black/30 backdrop-blur-sm border-t border-white/10">
        <div className="flex items-center justify-center gap-8 text-white/70 text-sm flex-wrap">
          <div className="flex items-center gap-2">
            <kbd className="px-3 py-1 bg-white/10 rounded border border-white/20 font-mono">← →</kbd>
            <span>Turn Left/Right</span>
          </div>
          <div className="flex items-center gap-2">
            <kbd className="px-3 py-1 bg-white/10 rounded border border-white/20 font-mono">SPACE</kbd>
            <span>Move Forward</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">$</span>
            <span>Collect coins to increase score</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-white/90">Goal: Reach 20,000 points!</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-20 text-center py-3 text-white/50 text-xs bg-black/20">
        <p>© 2025. Built with <span className="text-red-400">♥</span> using <a href="https://caffeine.ai" target="_blank" rel="noopener noreferrer" className="underline hover:text-white/70">caffeine.ai</a></p>
      </footer>
    </div>
  );
}
