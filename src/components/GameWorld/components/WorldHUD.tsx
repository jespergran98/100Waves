// src/components/GameWorld/components/WorldHUD.tsx

import type { WorldData } from '../../../types/world.types';

interface WorldHUDProps {
  worldData: WorldData;
  playerCoords: { x: number; y: number };
  onBackToMenu: () => void;
}

const WorldHUD = ({ worldData, playerCoords, onBackToMenu }: WorldHUDProps) => {
  return (
    <div className="world-header">
      <div className="header-left">
        <button className="icon-button back-button" onClick={onBackToMenu}>
          <span className="button-icon">←</span>
        </button>
        <div className="world-info">
          <h1 className="world-name">{worldData.name}</h1>
          <div className="world-meta">
            <span className="meta-item">Seed: {worldData.seed}</span>
            <span className="meta-divider">•</span>
            <span className="meta-item">{worldData.difficulty.toUpperCase()}</span>
            <span className="meta-divider">•</span>
            <span className="meta-item">X: {playerCoords.x} Y: {playerCoords.y}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorldHUD;