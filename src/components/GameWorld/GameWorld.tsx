import { useEffect, useRef, useState, useCallback } from 'react';
import { WorldGenerator } from '../../utils/worldGenerator';
import type { WorldData, Tile, TileType } from '../../types/world.types';
import { DEFAULT_WORLD_CONFIG } from '../../types/world.types';
import './GameWorld.css';

interface GameWorldProps {
  worldData: WorldData;
  onBackToMenu: () => void;
}

const GameWorld = ({ worldData, onBackToMenu }: GameWorldProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tiles, setTiles] = useState<Tile[][] | null>(null);
  const [isGenerating, setIsGenerating] = useState(true);
  const [worldStats, setWorldStats] = useState<Record<TileType, number> | null>(null);
  const [cameraOffset, setCameraOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Generate world on mount
  useEffect(() => {
    const generateWorld = () => {
      setIsGenerating(true);
      
      // Simulate generation delay for visual effect
      setTimeout(() => {
        const generator = new WorldGenerator(worldData, DEFAULT_WORLD_CONFIG);
        const generatedTiles = generator.generate();
        const stats = generator.getStatistics(generatedTiles);
        
        setTiles(generatedTiles);
        setWorldStats(stats);
        setIsGenerating(false);

        // Center camera
        const centerX = -(DEFAULT_WORLD_CONFIG.width * DEFAULT_WORLD_CONFIG.tileSize) / 2 + window.innerWidth / 2;
        const centerY = -(DEFAULT_WORLD_CONFIG.height * DEFAULT_WORLD_CONFIG.tileSize) / 2 + window.innerHeight / 2;
        setCameraOffset({ x: centerX, y: centerY });
      }, 800);
    };

    generateWorld();
  }, [worldData]);

  // Render world to canvas
  useEffect(() => {
    if (!tiles || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Clear canvas
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Tile colors
    const colors: Record<TileType, string> = {
      water: '#1a4d5c',
      sand: '#c2a66b',
      land: '#2d4a2b',
      stone: '#5a5a5a'
    };

    const { tileSize } = DEFAULT_WORLD_CONFIG;

    // Render tiles
    for (let y = 0; y < tiles.length; y++) {
      const row = tiles[y];
      if (!row) continue;
      
      for (let x = 0; x < row.length; x++) {
        const tile = row[x];
        if (!tile) continue;
        
        const screenX = x * tileSize + cameraOffset.x;
        const screenY = y * tileSize + cameraOffset.y;

        // Cull offscreen tiles
        if (
          screenX + tileSize < 0 ||
          screenX > canvas.width ||
          screenY + tileSize < 0 ||
          screenY > canvas.height
        ) {
          continue;
        }

        ctx.fillStyle = colors[tile.type];
        ctx.fillRect(screenX, screenY, tileSize, tileSize);

        // Add subtle borders for better visibility
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(screenX, screenY, tileSize, tileSize);
      }
    }

    // Draw grid overlay
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    
    for (let x = 0; x <= DEFAULT_WORLD_CONFIG.width; x += 8) {
      const screenX = x * tileSize + cameraOffset.x;
      ctx.beginPath();
      ctx.moveTo(screenX, cameraOffset.y);
      ctx.lineTo(screenX, DEFAULT_WORLD_CONFIG.height * tileSize + cameraOffset.y);
      ctx.stroke();
    }
    
    for (let y = 0; y <= DEFAULT_WORLD_CONFIG.height; y += 8) {
      const screenY = y * tileSize + cameraOffset.y;
      ctx.beginPath();
      ctx.moveTo(cameraOffset.x, screenY);
      ctx.lineTo(DEFAULT_WORLD_CONFIG.width * tileSize + cameraOffset.x, screenY);
      ctx.stroke();
    }

  }, [tiles, cameraOffset]);

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

  const calculatePercentage = (count: number): string => {
    if (!worldStats) return '0';
    const total = Object.values(worldStats).reduce((sum, val) => sum + val, 0);
    return ((count / total) * 100).toFixed(1);
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
      />

      {/* Loading overlay */}
      {isGenerating && (
        <div className="loading-overlay">
          <div className="loading-content">
            <div className="loading-spinner" />
            <h2 className="loading-title">GENERATING WORLD</h2>
            <p className="loading-subtitle">Seed: {worldData.seed}</p>
          </div>
        </div>
      )}

      {/* UI Overlay */}
      {!isGenerating && (
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
            <span className="hint-text">Click and drag to move camera</span>
          </div>
        </>
      )}
    </div>
  );
};

export default GameWorld;