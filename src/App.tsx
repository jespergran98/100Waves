import { useState, useCallback } from 'react';
import MainMenu from './components/MainMenu';
import WorldCreationMenu from './components/WorldCreationMenu';
import GameWorld from './components/GameWorld';
import type { WorldData } from './types/world.types';
import './global.css';

type GameState = 'menu' | 'worldCreationMenu' | 'playing' | 'settings';

function App() {
  const [gameState, setGameState] = useState<GameState>('menu');
  const [currentWorld, setCurrentWorld] = useState<WorldData | null>(null);

  const handlePlay = useCallback(() => {
    setGameState('worldCreationMenu');
  }, []);

  const handleSettings = useCallback(() => {
    setGameState('settings');
  }, []);

  const handleQuit = useCallback(() => {
    if (window.confirm('Are you sure you want to quit?')) {
      window.close();
    }
  }, []);

  const handleCreateWorld = useCallback((worldData: WorldData) => {
    setCurrentWorld(worldData);
    setGameState('playing');
  }, []);

  const handleBackToMenu = useCallback(() => {
    setGameState('menu');
    setCurrentWorld(null);
  }, []);

  return (
    <>
      {gameState === 'menu' && (
        <MainMenu
          onPlay={handlePlay}
          onSettings={handleSettings}
          onQuit={handleQuit}
        />
      )}

      {gameState === 'worldCreationMenu' && (
        <WorldCreationMenu
          onCreateWorld={handleCreateWorld}
          onBack={handleBackToMenu}
        />
      )}
      
      {gameState === 'playing' && currentWorld && (
        <GameWorld
          worldData={currentWorld}
          onBackToMenu={handleBackToMenu}
        />
      )}
      
      {gameState === 'settings' && (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          height: '100vh',
          flexDirection: 'column',
          gap: 'var(--space-6)',
          background: 'var(--surface)',
          color: 'var(--text)'
        }}>
          <div style={{
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-4)'
          }}>
            <h1 style={{ 
              fontFamily: 'var(--font-display)',
              fontSize: 'var(--text-4xl)',
              color: 'var(--accent-400)',
              textTransform: 'uppercase',
              letterSpacing: 'var(--tracking-wider)',
              margin: 0
            }}>
              Settings
            </h1>
            <p style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--text-base)',
              color: 'var(--text-secondary)',
              margin: 0
            }}>
              Settings panel coming soon...
            </p>
          </div>
          <button 
            onClick={handleBackToMenu}
            style={{
              padding: 'var(--space-4) var(--space-8)',
              fontSize: 'var(--text-lg)',
              fontFamily: 'var(--font-display)',
              fontWeight: 'var(--weight-bold)',
              letterSpacing: 'var(--tracking-wide)',
              textTransform: 'uppercase',
              cursor: 'pointer',
              background: 'var(--surface-secondary)',
              color: 'var(--text)',
              border: '2px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              transition: 'all var(--duration-base) var(--ease-out)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--surface-tertiary)';
              e.currentTarget.style.borderColor = 'var(--accent-500)';
              e.currentTarget.style.color = 'var(--accent-400)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--surface-secondary)';
              e.currentTarget.style.borderColor = 'var(--border)';
              e.currentTarget.style.color = 'var(--text)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            Back to Menu
          </button>
        </div>
      )}
    </>
  );
}

export default App;