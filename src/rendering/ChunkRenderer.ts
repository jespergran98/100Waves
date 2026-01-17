// src/rendering/ChunkRenderer.ts

import type { Chunk, WorldConfig } from '../types/world.types';
import type { ChunkTexture } from '../types/rendering.types';
import { getBlockColor, BIOME_BLEND_COLORS } from '../utils/world/biomeConfig';

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

            // Get base color
            const color = getBlockColor(block.type, tileVariant, block.x, block.y);
            ctx.fillStyle = color;
            ctx.fillRect(blockX, blockY, blockSize, blockSize);

            // Add biome transition blending
            if (block.blendFactor !== undefined && block.blendFactor < 0.7) {
              const blendColor = BIOME_BLEND_COLORS[block.type];
              if (blendColor) {
                ctx.fillStyle = blendColor;
                ctx.fillRect(blockX, blockY, blockSize, blockSize);
              }
            }

            // Add subtle highlights for visual depth
            const hash = (block.x * 73856093) ^ (block.y * 19349663);
            const shouldHighlight = (hash & 0xff) < 25;
            
            if (shouldHighlight) {
              // Determine highlight type based on biome
              if (['ocean', 'deep_ocean', 'river', 'frozen_ocean'].includes(block.type)) {
                // Water shimmer
                ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
                ctx.fillRect(blockX, blockY, blockSize, blockSize);
              } else if (['snowy_plains', 'tundra', 'snowy_taiga'].includes(block.type)) {
                // Snow sparkle
                ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
                ctx.fillRect(blockX, blockY, blockSize, blockSize);
              } else if (['grasslands', 'forest', 'jungle', 'plains'].includes(block.type)) {
                // Vegetation detail
                ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
                ctx.fillRect(blockX, blockY, blockSize, blockSize);
              }
            }

            // Add shadow details for depth
            const shouldShadow = (hash & 0xff) > 230;
            if (shouldShadow) {
              ctx.fillStyle = 'rgba(0, 0, 0, 0.06)';
              ctx.fillRect(blockX, blockY, blockSize, blockSize);
            }
          }
        }

        // Add tile-level detail for more complex biomes
        this.addTileDetails(ctx, tile, tileX, tileY, tileSize, blockSize);
      }
    }

    return {
      canvas,
      isDirty: false,
      lastAccessed: Date.now()
    };
  }

  private addTileDetails(
    ctx: CanvasRenderingContext2D,
    tile: any,
    tileX: number,
    tileY: number,
    tileSize: number,
    blockSize: number
  ): void {
    const { type } = tile;
    
    // Add special details for certain biomes
    const hash = (tile.x * 73856093) ^ (tile.y * 19349663);
    
    // Forest: Add tree-like clusters
    if (type === 'forest' || type === 'jungle') {
      if ((hash & 0xff) < 40) {
        const centerX = tileX + (tileSize / 2);
        const centerY = tileY + (tileSize / 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
        ctx.beginPath();
        ctx.arc(centerX, centerY, blockSize * 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    
    // Desert: Add dune patterns
    else if (type === 'desert') {
      if ((hash & 0xff) < 30) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
        ctx.fillRect(tileX, tileY + tileSize / 2, tileSize, blockSize);
      }
    }
    
    // Mountain: Add rocky texture
    else if (type === 'mountain') {
      if ((hash & 0xff) < 50) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
        const offset = (hash % 3) * blockSize;
        ctx.fillRect(tileX + offset, tileY + offset, blockSize * 2, blockSize * 2);
      }
    }
    
    // Molten wastes: Add lava glow
    else if (type === 'molten_wastes') {
      if ((hash & 0xff) < 60) {
        const gradient = ctx.createRadialGradient(
          tileX + tileSize / 2, 
          tileY + tileSize / 2, 
          0,
          tileX + tileSize / 2, 
          tileY + tileSize / 2, 
          tileSize / 2
        );
        gradient.addColorStop(0, 'rgba(255, 100, 50, 0.3)');
        gradient.addColorStop(1, 'rgba(255, 100, 50, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(tileX, tileY, tileSize, tileSize);
      }
    }
    
    // Coral reef: Add colorful spots
    else if (type === 'coral_reef') {
      if ((hash & 0xff) < 45) {
        ctx.fillStyle = 'rgba(255, 120, 180, 0.2)';
        const spotX = tileX + ((hash % 4) * blockSize * 2);
        const spotY = tileY + (((hash >> 4) % 4) * blockSize * 2);
        ctx.fillRect(spotX, spotY, blockSize * 2, blockSize * 2);
      }
    }
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