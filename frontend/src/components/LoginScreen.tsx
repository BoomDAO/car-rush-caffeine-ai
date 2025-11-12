import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { Button } from './ui/button';
import { Car, Coins, ArrowLeftRight } from 'lucide-react';

export function LoginScreen() {
  const { login, isLoggingIn } = useInternetIdentity();

  return (
    <div className="relative flex h-screen flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-game-sky via-game-road to-game-dark">
      {/* Animated background elements */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-10 h-32 w-32 animate-pulse rounded-full bg-game-coin blur-3xl" />
        <div className="absolute bottom-20 right-10 h-40 w-40 animate-pulse rounded-full bg-game-boost blur-3xl" />
      </div>

      {/* Branding logos */}
      <div className="absolute top-8 left-8 flex items-center gap-4 opacity-80">
        <img src="/assets/generated/icp-logo.dim_100x100.png" alt="ICP" className="h-12 w-12" />
        <img src="/assets/generated/boom-dao-logo.dim_120x40.png" alt="BOOM DAO" className="h-8" />
      </div>

      {/* Main content */}
      <div className="relative z-10 text-center space-y-8 px-4 max-w-2xl">
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-3 mb-6">
            <Car className="h-16 w-16 text-game-boost animate-bounce" />
            <h1 className="text-7xl font-black tracking-tight text-white drop-shadow-2xl">
              Car Rush
            </h1>
          </div>
          
          <p className="text-2xl font-semibold text-white/90 drop-shadow-lg">
            Navigate the zig-zag road and collect coins!
          </p>
        </div>

        <div className="flex flex-col items-center gap-6 mt-12">
          <Button
            onClick={login}
            disabled={isLoggingIn}
            size="lg"
            className="h-16 px-12 text-xl font-bold bg-game-boost hover:bg-game-boost/90 text-white shadow-2xl transform transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoggingIn ? (
              <>
                <div className="mr-3 h-5 w-5 animate-spin rounded-full border-3 border-white border-t-transparent" />
                Connecting...
              </>
            ) : (
              <>
                <Car className="mr-3 h-6 w-6" />
                Start Playing
              </>
            )}
          </Button>

          <div className="flex items-center gap-8 text-white/80 text-sm">
            <div className="flex items-center gap-2">
              <Coins className="h-5 w-5 text-game-coin" />
              <span>Collect Coins</span>
            </div>
            <div className="flex items-center gap-2">
              <ArrowLeftRight className="h-5 w-5 text-game-boost" />
              <span>Turn & Navigate</span>
            </div>
            <div className="flex items-center gap-2">
              <Car className="h-5 w-5 text-game-boost" />
              <span>Move Forward</span>
            </div>
          </div>
        </div>

        <div className="mt-16 text-white/60 text-sm space-y-2">
          <p>Use ← → arrow keys to turn</p>
          <p>Press SPACE to move forward</p>
          <p>Stay on the road and collect coins!</p>
        </div>
      </div>

      {/* Footer */}
      <footer className="absolute bottom-6 text-center text-white/50 text-sm">
        <p>© 2025. Built with <span className="text-red-400">♥</span> using <a href="https://caffeine.ai" target="_blank" rel="noopener noreferrer" className="underline hover:text-white/70">caffeine.ai</a></p>
      </footer>
    </div>
  );
}
