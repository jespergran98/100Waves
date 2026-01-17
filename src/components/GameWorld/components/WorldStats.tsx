// src/components/GameWorld/components/WorldStats.tsx

import { useMemo } from 'react';
import type { TileType, BiomeRarity } from '../../../types/world.types';
import { BIOME_RARITY } from '../../../types/world.types';

interface WorldStatsProps {
  worldStats: Record<TileType, number> | null;
  totalChunks: number;
  blocksPerTile: number;
}

const WorldStats = ({ worldStats, totalChunks, blocksPerTile }: WorldStatsProps) => {
  const totalTiles = worldStats ? Object.values(worldStats).reduce((sum, val) => sum + val, 0) : 0;
  const totalBlocks = totalTiles * blocksPerTile * blocksPerTile;

  const rareBiomesFound = useMemo(() => {
    if (!worldStats) return [];
    const rare: Array<{ name: string; count: number; rarity: BiomeRarity }> = [];
    
    (Object.keys(worldStats) as TileType[]).forEach(biome => {
      const rarity = BIOME_RARITY[biome];
      const count = worldStats[biome];
      if (count > 0 && (rarity === 'rare' || rarity === 'epic' || rarity === 'legendary')) {
        rare.push({ 
          name: biome.replace(/_/g, ' ').toUpperCase(), 
          count, 
          rarity 
        });
      }
    });
    
    return rare.sort((a, b) => {
      const rarityOrder: Record<BiomeRarity, number> = { legendary: 0, epic: 1, rare: 2, uncommon: 3, common: 4 };
      return rarityOrder[a.rarity] - rarityOrder[b.rarity];
    });
  }, [worldStats]);

  return (
    <div className="stats-panel">
      <div className="stats-header">
        <span className="stats-icon">🗺️</span>
        <span className="stats-title">WORLD DATA</span>
      </div>
      <div className="stats-grid">
        <div className="stat-item info">
          <span className="stat-label">Chunks Loaded</span>
          <span className="stat-value">{totalChunks}</span>
        </div>
        <div className="stat-item info">
          <span className="stat-label">Total Blocks</span>
          <span className="stat-value">{totalBlocks.toLocaleString()}</span>
        </div>
      </div>
      
      {rareBiomesFound.length > 0 && (
        <>
          <div className="stats-divider" />
          <div className="stats-header" style={{ marginTop: 'var(--space-3)' }}>
            <span className="stats-icon">✨</span>
            <span className="stats-title">RARE BIOMES</span>
          </div>
          <div className="stats-grid">
            {rareBiomesFound.slice(0, 5).map((biome, idx) => (
              <div key={idx} className={`stat-item ${biome.rarity}`}>
                <span className="stat-label">{biome.name}</span>
                <span className="stat-value">{biome.count}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default WorldStats;