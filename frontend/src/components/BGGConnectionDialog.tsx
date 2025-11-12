import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Loader2, AlertCircle } from 'lucide-react';
import { useConnectBGGAccount } from '../hooks/useQueries';
import { toast } from 'sonner';

interface BGGConnectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isRequired?: boolean;
}

export function BGGConnectionDialog({ open, onOpenChange, isRequired = false }: BGGConnectionDialogProps) {
  const [bggPrincipalId, setBggPrincipalId] = useState('');
  const [validationError, setValidationError] = useState('');
  const connectBGGMutation = useConnectBGGAccount();

  const handleConnect = async () => {
    // Clear previous validation error
    setValidationError('');

    // Validate input
    if (!bggPrincipalId.trim()) {
      setValidationError('BGG Principal ID is required');
      toast.error('Validation Error', {
        description: 'Please enter your BGG principal ID',
      });
      return;
    }

    connectBGGMutation.mutate(bggPrincipalId.trim(), {
      onSuccess: () => {
        toast.success('BGG Account Connected!', {
          description: 'Your BOOM Gaming Guilds account has been successfully connected via the dedicated backend. You can now play the game!',
        });
        onOpenChange(false);
        setBggPrincipalId('');
        setValidationError('');
      },
      onError: (error) => {
        const errorMessage = error instanceof Error ? error.message : 'Failed to connect BGG account';
        setValidationError(errorMessage);
        toast.error('Connection Failed', {
          description: errorMessage,
          duration: 5000,
        });
      },
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !connectBGGMutation.isPending && bggPrincipalId.trim()) {
      handleConnect();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBggPrincipalId(e.target.value);
    // Clear validation error when user starts typing
    if (validationError) {
      setValidationError('');
    }
  };

  // Prevent closing if required and not connected
  const handleOpenChangeInternal = (newOpen: boolean) => {
    if (!newOpen && isRequired) {
      console.log('[BGGConnectionDialog] Cannot close - BGG connection is required to play');
      toast.warning('Connection Required', {
        description: 'You must connect your BGG account to play the game.',
      });
      return;
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChangeInternal}>
      <DialogContent 
        className="sm:max-w-[550px] bg-black/95 backdrop-blur-md border-white/20 text-white"
        onPointerDownOutside={(e) => {
          if (isRequired) {
            e.preventDefault();
          }
        }}
        onEscapeKeyDown={(e) => {
          if (isRequired) {
            e.preventDefault();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-white flex items-center gap-2">
            {isRequired && <AlertCircle className="h-6 w-6 text-game-boost" />}
            Connect BOOM Gaming Guilds Account
          </DialogTitle>
          <DialogDescription className="text-white/80 text-base space-y-2">
            <p>Connect your BOOM Gaming Guilds Account to the Car Rush Game to claim quest rewards.</p>
            {isRequired && (
              <p className="font-semibold text-game-boost">
                You must connect your BGG account to play the game.
              </p>
            )}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="bgg-principal" className="text-white">
              BGG Principal ID <span className="text-red-400">*</span>
            </Label>
            <Input
              id="bgg-principal"
              placeholder="Enter your BGG principal ID"
              value={bggPrincipalId}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              disabled={connectBGGMutation.isPending}
              className={`bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-game-boost ${
                validationError ? 'border-red-400 focus:border-red-400' : ''
              }`}
              autoFocus
            />
            {validationError && (
              <p className="text-xs text-red-400 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {validationError}
              </p>
            )}
            <p className="text-xs text-white/50">
              You can find your BGG principal ID in your BOOM Gaming Guilds account settings.
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {!isRequired && (
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={connectBGGMutation.isPending}
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              Cancel
            </Button>
          )}
          <Button
            onClick={handleConnect}
            disabled={connectBGGMutation.isPending || !bggPrincipalId.trim()}
            className="bg-game-boost hover:bg-game-boost/90 text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {connectBGGMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : (
              'Connect'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
