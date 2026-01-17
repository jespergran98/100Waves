// src/utils/world/biomeConfig.ts

import type { TileType } from '../../types/world.types';

export const TILE_COLORS: Record<TileType, string[]> = {
  // Common temperate
  grasslands: ['#4a7c4a', '#4b7d4b', '#4c7e4c', '#4d7f4d', '#4e804e', '#4f814f'],
  plains: ['#7a9a5a', '#7b9b5b', '#7c9c5c', '#7d9d5d', '#7e9e5e'],
  forest: ['#2d5a2d', '#2e5b2e', '#2f5c2f', '#305d30', '#315e31', '#326032'],
  swamp: ['#3d4d3a', '#3e4e3b', '#3f4f3c', '#40503d'],
  
  // Water
  river: ['#4a7a9a', '#4b7b9b', '#4c7c9c', '#4d7d9d'],
  ocean: ['#2d5d7d', '#2e5e7e', '#2f5f7f', '#306080'],
  deep_ocean: ['#1a3a5a', '#1b3b5b', '#1c3c5c', '#1d3d5d'],
  coral_reef: ['#4a8a8a', '#5a9a7a', '#6aaa8a', '#7aba9a'],
  
  // Cold
  snowy_plains: ['#e8f0f8', '#e9f1f9', '#eaf2fa', '#ebf3fb'],
  frozen_ocean: ['#6a8aaa', '#6b8bab', '#6c8cac', '#6d8dad'],
  deep_frozen_ocean: ['#4a6a8a', '#4b6b8b', '#4c6c8c', '#4d6d8d'],
  taiga: ['#3a5a4a', '#3b5b4b', '#3c5c4c', '#3d5d4d', '#3e5e4e'],
  snowy_taiga: ['#5a7a7a', '#5b7b7b', '#5c7c7c', '#5d7d7d'],
  tundra: ['#c0d0e0', '#c1d1e1', '#c2d2e2', '#c3d3e3'],
  
  // Hot/Dry
  desert: ['#d4b896', '#d5b997', '#d6ba98', '#d7bb99', '#d8bc9a'],
  badlands: ['#a85a3a', '#a95b3b', '#aa5c3c', '#ab5d3d', '#ac5e3e'],
  wastelands: ['#8a7a6a', '#8b7b6b', '#8c7c6c', '#8d7d6d'],
  savanna: ['#b4a46a', '#b5a56b', '#b6a66c', '#b7a76d'],
  
  // Rare
  oasis: ['#5aaa7a', '#5bab7b', '#5cac7c', '#5dad7d'],
  wooded_badlands: ['#8a6a4a', '#8b6b4b', '#8c6c4c', '#8d6d4d', '#8e6e4e'],
  mangrove: ['#4a6a4a', '#4b6b4b', '#4c6c4c', '#4d6d4d'],
  jungle: ['#2a4a2a', '#2b4b2b', '#2c4c2c', '#2d4d2d', '#2e4e2e', '#2f4f2f'],
  
  // Mountain/Underground
  mountain: ['#7a7a7a', '#7b7b7b', '#7c7c7c', '#7d7d7d', '#7e7e7e'],
  caves: ['#3a3a3a', '#3b3b3b', '#3c3c3c', '#3d3d3d'],
  mines: ['#5a5a5a', '#5b5b5b', '#5c5c5c', '#5d5d5d', '#5e5e5e'],
  
  // Legendary
  ashlands: ['#4a4a4a', '#5a5a5a', '#6a6a6a', '#7a7a7a'],
  molten_wastes: ['#da4a2a', '#db4b2b', '#dc4c2c', '#dd4d2d']
};

export const getBlockColor = (
  biomeType: TileType,
  variantIndex: number,
  blockX: number,
  blockY: number
): string => {
  const colors = TILE_COLORS[biomeType];
  const baseColor = colors[variantIndex % colors.length];
  
  if (!baseColor) return '#000000';
  
  // Fast hash for variation
  const hash = (blockX * 73856093) ^ (blockY * 19349663);
  const variation = ((hash & 0xff) / 255) * 0.08 - 0.04;
  
  const hex = baseColor.replace('#', '');
  const r = Math.max(0, Math.min(255, parseInt(hex.substr(0, 2), 16) * (1 + variation)));
  const g = Math.max(0, Math.min(255, parseInt(hex.substr(2, 2), 16) * (1 + variation)));
  const b = Math.max(0, Math.min(255, parseInt(hex.substr(4, 2), 16) * (1 + variation)));
  
  return `rgb(${Math.floor(r)}, ${Math.floor(g)}, ${Math.floor(b)})`;
};