// src/components/GameWorld/components/WorldHUD.tsx

import type { WorldData, TileType } from '../../../types/world.types';
import { BIOME_THREAT, BIOME_RARITY } from '../../../types/world.types';

interface WorldHUDProps {
  worldData: WorldData;
  playerCoords: { x: number; y: number };
  currentBiome: TileType;
  onBackToMenu: () => void;
}

const WorldHUD = ({ worldData, playerCoords, currentBiome, onBackToMenu }: WorldHUDProps) => {
  const getThreatColor = (biome: TileType): string => {
    const threat = BIOME_THREAT[biome];
    switch (threat) {
      case 'safe': return '#00ff80';
      case 'low': return '#80ff00';
      case 'medium': return '#ffaa00';
      case 'high': return '#ff5500';
      case 'extreme': return '#ff0000';
      default: return '#ffffff';
    }
  };

  const getRarityColor = (biome: TileType): string => {
    const rarity = BIOME_RARITY[biome];
    switch (rarity) {
      case 'common': return '#888888';
      case 'uncommon': return '#55aa55';
      case 'rare': return '#5588ff';
      case 'epic': return '#aa55ff';
      case 'legendary': return '#ff5555';
      default: return '#ffffff';
    }
  };

  const formatBiomeName = (biome: TileType): string => {
    return biome.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  return (
    <div className="world-header">
      <div className="header-left">
        <button 
          className="icon-button" 
          onClick={onBackToMenu}
          aria-label="Back to menu"
        >
          <span className="button-icon">←</span>
        </button>
        <div className="world-info">
          <h1 className="world-name">{worldData.name}</h1>
          <div className="world-meta">
            <span className="meta-item">Seed: {worldData.seed}</span>
            <span className="meta-divider">•</span>
            <span className="meta-item">{worldData.difficulty}</span>
            {worldData.daysSurvived !== undefined && (
              <>
                <span className="meta-divider">•</span>
                <span className="meta-item">Day {worldData.daysSurvived}</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="player-info-panel">
        <div className="info-row">
          <span className="info-label">Position:</span>
          <span className="info-value">
            {playerCoords.x}, {playerCoords.y}
          </span>
        </div>
        <div className="info-row">
          <span className="info-label">Biome:</span>
          <span 
            className="info-value biome-name"
            style={{ color: getRarityColor(currentBiome) }}
          >
            {formatBiomeName(currentBiome)}
          </span>
        </div>
        <div className="info-row">
          <span className="info-label">Threat:</span>
          <span 
            className="info-value threat-level"
            style={{ color: getThreatColor(currentBiome) }}
          >
            {BIOME_THREAT[currentBiome].toUpperCase()}
          </span>
        </div>
      </div>
    </div>
  );
};

export default WorldHUD;