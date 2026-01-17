// src/utils/world/biomeConfig.ts

import type { TileType } from '../../types/world.types';

// Enhanced color palettes with more realistic, visually appealing colors
export const TILE_COLORS: Record<TileType, string[]> = {
  // Lush temperate biomes - vibrant greens
  grasslands: ['#5a8c5a', '#5b8d5b', '#5c8e5c', '#5d8f5d', '#5e905e', '#5f915f', '#608f60', '#619061'],
  plains: ['#8aaa6a', '#8bab6b', '#8cac6c', '#8dad6d', '#8eae6e', '#8faf6f', '#90b070', '#91b171'],
  forest: ['#3d6b3d', '#3e6c3e', '#3f6d3f', '#406e40', '#417041', '#427142', '#436d43', '#446e44'],
  swamp: ['#4d5d4a', '#4e5e4b', '#4f5f4c', '#50604d', '#51614e', '#52624f', '#535f50', '#546051'],
  
  // Water biomes - deep blues with variation
  river: ['#5a8aaa', '#5b8bab', '#5c8cac', '#5d8dad', '#5e8eae', '#5f8faf', '#6090b0', '#6191b1'],
  ocean: ['#3d6d8d', '#3e6e8e', '#3f6f8f', '#407090', '#417191', '#427292', '#436d8d', '#446e8e'],
  deep_ocean: ['#2a4a6a', '#2b4b6b', '#2c4c6c', '#2d4d6d', '#2e4e6e', '#2f4f6f', '#304a6a', '#314b6b'],
  coral_reef: ['#5a9a9a', '#5b9b9b', '#6aaa8a', '#6bab8b', '#7aba9a', '#7bbb9b', '#6c9c9c', '#7cbc9c'],
  
  // Cold biomes - whites, ice blues
  snowy_plains: ['#e8f4f8', '#e9f5f9', '#eaf6fa', '#ebf7fb', '#ecf8fc', '#edf9fd', '#eef5f9', '#eff6fa'],
  frozen_ocean: ['#7a9aba', '#7b9bbb', '#7c9cbc', '#7d9dbd', '#7e9ebe', '#7f9fbf', '#809ac0', '#819bc1'],
  deep_frozen_ocean: ['#5a7a9a', '#5b7b9b', '#5c7c9c', '#5d7d9d', '#5e7e9e', '#5f7f9f', '#607aa0', '#617ba1'],
  taiga: ['#4a6a5a', '#4b6b5b', '#4c6c5c', '#4d6d5d', '#4e6e5e', '#4f6f5f', '#506a60', '#516b61'],
  snowy_taiga: ['#6a8a8a', '#6b8b8b', '#6c8c8c', '#6d8d8d', '#6e8e8e', '#6f8f8f', '#708a90', '#718b91'],
  tundra: ['#d0e0f0', '#d1e1f1', '#d2e2f2', '#d3e3f3', '#d4e4f4', '#d5e5f5', '#d6e0f6', '#d7e1f7'],
  
  // Hot/Dry biomes - warm earth tones
  desert: ['#e4c896', '#e5c997', '#e6ca98', '#e7cb99', '#e8cc9a', '#e9cd9b', '#eac89c', '#ebc99d'],
  badlands: ['#b86a3a', '#b96b3b', '#ba6c3c', '#bb6d3d', '#bc6e3e', '#bd6f3f', '#be6a40', '#bf6b41'],
  wastelands: ['#9a8a7a', '#9b8b7b', '#9c8c7c', '#9d8d7d', '#9e8e7e', '#9f8f7f', '#a08a80', '#a18b81'],
  savanna: ['#c4b47a', '#c5b57b', '#c6b67c', '#c7b77d', '#c8b87e', '#c9b97f', '#cab480', '#cbb581'],
  
  // Rare tropical biomes - rich greens
  oasis: ['#6aba8a', '#6bbb8b', '#6cbc8c', '#6dbd8d', '#6ebe8e', '#6fbf8f', '#70ba90', '#71bb91'],
  wooded_badlands: ['#9a7a5a', '#9b7b5b', '#9c7c5c', '#9d7d5d', '#9e7e5e', '#9f7f5f', '#a07a60', '#a17b61'],
  mangrove: ['#5a7a5a', '#5b7b5b', '#5c7c5c', '#5d7d5d', '#5e7e5e', '#5f7f5f', '#607a60', '#617b61'],
  jungle: ['#3a5a3a', '#3b5b3b', '#3c5c3c', '#3d5d3d', '#3e5e3e', '#3f5f3f', '#405a40', '#415b41'],
  
  // Mountain/Underground - greys and browns
  mountain: ['#8a8a8a', '#8b8b8b', '#8c8c8c', '#8d8d8d', '#8e8e8e', '#8f8f8f', '#908a90', '#918b91'],
  caves: ['#4a4a4a', '#4b4b4b', '#4c4c4c', '#4d4d4d', '#4e4e4e', '#4f4f4f', '#504a50', '#514b51'],
  mines: ['#6a6a5a', '#6b6b5b', '#6c6c5c', '#6d6d5d', '#6e6e5e', '#6f6f5f', '#706a60', '#716b61'],
  
  // Legendary biomes - dramatic colors
  ashlands: ['#5a5a5a', '#6a6a6a', '#7a7a7a', '#8a8a8a', '#9a9a9a', '#aaaaaa', '#7a7a7a', '#8a8a8a'],
  molten_wastes: ['#ea5a3a', '#eb5b3b', '#ec5c3c', '#ed5d3d', '#ee5e3e', '#ef5f3f', '#f05a40', '#f15b41']
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
  
  // Use multiple hash functions for better organic distribution
  const hash1 = (blockX * 73856093) ^ (blockY * 19349663);
  const hash2 = (blockX * 83492791) ^ (blockY * 62089911);
  
  const noise1 = ((hash1 & 0xff) / 255);
  const noise2 = ((hash2 & 0xff) / 255);
  
  // Combine noises for more organic variation
  const organicNoise = (noise1 * 0.6 + noise2 * 0.4 - 0.5);
  
  // Different variation intensity for different biomes
  let variationIntensity = 0.08;
  
  // More variation for natural biomes
  if (['grasslands', 'forest', 'jungle', 'swamp'].includes(biomeType)) {
    variationIntensity = 0.12;
  }
  // Less variation for water and snow
  else if (['ocean', 'deep_ocean', 'snowy_plains', 'tundra'].includes(biomeType)) {
    variationIntensity = 0.06;
  }
  // Medium variation for deserts and mountains
  else if (['desert', 'mountain', 'badlands'].includes(biomeType)) {
    variationIntensity = 0.09;
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
  grasslands: 'rgba(90, 140, 90, 0.3)',
  forest: 'rgba(61, 107, 61, 0.3)',
  ocean: 'rgba(61, 109, 141, 0.3)',
  desert: 'rgba(228, 200, 150, 0.3)',
  snowy_plains: 'rgba(232, 244, 248, 0.3)',
  mountain: 'rgba(138, 138, 138, 0.3)',
  swamp: 'rgba(77, 93, 74, 0.3)',
  jungle: 'rgba(58, 90, 58, 0.3)',
  ashlands: 'rgba(90, 90, 90, 0.3)',
  molten_wastes: 'rgba(234, 90, 58, 0.3)'
};