// src/utils/world/biomeConfig.ts

import type { TileType } from '../../types/world.types';

/**
 * Enhanced color palettes for post-apocalyptic zombie survival
 * Colors are designed to create atmosphere and gameplay clarity
 */
export const TILE_COLORS: Record<TileType, string[]> = {
  // Safe zones - muted greens
  grasslands: ['#4a6b4a', '#4b6c4b', '#4c6d4c', '#4d6e4d', '#4e6f4e', '#4f704f', '#506b50', '#516c51'],
  plains: ['#6a8a5a', '#6b8b5b', '#6c8c5c', '#6d8d5d', '#6e8e5e', '#6f8f5f', '#708a60', '#718b61'],
  forest: ['#2d4b2d', '#2e4c2e', '#2f4d2f', '#304e30', '#314f31', '#325032', '#334b33', '#344c34'],
  
  // Water - dark blues
  river: ['#3a5a6a', '#3b5b6b', '#3c5c6c', '#3d5d6d', '#3e5e6e', '#3f5f6f', '#405a70', '#415b71'],
  ocean: ['#2d4d5d', '#2e4e5e', '#2f4f5f', '#305060', '#315161', '#325262', '#334d63', '#344e64'],
  deep_ocean: ['#1a3a4a', '#1b3b4b', '#1c3c4c', '#1d3d4d', '#1e3e4e', '#1f3f4f', '#203a50', '#213b51'],
  
  // Dangerous zones - desaturated, ominous
  swamp: ['#3d4d3a', '#3e4e3b', '#3f4f3c', '#40503d', '#41513e', '#42523f', '#434d40', '#444e41'],
  wasteland: ['#6a5a4a', '#6b5b4b', '#6c5c4c', '#6d5d4d', '#6e5e4e', '#6f5f4f', '#705a50', '#715b51'],
  
  // Urban ruins - greys and browns
  ruins: ['#4a4a4a', '#4b4b4b', '#4c4c4c', '#4d4d4d', '#4e4e4e', '#4f4f4f', '#504a50', '#514b51'],
  bunker: ['#5a5a5a', '#5b5b5b', '#5c5c5c', '#5d5d5d', '#5e5e5e', '#5f5f5f', '#605a60', '#615b61'],
  
  // Cold biomes - icy whites and blues
  snowy_plains: ['#d8e4e8', '#d9e5e9', '#dae6ea', '#dbe7eb', '#dce8ec', '#dde9ed', '#dee4ee', '#dfe5ef'],
  frozen_ocean: ['#6a8a9a', '#6b8b9b', '#6c8c9c', '#6d8d9d', '#6e8e9e', '#6f8f9f', '#708aa0', '#718ba1'],
  deep_frozen_ocean: ['#4a6a7a', '#4b6b7b', '#4c6c7c', '#4d6d7d', '#4e6e7e', '#4f6f7f', '#506a80', '#516b81'],
  taiga: ['#3a5a4a', '#3b5b4b', '#3c5c4c', '#3d5d4d', '#3e5e4e', '#3f5f4f', '#405a50', '#415b51'],
  snowy_taiga: ['#5a7a7a', '#5b7b7b', '#5c7c7c', '#5d7d7d', '#5e7e7e', '#5f7f7f', '#607a80', '#617b81'],
  tundra: ['#c0d0e0', '#c1d1e1', '#c2d2e2', '#c3d3e3', '#c4d4e4', '#c5d5e5', '#c6d0e6', '#c7d1e7'],
  
  // Desert biomes - sandy, harsh
  desert: ['#c4b896', '#c5b997', '#c6ba98', '#c7bb99', '#c8bc9a', '#c9bd9b', '#cab89c', '#cbb99d'],
  badlands: ['#986a3a', '#996b3b', '#9a6c3c', '#9b6d3d', '#9c6e3e', '#9d6f3f', '#9e6a40', '#9f6b41'],
  canyon: ['#8a6a5a', '#8b6b5b', '#8c6c5c', '#8d6d5d', '#8e6e5e', '#8f6f5f', '#906a60', '#916b61'],
  
  // Tropical/Dense - dark greens
  oasis: ['#5aaa7a', '#5bab7b', '#5cac7c', '#5dad7d', '#5eae7e', '#5faf7f', '#60aa80', '#61ab81'],
  coral_reef: ['#4a8a8a', '#4b8b8b', '#5a9a7a', '#5b9b7b', '#6aaa8a', '#6bab8b', '#4c8c8c', '#6cac8c'],
  mangrove: ['#4a6a4a', '#4b6b4b', '#4c6c4c', '#4d6d4d', '#4e6e4e', '#4f6f4f', '#506a50', '#516b51'],
  jungle: ['#2a4a2a', '#2b4b2b', '#2c4c2c', '#2d4d2d', '#2e4e2e', '#2f4f2f', '#304a30', '#314b31'],
  
  // Mountain/Underground - greys
  mountain: ['#7a7a7a', '#7b7b7b', '#7c7c7c', '#7d7d7d', '#7e7e7e', '#7f7f7f', '#807a80', '#817b81'],
  caves: ['#3a3a3a', '#3b3b3b', '#3c3c3c', '#3d3d3d', '#3e3e3e', '#3f3f3f', '#403a40', '#413b41'],
  mines: ['#5a5a4a', '#5b5b4b', '#5c5c4c', '#5d5d4d', '#5e5e4e', '#5f5f4f', '#605a50', '#615b51'],
  
  // Apocalyptic legendary - dramatic, ominous
  dead_zone: ['#4a4a4a', '#5a5a5a', '#6a6a6a', '#7a7a7a', '#8a8a8a', '#9a9a9a', '#6a6a6a', '#7a7a7a'],
  infection_site: ['#6a3a3a', '#7a4a4a', '#8a5a5a', '#9a6a6a', '#aa7a7a', '#ba8a8a', '#8a5a5a', '#9a6a6a']
};

