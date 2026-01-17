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

        // Render all blocks in the tile with improved noise patterns
        for (let by = 0; by < blocksPerTile; by++) {
          const blockRow = tile.blocks[by];
          if (!blockRow) continue;

          for (let bx = 0; bx < blocksPerTile; bx++) {
            const block = blockRow[bx];
            if (!block) continue;

            const blockX = tileX + bx * blockSize;
            const blockY = tileY + by * blockSize;

            // Get base color with improved variation
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

            // Add organic texture patterns
            this.addBlockTexture(ctx, block, blockX, blockY, blockSize);
          }
        }

        // Add tile-level organic features
        this.addTileFeatures(ctx, tile, tileX, tileY, tileSize, blockSize);
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
    
    // Create varied hash for organic randomness
    const hash1 = (x * 73856093) ^ (y * 19349663);
    const hash2 = (x * 83492791) ^ (y * 62089911);
    const hash3 = (x * 47989213) ^ (y * 99194853);
    
    const noise1 = (hash1 & 0xff) / 255;
    const noise2 = (hash2 & 0xff) / 255;
    const noise3 = (hash3 & 0xff) / 255;
    
    // Water biomes: diagonal wave patterns + organic textures
    if (['ocean', 'deep_ocean', 'river', 'frozen_ocean', 'deep_frozen_ocean'].includes(type)) {
      // DIAGONAL WAVE PATTERN (the good-looking waves)
      const wavePattern = (x + y) % 4;
      
      if (wavePattern === 0) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.fillRect(blockX, blockY, blockSize, blockSize);
      } else if (wavePattern === 2) {
        ctx.fillStyle = 'rgba(0, 0, 20, 0.12)';
        ctx.fillRect(blockX, blockY, blockSize, blockSize);
      }
      
      // Additional organic variation on top of waves
      if (noise1 > 0.85) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.fillRect(blockX, blockY, blockSize, blockSize);
      } else if (noise1 < 0.15) {
        ctx.fillStyle = 'rgba(0, 0, 30, 0.18)';
        ctx.fillRect(blockX, blockY, blockSize, blockSize);
      }
      
      // Shimmer effect for extra sparkle
      if (noise2 > 0.88) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
        ctx.fillRect(blockX + Math.floor(noise3 * blockSize * 0.5), blockY, Math.ceil(blockSize * 0.3), Math.ceil(blockSize * 0.3));
      }
      
      // Frozen ocean gets additional ice crystals
      if (type === 'frozen_ocean' || type === 'deep_frozen_ocean') {
        if (noise3 > 0.9) {
          ctx.fillStyle = 'rgba(200, 230, 255, 0.25)';
          ctx.fillRect(blockX, blockY, Math.ceil(blockSize * 0.4), Math.ceil(blockSize * 0.4));
        }
      }
    }
    
    // Snow biomes: sparkly, crystalline
    else if (['snowy_plains', 'tundra', 'snowy_taiga'].includes(type)) {
      if (noise1 > 0.8) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillRect(blockX, blockY, Math.ceil(blockSize * 0.4), Math.ceil(blockSize * 0.4));
      }
      if (noise2 > 0.9) {
        ctx.fillStyle = 'rgba(200, 230, 255, 0.2)';
        ctx.fillRect(blockX + Math.floor(noise3 * blockSize * 0.6), blockY + Math.floor(noise1 * blockSize * 0.6), Math.ceil(blockSize * 0.5), Math.ceil(blockSize * 0.5));
      }
    }
    
    // Vegetation biomes: clustered, organic texture
    else if (['grasslands', 'forest', 'jungle', 'plains', 'savanna'].includes(type)) {
      // Dark vegetation patches
      if (noise1 > 0.65 && noise2 > 0.6) {
        ctx.fillStyle = 'rgba(0, 20, 0, 0.15)';
        ctx.fillRect(blockX, blockY, blockSize, blockSize);
      }
      // Light grass highlights
      else if (noise1 < 0.25 && noise3 > 0.7) {
        ctx.fillStyle = 'rgba(255, 255, 200, 0.06)';
        ctx.fillRect(blockX, blockY, Math.ceil(blockSize * 0.6), Math.ceil(blockSize * 0.6));
      }
      
      // Add grass blade-like details
      if (noise2 > 0.88) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
        ctx.fillRect(blockX, blockY + Math.floor(blockSize * 0.3), blockSize, 1);
      }
    }
    
    // Desert biomes: sandy, grainy texture
    else if (['desert', 'badlands', 'wastelands'].includes(type)) {
      // Sandy grain
      if (noise1 > 0.5) {
        const brightness = noise2 > 0.5 ? 'rgba(255, 255, 220, 0.08)' : 'rgba(100, 80, 60, 0.08)';
        ctx.fillStyle = brightness;
        ctx.fillRect(blockX + Math.floor(noise3 * blockSize * 0.5), blockY + Math.floor(noise1 * blockSize * 0.5), Math.ceil(blockSize * 0.4), Math.ceil(blockSize * 0.4));
      }
      
      // Dune shadows
      if (noise3 > 0.75) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.fillRect(blockX, blockY + Math.floor(blockSize * 0.6), blockSize, Math.ceil(blockSize * 0.4));
      }
    }
    
    // Mountain/rocky: angular, rough texture
    else if (['mountain', 'caves', 'mines'].includes(type)) {
      // Rock faces
      if (noise1 > 0.6) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        const size = Math.ceil(blockSize * (0.3 + noise2 * 0.4));
        ctx.fillRect(blockX + Math.floor(noise3 * (blockSize - size)), blockY, size, size);
      }
      
      // Highlights on rocks
      if (noise2 > 0.8) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.fillRect(blockX, blockY, Math.ceil(blockSize * 0.3), Math.ceil(blockSize * 0.3));
      }
    }
    
    // Swamp: murky, patchy
    else if (type === 'swamp' || type === 'mangrove') {
      if (noise1 > 0.55 && noise2 > 0.55) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.fillRect(blockX, blockY, blockSize, blockSize);
      }
      if (noise3 > 0.75) {
        ctx.fillStyle = 'rgba(100, 120, 80, 0.15)';
        ctx.fillRect(blockX + Math.floor(noise1 * blockSize * 0.5), blockY + Math.floor(noise2 * blockSize * 0.5), Math.ceil(blockSize * 0.6), Math.ceil(blockSize * 0.6));
      }
    }
    
    // Molten/volcanic: glowing, pulsing
    else if (type === 'molten_wastes' || type === 'ashlands') {
      if (noise1 > 0.6) {
        const glow = noise2 > 0.7 ? 'rgba(255, 100, 0, 0.3)' : 'rgba(150, 50, 0, 0.2)';
        ctx.fillStyle = glow;
        ctx.fillRect(blockX, blockY, blockSize, blockSize);
      }
      if (noise3 > 0.85) {
        ctx.fillStyle = 'rgba(255, 200, 100, 0.15)';
        const size = Math.ceil(blockSize * 0.5);
        ctx.fillRect(blockX + Math.floor((blockSize - size) / 2), blockY + Math.floor((blockSize - size) / 2), size, size);
      }
    }
    
    // Coral reef: colorful, spotted
    else if (type === 'coral_reef') {
      // Add diagonal wave pattern to coral reefs too since they're underwater
      const wavePattern = (x + y) % 4;
      if (wavePattern === 0) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
        ctx.fillRect(blockX, blockY, blockSize, blockSize);
      }
      
      // Colorful coral spots
      if (noise1 > 0.7) {
        const colors = [
          'rgba(255, 120, 180, 0.2)',
          'rgba(180, 120, 255, 0.2)',
          'rgba(120, 255, 180, 0.2)',
          'rgba(255, 200, 120, 0.2)'
        ];
        ctx.fillStyle = colors[Math.floor(noise2 * colors.length)] || colors[0];
        ctx.fillRect(blockX, blockY, Math.ceil(blockSize * 0.7), Math.ceil(blockSize * 0.7));
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
    const hash2 = (x * 83492791) ^ (y * 62089911);
    const noise = (hash & 0xff) / 255;
    const noise2 = (hash2 & 0xff) / 255;
    
    // Water biomes: Add flowing water effects on top of wave patterns
    if (['ocean', 'deep_ocean', 'river', 'frozen_ocean', 'deep_frozen_ocean'].includes(type)) {
      if (noise > 0.7) {
        const flowX = tileX + tileSize * noise2 * 0.3;
        const flowY = tileY + tileSize * noise * 0.3;
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.fillRect(flowX, flowY, blockSize * 4, blockSize);
      }
    }
    
    // Forest: organic tree clusters
    else if (type === 'forest' || type === 'jungle') {
      if (noise > 0.6) {
        const centerX = tileX + tileSize * noise2;
        const centerY = tileY + tileSize * (1 - noise2);
        const radius = blockSize * (2 + noise * 3);
        
        const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0.25)');
        gradient.addColorStop(0.7, 'rgba(0, 0, 0, 0.1)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    
    // Desert: flowing dunes
    else if (type === 'desert') {
      if (noise > 0.5) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
        const waveY = tileY + tileSize * noise2;
        ctx.fillRect(tileX, waveY, tileSize, blockSize * 3);
      }
      if (noise2 > 0.7) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
        const waveY = tileY + tileSize * (1 - noise);
        ctx.fillRect(tileX, waveY, tileSize, blockSize * 2);
      }
    }
    
    // Mountain: rocky outcrops
    else if (type === 'mountain') {
      if (noise > 0.6) {
        const rockX = tileX + tileSize * noise2 * 0.5;
        const rockY = tileY + tileSize * noise * 0.5;
        const rockSize = blockSize * (3 + noise2 * 3);
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
        ctx.fillRect(rockX, rockY, rockSize, rockSize);
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
        ctx.fillRect(rockX, rockY, rockSize * 0.3, rockSize * 0.3);
      }
    }
    
    // Molten wastes: lava pools
    else if (type === 'molten_wastes') {
      if (noise > 0.55) {
        const centerX = tileX + tileSize / 2;
        const centerY = tileY + tileSize / 2;
        const radius = tileSize * 0.4;
        
        const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
        gradient.addColorStop(0, 'rgba(255, 150, 50, 0.5)');
        gradient.addColorStop(0.5, 'rgba(255, 100, 50, 0.3)');
        gradient.addColorStop(1, 'rgba(100, 0, 0, 0)');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(tileX, tileY, tileSize, tileSize);
      }
    }
    
    // Swamp: murky water patches
    else if (type === 'swamp' || type === 'mangrove') {
      if (noise > 0.55) {
        const patchX = tileX + (hash % 3) * blockSize * 3;
        const patchY = tileY + ((hash >> 3) % 3) * blockSize * 3;
        const patchSize = blockSize * (4 + noise2 * 4);
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.fillRect(patchX, patchY, patchSize, patchSize);
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