import { useEffect, useRef, useState, RefObject } from 'react';

interface Coin {
  x: number;
  y: number;
  collected: boolean;
}

interface Car {
  x: number;
  y: number;
  angle: number; // Rotation angle in radians
  speed: number;
}

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const CAR_WIDTH = 64; // Half of 128px for better scaling
const CAR_HEIGHT = 32; // Half of 64px for better scaling
const COIN_SIZE = 24;
const ROAD_WIDTH = 400;
const TURN_SPEED = 0.08; // Radians per frame
const MOVE_SPEED = 6; // Doubled from 3 to 6 - Pixels per frame when spacebar pressed
const SEGMENT_WIDTH = 60;
const ROAD_EXTEND_THRESHOLD = 200; // Extend road when car is within this distance from top
const MAX_SCORE = 20000; // Maximum score to win the game
const ACTION_SCORE_THRESHOLD = 300; // Score threshold to trigger backend action

export function useGameLoop(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  isPaused: boolean,
  isGameOver: boolean,
  setIsGameOver: (value: boolean) => void,
  onScoreThresholdReached?: () => void
) {
  const [score, setScore] = useState(0);
  const [speed, setSpeed] = useState(0);
  const actionTriggeredRef = useRef(false);
  
  const gameStateRef = useRef({
    car: {
      x: CANVAS_WIDTH / 2,
      y: CANVAS_HEIGHT - 100,
      angle: -Math.PI / 2, // Pointing up
      speed: 0
    } as Car,
    coins: [] as Coin[],
    keysPressed: new Set<string>(),
    icpLogo: null as HTMLImageElement | null,
    boomLogo: null as HTMLImageElement | null,
    roadPath: [] as { x: number; y: number }[],
    cameraOffsetY: 0 // Track vertical camera offset for infinite scrolling
  });

  const resetGame = () => {
    console.log('[useGameLoop] Resetting game state');
    setScore(0);
    setSpeed(0);
    actionTriggeredRef.current = false;
    gameStateRef.current = {
      car: {
        x: CANVAS_WIDTH / 2,
        y: CANVAS_HEIGHT - 100,
        angle: -Math.PI / 2,
        speed: 0
      },
      coins: [],
      keysPressed: new Set<string>(),
      icpLogo: gameStateRef.current.icpLogo,
      boomLogo: gameStateRef.current.boomLogo,
      roadPath: [],
      cameraOffsetY: 0
    };
    initializeRoad();
    initializeCoins();
  };

  const extendRoad = () => {
    const state = gameStateRef.current;
    const lastPoint = state.roadPath[state.roadPath.length - 1];
    
    // Add 5 more segments to the road
    let currentX = lastPoint.x;
    let currentY = lastPoint.y;
    const currentSegmentCount = state.roadPath.length;
    
    for (let i = 0; i < 5; i++) {
      currentY -= SEGMENT_WIDTH;
      // Alternate between left and right turns with some randomness
      const direction = (currentSegmentCount + i) % 3 === 0 ? (Math.random() > 0.5 ? 1 : -1) : 0;
      currentX += direction * (SEGMENT_WIDTH * 0.8);
      
      // Keep road within bounds
      currentX = Math.max(ROAD_WIDTH / 2, Math.min(CANVAS_WIDTH - ROAD_WIDTH / 2, currentX));
      
      state.roadPath.push({ x: currentX, y: currentY });
      
      // Add coins to new segments
      if (Math.random() > 0.4) { // 60% chance of coin
        const offsetX = (Math.random() - 0.5) * 40;
        state.coins.push({
          x: currentX + offsetX,
          y: currentY,
          collected: false
        });
      }
    }
  };

  const initializeRoad = () => {
    const state = gameStateRef.current;
    state.roadPath = [];
    
    // Create initial zig-zag road path
    let currentX = CANVAS_WIDTH / 2;
    let currentY = CANVAS_HEIGHT;
    
    state.roadPath.push({ x: currentX, y: currentY });
    
    for (let i = 0; i < 15; i++) {
      currentY -= SEGMENT_WIDTH;
      // Alternate between left and right turns with some randomness
      const direction = i % 3 === 0 ? (Math.random() > 0.5 ? 1 : -1) : 0;
      currentX += direction * (SEGMENT_WIDTH * 0.8);
      
      // Keep road within bounds
      currentX = Math.max(ROAD_WIDTH / 2, Math.min(CANVAS_WIDTH - ROAD_WIDTH / 2, currentX));
      
      state.roadPath.push({ x: currentX, y: currentY });
    }
  };

  const initializeCoins = () => {
    const state = gameStateRef.current;
    state.coins = [];
    
    // Place coins along the road path
    for (let i = 1; i < state.roadPath.length - 1; i++) {
      if (Math.random() > 0.4) { // 60% chance of coin at each segment
        const point = state.roadPath[i];
        const nextPoint = state.roadPath[i + 1];
        
        // Place coin between segments with slight offset
        const offsetX = (Math.random() - 0.5) * 40;
        state.coins.push({
          x: (point.x + nextPoint.x) / 2 + offsetX,
          y: (point.y + nextPoint.y) / 2,
          collected: false
        });
      }
    }
  };

  useEffect(() => {
    // Load images (only logos, no car image)
    const icpImg = new Image();
    icpImg.src = '/assets/generated/icp-logo.dim_100x100.png';
    icpImg.onload = () => {
      gameStateRef.current.icpLogo = icpImg;
    };

    const boomImg = new Image();
    boomImg.src = '/assets/generated/boom-dao-logo.dim_120x40.png';
    boomImg.onload = () => {
      gameStateRef.current.boomLogo = boomImg;
    };

    initializeRoad();
    initializeCoins();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
        gameStateRef.current.keysPressed.add(e.key);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      gameStateRef.current.keysPressed.delete(e.key);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    canvas.focus();

    let animationFrameId: number;

    const checkCollision = (car: Car, coin: { x: number; y: number }): boolean => {
      const dx = car.x - coin.x;
      const dy = car.y - coin.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      return distance < (Math.max(CAR_WIDTH, CAR_HEIGHT) + COIN_SIZE) / 2;
    };

    const isCarOnRoad = (car: Car): boolean => {
      const state = gameStateRef.current;
      
      // Find closest road segment
      let minDistance = Infinity;
      for (let i = 0; i < state.roadPath.length - 1; i++) {
        const p1 = state.roadPath[i];
        const p2 = state.roadPath[i + 1];
        
        // Calculate distance from car to line segment
        const A = car.x - p1.x;
        const B = car.y - p1.y;
        const C = p2.x - p1.x;
        const D = p2.y - p1.y;
        
        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        let param = -1;
        
        if (lenSq !== 0) param = dot / lenSq;
        
        let xx, yy;
        
        if (param < 0) {
          xx = p1.x;
          yy = p1.y;
        } else if (param > 1) {
          xx = p2.x;
          yy = p2.y;
        } else {
          xx = p1.x + param * C;
          yy = p1.y + param * D;
        }
        
        const dx = car.x - xx;
        const dy = car.y - yy;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        minDistance = Math.min(minDistance, distance);
      }
      
      // Car is on road if within the road width minus a small margin (green border)
      return minDistance < ROAD_WIDTH / 2 - 20;
    };

    const drawRoad = (ctx: CanvasRenderingContext2D, state: typeof gameStateRef.current) => {
      // Draw road segments
      ctx.strokeStyle = 'oklch(0.35 0.05 120)';
      ctx.lineWidth = ROAD_WIDTH;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      ctx.beginPath();
      ctx.moveTo(state.roadPath[0].x, state.roadPath[0].y + state.cameraOffsetY);
      for (let i = 1; i < state.roadPath.length; i++) {
        ctx.lineTo(state.roadPath[i].x, state.roadPath[i].y + state.cameraOffsetY);
      }
      ctx.stroke();
      
      // Draw road edges (green border)
      ctx.strokeStyle = 'oklch(0.85 0.1 60)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(state.roadPath[0].x, state.roadPath[0].y + state.cameraOffsetY);
      for (let i = 1; i < state.roadPath.length; i++) {
        ctx.lineTo(state.roadPath[i].x, state.roadPath[i].y + state.cameraOffsetY);
      }
      ctx.stroke();
      
      // Draw center dashed line
      ctx.strokeStyle = 'oklch(0.95 0 0 / 0.5)';
      ctx.lineWidth = 3;
      ctx.setLineDash([20, 15]);
      ctx.beginPath();
      ctx.moveTo(state.roadPath[0].x, state.roadPath[0].y + state.cameraOffsetY);
      for (let i = 1; i < state.roadPath.length; i++) {
        ctx.lineTo(state.roadPath[i].x, state.roadPath[i].y + state.cameraOffsetY);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    };

    const drawBackgroundLogos = (ctx: CanvasRenderingContext2D, state: typeof gameStateRef.current) => {
      ctx.globalAlpha = 0.15;
      
      if (state.icpLogo) {
        ctx.drawImage(state.icpLogo, 50, 100, 80, 80);
        ctx.drawImage(state.icpLogo, CANVAS_WIDTH - 130, 300, 80, 80);
      }
      
      if (state.boomLogo) {
        ctx.drawImage(state.boomLogo, CANVAS_WIDTH - 170, 120, 120, 40);
        ctx.drawImage(state.boomLogo, 40, 380, 120, 40);
      }
      
      ctx.globalAlpha = 1;
    };

    const drawCSSCar = (ctx: CanvasRenderingContext2D) => {
      // Car body - main rectangle with gradient
      const bodyGradient = ctx.createLinearGradient(-CAR_WIDTH / 2, -CAR_HEIGHT / 2, CAR_WIDTH / 2, CAR_HEIGHT / 2);
      bodyGradient.addColorStop(0, '#3b82f6'); // Blue
      bodyGradient.addColorStop(1, '#1e40af'); // Darker blue
      ctx.fillStyle = bodyGradient;
      ctx.fillRect(-CAR_WIDTH / 2 + 8, -CAR_HEIGHT / 2 + 4, CAR_WIDTH - 16, CAR_HEIGHT - 8);
      
      // Car roof/windshield - smaller rectangle on top
      ctx.fillStyle = '#60a5fa'; // Lighter blue
      ctx.fillRect(-CAR_WIDTH / 2 + 14, -CAR_HEIGHT / 2 + 8, CAR_WIDTH - 28, CAR_HEIGHT / 2 - 6);
      
      // Windshield reflection
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.fillRect(-CAR_WIDTH / 2 + 16, -CAR_HEIGHT / 2 + 10, CAR_WIDTH - 32, 6);
      
      // Front bumper
      ctx.fillStyle = '#1e293b'; // Dark gray
      ctx.fillRect(-CAR_WIDTH / 2 + 10, -CAR_HEIGHT / 2, CAR_WIDTH - 20, 4);
      
      // Rear bumper
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(-CAR_WIDTH / 2 + 10, CAR_HEIGHT / 2 - 4, CAR_WIDTH - 20, 4);
      
      // Left wheels
      ctx.fillStyle = '#0f172a'; // Very dark
      ctx.fillRect(-CAR_WIDTH / 2 + 2, -CAR_HEIGHT / 2 + 6, 6, 8);
      ctx.fillRect(-CAR_WIDTH / 2 + 2, CAR_HEIGHT / 2 - 14, 6, 8);
      
      // Right wheels
      ctx.fillRect(CAR_WIDTH / 2 - 8, -CAR_HEIGHT / 2 + 6, 6, 8);
      ctx.fillRect(CAR_WIDTH / 2 - 8, CAR_HEIGHT / 2 - 14, 6, 8);
      
      // ICP branding - small circle on hood
      ctx.fillStyle = '#f59e0b'; // Amber/gold
      ctx.beginPath();
      ctx.arc(0, -CAR_HEIGHT / 2 + 12, 4, 0, Math.PI * 2);
      ctx.fill();
      
      // BOOM DAO accent stripe
      ctx.fillStyle = '#ef4444'; // Red accent
      ctx.fillRect(-CAR_WIDTH / 2 + 12, CAR_HEIGHT / 2 - 10, CAR_WIDTH - 24, 2);
      
      // Headlights
      ctx.fillStyle = '#fef08a'; // Yellow
      ctx.fillRect(-CAR_WIDTH / 2 + 14, -CAR_HEIGHT / 2 + 1, 8, 2);
      ctx.fillRect(CAR_WIDTH / 2 - 22, -CAR_HEIGHT / 2 + 1, 8, 2);
      
      // Car outline for definition
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-CAR_WIDTH / 2 + 8, -CAR_HEIGHT / 2 + 4, CAR_WIDTH - 16, CAR_HEIGHT - 8);
    };

    const gameLoop = () => {
      if (isPaused || isGameOver) {
        animationFrameId = requestAnimationFrame(gameLoop);
        return;
      }

      const state = gameStateRef.current;

      // Clear canvas with gradient sky
      const skyGradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
      skyGradient.addColorStop(0, 'oklch(0.75 0.15 220)');
      skyGradient.addColorStop(1, 'oklch(0.55 0.12 230)');
      ctx.fillStyle = skyGradient;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Draw background logos
      drawBackgroundLogos(ctx, state);

      // Handle car turning
      if (state.keysPressed.has('ArrowLeft')) {
        state.car.angle -= TURN_SPEED;
      }
      if (state.keysPressed.has('ArrowRight')) {
        state.car.angle += TURN_SPEED;
      }

      // Handle car movement (only when spacebar pressed)
      const isMoving = state.keysPressed.has(' ');
      if (isMoving) {
        const newX = state.car.x + Math.cos(state.car.angle) * MOVE_SPEED;
        const newY = state.car.y + Math.sin(state.car.angle) * MOVE_SPEED;
        
        state.car.x = newX;
        state.car.y = newY;
        state.car.speed = MOVE_SPEED;
        setSpeed(MOVE_SPEED);
        
        // Check if we need to extend the road (car approaching top of visible road)
        const topOfRoad = state.roadPath[state.roadPath.length - 1].y + state.cameraOffsetY;
        if (topOfRoad > -ROAD_EXTEND_THRESHOLD) {
          extendRoad();
        }
        
        // Adjust camera to follow car when it moves up
        if (state.car.y < CANVAS_HEIGHT / 2) {
          const adjustment = CANVAS_HEIGHT / 2 - state.car.y;
          state.cameraOffsetY += adjustment;
          state.car.y = CANVAS_HEIGHT / 2;
        }
      } else {
        state.car.speed = 0;
        setSpeed(0);
      }

      // Check if car is off road (beyond green border)
      if (isMoving && !isCarOnRoad(state.car)) {
        setIsGameOver(true);
      }

      // Check if car went off screen horizontally
      if (state.car.x < 0 || state.car.x > CANVAS_WIDTH) {
        setIsGameOver(true);
      }

      // Draw road
      drawRoad(ctx, state);

      // Draw coins
      state.coins.forEach(coin => {
        if (coin.collected) return;

        const coinScreenY = coin.y + state.cameraOffsetY;
        
        // Only draw coins that are visible on screen
        if (coinScreenY < -50 || coinScreenY > CANVAS_HEIGHT + 50) return;

        // Check collision
        if (checkCollision(state.car, { x: coin.x, y: coinScreenY })) {
          coin.collected = true;
          setScore(prev => {
            const newScore = prev + 10;
            
            console.log('[useGameLoop] Score updated:', newScore);
            
            // Check if we reached the action threshold and haven't triggered it yet
            if (newScore >= ACTION_SCORE_THRESHOLD && !actionTriggeredRef.current) {
              console.log('[useGameLoop] Action threshold reached! Triggering callback...');
              actionTriggeredRef.current = true;
              
              // Call the callback on next tick to avoid state update during render
              setTimeout(() => {
                if (onScoreThresholdReached) {
                  console.log('[useGameLoop] Calling onScoreThresholdReached callback');
                  onScoreThresholdReached();
                } else {
                  console.warn('[useGameLoop] onScoreThresholdReached callback is not defined');
                }
              }, 0);
            }
            
            // Check if player reached max score
            if (newScore >= MAX_SCORE) {
              console.log('[useGameLoop] Max score reached! Game over.');
              setIsGameOver(true);
            }
            return newScore;
          });
        }

        // Draw coin
        ctx.fillStyle = 'oklch(0.85 0.2 85)';
        ctx.strokeStyle = 'oklch(0.65 0.25 75)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(coin.x, coinScreenY, COIN_SIZE / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        // Draw coin symbol
        ctx.fillStyle = 'oklch(0.65 0.25 75)';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('$', coin.x, coinScreenY);
      });

      // Draw CSS-rendered car
      ctx.save();
      ctx.translate(state.car.x, state.car.y);
      // Rotate the car - pointing upward by default
      ctx.rotate(state.car.angle);
      
      // Draw the car using CSS-inspired canvas drawing
      drawCSSCar(ctx);
      
      ctx.restore();

      animationFrameId = requestAnimationFrame(gameLoop);
    };

    animationFrameId = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [canvasRef, isPaused, isGameOver, setIsGameOver, onScoreThresholdReached]);

  return { score, speed, resetGame };
}
