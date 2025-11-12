import { useInternetIdentity } from './hooks/useInternetIdentity';
import { LoginScreen } from './components/LoginScreen';
import { GameScreen } from './components/GameScreen';
import { Toaster } from './components/ui/sonner';
import { ThemeProvider } from 'next-themes';

function App() {
  const { identity, isInitializing } = useInternetIdentity();

  if (isInitializing) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-b from-game-sky to-game-dark">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto"></div>
          <p className="text-white text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      {identity ? <GameScreen /> : <LoginScreen />}
      <Toaster />
    </ThemeProvider>
  );
}

export default App;
