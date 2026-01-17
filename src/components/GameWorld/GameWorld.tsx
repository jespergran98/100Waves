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
  const lastLoadedChunksRef = useRef<Set<string>>(new Set());

  // Get chunk key from chunk coordinates
  const getChunkKey = useCallback((chunkX: number, chunkY: number): string => {
    return `${chunkX},${chunkY}`;
  }, []);

  // Get visible chunk coordinates based on camera position
  const getVisibleChunks = useCallback((offsetX: number, offsetY: number): Set<string> => {
    const canvas = canvasRef.current;
    if (!canvas) return new Set();

    const { chunkSize, tileSize, viewDistance } = DEFAULT_WORLD_CONFIG;
    const chunkPixelSize = chunkSize * tileSize;

    // Calculate the world coordinates of the viewport corners
    const viewportLeft = -offsetX;
    const viewportTop = -offsetY;
    const viewportRight = canvas.width - offsetX;
    const viewportBottom = canvas.height - offsetY;

    // Convert to chunk coordinates with buffer
    const minChunkX = Math.floor(viewportLeft / chunkPixelSize) - viewDistance;
    const minChunkY = Math.floor(viewportTop / chunkPixelSize) - viewDistance;
    const maxChunkX = Math.floor(viewportRight / chunkPixelSize) + viewDistance;
    const maxChunkY = Math.floor(viewportBottom / chunkPixelSize) + viewDistance;

    const visible = new Set<string>();
    for (let cy = minChunkY; cy <= maxChunkY; cy++) {
      for (let cx = minChunkX; cx <= maxChunkX; cx++) {
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

    // Check if we actually need to load new chunks
    const needsUpdate = Array.from(visibleKeys).some(key => !chunks.has(key));
    if (!needsUpdate && visibleKeys.size === lastLoadedChunksRef.current.size) {
      return;
    }

    let newChunksGenerated = false;

    // Generate missing chunks
    visibleKeys.forEach(key => {
      if (!chunks.has(key)) {
        const [cxStr, cyStr] = key.split(',');
        const cx = parseInt(cxStr ?? '0', 10);
        const cy = parseInt(cyStr ?? '0', 10);
        
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

    // Memory management: remove chunks that are far away
    const maxDistance = DEFAULT_WORLD_CONFIG.viewDistance + 4;
    const chunksToDelete: string[] = [];

    chunks.forEach((_, key) => {
      if (!visibleKeys.has(key)) {
        const [cxStr, cyStr] = key.split(',');
        const cx = parseInt(cxStr ?? '0', 10);
        const cy = parseInt(cyStr ?? '0', 10);
        
        if (!isNaN(cx) && !isNaN(cy)) {
          // Check if chunk is within max distance of any visible chunk
          let shouldKeep = false;
          for (const visibleKey of visibleKeys) {
            const [vxStr, vyStr] = visibleKey.split(',');
            const vx = parseInt(vxStr ?? '0', 10);
            const vy = parseInt(vyStr ?? '0', 10);
            
            if (!isNaN(vx) && !isNaN(vy)) {
              const distance = Math.max(Math.abs(cx - vx), Math.abs(cy - vy));
              if (distance <= maxDistance) {
                shouldKeep = true;
                break;
              }
            }
          }
          
          if (!shouldKeep) {
            chunksToDelete.push(key);
          }
        }
      }
    });

    chunksToDelete.forEach(key => chunks.delete(key));
    lastLoadedChunksRef.current = visibleKeys;
  }, [getVisibleChunks, cameraOffset]);

  // Initialize world generator
  useEffect(() => {
    setIsInitializing(true);
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Create generator
    const generator = new WorldGenerator(worldData, DEFAULT_WORLD_CONFIG);
    generatorRef.current = generator;

    // Center camera so that world (0, 0) appears in the center
    const centerX = Math.floor(canvas.width / 2);
    const centerY = Math.floor(canvas.height / 2);
    setCameraOffset({ x: centerX, y: centerY });

    // Initialization complete
    setTimeout(() => {
      setIsInitializing(false);
    }, 600);

    return () => {
      if (generatorRef.current) {
        generatorRef.current.clearCache();
      }
      chunksRef.current.clear();
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

    // Set canvas size if needed
    if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    // Clear canvas
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const { tileSize, chunkSize } = DEFAULT_WORLD_CONFIG;
    const chunks = chunksRef.current;

    if (chunks.size === 0) return;

    // Tile colors with slight variations
    const colors: Record<TileType, string> = {
      water: '#1a4d5c',
      sand: '#c2a66b',
      land: '#2d4a2b',
      stone: '#5a5a5a'
    };

    const borderColor = 'rgba(0, 0, 0, 0.15)';

    // Render all loaded chunks
    chunks.forEach((chunk) => {
      const chunkPixelX = chunk.x * chunkSize * tileSize;
      const chunkPixelY = chunk.y * chunkSize * tileSize;

      // Calculate screen position of chunk
      const screenChunkX = chunkPixelX + cameraOffset.x;
      const screenChunkY = chunkPixelY + cameraOffset.y;

      // Cull entire chunk if completely off-screen
      const chunkPixelSize = chunkSize * tileSize;
      if (
        screenChunkX + chunkPixelSize < 0 ||
        screenChunkX > canvas.width ||
        screenChunkY + chunkPixelSize < 0 ||
        screenChunkY > canvas.height
      ) {
        return;
      }

      // Render tiles in this chunk
      for (let y = 0; y < chunkSize; y++) {
        const row = chunk.tiles[y];
        if (!row) continue;
        
        for (let x = 0; x < chunkSize; x++) {
          const tile = row[x];
          if (!tile) continue;
          
          const screenX = screenChunkX + (x * tileSize);
          const screenY = screenChunkY + (y * tileSize);

          // Tile-level culling for edge chunks
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

          // Draw subtle border
          ctx.strokeStyle = borderColor;
          ctx.lineWidth = 1;
          ctx.strokeRect(screenX, screenY, tileSize, tileSize);
        }
      }
    });

    // Draw grid overlay (every 8 tiles)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    
    const gridSize = tileSize * 8;
    const offsetX = cameraOffset.x % gridSize;
    const offsetY = cameraOffset.y % gridSize;

    // Vertical lines
    for (let x = offsetX; x < canvas.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    
    // Horizontal lines
    for (let y = offsetY; y < canvas.height; y += gridSize) {
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

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        loadVisibleChunks();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [loadVisibleChunks]);

  // Mouse drag handlers
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

  // Touch handlers for mobile
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

  // Calculate terrain percentage
  const calculatePercentage = useCallback((count: number): string => {
    if (!worldStats) return '0.0';
    const total = Object.values(worldStats).reduce((sum, val) => sum + val, 0);
    if (total === 0) return '0.0';
    return ((count / total) * 100).toFixed(1);
  }, [worldStats]);

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