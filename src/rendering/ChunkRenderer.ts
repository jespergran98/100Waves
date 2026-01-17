// src/rendering/ChunkRenderer.ts

import type { Chunk, WorldConfig } from '../types/world.types';
import type { ChunkTexture } from '../types/rendering.types';
import { getBlockColor } from '../utils/world/biomeConfig';

export class ChunkRenderer {
  private config: WorldConfig;

  constructor(config: WorldConfig) {
    this.config = config;
  }

  renderChunkToTexture(chunk: Chunk): ChunkTexture {
    const { chunkSize, tileSize, blockSize, blocksPerTile } = this.config;
    const chunkPixelSize = chunkSize * tileSize;

    const canvas = document.createElement('canvas');
    canvas.width = chunkPixelSize;
    canvas.height = chunkPixelSize;

    const ctx = canvas.getContext('2d', { 
      alpha: false, 
      desynchronized: true,
      willReadFrequently: false 
    });

    if (!ctx) {
      throw new Error('Failed to get 2D context for chunk rendering');
    }

    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#0a0c0e';
    ctx.fillRect(0, 0, chunkPixelSize, chunkPixelSize);

    // Render all tiles in the chunk
    for (let y = 0; y < chunkSize; y++) {
      const row = chunk.tiles[y];
      if (!row) continue;

      for (let x = 0; x < chunkSize; x++) {
        const tile = row[x];
        if (!tile) continue;

        const tileX = x * tileSize;
        const tileY = y * tileSize;
        const tileVariant = tile.variant ?? 0;

        // Render all blocks in the tile
        for (let by = 0; by < blocksPerTile; by++) {
          const blockRow = tile.blocks[by];
          if (!blockRow) continue;

          for (let bx = 0; bx < blocksPerTile; bx++) {
            const block = blockRow[bx];
            if (!block) continue;

            const blockX = tileX + bx * blockSize;
            const blockY = tileY + by * blockSize;

            const color = getBlockColor(block.type, tileVariant, block.x, block.y);
            ctx.fillStyle = color;
            ctx.fillRect(blockX, blockY, blockSize, blockSize);

            // Optional: Add subtle highlights for biome boundaries
            if (block.blendFactor !== undefined && block.blendFactor < 0.5) {
              const hash = (block.x * 73856093) ^ (block.y * 19349663);
              if ((hash & 0xff) < 40) {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
                ctx.fillRect(blockX, blockY, blockSize, blockSize);
              }
            }
          }
        }
      }
    }

    return {
      canvas,
      isDirty: false,
      lastAccessed: Date.now()
    };
  }

  drawChunkTexture(
    targetCtx: CanvasRenderingContext2D,
    texture: ChunkTexture,
    screenX: number,
    screenY: number
  ): void {
    targetCtx.drawImage(texture.canvas, screenX, screenY);
  }
}