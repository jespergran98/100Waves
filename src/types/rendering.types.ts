// src/types/rendering.types.ts

export interface Camera {
  x: number;
  y: number;
  zoom: number;
}

export interface ViewportBounds {
  minChunkX: number;
  minChunkY: number;
  maxChunkX: number;
  maxChunkY: number;
}

export interface ChunkTexture {
  canvas: HTMLCanvasElement;
  isDirty: boolean;
  lastAccessed: number;
}

export interface RenderStats {
  fps: number;
  chunksRendered: number;
  chunksInCache: number;
  drawCalls: number;
}