// src/components/GameWorld/GameWorld.tsx

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { WorldGenerator } from '../../utils/world/worldGenerator';
import type { WorldData, Chunk, TileType } from '../../types/world.types';
import { DEFAULT_WORLD_CONFIG, BIOME_THREAT, BIOME_RARITY } from '../../types/world.types';
import { useCamera } from '../../hooks/useCamera';
import { RenderOptimizer } from '../../rendering/RenderOptimizer';
import WorldCanvas from './components/WorldCanvas';
import WorldHUD from './components/WorldHUD';
import WorldStats from './components/WorldStats';
import './GameWorld.css';

interface GameWorldProps {
  worldData: WorldData;
  onBackToMenu: () => void;
}

const GameWorld = ({ worldData, onBackToMenu }: GameWorldProps) => {
  const generatorRef = useRef<WorldGenerator | null>(null);
  const chunksRef = useRef<Map<string, Chunk>>(new Map());
  const optimizerRef = useRef<RenderOptimizer | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [worldStats, setWorldStats] = useState<Record<TileType, number> | null>(null);
  const [playerCoords, setPlayerCoords] = useState({ x: 0, y: 0 });
  const [currentBiome, setCurrentBiome] = useState<TileType>('grasslands');
  const loadTimeoutRef = useRef<number | null>(null);
  const canvasSizeRef = useRef({ width: 0, height: 0 });
  const isLoadingRef = useRef(false);

  const { chunkSize, tileSize, blockSize, blocksPerTile } = DEFAULT_WORLD_CONFIG;

  // Initialize camera centered on spawn
  const { camera, isDragging, startDrag, updateDrag, endDrag, setCamera } = useCamera({
    initialX: 0,
    initialY: 0
  });

  // Initialize optimizer
  useEffect(() => {
    if (!optimizerRef.current) {
      optimizerRef.current = new RenderOptimizer(DEFAULT_WORLD_CONFIG);
    }
  }, []);

  // Convert screen position to world coordinates
  const screenToWorld = useCallback((screenX: number, screenY: number) => {
    const worldX = Math.floor((screenX - camera.x) / blockSize);
    const worldY = Math.floor((screenY - camera.y) / blockSize);
    return { x: worldX, y: worldY };
  }, [camera, blockSize]);

  // Get biome at current position
  const getBiomeAtPosition = useCallback((worldX: number, worldY: number): TileType => {
    const tileX = Math.floor(worldX / blocksPerTile);
    const tileY = Math.floor(worldY / blocksPerTile);
    const chunkX = Math.floor(tileX / chunkSize);
    const chunkY = Math.floor(tileY / chunkSize);
    
    const chunk = chunksRef.current.get(`${chunkX},${chunkY}`);
    if (!chunk) return 'grasslands';
    
    const localTileX = ((tileX % chunkSize) + chunkSize) % chunkSize;
    const localTileY = ((tileY % chunkSize) + chunkSize) % chunkSize;
    
    const tile = chunk.tiles[localTileY]?.[localTileX];
    return tile?.type ?? 'grasslands';
  }, [chunkSize, blocksPerTile]);

  // Update player coordinates and current biome
  useEffect(() => {
    if (!canvasSizeRef.current.width) return;
    
    const centerX = canvasSizeRef.current.width / 2;
    const centerY = canvasSizeRef.current.height / 2;
    const coords = screenToWorld(centerX, centerY);
    setPlayerCoords(coords);
    
    const biome = getBiomeAtPosition(coords.x, coords.y);
    setCurrentBiome(biome);
  }, [camera, screenToWorld, getBiomeAtPosition]);

  const loadVisibleChunks = useCallback(() => {
    if (isLoadingRef.current) return;
    
    const generator = generatorRef.current;
    const optimizer = optimizerRef.current;
    if (!generator || !optimizer) return;

    isLoadingRef.current = true;

    const bounds = optimizer.calculateViewportBounds(
      camera.x,
      camera.y,
      canvasSizeRef.current.width,
      canvasSizeRef.current.height
    );

    // Extend bounds for preloading
    const extendedBounds = {
      minChunkX: bounds.minChunkX - 1,
      minChunkY: bounds.minChunkY - 1,
      maxChunkX: bounds.maxChunkX + 1,
      maxChunkY: bounds.maxChunkY + 1
    };

    const visibleKeys = optimizer.getVisibleChunks(extendedBounds);
    const chunks = chunksRef.current;
    const newChunks: Chunk[] = [];

    // Generate missing chunks
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

    // Update stats if new chunks were generated
    if (newChunks.length > 0) {
      setWorldStats(prev => {
        const updated = prev ? { ...prev } : {
          grasslands: 0, plains: 0, forest: 0, mines: 0, river: 0,
          ocean: 0, deep_ocean: 0, mountain: 0, caves: 0, mangrove: 0,
          desert: 0, coral_reef: 0, wasteland: 0, badlands: 0, canyon: 0,
          oasis: 0, swamp: 0, snowy_plains: 0, ruins: 0, bunker: 0,
          frozen_ocean: 0, deep_frozen_ocean: 0, taiga: 0, snowy_taiga: 0,
          tundra: 0, jungle: 0, dead_zone: 0, infection_site: 0
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
    }

    // Clean up far chunks
    const toDelete: string[] = [];
    chunks.forEach((_, key) => {
      if (!visibleKeys.has(key)) {
        const [cxStr, cyStr] = key.split(',');
        const cx = parseInt(cxStr!, 10);
        const cy = parseInt(cyStr!, 10);
        
        if (optimizer.shouldUnloadChunk(cx, cy, extendedBounds, 4)) {
          toDelete.push(key);
        }
      }
    });

    toDelete.forEach(key => chunks.delete(key));
    
    isLoadingRef.current = false;
  }, [camera]);

  const scheduleChunkLoad = useCallback(() => {
    if (loadTimeoutRef.current !== null) {
      clearTimeout(loadTimeoutRef.current);
    }
    loadTimeoutRef.current = window.setTimeout(() => {
      loadVisibleChunks();
      loadTimeoutRef.current = null;
    }, 16);
  }, [loadVisibleChunks]);

  // Initialize world
  useEffect(() => {
    setIsInitializing(true);

    const generator = new WorldGenerator(worldData, DEFAULT_WORLD_CONFIG);
    generatorRef.current = generator;

    canvasSizeRef.current = {
      width: window.innerWidth,
      height: window.innerHeight
    };

    // Center camera on spawn
    setCamera({
      x: Math.floor(window.innerWidth / 2),
      y: Math.floor(window.innerHeight / 2),
      zoom: 1
    });

    setTimeout(() => setIsInitializing(false), 200);

    return () => {
      if (generatorRef.current) {
        generatorRef.current.clearCache();
      }
      chunksRef.current.clear();
      if (loadTimeoutRef.current !== null) {
        clearTimeout(loadTimeoutRef.current);
      }
    };
  }, [worldData, setCamera]);

  // Load initial chunks
  useEffect(() => {
    if (!isInitializing) {
      loadVisibleChunks();
    }
  }, [isInitializing, loadVisibleChunks]);

  // Schedule chunk loading when camera moves
  useEffect(() => {
    if (isInitializing) return;
    scheduleChunkLoad();
  }, [camera, isInitializing, scheduleChunkLoad]);

  // Handle drag events
  const handleDragStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if ('touches' in e) {
      const touch = e.touches[0];
      if (touch) startDrag(touch.clientX, touch.clientY);
    } else {
      startDrag(e.clientX, e.clientY);
    }
  }, [startDrag]);

  const handleDragMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if ('touches' in e) {
      const touch = e.touches[0];
      if (touch) updateDrag(touch.clientX, touch.clientY);
    } else {
      updateDrag(e.clientX, e.clientY);
    }
  }, [updateDrag]);

  const totalChunks = chunksRef.current.size;

  return (
    <div className="game-world">
      <WorldCanvas
        chunks={chunksRef.current}
        camera={camera}
        config={DEFAULT_WORLD_CONFIG}
        isDragging={isDragging}
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragEnd={endDrag}
      />

      {isInitializing && (
        <div className="loading-overlay">
          <div className="loading-content">
            <div className="loading-spinner" />
            <h2 className="loading-title">GENERATING WORLD</h2>
            <p className="loading-subtitle">Seed: {worldData.seed}</p>
            <p className="loading-detail">27 unique biomes • Infinite procedural terrain</p>
          </div>
        </div>
      )}

      {!isInitializing && (
        <>
          <WorldHUD
            worldData={worldData}
            playerCoords={playerCoords}
            currentBiome={currentBiome}
            onBackToMenu={onBackToMenu}
          />

          <WorldStats
            worldStats={worldStats}
            totalChunks={totalChunks}
            blocksPerTile={blocksPerTile}
          />

          <div className="controls-hint">
            <span className="hint-icon">⚠️</span>
            <span className="hint-text">Drag to explore • Green marker = spawn (0,0)</span>
          </div>
        </>
      )}
    </div>
  );
};

export default GameWorld;