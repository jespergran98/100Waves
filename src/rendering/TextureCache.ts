// src/rendering/TextureCache.ts

import type { ChunkTexture } from '../types/rendering.types';

export class TextureCache {
  private cache: Map<string, ChunkTexture> = new Map();
  private maxSize: number;
  private accessOrder: string[] = [];

  constructor(maxSize: number = 100) {
    this.maxSize = maxSize;
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  get(key: string): ChunkTexture | undefined {
    const texture = this.cache.get(key);
    if (texture) {
      texture.lastAccessed = Date.now();
      this.updateAccessOrder(key);
    }
    return texture;
  }

  set(key: string, texture: ChunkTexture): void {
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }
    
    this.cache.set(key, texture);
    this.updateAccessOrder(key);
  }

  delete(key: string): void {
    this.cache.delete(key);
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
  }

  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
  }

  getSize(): number {
    return this.cache.size;
  }

  private updateAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
    this.accessOrder.push(key);
  }

  private evictLRU(): void {
    if (this.accessOrder.length === 0) return;
    
    const lruKey = this.accessOrder.shift();
    if (lruKey) {
      this.cache.delete(lruKey);
    }
  }

  markDirty(key: string): void {
    const texture = this.cache.get(key);
    if (texture) {
      texture.isDirty = true;
    }
  }

  cleanUp(keysToKeep: Set<string>): void {
    const keysToDelete: string[] = [];
    
    this.cache.forEach((_, key) => {
      if (!keysToKeep.has(key)) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => this.delete(key));
  }
}