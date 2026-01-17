import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { WorldGenerator } from '../../utils/worldGenerator';
import type { WorldData, Chunk, TileType } from '../../types/world.types';
import { DEFAULT_WORLD_CONFIG } from '../../types/world.types';
import './GameWorld.css';

interface GameWorldProps {
  worldData: WorldData;
  onBackToMenu: () => void;
}

// Tile color constants (avoid object recreation)
const TILE_COLORS: Record<TileType, string> = {
  water: '#1a4d5c',
  sand: '#c2a66b',
  land: '#2d4a2b',
  stone: '#5a5a5a'
};

const BORDER_COLOR = 'rgba(0, 0, 0, 0.15)';
const GRID_COLOR = 'rgba(255, 255, 255, 0.03)';

const GameWorld = ({ worldData, onBackToMenu }: GameWorldProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const generatorRef = useRef<WorldGenerator | null>(null);
  const chunksRef = useRef<Map<string, Chunk>>(new Map());
  const [isInitializing, setIsInitializing] = useState(true);
  const [worldStats, setWorldStats] = useState<Record<TileType, number> | null>(null);
  const [cameraOffset, setCameraOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const lastRenderOffset = useRef({ x: 0, y: 0 });
  const needsRenderRef = useRef(true);
  const visibleChunksRef = useRef<Set<string>>(new Set());
  const loadTimeoutRef = useRef<number | null>(null);
  const canvasSizeRef = useRef({ width: 0, height: 0 });

  // Memoized config values
  const { chunkSize, tileSize, viewDistance } = useMemo(() => DEFAULT_WORLD_CONFIG, []);
  const chunkPixelSize = useMemo(() => chunkSize * tileSize, [chunkSize, tileSize]);
  const gridSize = useMemo(() => tileSize * 8, [tileSize]);

  // Get chunk key (memoized inline)
  const getChunkKey = useCallback((cx: number, cy: number): string => `${cx},${cy}`, []);

  // Optimized visible chunks calculation
  const calculateVisibleChunks = useCallback((offsetX: number, offsetY: number, width: number, height: number): Set<string> => {
    const minChunkX = Math.floor(-offsetX / chunkPixelSize) - viewDistance;
    const minChunkY = Math.floor(-offsetY / chunkPixelSize) - viewDistance;
    const maxChunkX = Math.floor((width - offsetX) / chunkPixelSize) + viewDistance;
    const maxChunkY = Math.floor((height - offsetY) / chunkPixelSize) + viewDistance;

    const visible = new Set<string>();
    for (let cy = minChunkY; cy <= maxChunkY; cy++) {
      for (let cx = minChunkX; cx <= maxChunkX; cx++) {
        visible.add(getChunkKey(cx, cy));
      }
    }
    return visible;
  }, [chunkPixelSize, viewDistance, getChunkKey]);

  // Batch load visible chunks with intelligent caching
  const loadVisibleChunks = useCallback(() => {
    const canvas = canvasRef.current;
    const generator = generatorRef.current;
    if (!canvas || !generator) return;

    const visibleKeys = calculateVisibleChunks(
      cameraOffset.x,
      cameraOffset.y,
      canvasSizeRef.current.width,
      canvasSizeRef.current.height
    );

    // Quick check: if same chunks are visible, skip
    if (visibleKeys.size === visibleChunksRef.current.size) {
      let allSame = true;
      for (const key of visibleKeys) {
        if (!visibleChunksRef.current.has(key)) {
          allSame = false;
          break;
        }
      }
      if (allSame) return;
    }

    const chunks = chunksRef.current;
    const newChunks: Chunk[] = [];

    // Generate missing chunks in batch
    visibleKeys.forEach(key => {
      if (!chunks.has(key)) {
        const [cxStr, cyStr] = key.split(',');
        const cx = parseInt(cxStr!, 10);
        const cy = parseInt(cyStr!, 10);
        
        const chunk = generator.generateChunk(cx, cy);
        chunks.set(key, chunk);
        newChunks.push(chunk);
      }
    });

    // Update stats only if new chunks were added
    if (newChunks.length > 0) {
      // Incremental stats update instead of full recalculation
      setWorldStats(prev => {
        const updated = prev ? { ...prev } : { land: 0, water: 0, stone: 0, sand: 0 };
        newChunks.forEach(chunk => {
          chunk.tiles.forEach(row => {
            row.forEach(tile => {
              updated[tile.type]++;
            });
          });
        });
        return updated;
      });
      needsRenderRef.current = true;
    }

    // Efficient cleanup: remove chunks outside max range
    const maxDist = viewDistance + 4;
    const toDelete: string[] = [];

    chunks.forEach((_, key) => {
      if (!visibleKeys.has(key)) {
        const [cxStr, cyStr] = key.split(',');
        const cx = parseInt(cxStr!, 10);
        const cy = parseInt(cyStr!, 10);
        
        // Check distance to nearest visible chunk edge
        const minVisibleCx = Math.floor(-cameraOffset.x / chunkPixelSize) - viewDistance;
        const minVisibleCy = Math.floor(-cameraOffset.y / chunkPixelSize) - viewDistance;
        const maxVisibleCx = Math.floor((canvasSizeRef.current.width - cameraOffset.x) / chunkPixelSize) + viewDistance;
        const maxVisibleCy = Math.floor((canvasSizeRef.current.height - cameraOffset.y) / chunkPixelSize) + viewDistance;
        
        const distX = Math.max(0, minVisibleCx - cx, cx - maxVisibleCx);
        const distY = Math.max(0, minVisibleCy - cy, cy - maxVisibleCy);
        
        if (Math.max(distX, distY) > maxDist) {
          toDelete.push(key);
        }
      }
    });

    if (toDelete.length > 0) {
      toDelete.forEach(key => chunks.delete(key));
      needsRenderRef.current = true;
    }

    visibleChunksRef.current = visibleKeys;
  }, [cameraOffset, calculateVisibleChunks, chunkPixelSize, viewDistance]);

  // Throttled chunk loading
  const scheduleChunkLoad = useCallback(() => {
    if (loadTimeoutRef.current !== null) {
      clearTimeout(loadTimeoutRef.current);
    }
    loadTimeoutRef.current = window.setTimeout(() => {
      loadVisibleChunks();
      loadTimeoutRef.current = null;
    }, 50);
  }, [loadVisibleChunks]);

  // Ultra-optimized render function
  const renderWorld = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d', { alpha: false });
    if (!canvas || !ctx) return;

    // Check if render is needed
    const offsetChanged = lastRenderOffset.current.x !== cameraOffset.x || 
                          lastRenderOffset.current.y !== cameraOffset.y;
    
    if (!needsRenderRef.current && !offsetChanged) return;

    lastRenderOffset.current = { x: cameraOffset.x, y: cameraOffset.y };
    needsRenderRef.current = false;

    // Clear canvas
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const chunks = chunksRef.current;
    if (chunks.size === 0) return;

    const { width, height } = canvas;

    // Render chunks with aggressive culling
    chunks.forEach((chunk) => {
      const chunkScreenX = chunk.x * chunkPixelSize + cameraOffset.x;
      const chunkScreenY = chunk.y * chunkPixelSize + cameraOffset.y;

      // Chunk-level culling
      if (
        chunkScreenX + chunkPixelSize < 0 ||
        chunkScreenX > width ||
        chunkScreenY + chunkPixelSize < 0 ||
        chunkScreenY > height
      ) {
        return;
      }

      // Batch tile rendering for this chunk
      for (let y = 0; y < chunkSize; y++) {
        const row = chunk.tiles[y];
        if (!row) continue;
        
        const screenY = chunkScreenY + y * tileSize;
        
        // Row-level culling
        if (screenY + tileSize < 0 || screenY > height) continue;
        
        for (let x = 0; x < chunkSize; x++) {
          const tile = row[x];
          if (!tile) continue;
          
          const screenX = chunkScreenX + x * tileSize;

          // Tile-level culling
          if (screenX + tileSize < 0 || screenX > width) continue;

          // Draw tile (batched by color would be even better, but adds complexity)
          ctx.fillStyle = TILE_COLORS[tile.type];
          ctx.fillRect(screenX, screenY, tileSize, tileSize);

          // Draw border
          ctx.strokeStyle = BORDER_COLOR;
          ctx.strokeRect(screenX, screenY, tileSize, tileSize);
        }
      }
    });

    // Draw grid overlay
    ctx.strokeStyle = GRID_COLOR;
    ctx.lineWidth = 1;
    
    const offsetX = ((cameraOffset.x % gridSize) + gridSize) % gridSize;
    const offsetY = ((cameraOffset.y % gridSize) + gridSize) % gridSize;

    ctx.beginPath();
    for (let x = offsetX; x < width; x += gridSize) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
    }
    for (let y = offsetY; y < height; y += gridSize) {
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }
    ctx.stroke();

  }, [cameraOffset, chunkPixelSize, chunkSize, tileSize, gridSize]);

  // Initialize world generator
  useEffect(() => {
    setIsInitializing(true);
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const generator = new WorldGenerator(worldData, DEFAULT_WORLD_CONFIG);
    generatorRef.current = generator;

    // Set canvas size
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    canvasSizeRef.current = { width: canvas.width, height: canvas.height };

    // Center camera
    setCameraOffset({ 
      x: Math.floor(canvas.width / 2), 
      y: Math.floor(canvas.height / 2) 
    });

    setTimeout(() => setIsInitializing(false), 400);

    return () => {
      if (generatorRef.current) {
        generatorRef.current.clearCache();
      }
      chunksRef.current.clear();
      if (loadTimeoutRef.current !== null) {
        clearTimeout(loadTimeoutRef.current);
      }
    };
  }, [worldData]);

  // Load initial chunks
  useEffect(() => {
    if (!isInitializing) {
      loadVisibleChunks();
    }
  }, [isInitializing, loadVisibleChunks]);

  // Optimized render loop - only render when needed
  useEffect(() => {
    if (isInitializing) return;

    let rafId: number;
    const render = () => {
      renderWorld();
      rafId = requestAnimationFrame(render);
    };

    rafId = requestAnimationFrame(render);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [isInitializing, renderWorld]);

  // Debounced chunk loading on camera change
  useEffect(() => {
    if (isInitializing) return;
    scheduleChunkLoad();
  }, [cameraOffset, isInitializing, scheduleChunkLoad]);

  // Handle window resize efficiently
  useEffect(() => {
    let resizeTimeout: number;
    
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = window.setTimeout(() => {
        const canvas = canvasRef.current;
        if (canvas) {
          canvas.width = window.innerWidth;
          canvas.height = window.innerHeight;
          canvasSizeRef.current = { width: canvas.width, height: canvas.height };
          needsRenderRef.current = true;
          loadVisibleChunks();
        }
      }, 150);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimeout);
    };
  }, [loadVisibleChunks]);

  // Mouse handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX - cameraOffset.x, y: e.clientY - cameraOffset.y };
  }, [cameraOffset]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    setCameraOffset({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y
    });
  }, [isDragging]);

  const handleMouseUp = useCallback(() => setIsDragging(false), []);

  // Touch handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (!touch) return;
    setIsDragging(true);
    dragStartRef.current = { x: touch.clientX - cameraOffset.x, y: touch.clientY - cameraOffset.y };
  }, [cameraOffset]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    if (!touch) return;
    e.preventDefault();
    setCameraOffset({
      x: touch.clientX - dragStartRef.current.x,
      y: touch.clientY - dragStartRef.current.y
    });
  }, [isDragging]);

  const handleTouchEnd = useCallback(() => setIsDragging(false), []);

  // Memoized percentage calculation
  const getPercentage = useCallback((count: number): string => {
    if (!worldStats) return '0.0';
    const total = worldStats.land + worldStats.water + worldStats.sand + worldStats.stone;
    return total > 0 ? ((count / total) * 100).toFixed(1) : '0.0';
  }, [worldStats]);

  const totalChunks = chunksRef.current.size;

  return (
    <div className="game-world">
      <canvas
        ref={canvasRef}
        className={`world-canvas ${isDragging ? 'dragging' : ''}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      />

      {isInitializing && (
        <div className="loading-overlay">
          <div className="loading-content">
            <div className="loading-spinner" />
            <h2 className="loading-title">GENERATING WORLD</h2>
            <p className="loading-subtitle">Seed: {worldData.seed}</p>
          </div>
        </div>
      )}

      {!isInitializing && (
        <>
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
                  <span className="meta-item">{totalChunks} Chunks</span>
                </div>
              </div>
            </div>
          </div>

          {worldStats && (
            <div className="stats-panel">
              <div className="stats-header">
                <span className="stats-icon">📊</span>
                <span className="stats-title">TERRAIN</span>
              </div>
              <div className="stats-grid">
                <div className="stat-item land">
                  <div className="stat-bar" style={{ width: `${getPercentage(worldStats.land)}%` }} />
                  <span className="stat-label">Land</span>
                  <span className="stat-value">{getPercentage(worldStats.land)}%</span>
                </div>
                <div className="stat-item water">
                  <div className="stat-bar" style={{ width: `${getPercentage(worldStats.water)}%` }} />
                  <span className="stat-label">Water</span>
                  <span className="stat-value">{getPercentage(worldStats.water)}%</span>
                </div>
                <div className="stat-item sand">
                  <div className="stat-bar" style={{ width: `${getPercentage(worldStats.sand)}%` }} />
                  <span className="stat-label">Sand</span>
                  <span className="stat-value">{getPercentage(worldStats.sand)}%</span>
                </div>
                <div className="stat-item stone">
                  <div className="stat-bar" style={{ width: `${getPercentage(worldStats.stone)}%` }} />
                  <span className="stat-label">Stone</span>
                  <span className="stat-value">{getPercentage(worldStats.stone)}%</span>
                </div>
              </div>
            </div>
          )}

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