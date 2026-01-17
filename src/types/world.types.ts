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
    landPercentage: 0.80,
    waterPercentage: 0.12,
    stonePercentage: 0.08,
    resourceMultiplier: 1.5
  },
  medium: {
    landPercentage: 0.70,
    waterPercentage: 0.20,
    stonePercentage: 0.10,
    resourceMultiplier: 1.0
  },
  hard: {
    landPercentage: 0.60,
    waterPercentage: 0.28,
    stonePercentage: 0.12,
    resourceMultiplier: 0.7
  }
};

export const DEFAULT_WORLD_CONFIG: WorldConfig = {
  width: 64,
  height: 64,
  tileSize: 16
};