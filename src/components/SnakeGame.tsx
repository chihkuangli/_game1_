/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Play, RotateCcw, Pause, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { Point, Direction, GameStatus } from '../types';
import { SETTINGS, DIRECTIONS, INITIAL_SNAKE } from '../constants';

const SnakeGame: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [snake, setSnake] = useState<Point[]>(INITIAL_SNAKE);
  const [food, setFood] = useState<Point>({ x: 15, y: 15 });
  const [direction, setDirection] = useState<Direction>('RIGHT');
  const [status, setStatus] = useState<GameStatus>(GameStatus.IDLE);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [speed, setSpeed] = useState(SETTINGS.initialSpeed);
  const [logs, setLogs] = useState<string[]>(['> BOOTING SYSTEM...', '> INITIALIZING GRID 40x30...', '> SEEDING ENTITIES...']);

  // Refs for game loop logic to avoid stale closures
  const gameLoopRef = useRef<number | null>(null);
  const snakeRef = useRef<Point[]>(INITIAL_SNAKE);
  const directionRef = useRef<Direction>('RIGHT');
  const foodRef = useRef<Point>({ x: 15, y: 15 });
  const scoreRef = useRef(0);
  const lastUpdateRef = useRef(0);

  // Load high score from local storage
  useEffect(() => {
    const saved = localStorage.getItem('snake-high-score');
    if (saved) setHighScore(parseInt(saved, 10));
  }, []);

  // Update high score
  useEffect(() => {
    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem('snake-high-score', score.toString());
    }
  }, [score, highScore]);

  // Terminal log helper
  const addLog = useCallback((msg: string) => {
    setLogs(prev => [...prev.slice(-3), `> ${msg}`]);
  }, []);

  // Generate random food position
  const generateFood = useCallback((currentSnake: Point[]): Point => {
    const maxCols = SETTINGS.canvasWidth / SETTINGS.gridSize;
    const maxRows = SETTINGS.canvasHeight / SETTINGS.gridSize;
    
    let newFood: Point;
    while (true) {
      newFood = {
        x: Math.floor(Math.random() * maxCols),
        y: Math.floor(Math.random() * maxRows),
      };
      // Ensure food doesn't land on snake
      const onSnake = currentSnake.some(segment => segment.x === newFood.x && segment.y === newFood.y);
      if (!onSnake) break;
    }
    return newFood;
  }, []);

  // Initialize Game
  const resetGame = () => {
    setSnake(INITIAL_SNAKE);
    snakeRef.current = INITIAL_SNAKE;
    setFood({ x: 15, y: 15 });
    foodRef.current = { x: 15, y: 15 };
    setDirection('RIGHT');
    directionRef.current = 'RIGHT';
    setScore(0);
    scoreRef.current = 0;
    setSpeed(SETTINGS.initialSpeed);
    setStatus(GameStatus.PLAYING);
    addLog('PROTOCOL_RESTARTED');
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          if (directionRef.current !== 'DOWN') setDirection('UP');
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          if (directionRef.current !== 'UP') setDirection('DOWN');
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          if (directionRef.current !== 'RIGHT') setDirection('LEFT');
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          if (directionRef.current !== 'LEFT') setDirection('RIGHT');
          break;
        case ' ':
          if (status === GameStatus.PLAYING) setStatus(GameStatus.PAUSED);
          else if (status === GameStatus.PAUSED || status === GameStatus.IDLE) setStatus(GameStatus.PLAYING);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [status, addLog]);

  // Sync refs with state for the game loop
  useEffect(() => {
    directionRef.current = direction;
  }, [direction]);

  // Game Logic Tick
  const moveSnake = useCallback(() => {
    const head = snakeRef.current[0];
    const move = DIRECTIONS[directionRef.current];
    const newHead = { x: head.x + move.x, y: head.y + move.y };

    // Check Wall Collision
    const maxCols = SETTINGS.canvasWidth / SETTINGS.gridSize;
    const maxRows = SETTINGS.canvasHeight / SETTINGS.gridSize;
    
    if (
      newHead.x < 0 || 
      newHead.x >= maxCols || 
      newHead.y < 0 || 
      newHead.y >= maxRows
    ) {
      setStatus(GameStatus.GAME_OVER);
      addLog('WALL_COLLISION_DETECTED');
      return;
    }

    // Check Self Collision
    if (snakeRef.current.some(segment => segment.x === newHead.x && segment.y === newHead.y)) {
      setStatus(GameStatus.GAME_OVER);
      addLog('SELF_SABOTAGE_RECOGNIZED');
      return;
    }

    const newSnake = [newHead, ...snakeRef.current];

    // Check Food Collision
    if (newHead.x === foodRef.current.x && newHead.y === foodRef.current.y) {
      scoreRef.current += 10;
      setScore(scoreRef.current);
      const newFood = generateFood(newSnake);
      foodRef.current = newFood;
      setFood(newFood);
      setSpeed(prev => Math.max(70, prev - SETTINGS.speedIncrement));
      addLog(`TARGET_ACQUIRED: +10`);
    } else {
      newSnake.pop(); // Remove tail
    }

    snakeRef.current = newSnake;
    setSnake(newSnake);
  }, [generateFood, addLog]);

  // Draw Function
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear Canvas with subtle radial gradient
    const gradient = ctx.createRadialGradient(
      canvas.width / 2, canvas.height / 2, 50,
      canvas.width / 2, canvas.height / 2, canvas.width / 1.5
    );
    gradient.addColorStop(0, '#1a1c22');
    gradient.addColorStop(1, '#0A0B0E');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw Grid
    ctx.strokeStyle = '#2A2D35';
    ctx.lineWidth = 1;
    for (let i = 0; i <= canvas.width; i += SETTINGS.gridSize) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, canvas.height);
      ctx.stroke();
    }
    for (let i = 0; i <= canvas.height; i += SETTINGS.gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(canvas.width, i);
      ctx.stroke();
    }

    // Draw Food
    const foodX = foodRef.current.x * SETTINGS.gridSize;
    const foodY = foodRef.current.y * SETTINGS.gridSize;
    ctx.fillStyle = '#FF4444';
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#FF4444';
    ctx.beginPath();
    ctx.arc(
      foodX + SETTINGS.gridSize / 2,
      foodY + SETTINGS.gridSize / 2,
      SETTINGS.gridSize / 3,
      0,
      Math.PI * 2
    );
    ctx.fill();
    ctx.shadowBlur = 0;

    // Draw Snake
    snakeRef.current.forEach((segment, index) => {
      const x = segment.x * SETTINGS.gridSize;
      const y = segment.y * SETTINGS.gridSize;
      
      if (index === 0) {
        // Head
        ctx.fillStyle = '#FFFFFF';
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#FFFFFF';
      } else {
        // Body
        ctx.fillStyle = '#00FF00';
        ctx.shadowBlur = 4;
        ctx.shadowColor = 'rgba(0, 255, 0, 0.4)';
      }

      ctx.fillRect(
        x + 2,
        y + 2,
        SETTINGS.gridSize - 4,
        SETTINGS.gridSize - 4
      );
    });
    ctx.shadowBlur = 0;
  }, []);

  // Main Game Loop
  useEffect(() => {
    const loop = (timestamp: number) => {
      if (status === GameStatus.PLAYING) {
        const elapsed = timestamp - lastUpdateRef.current;
        if (elapsed > speed) {
          moveSnake();
          lastUpdateRef.current = timestamp;
        }
      }
      draw();
      gameLoopRef.current = requestAnimationFrame(loop);
    };

    gameLoopRef.current = requestAnimationFrame(loop);
    return () => {
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    };
  }, [status, speed, moveSnake, draw]);

  const padScore = (num: number) => num.toString().padStart(5, '0');

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden terminal-text">
      {/* Header */}
      <header className="h-[60px] border-b border-[#2A2D35] bg-[#151619] px-10 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-3 h-3 bg-[#00FF00] blur-[1px] shadow-[0_0_8px_#00FF00]" />
          <span className="text-[11px] tracking-[4px] text-[#666A73]">SNAKE_PROTOCOL // VERSION 2.0.4</span>
        </div>
        <div className="flex items-center gap-2">
           <span className="text-[11px] text-[#666A73]">STATUS:</span>
           <span className={`text-[11px] ${status === GameStatus.PLAYING ? 'text-[#00FF00]' : 'text-[#FF4444]'}`}>
             {status === GameStatus.PLAYING ? 'EXECUTING_LOGIC' : status === GameStatus.PAUSED ? 'SYSTEM_HALTED' : 'IDLE_WAITING'}
           </span>
        </div>
      </header>

      {/* Main Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <aside className="w-[240px] border-r border-[#2A2D35] p-8 flex flex-col gap-10 shrink-0 bg-[#0A0B0E]">
          <div className="flex flex-col gap-2">
            <span className="text-[10px] text-[#666A73] tracking-widest">CURRENT SCORE</span>
            <span className="text-3xl text-[#00FF00] font-bold">{padScore(score)}</span>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-[10px] text-[#666A73] tracking-widest">GLOBAL HIGH</span>
            <span className="text-3xl text-white font-bold">{padScore(highScore)}</span>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-[10px] text-[#666A73] tracking-widest">VELOCITY_MS</span>
            <span className="text-xl text-[#00FF00]">{speed.toFixed(3)}</span>
          </div>
          
          <div className="mt-auto flex flex-col gap-1 text-[#4a4d55] text-[11px]">
            {logs.map((log, i) => <div key={i}>{log}</div>)}
            <div className="animate-pulse">_</div>
          </div>
        </aside>

        {/* Center Game Board */}
        <main className="flex-1 min-w-0 bg-[#0A0B0E] relative flex items-center justify-center p-8">
           <div className="relative">
              <div className="absolute -inset-4 border border-[#2A2D35]/30 rounded-xl" />
              <canvas
                ref={canvasRef}
                width={SETTINGS.canvasWidth}
                height={SETTINGS.canvasHeight}
                className="block border border-[#2A2D35] neon-glow relative z-10"
              />

              {/* Overlays */}
              <AnimatePresence>
                {(status === GameStatus.IDLE || status === GameStatus.GAME_OVER) && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 z-20 flex items-center justify-center bg-[#0A0B0E]/90 backdrop-blur-sm"
                  >
                    <div className="text-center">
                      <h1 className="text-5xl font-black text-white mb-2 tracking-tighter uppercase italic">SNAKE SYSTEM</h1>
                      <div className="h-px w-full bg-[#2A2D35] mb-8" />
                      
                      {status === GameStatus.GAME_OVER && (
                        <div className="mb-8">
                          <div className="text-[#FF4444] text-xl tracking-[0.3em] mb-2 uppercase">Protocol_Failure</div>
                          <div className="text-white text-4xl mb-4 font-bold">{padScore(score)}</div>
                        </div>
                      )}

                      <button
                        onClick={resetGame}
                        className="px-10 py-4 bg-[#00FF00] text-black font-black hover:bg-white transition-colors uppercase tracking-widest text-sm"
                      >
                        Initialize_Link
                      </button>
                      <p className="mt-6 text-[#666A73] text-[10px] tracking-widest uppercase italic">Press Space To Toggle Halt</p>
                    </div>
                  </motion.div>
                )}

                {status === GameStatus.PAUSED && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 z-20 flex items-center justify-center bg-[#0A0B0E]/40 backdrop-blur-sm"
                  >
                    <div className="bg-[#151619] hardware-border p-10 text-center">
                      <h2 className="text-[#00FF00] text-xl mb-6 tracking-widest">SYSTEM_HALTED</h2>
                      <button
                        onClick={() => setStatus(GameStatus.PLAYING)}
                        className="px-6 py-2 border border-[#00FF00] text-[#00FF00] hover:bg-[#00FF00] hover:text-black transition-all"
                      >
                        RE_ENGAGE
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
           </div>
        </main>

        {/* Right Sidebar */}
        <aside className="w-[240px] border-l border-[#2A2D35] p-8 flex flex-col shrink-0 bg-[#0A0B0E]">
          <div className="mb-10">
            <span className="text-[10px] text-[#666A73] tracking-widest uppercase">Input Mapping</span>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className={`w-8 h-8 hardware-border flex items-center justify-center text-xs ${direction === 'UP' ? 'bg-[#00FF00] text-black' : 'text-[#666A73]'}`}>W</div>
              <span className="text-[10px] text-[#666A73] uppercase tracking-widest">Y+ Vector</span>
            </div>
            <div className="flex items-center gap-4">
              <div className={`w-8 h-8 hardware-border flex items-center justify-center text-xs ${direction === 'RIGHT' ? 'bg-[#00FF00] text-black' : 'text-[#666A73]'}`}>D</div>
              <span className="text-[10px] text-[#666A73] uppercase tracking-widest">X+ Vector</span>
            </div>
            <div className="flex items-center gap-4">
              <div className={`w-8 h-8 hardware-border flex items-center justify-center text-xs ${direction === 'DOWN' ? 'bg-[#00FF00] text-black' : 'text-[#666A73]'}`}>S</div>
              <span className="text-[10px] text-[#666A73] uppercase tracking-widest">Y- Vector</span>
            </div>
            <div className="flex items-center gap-4">
              <div className={`w-8 h-8 hardware-border flex items-center justify-center text-xs ${direction === 'LEFT' ? 'bg-[#00FF00] text-black' : 'text-[#666A73]'}`}>A</div>
              <span className="text-[10px] text-[#666A73] uppercase tracking-widest">X- Vector</span>
            </div>
          </div>

          <div className="mt-16 pt-8 border-t border-[#2A2D35]">
            <span className="text-[10px] text-[#666A73] tracking-widest uppercase block mb-4">Telemetry</span>
            <div className="text-[11px] text-[#666A73] space-y-1">
              <div>HD_POS_X: {snake[0]?.x.toFixed(3)}</div>
              <div>HD_POS_Y: {snake[0]?.y.toFixed(3)}</div>
              <div>FD_POS_X: {food.x.toFixed(3)}</div>
              <div>FD_POS_Y: {food.y.toFixed(3)}</div>
            </div>
          </div>
        </aside>
      </div>

      {/* Footer */}
      <footer className="h-10 border-t border-[#2A2D35] flex items-center px-10 text-[9px] text-[#666A73] gap-6 shrink-0 bg-[#151619]">
        <span>SYSTEM_CLOCK: {new Date().toLocaleTimeString()}</span>
        <span>ENV_TEMP: 24.5C</span>
        <div className="ml-auto flex gap-6">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#00FF00] shadow-[0_0_4px_#00FF00]" />
            CPU_CORE_01
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#00FF00] shadow-[0_0_4px_#00FF00]" />
            NET_LINK_ACTIVE
          </div>
        </div>
      </footer>
    </div>
  );
};

export default SnakeGame;
