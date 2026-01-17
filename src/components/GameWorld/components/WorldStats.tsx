// src/components/GameWorld/components/WorldStats.tsx

import type { TileType } from '../../../types/world.types';
import { BIOME_RARITY } from '../../../types/world.types';

interface WorldStatsProps {
  worldStats: Record<TileType, number> | null;
  totalChunks: number;
  blocksPerTile: number;
}

const WorldStats = ({ worldStats, totalChunks, blocksPerTile }: WorldStatsProps) => {
  if (!worldStats) return null;

  // Group biomes by category
  const biomeCategories = {
    legendary: [] as { name: string; count: number; type: TileType }[],
    epic: [] as { name: string; count: number; type: TileType }[],
    rare: [] as { name: string; count: number; type: TileType }[],
    common: [] as { name: string; count: number; type: TileType }[]
  };

  Object.entries(worldStats).forEach(([biome, count]) => {
    if (count === 0) return;
    
    const type = biome as TileType;
    const rarity = BIOME_RARITY[type];
    const name = biome.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    const item = { name, count, type };

    if (rarity === 'legendary') {
      biomeCategories.legendary.push(item);
    } else if (rarity === 'epic') {
      biomeCategories.epic.push(item);
    } else if (rarity === 'rare' || rarity === 'uncommon') {
      biomeCategories.rare.push(item);
    } else {
      biomeCategories.common.push(item);
    }
  });

  const totalTiles = Object.values(worldStats).reduce((sum, count) => sum + count, 0);

  const getPercentage = (count: number): number => {
    return totalTiles > 0 ? (count / totalTiles) * 100 : 0;
  };

  const formatCount = (count: number): string => {
    if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
    return count.toString();
  };

  return (
    <div className="stats-panel">
      <div className="stats-header">
        <span className="stats-icon">🗺️</span>
        <h3 className="stats-title">World Statistics</h3>
      </div>

      <div className="stats-grid">
        <div className="stat-item info">
          <span className="stat-label">Chunks Loaded</span>
          <span className="stat-value">{totalChunks}</span>
        </div>

        <div className="stat-item info">
          <span className="stat-label">Tiles Explored</span>
          <span className="stat-value">{formatCount(totalTiles)}</span>
        </div>

        {biomeCategories.legendary.length > 0 && (
          <>
            <div className="stats-divider" />
            {biomeCategories.legendary.map(({ name, count, type }) => (
              <div key={type} className="stat-item legendary">
                <div 
                  className="stat-bar" 
                  style={{ width: `${getPercentage(count)}%` }}
                />
                <span className="stat-label">{name}</span>
                <span className="stat-value">{formatCount(count)}</span>
              </div>
            ))}
          </>
        )}

        {biomeCategories.epic.length > 0 && (
          <>
            <div className="stats-divider" />
            {biomeCategories.epic.map(({ name, count, type }) => (
              <div key={type} className="stat-item epic">
                <div 
                  className="stat-bar" 
                  style={{ width: `${getPercentage(count)}%` }}
                />
                <span className="stat-label">{name}</span>
                <span className="stat-value">{formatCount(count)}</span>
              </div>
            ))}
          </>
        )}

        {biomeCategories.rare.length > 0 && biomeCategories.rare.slice(0, 5).map(({ name, count, type }) => (
          <div key={type} className="stat-item rare">
            <div 
              className="stat-bar" 
              style={{ width: `${getPercentage(count)}%` }}
            />
            <span className="stat-label">{name}</span>
            <span className="stat-value">{formatCount(count)}</span>
          </div>
        ))}

        {biomeCategories.common.length > 0 && (
          <>
            <div className="stats-divider" />
            {biomeCategories.common.slice(0, 5).map(({ name, count, type }) => (
              <div key={type} className="stat-item">
                <div 
                  className="stat-bar" 
                  style={{ width: `${getPercentage(count)}%` }}
                />
                <span className="stat-label">{name}</span>
                <span className="stat-value">{formatCount(count)}</span>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
};

export default WorldStats;