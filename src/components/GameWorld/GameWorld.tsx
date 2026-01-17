import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { WorldGenerator } from '../../utils/worldGenerator';
import type { WorldData, Chunk, TileType } from '../../types/world.types';
import { DEFAULT_WORLD_CONFIG } from '../../types/world.types';
import './GameWorld.css';

interface GameWorldProps {
  worldData: WorldData;
  onBackToMenu: () => void;
}

// Enhanced pixel-perfect color palette with variants
const TILE_COLORS: Record<TileType, string[]> = {
  grass: [
    '#3d5a3d', '#3e5b3e', '#3f5c3f', '#405d40', '#415e41', '#3c593c'
  ],
  dirt: [
    '#6b4e3d', '#6c4f3e', '#6d503f', '#6e5140'
  ],
  water: [
    '#2d4d66', '#2e4e67', '#2f4f68', '#305069'
  ],
  deep_water: [
    '#1e3a52', '#1f3b53', '#203c54'
  ],
  sand: [
    '#a89968', '#a99a69', '#aa9b6a', '#ab9c6b'
  ],
  stone: [
    '#5a5a5a', '#5b5b5b', '#5c5c5c', '#5d5d5d', '#5e5e5e'
  ],
  gravel: [
    '#6e6e6e', '#6f6f6f', '#707070', '#717171'
  ],
  forest: [
    '#2d4a2d', '#2e4b2e', '#2f4c2f'
  ],
  dead_tree: [
    '#4a4034', '#4b4135', '#4c4236'
  ],
  concrete: [
    '#7a7a7a', '#7b7b7b', '#7c7c7c', '#7d7d7d'
  ],
  asphalt: [
    '#3a3a3a', '#3b3b3b', '#3c3c3c'
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

  const { chunkSize, tileSize, viewDistance } = useMemo(() => DEFAULT_WORLD_CONFIG, []);
  const chunkPixelSize = useMemo(() => chunkSize * tileSize, [chunkSize, tileSize]);

  const getChunkKey = useCallback((cx: number, cy: number): string => `${cx},${cy}`, []);

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
        const updated = prev ? { ...prev } : { 
          grass: 0, dirt: 0, water: 0, deep_water: 0, sand: 0, 
          stone: 0, gravel: 0, forest: 0, dead_tree: 0, concrete: 0, asphalt: 0 
        };
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

    const maxDist = viewDistance + 5;
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

  const scheduleChunkLoad = useCallback(() => {
    if (loadTimeoutRef.current !== null) {
      clearTimeout(loadTimeoutRef.current);
    }
    loadTimeoutRef.current = window.setTimeout(() => {
      loadVisibleChunks();
      loadTimeoutRef.current = null;
    }, 50);
  }, [loadVisibleChunks]);

  // Enhanced pixel art rendering
  const renderWorld = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d', { alpha: false, desynchronized: true });
    if (!canvas || !ctx) return;

    const offsetChanged = lastRenderOffset.current.x !== cameraOffset.x || 
                          lastRenderOffset.current.y !== cameraOffset.y;
    
    if (!needsRenderRef.current && !offsetChanged) return;

    lastRenderOffset.current = { x: cameraOffset.x, y: cameraOffset.y };
    needsRenderRef.current = false;

    // Clear with dark background
    ctx.fillStyle = '#1a1d1e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const chunks = chunksRef.current;
    if (chunks.size === 0) return;

    const { width, height } = canvas;

    // Disable image smoothing for crisp pixels
    ctx.imageSmoothingEnabled = false;

    // Render chunks with pixel-perfect tiles
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

      // Render tiles with variants
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

          const colors = TILE_COLORS[tile.type];
          const variant = tile.variant ?? 0;
          const tileColor = colors[variant % colors.length];
          
          if (tileColor) {
            ctx.fillStyle = tileColor;
            ctx.fillRect(screenX, screenY, tileSize, tileSize);
            
            // Add subtle pixel texture for certain tiles
            if (tile.type === 'grass' || tile.type === 'dirt' || tile.type === 'gravel') {
              addPixelDetailRef.current(ctx, screenX, screenY, tile, tileSize);
            }
          }
        }
      }
    });

    // Subtle grid for chunk boundaries
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.015)';
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

  }, [cameraOffset, chunkPixelSize, chunkSize, tileSize]);

  // Add pixel-level detail to tiles
  const addPixelDetailRef = useRef((
    ctx: CanvasRenderingContext2D, 
    x: number, 
    y: number, 
    tile: { type: TileType; x: number; y: number; variant?: number },
    size: number
  ) => {
    const pixelSize = 4;
    const hash = (tile.x * 73856093) ^ (tile.y * 19349663);
    
    // Add 1-2 darker pixels for texture
    if ((hash & 0xff) < 80) {
      const px = x + ((hash >> 8) % (size / pixelSize)) * pixelSize;
      const py = y + ((hash >> 16) % (size / pixelSize)) * pixelSize;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
      ctx.fillRect(px, py, pixelSize, pixelSize);
    }
    
    if ((hash & 0xff00) < 20480) {
      const px = x + ((hash >> 10) % (size / pixelSize)) * pixelSize;
      const py = y + ((hash >> 18) % (size / pixelSize)) * pixelSize;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.fillRect(px, py, pixelSize, pixelSize);
    }
  });

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

  useEffect(() => {
    if (!isInitializing) {
      loadVisibleChunks();
    }
  }, [isInitializing, loadVisibleChunks]);

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

  useEffect(() => {
    if (isInitializing) return;
    scheduleChunkLoad();
  }, [cameraOffset, isInitializing, scheduleChunkLoad]);

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

  const getPercentage = useCallback((count: number): string => {
    if (!worldStats) return '0.0';
    const total = Object.values(worldStats).reduce((sum, val) => sum + val, 0);
    return total > 0 ? ((count / total) * 100).toFixed(1) : '0.0';
  }, [worldStats]);

  const totalChunks = chunksRef.current.size;
  const totalTiles = worldStats ? Object.values(worldStats).reduce((sum, val) => sum + val, 0) : 0;

  // Group terrain types for display
  const terrainGroups = useMemo(() => {
    if (!worldStats) return null;
    
    return {
      vegetation: worldStats.grass + worldStats.forest,
      wasteland: worldStats.dirt + worldStats.sand + worldStats.gravel + worldStats.dead_tree,
      water: worldStats.water + worldStats.deep_water,
      urban: worldStats.concrete + worldStats.asphalt,
      rocky: worldStats.stone
    };
  }, [worldStats]);

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
            <p className="loading-detail">Procedural terrain generation...</p>
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
                  <span className="meta-divider">•</span>
                  <span className="meta-item">{totalTiles.toLocaleString()} Tiles</span>
                </div>
              </div>
            </div>
          </div>

          {terrainGroups && (
            <div className="stats-panel">
              <div className="stats-header">
                <span className="stats-icon">🗺️</span>
                <span className="stats-title">TERRAIN ANALYSIS</span>
              </div>
              <div className="stats-grid">
                <div className="stat-item vegetation">
                  <div className="stat-bar" style={{ width: `${getPercentage(terrainGroups.vegetation)}%` }} />
                  <span className="stat-label">Overgrown</span>
                  <span className="stat-value">{getPercentage(terrainGroups.vegetation)}%</span>
                </div>
                <div className="stat-item wasteland">
                  <div className="stat-bar" style={{ width: `${getPercentage(terrainGroups.wasteland)}%` }} />
                  <span className="stat-label">Wasteland</span>
                  <span className="stat-value">{getPercentage(terrainGroups.wasteland)}%</span>
                </div>
                <div className="stat-item water">
                  <div className="stat-bar" style={{ width: `${getPercentage(terrainGroups.water)}%` }} />
                  <span className="stat-label">Contaminated</span>
                  <span className="stat-value">{getPercentage(terrainGroups.water)}%</span>
                </div>
                <div className="stat-item urban">
                  <div className="stat-bar" style={{ width: `${getPercentage(terrainGroups.urban)}%` }} />
                  <span className="stat-label">Ruins</span>
                  <span className="stat-value">{getPercentage(terrainGroups.urban)}%</span>
                </div>
                <div className="stat-item rocky">
                  <div className="stat-bar" style={{ width: `${getPercentage(terrainGroups.rocky)}%` }} />
                  <span className="stat-label">Rocky</span>
                  <span className="stat-value">{getPercentage(terrainGroups.rocky)}%</span>
                </div>
              </div>
            </div>
          )}

          <div className="controls-hint">
            <span className="hint-icon">⚠️</span>
            <span className="hint-text">Drag to explore • Zoom: {tileSize}px tiles</span>
          </div>
        </>
      )}
    </div>
  );
};

export default GameWorld;