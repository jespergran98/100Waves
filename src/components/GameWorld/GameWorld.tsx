import { useEffect, useRef, useState, useCallback } from 'react';
import { WorldGenerator } from '../../utils/worldGenerator';
import type { WorldData, Chunk, TileType } from '../../types/world.types';
import { DEFAULT_WORLD_CONFIG } from '../../types/world.types';
import './GameWorld.css';

interface GameWorldProps {
  worldData: WorldData;
  onBackToMenu: () => void;
}

const GameWorld = ({ worldData, onBackToMenu }: GameWorldProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const generatorRef = useRef<WorldGenerator | null>(null);
  const chunksRef = useRef<Map<string, Chunk>>(new Map());
  const [isInitializing, setIsInitializing] = useState(true);
  const [worldStats, setWorldStats] = useState<Record<TileType, number> | null>(null);
  const [cameraOffset, setCameraOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const animationFrameRef = useRef<number | null>(null);

  // Get chunk key from chunk coordinates
  const getChunkKey = useCallback((chunkX: number, chunkY: number): string => {
    return `${chunkX},${chunkY}`;
  }, []);

  // Convert world position to chunk coordinates
  const worldToChunk = useCallback((worldX: number, worldY: number): { x: number; y: number } => {
    return {
      x: Math.floor(worldX / DEFAULT_WORLD_CONFIG.chunkSize),
      y: Math.floor(worldY / DEFAULT_WORLD_CONFIG.chunkSize)
    };
  }, []);

  // Get visible chunk coordinates based on camera position
  const getVisibleChunks = useCallback((offsetX: number, offsetY: number): Set<string> => {
    const canvas = canvasRef.current;
    if (!canvas) return new Set();

    const { chunkSize, tileSize, viewDistance } = DEFAULT_WORLD_CONFIG;
    const chunkPixelSize = chunkSize * tileSize;

    // Calculate which chunks are visible
    // The camera offset tells us where world (0,0) appears on screen
    // To find which world coordinates are visible, we need to inverse this
    const worldLeft = -offsetX;
    const worldTop = -offsetY;
    const worldRight = canvas.width - offsetX;
    const worldBottom = canvas.height - offsetY;

    const startX = Math.floor(worldLeft / chunkPixelSize) - viewDistance;
    const startY = Math.floor(worldTop / chunkPixelSize) - viewDistance;
    const endX = Math.ceil(worldRight / chunkPixelSize) + viewDistance;
    const endY = Math.ceil(worldBottom / chunkPixelSize) + viewDistance;

    const visible = new Set<string>();
    for (let cy = startY; cy <= endY; cy++) {
      for (let cx = startX; cx <= endX; cx++) {
        visible.add(getChunkKey(cx, cy));
      }
    }

    return visible;
  }, [getChunkKey]);

  // Load chunks that are visible but not yet generated
  const loadVisibleChunks = useCallback(() => {
    const visibleKeys = getVisibleChunks(cameraOffset.x, cameraOffset.y);
    const chunks = chunksRef.current;
    const generator = generatorRef.current;

    if (!generator) return;

    let newChunksGenerated = false;

    visibleKeys.forEach(key => {
      if (!chunks.has(key)) {
        const parts = key.split(',');
        const cx = parseInt(parts[0] ?? '0', 10);
        const cy = parseInt(parts[1] ?? '0', 10);
        
        if (!isNaN(cx) && !isNaN(cy)) {
          const chunk = generator.generateChunk(cx, cy);
          chunks.set(key, chunk);
          newChunksGenerated = true;
        }
      }
    });

    // Update stats if new chunks were generated
    if (newChunksGenerated) {
      const allChunks = Array.from(chunks.values());
      const stats = generator.getChunkStatistics(allChunks);
      setWorldStats(stats);
    }

    // Clean up chunks that are too far away (memory management)
    const { viewDistance } = DEFAULT_WORLD_CONFIG;
    const maxDistance = viewDistance + 3; // Keep a larger buffer
    const centerChunk = worldToChunk(-cameraOffset.x, -cameraOffset.y);

    const chunksToDelete: string[] = [];
    chunks.forEach((_, key) => {
      const parts = key.split(',');
      const cx = parseInt(parts[0] ?? '0', 10);
      const cy = parseInt(parts[1] ?? '0', 10);
      
      if (!isNaN(cx) && !isNaN(cy)) {
        const distance = Math.max(
          Math.abs(cx - centerChunk.x),
          Math.abs(cy - centerChunk.y)
        );
        
        if (distance > maxDistance) {
          chunksToDelete.push(key);
        }
      }
    });

    chunksToDelete.forEach(key => chunks.delete(key));
  }, [getVisibleChunks, worldToChunk, cameraOffset]);

  // Initialize world generator
  useEffect(() => {
    setIsInitializing(true);
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Create generator immediately
    const generator = new WorldGenerator(worldData, DEFAULT_WORLD_CONFIG);
    generatorRef.current = generator;

    // Center camera so that world (0, 0) appears in the center of the screen
    const centerX = canvas.width / 2 || window.innerWidth / 2;
    const centerY = canvas.height / 2 || window.innerHeight / 2;
    setCameraOffset({ x: centerX, y: centerY });

    // Small delay for visual effect, then mark as ready
    setTimeout(() => {
      setIsInitializing(false);
    }, 800);

    return () => {
      if (generatorRef.current) {
        generatorRef.current.clearCache();
      }
    };
  }, [worldData]);

  // Load initial chunks when initialization completes
  useEffect(() => {
    if (!isInitializing && generatorRef.current) {
      loadVisibleChunks();
    }
  }, [isInitializing, loadVisibleChunks]);

  // Render world to canvas
  const renderWorld = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    // Set canvas size
    if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    // Clear canvas with dark background
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const { tileSize, chunkSize } = DEFAULT_WORLD_CONFIG;
    const chunks = chunksRef.current;

    if (chunks.size === 0) return;

    // Tile colors
    const colors: Record<TileType, string> = {
      water: '#1a4d5c',
      sand: '#c2a66b',
      land: '#2d4a2b',
      stone: '#5a5a5a'
    };

    // Render all chunks
    chunks.forEach((chunk) => {
      // Calculate chunk's top-left position in world space
      const chunkWorldX = chunk.x * chunkSize * tileSize;
      const chunkWorldY = chunk.y * chunkSize * tileSize;

      // Render tiles in chunk
      for (let y = 0; y < chunk.tiles.length; y++) {
        const row = chunk.tiles[y];
        if (!row) continue;
        
        for (let x = 0; x < row.length; x++) {
          const tile = row[x];
          if (!tile) continue;
          
          // Calculate screen position
          const screenX = chunkWorldX + (x * tileSize) + cameraOffset.x;
          const screenY = chunkWorldY + (y * tileSize) + cameraOffset.y;

          // Cull offscreen tiles for performance
          if (
            screenX + tileSize < 0 ||
            screenX > canvas.width ||
            screenY + tileSize < 0 ||
            screenY > canvas.height
          ) {
            continue;
          }

          // Draw tile
          ctx.fillStyle = colors[tile.type];
          ctx.fillRect(screenX, screenY, tileSize, tileSize);

          // Add subtle borders
          ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
          ctx.lineWidth = 1;
          ctx.strokeRect(screenX, screenY, tileSize, tileSize);
        }
      }
    });

    // Draw grid overlay (every 8 tiles)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    
    const gridSize = tileSize * 8;
    const startX = Math.floor(-cameraOffset.x / gridSize) * gridSize + cameraOffset.x;
    const startY = Math.floor(-cameraOffset.y / gridSize) * gridSize + cameraOffset.y;

    for (let x = startX; x < canvas.width + gridSize; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    
    for (let y = startY; y < canvas.height + gridSize; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

  }, [cameraOffset]);

  // Render loop
  useEffect(() => {
    if (isInitializing) return;

    const render = () => {
      renderWorld();
      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isInitializing, renderWorld]);

  // Load chunks when camera moves
  useEffect(() => {
    if (isInitializing) return;
    loadVisibleChunks();
  }, [cameraOffset, isInitializing, loadVisibleChunks]);

  // Handle mouse drag for camera movement
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - cameraOffset.x, y: e.clientY - cameraOffset.y });
  }, [cameraOffset]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;
    setCameraOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Handle touch events for mobile
  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    if (!touch) return;
    
    setIsDragging(true);
    setDragStart({ x: touch.clientX - cameraOffset.x, y: touch.clientY - cameraOffset.y });
  }, [cameraOffset]);

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDragging || e.touches.length !== 1) return;
    e.preventDefault();
    const touch = e.touches[0];
    if (!touch) return;
    
    setCameraOffset({
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y
    });
  }, [isDragging, dragStart]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  const calculatePercentage = (count: number): string => {
    if (!worldStats) return '0';
    const total = Object.values(worldStats).reduce((sum, val) => sum + val, 0);
    return ((count / total) * 100).toFixed(1);
  };

  const getTotalChunks = (): number => {
    return chunksRef.current.size;
  };

  return (
    <div className="game-world">
      {/* Canvas */}
      <canvas
        ref={canvasRef}
        className={`world-canvas ${isDragging ? 'dragging' : ''}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      />

      {/* Loading overlay */}
      {isInitializing && (
        <div className="loading-overlay">
          <div className="loading-content">
            <div className="loading-spinner" />
            <h2 className="loading-title">GENERATING WORLD</h2>
            <p className="loading-subtitle">Seed: {worldData.seed}</p>
          </div>
        </div>
      )}

      {/* UI Overlay */}
      {!isInitializing && (
        <>
          {/* Header */}
          <div className="world-header">
            <div className="header-left">
              <button className="icon-button back-button" onClick={onBackToMenu}>
                <span className="button-icon">←</span>
              </button>
              <div className="world-info">
                <h1 className="world-name">{worldData.name}</h1>
                <div className="world-meta">
                  <span className="meta-item">Seed: {worldData.seed}</span>
                  <span className="meta-divider">•</span>
                  <span className="meta-item">{worldData.difficulty.toUpperCase()}</span>
                  <span className="meta-divider">•</span>
                  <span className="meta-item">{getTotalChunks()} Chunks</span>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Panel */}
          {worldStats && (
            <div className="stats-panel">
              <div className="stats-header">
                <span className="stats-icon">📊</span>
                <span className="stats-title">TERRAIN</span>
              </div>
              <div className="stats-grid">
                <div className="stat-item land">
                  <div className="stat-bar" style={{ width: `${calculatePercentage(worldStats.land)}%` }} />
                  <span className="stat-label">Land</span>
                  <span className="stat-value">{calculatePercentage(worldStats.land)}%</span>
                </div>
                <div className="stat-item water">
                  <div className="stat-bar" style={{ width: `${calculatePercentage(worldStats.water)}%` }} />
                  <span className="stat-label">Water</span>
                  <span className="stat-value">{calculatePercentage(worldStats.water)}%</span>
                </div>
                <div className="stat-item sand">
                  <div className="stat-bar" style={{ width: `${calculatePercentage(worldStats.sand)}%` }} />
                  <span className="stat-label">Sand</span>
                  <span className="stat-value">{calculatePercentage(worldStats.sand)}%</span>
                </div>
                <div className="stat-item stone">
                  <div className="stat-bar" style={{ width: `${calculatePercentage(worldStats.stone)}%` }} />
                  <span className="stat-label">Stone</span>
                  <span className="stat-value">{calculatePercentage(worldStats.stone)}%</span>
                </div>
              </div>
            </div>
          )}

          {/* Controls hint */}
          <div className="controls-hint">
            <span className="hint-icon">🖱️</span>
            <span className="hint-text">Click and drag to explore • World expands as you move</span>
          </div>
        </>
      )}
    </div>
  );
};

export default GameWorld;