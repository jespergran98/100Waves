// src/rendering/RenderOptimizer.ts

import type { ViewportBounds } from '../types/rendering.types';
import type { WorldConfig } from '../types/world.types';

export class RenderOptimizer {
  private config: WorldConfig;
  private chunkPixelSize: number;

  constructor(config: WorldConfig) {
    this.config = config;
    this.chunkPixelSize = config.chunkSize * config.tileSize;
  }

  calculateViewportBounds(
    cameraX: number,
    cameraY: number,
    viewportWidth: number,
    viewportHeight: number
  ): ViewportBounds {
    const { viewDistance } = this.config;

    const minChunkX = Math.floor(-cameraX / this.chunkPixelSize) - viewDistance;
    const minChunkY = Math.floor(-cameraY / this.chunkPixelSize) - viewDistance;
    const maxChunkX = Math.floor((viewportWidth - cameraX) / this.chunkPixelSize) + viewDistance;
    const maxChunkY = Math.floor((viewportHeight - cameraY) / this.chunkPixelSize) + viewDistance;

    return { minChunkX, minChunkY, maxChunkX, maxChunkY };
  }

  getVisibleChunks(bounds: ViewportBounds): Set<string> {
    const visible = new Set<string>();

    for (let cy = bounds.minChunkY; cy <= bounds.maxChunkY; cy++) {
      for (let cx = bounds.minChunkX; cx <= bounds.maxChunkX; cx++) {
        visible.add(`${cx},${cy}`);
      }
    }

    return visible;
  }

  isChunkVisible(
    chunkX: number,
    chunkY: number,
    cameraX: number,
    cameraY: number,
    viewportWidth: number,
    viewportHeight: number
  ): boolean {
    const chunkScreenX = chunkX * this.chunkPixelSize + cameraX;
    const chunkScreenY = chunkY * this.chunkPixelSize + cameraY;

    return !(
      chunkScreenX + this.chunkPixelSize < 0 ||
      chunkScreenX > viewportWidth ||
      chunkScreenY + this.chunkPixelSize < 0 ||
      chunkScreenY > viewportHeight
    );
  }

  shouldUnloadChunk(
    chunkX: number,
    chunkY: number,
    bounds: ViewportBounds,
    maxDistance: number = 3
  ): boolean {
    const distX = Math.max(0, bounds.minChunkX - chunkX, chunkX - bounds.maxChunkX);
    const distY = Math.max(0, bounds.minChunkY - chunkY, chunkY - bounds.maxChunkY);

    return Math.max(distX, distY) > maxDistance;
  }

  getChunkScreenPosition(
    chunkX: number,
    chunkY: number,
    cameraX: number,
    cameraY: number
  ): { x: number; y: number } {
    return {
      x: chunkX * this.chunkPixelSize + cameraX,
      y: chunkY * this.chunkPixelSize + cameraY
    };
  }
}