// World generation and tile types

export type TileType = 'land' | 'water' | 'stone' | 'sand';

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface WorldData {
  name: string;
  seed: string;
  difficulty: Difficulty;
}

export interface Tile {
  type: TileType;
  x: number;
  y: number;
}

export interface WorldConfig {
  width: number;
  height: number;
  tileSize: number;
}

export interface TerrainThresholds {
  water: number;
  sand: number;
  land: number;
  stone: number;
}

export interface DifficultySettings {
  landPercentage: number;
  waterPercentage: number;
  stonePercentage: number;
  resourceMultiplier: number;
}

export const DIFFICULTY_SETTINGS: Record<Difficulty, DifficultySettings> = {
  easy: {
    landPercentage: 0.56,      // 56% land - comfortable gameplay
    waterPercentage: 0.28,     // 28% water - strategic placement
    stonePercentage: 0.16,     // 16% stone+sand combined
    resourceMultiplier: 1.5    // More resources available
  },
  medium: {
    landPercentage: 0.47,      // 47% land - balanced challenge
    waterPercentage: 0.36,     // 36% water - moderate obstacles
    stonePercentage: 0.17,     // 17% stone+sand combined
    resourceMultiplier: 1.0    // Standard resources
  },
  hard: {
    landPercentage: 0.38,      // 38% land - survival mode
    waterPercentage: 0.45,     // 45% water - dangerous terrain
    stonePercentage: 0.17,     // 17% stone+sand combined
    resourceMultiplier: 0.6    // Reduced resources
  }
};

export const DEFAULT_WORLD_CONFIG: WorldConfig = {
  width: 64,
  height: 64,
  tileSize: 16
};