export const getBlockColor = (
  biomeType: TileType,
  variantIndex: number,
  blockX: number,
  blockY: number
): string => {
  const colors = TILE_COLORS[biomeType];
  const baseColor = colors[variantIndex % colors.length];
  
  if (!baseColor) return '#1a1a1a';
  
  // Multi-hash for organic distribution
  const hash1 = (blockX * 73856093) ^ (blockY * 19349663);
  const hash2 = (blockX * 83492791) ^ (blockY * 62089911);
  
  const noise1 = ((hash1 & 0xff) / 255);
  const noise2 = ((hash2 & 0xff) / 255);
  
  const organicNoise = (noise1 * 0.6 + noise2 * 0.4 - 0.5);
  
  // Variation intensity by biome type
  let variationIntensity = 0.08;
  
  if (['grasslands', 'forest', 'jungle', 'swamp'].includes(biomeType)) {
    variationIntensity = 0.12;
  } else if (['ocean', 'deep_ocean', 'snowy_plains', 'tundra'].includes(biomeType)) {
    variationIntensity = 0.06;
  } else if (['desert', 'mountain', 'badlands', 'wasteland'].includes(biomeType)) {
    variationIntensity = 0.09;
  } else if (['dead_zone', 'infection_site', 'ruins'].includes(biomeType)) {
    variationIntensity = 0.14; // More variation for apocalyptic zones
  }
  
  const variation = organicNoise * variationIntensity;
  
  const hex = baseColor.replace('#', '');
  const r = Math.max(0, Math.min(255, parseInt(hex.substr(0, 2), 16) * (1 + variation)));
  const g = Math.max(0, Math.min(255, parseInt(hex.substr(2, 2), 16) * (1 + variation)));
  const b = Math.max(0, Math.min(255, parseInt(hex.substr(4, 2), 16) * (1 + variation)));
  
  return `rgb(${Math.floor(r)}, ${Math.floor(g)}, ${Math.floor(b)})`;
};

// Biome blend colors for smooth transitions
export const BIOME_BLEND_COLORS: Partial<Record<TileType, string>> = {
  grasslands: 'rgba(74, 107, 74, 0.3)',
  forest: 'rgba(45, 75, 45, 0.3)',
  ocean: 'rgba(45, 77, 93, 0.3)',
  desert: 'rgba(196, 184, 150, 0.3)',
  snowy_plains: 'rgba(216, 228, 232, 0.3)',
  mountain: 'rgba(122, 122, 122, 0.3)',
  swamp: 'rgba(61, 77, 58, 0.3)',
  jungle: 'rgba(42, 74, 42, 0.3)',
  dead_zone: 'rgba(74, 74, 74, 0.3)',
  infection_site: 'rgba(106, 58, 58, 0.3)',
  ruins: 'rgba(74, 74, 74, 0.3)',
  wasteland: 'rgba(106, 90, 74, 0.3)'
};