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
    ctx.fillStyle = '#0a0a0a';
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

            // Add block texture
            this.addBlockTexture(ctx, block, blockX, blockY, blockSize);
          }
        }

        // Add tile-level features
        this.addTileFeatures(ctx, tile, tileX, tileY, tileSize, blockSize);
        
        // Add structure markers
        if (tile.hasStructure) {
          this.addStructureMarker(ctx, tileX, tileY, tileSize);
        }
      }
    }

    return {
      canvas,
      isDirty: false,
      lastAccessed: Date.now()
    };
  }

  private addBlockTexture(
    ctx: CanvasRenderingContext2D,
    block: any,
    blockX: number,
    blockY: number,
    blockSize: number
  ): void {
    const { type, x, y } = block;
    
    const hash1 = (x * 73856093) ^ (y * 19349663);
    const hash2 = (x * 83492791) ^ (y * 62089911);
    const hash3 = (x * 47989213) ^ (y * 99194853);
    
    const noise1 = (hash1 & 0xff) / 255;
    const noise2 = (hash2 & 0xff) / 255;
    const noise3 = (hash3 & 0xff) / 255;
    
    // Water biomes: diagonal waves
    if (['ocean', 'deep_ocean', 'river', 'frozen_ocean', 'deep_frozen_ocean'].includes(type)) {
      const wavePattern = (x + y) % 4;
      
      if (wavePattern === 0) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.fillRect(blockX, blockY, blockSize, blockSize);
      } else if (wavePattern === 2) {
        ctx.fillStyle = 'rgba(0, 0, 20, 0.12)';
        ctx.fillRect(blockX, blockY, blockSize, blockSize);
      }
      
      if (noise1 > 0.85) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.fillRect(blockX, blockY, blockSize, blockSize);
      }
    }
    
    // Snow biomes: sparkly ice
    else if (['snowy_plains', 'tundra', 'snowy_taiga'].includes(type)) {
      if (noise1 > 0.8) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillRect(blockX, blockY, Math.ceil(blockSize * 0.4), Math.ceil(blockSize * 0.4));
      }
    }
    
    // Vegetation: organic patches
    else if (['grasslands', 'forest', 'jungle', 'plains'].includes(type)) {
      if (noise1 > 0.65 && noise2 > 0.6) {
        ctx.fillStyle = 'rgba(0, 20, 0, 0.15)';
        ctx.fillRect(blockX, blockY, blockSize, blockSize);
      }
    }
    
    // Desert: sandy grain
    else if (['desert', 'badlands', 'wasteland', 'canyon'].includes(type)) {
      if (noise1 > 0.5) {
        const brightness = noise2 > 0.5 ? 'rgba(255, 255, 220, 0.08)' : 'rgba(100, 80, 60, 0.08)';
        ctx.fillStyle = brightness;
        ctx.fillRect(blockX + Math.floor(noise3 * blockSize * 0.5), blockY + Math.floor(noise1 * blockSize * 0.5), Math.ceil(blockSize * 0.4), Math.ceil(blockSize * 0.4));
      }
    }
    
    // Ruins: debris and cracks
    else if (type === 'ruins') {
      if (noise1 > 0.6) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(blockX, blockY, blockSize, blockSize);
      }
      if (noise2 > 0.8) {
        ctx.fillStyle = 'rgba(100, 80, 60, 0.2)';
        const size = Math.ceil(blockSize * 0.5);
        ctx.fillRect(blockX, blockY, size, size);
      }
    }
    
    // Dead zone: ominous patterns
    else if (type === 'dead_zone' || type === 'infection_site') {
      if (noise1 > 0.5) {
        const darkness = noise2 > 0.7 ? 'rgba(0, 0, 0, 0.4)' : 'rgba(50, 0, 0, 0.3)';
        ctx.fillStyle = darkness;
        ctx.fillRect(blockX, blockY, blockSize, blockSize);
      }
      if (type === 'infection_site' && noise3 > 0.85) {
        ctx.fillStyle = 'rgba(150, 50, 50, 0.25)';
        ctx.fillRect(blockX, blockY, blockSize, blockSize);
      }
    }
    
    // Mountain/rocky: angular texture
    else if (['mountain', 'caves', 'mines'].includes(type)) {
      if (noise1 > 0.6) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        const size = Math.ceil(blockSize * (0.3 + noise2 * 0.4));
        ctx.fillRect(blockX + Math.floor(noise3 * (blockSize - size)), blockY, size, size);
      }
    }
    
    // Swamp: murky patches
    else if (type === 'swamp' || type === 'mangrove') {
      if (noise1 > 0.55 && noise2 > 0.55) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.fillRect(blockX, blockY, blockSize, blockSize);
      }
    }
  }

  private addTileFeatures(
    ctx: CanvasRenderingContext2D,
    tile: any,
    tileX: number,
    tileY: number,
    tileSize: number,
    blockSize: number
  ): void {
    const { type, x, y } = tile;
    
    const hash = (x * 73856093) ^ (y * 19349663);
    const noise = (hash & 0xff) / 255;
    
    // Water: flowing effects
    if (['ocean', 'deep_ocean', 'river'].includes(type)) {
      if (noise > 0.7) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.fillRect(tileX, tileY + tileSize * noise * 0.3, tileSize, blockSize);
      }
    }
    
    // Forest: tree shadows
    else if (type === 'forest' || type === 'jungle') {
      if (noise > 0.6) {
        const centerX = tileX + tileSize * noise;
        const centerY = tileY + tileSize * (1 - noise);
        const radius = blockSize * (2 + noise * 3);
        
        const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0.25)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    
    // Ruins: rubble piles
    else if (type === 'ruins') {
      if (noise > 0.55) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(tileX + tileSize * noise * 0.5, tileY + tileSize * noise * 0.5, blockSize * 4, blockSize * 3);
      }
    }
  }

  private addStructureMarker(
    ctx: CanvasRenderingContext2D,
    tileX: number,
    tileY: number,
    tileSize: number
  ): void {
    // Small visual indicator for structures
    ctx.strokeStyle = 'rgba(255, 200, 0, 0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(tileX + 2, tileY + 2, tileSize - 4, tileSize - 4);
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