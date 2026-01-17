import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { WorldGenerator } from '../../utils/worldGenerator';
import type { WorldData, Chunk, TileType } from '../../types/world.types';
import { DEFAULT_WORLD_CONFIG } from '../../types/world.types';
import './GameWorld.css';

interface GameWorldProps {
  worldData: WorldData;
  onBackToMenu: () => void;
}

// Vibrant, clean color palette - bright and saturated
const TILE_COLORS: Record<TileType, string[]> = {
  land: [
    '#4a6b4a', '#4b6c4b', '#4c6d4c', '#4d6e4d',
    '#4a6a4a', '#4b6b4b', '#4c6c4c', '#4d6d4d'
  ],
  water: [
    '#2a5a6f', '#2b5b70', '#2c5c71', '#2d5d72',
    '#2a5970', '#2b5a71', '#2c5b72', '#2d5c73'
  ],
  sand: [
    '#8b7a5a', '#8c7b5b', '#8d7c5c', '#8e7d5d',
    '#8b795a', '#8c7a5b', '#8d7b5c', '#8e7c5d'
  ],
  stone: [
    '#6a6b6c', '#6b6c6d', '#6c6d6e', '#6d6e6f',
    '#696a6b', '#6a6b6c', '#6b6c6d', '#6c6d6e'
  ]
};

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

  // Get chunk key
  const getChunkKey = useCallback((cx: number, cy: number): string => `${cx},${cy}`, []);

  // Calculate visible chunks
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

  // Load visible chunks
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

    if (newChunks.length > 0) {
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

    const maxDist = viewDistance + 4;
    const toDelete: string[] = [];

    chunks.forEach((_, key) => {
      if (!visibleKeys.has(key)) {
        const [cxStr, cyStr] = key.split(',');
        const cx = parseInt(cxStr!, 10);
        const cy = parseInt(cyStr!, 10);
        
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

  // Seeded random for consistent tile variations
  const getTileVariation = useCallback((x: number, y: number, type: TileType): number => {
    const hash = ((x * 73856093) ^ (y * 19349663)) & 0x7fffffff;
    return hash % TILE_COLORS[type].length;
  }, []);

  // Clean, vibrant render - no imperfections
  const renderWorld = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d', { alpha: false });
    if (!canvas || !ctx) return;

    const offsetChanged = lastRenderOffset.current.x !== cameraOffset.x || 
                          lastRenderOffset.current.y !== cameraOffset.y;
    
    if (!needsRenderRef.current && !offsetChanged) return;

    lastRenderOffset.current = { x: cameraOffset.x, y: cameraOffset.y };
    needsRenderRef.current = false;

    // Clear with clean background
    ctx.fillStyle = '#2a2e2f';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const chunks = chunksRef.current;
    if (chunks.size === 0) return;

    const { width, height } = canvas;

    // Render chunks with clean blocks
    chunks.forEach((chunk) => {
      const chunkScreenX = chunk.x * chunkPixelSize + cameraOffset.x;
      const chunkScreenY = chunk.y * chunkPixelSize + cameraOffset.y;

      if (
        chunkScreenX + chunkPixelSize < 0 ||
        chunkScreenX > width ||
        chunkScreenY + chunkPixelSize < 0 ||
        chunkScreenY > height
      ) {
        return;
      }

      // Render clean tiles
      for (let y = 0; y < chunkSize; y++) {
        const row = chunk.tiles[y];
        if (!row) continue;
        
        const screenY = chunkScreenY + y * tileSize;
        if (screenY + tileSize < 0 || screenY > height) continue;
        
        for (let x = 0; x < chunkSize; x++) {
          const tile = row[x];
          if (!tile) continue;
          
          const screenX = chunkScreenX + x * tileSize;
          if (screenX + tileSize < 0 || screenX > width) continue;

          // Get color variation for this tile
          const colorIndex = getTileVariation(tile.x, tile.y, tile.type);
          const tileColor = TILE_COLORS[tile.type][colorIndex];
          if (tileColor) {
            ctx.fillStyle = tileColor;
            ctx.fillRect(screenX, screenY, tileSize, tileSize);
          }
        }
      }
    });

    // Draw chunk grid (very subtle)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
    ctx.lineWidth = 1;
    
    const chunkGridSize = chunkPixelSize;
    const offsetX = ((cameraOffset.x % chunkGridSize) + chunkGridSize) % chunkGridSize;
    const offsetY = ((cameraOffset.y % chunkGridSize) + chunkGridSize) % chunkGridSize;

    ctx.beginPath();
    for (let x = offsetX; x < width; x += chunkGridSize) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
    }
    for (let y = offsetY; y < height; y += chunkGridSize) {
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }
    ctx.stroke();

    // Very subtle vignette
    const gradient = ctx.createRadialGradient(
      width / 2, height / 2, 0,
      width / 2, height / 2, Math.max(width, height) * 0.8
    );
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    gradient.addColorStop(0.9, 'rgba(0, 0, 0, 0.02)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.1)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

  }, [cameraOffset, chunkPixelSize, chunkSize, tileSize, getTileVariation]);

  // Initialize
  useEffect(() => {
    setIsInitializing(true);
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const generator = new WorldGenerator(worldData, DEFAULT_WORLD_CONFIG);
    generatorRef.current = generator;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    canvasSizeRef.current = { width: canvas.width, height: canvas.height };

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

  // Render loop
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

  // Chunk loading on camera change
  useEffect(() => {
    if (isInitializing) return;
    scheduleChunkLoad();
  }, [cameraOffset, isInitializing, scheduleChunkLoad]);

  // Window resize
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

  // Percentage calculation
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
                <span className="stats-icon">🗺️</span>
                <span className="stats-title">TERRAIN</span>
              </div>
              <div className="stats-grid">
                <div className="stat-item land">
                  <div className="stat-bar" style={{ width: `${getPercentage(worldStats.land)}%` }} />
                  <span className="stat-label">Overgrown</span>
                  <span className="stat-value">{getPercentage(worldStats.land)}%</span>
                </div>
                <div className="stat-item water">
                  <div className="stat-bar" style={{ width: `${getPercentage(worldStats.water)}%` }} />
                  <span className="stat-label">Contaminated</span>
                  <span className="stat-value">{getPercentage(worldStats.water)}%</span>
                </div>
                <div className="stat-item sand">
                  <div className="stat-bar" style={{ width: `${getPercentage(worldStats.sand)}%` }} />
                  <span className="stat-label">Wasteland</span>
                  <span className="stat-value">{getPercentage(worldStats.sand)}%</span>
                </div>
                <div className="stat-item stone">
                  <div className="stat-bar" style={{ width: `${getPercentage(worldStats.stone)}%` }} />
                  <span className="stat-label">Ruins</span>
                  <span className="stat-value">{getPercentage(worldStats.stone)}%</span>
                </div>
              </div>
            </div>
          )}

          <div className="controls-hint">
            <span className="hint-icon">⚠️</span>
            <span className="hint-text">Explore the wasteland • Beware of the infected</span>
          </div>
        </>
      )}
    </div>
  );
};

export default GameWorld;