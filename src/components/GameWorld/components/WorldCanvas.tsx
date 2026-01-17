// src/components/GameWorld/components/WorldCanvas.tsx

import { useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import type { Chunk, WorldConfig } from '../../../types/world.types';
import type { Camera } from '../../../types/rendering.types';
import { ChunkRenderer } from '../../../rendering/ChunkRenderer';
import { TextureCache } from '../../../rendering/TextureCache';
import { RenderOptimizer } from '../../../rendering/RenderOptimizer';

interface WorldCanvasProps {
  chunks: Map<string, Chunk>;
  camera: Camera;
  config: WorldConfig;
  isDragging: boolean;
  onDragStart: (e: React.MouseEvent | React.TouchEvent) => void;
  onDragMove: (e: React.MouseEvent | React.TouchEvent) => void;
  onDragEnd: () => void;
}

export interface WorldCanvasHandle {
  forceRender: () => void;
}

const WorldCanvas = forwardRef<WorldCanvasHandle, WorldCanvasProps>(({
  chunks,
  camera,
  config,
  isDragging,
  onDragStart,
  onDragMove,
  onDragEnd
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<ChunkRenderer | null>(null);
  const textureCacheRef = useRef<TextureCache | null>(null);
  const optimizerRef = useRef<RenderOptimizer | null>(null);
  const lastCameraRef = useRef<Camera>(camera);
  const rafIdRef = useRef<number | null>(null);

  // Initialize rendering systems
  useEffect(() => {
    if (!rendererRef.current) {
      rendererRef.current = new ChunkRenderer(config);
    }
    if (!textureCacheRef.current) {
      textureCacheRef.current = new TextureCache(100);
    }
    if (!optimizerRef.current) {
      optimizerRef.current = new RenderOptimizer(config);
    }
  }, [config]);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d', { alpha: false, desynchronized: true });
    const renderer = rendererRef.current;
    const textureCache = textureCacheRef.current;
    const optimizer = optimizerRef.current;

    if (!canvas || !ctx || !renderer || !textureCache || !optimizer) return;

    // Clear canvas
    ctx.fillStyle = '#0a0c0e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = false;

    // Calculate visible chunks
    const bounds = optimizer.calculateViewportBounds(
      camera.x,
      camera.y,
      canvas.width,
      canvas.height
    );

    const visibleKeys = optimizer.getVisibleChunks(bounds);
    let drawCalls = 0;

    // Render visible chunks
    chunks.forEach((chunk, key) => {
      if (!visibleKeys.has(key)) return;

      const screenPos = optimizer.getChunkScreenPosition(
        chunk.x,
        chunk.y,
        camera.x,
        camera.y
      );

      // Check if chunk is actually visible on screen
      if (!optimizer.isChunkVisible(
        chunk.x,
        chunk.y,
        camera.x,
        camera.y,
        canvas.width,
        canvas.height
      )) {
        return;
      }

      // Get or create chunk texture
      let texture = textureCache.get(key);
      if (!texture || texture.isDirty) {
        texture = renderer.renderChunkToTexture(chunk);
        textureCache.set(key, texture);
      }

      // Draw the pre-rendered chunk texture
      renderer.drawChunkTexture(ctx, texture, screenPos.x, screenPos.y);
      drawCalls++;
    });

    // Clean up old textures
    textureCache.cleanUp(visibleKeys);

    // Draw spawn point
    const spawnScreenX = config.spawnX * config.blockSize + camera.x;
    const spawnScreenY = config.spawnY * config.blockSize + camera.y;
    
    if (spawnScreenX >= -20 && spawnScreenX <= canvas.width + 20 &&
        spawnScreenY >= -20 && spawnScreenY <= canvas.height + 20) {
      ctx.strokeStyle = '#00ff80';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(spawnScreenX, spawnScreenY, 8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = 'rgba(0, 255, 128, 0.3)';
      ctx.fill();
    }
  }, [chunks, camera, config]);

  // Main render loop
  useEffect(() => {
    const animate = () => {
      // Only re-render if camera has moved
      if (
        lastCameraRef.current.x !== camera.x ||
        lastCameraRef.current.y !== camera.y ||
        lastCameraRef.current.zoom !== camera.zoom
      ) {
        render();
        lastCameraRef.current = { ...camera };
      }
      rafIdRef.current = requestAnimationFrame(animate);
    };

    rafIdRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [camera, render]);

  // Handle canvas resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      render();
    };

    resizeCanvas();

    let resizeTimeout: number;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = window.setTimeout(resizeCanvas, 150);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimeout);
    };
  }, [render]);

  // Expose imperative handle
  useImperativeHandle(ref, () => ({
    forceRender: render
  }), [render]);

  // Event handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    onDragStart(e);
  }, [onDragStart]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    onDragMove(e);
  }, [onDragMove]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    onDragStart(e);
  }, [onDragStart]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    onDragMove(e);
  }, [onDragMove]);

  return (
    <canvas
      ref={canvasRef}
      className={`world-canvas ${isDragging ? 'dragging' : ''}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={onDragEnd}
      onMouseLeave={onDragEnd}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={onDragEnd}
    />
  );
});

WorldCanvas.displayName = 'WorldCanvas';

export default WorldCanvas;