import { useState } from 'react';
import MainMenu from './components/MainMenu';
import './global.css';

function App() {
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'settings'>('menu');

  const handlePlay = () => {
    setGameState('playing');
    console.log('Game starting...');
    // TODO: Initialize game
  };

  const handleSettings = () => {
    setGameState('settings');
    console.log('Opening settings...');
    // TODO: Show settings panel
  };

  const handleQuit = () => {
    if (window.confirm('Are you sure you want to quit?')) {
      window.close();
    }
  };

  return (
    <>
      {gameState === 'menu' && (
        <MainMenu
          onPlay={handlePlay}
          onSettings={handleSettings}
          onQuit={handleQuit}
        />
      )}
      
      {gameState === 'playing' && (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          height: '100vh',
          flexDirection: 'column',
          gap: 'var(--space-4)'
        }}>
          <h1>Game Starting...</h1>
          <button 
            onClick={() => setGameState('menu')}
            style={{
              padding: 'var(--space-3) var(--space-6)',
              fontSize: 'var(--text-lg)',
              cursor: 'pointer'
            }}
          >
            Back to Menu
          </button>
        </div>
      )}
      
      {gameState === 'settings' && (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          height: '100vh',
          flexDirection: 'column',
          gap: 'var(--space-4)'
        }}>
          <h1>Settings</h1>
          <p>Settings panel coming soon...</p>
          <button 
            onClick={() => setGameState('menu')}
            style={{
              padding: 'var(--space-3) var(--space-6)',
              fontSize: 'var(--text-lg)',
              cursor: 'pointer'
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