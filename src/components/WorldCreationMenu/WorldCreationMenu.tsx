import { useState, useEffect, useRef, useCallback } from 'react';
import './WorldCreationMenu.css';

interface WorldCreationProps {
  onCreateWorld: (worldData: WorldData) => void;
  onBack: () => void;
}

export interface WorldData {
  name: string;
  seed: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

const WorldCreationMenu = ({ onCreateWorld, onBack }: WorldCreationProps) => {
  const [worldName, setWorldName] = useState('');
  const [seed, setSeed] = useState('');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [focusedElement, setFocusedElement] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Generate random seed
  const generateRandomSeed = useCallback(() => {
    const randomSeed = Math.floor(Math.random() * 1000000000).toString();
    setSeed(randomSeed);
    playSound(1000);
  }, []);

  // Initialize with random seed if empty
  useEffect(() => {
    if (!seed) {
      const randomSeed = Math.floor(Math.random() * 1000000000).toString();
      setSeed(randomSeed);
    }
  }, [seed]);

  // Subtle UI sound
  const playSound = useCallback((frequency: number = 800) => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.frequency.value = frequency;
      gain.gain.value = 0.008;
      
      osc.start();
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc.stop(ctx.currentTime + 0.08);
    } catch (e) {
      // Silently fail if audio context not available
    }
  }, []);

  const handleFocus = useCallback((elementId: string) => {
    setFocusedElement(elementId);
    playSound(900);
  }, [playSound]);

  const handleDifficultySelect = useCallback((selectedDifficulty: 'easy' | 'medium' | 'hard') => {
    setDifficulty(selectedDifficulty);
    playSound(1000);
  }, [playSound]);

  const handleCreateWorld = useCallback(() => {
    if (!worldName.trim()) {
      playSound(400);
      return;
    }

    setIsCreating(true);
    playSound(1200);

    setTimeout(() => {
      onCreateWorld({
        name: worldName.trim(),
        seed: seed || Math.floor(Math.random() * 1000000000).toString(),
        difficulty
      });
    }, 300);
  }, [worldName, seed, difficulty, onCreateWorld, playSound]);

  const handleBack = useCallback(() => {
    playSound(800);
    setTimeout(() => {
      onBack();
    }, 150);
  }, [onBack, playSound]);

  const difficultyConfig = {
    easy: {
      label: 'EASY',
      description: 'Relaxed survival with more resources',
      icon: '●'
    },
    medium: {
      label: 'MEDIUM',
      description: 'Balanced challenge for most players',
      icon: '●●'
    },
    hard: {
      label: 'HARD',
      description: 'Brutal survival for veterans',
      icon: '●●●'
    }
  };

  return (
    <div className="world-creation">
      {/* Background elements */}
      <div className="creation-bg">
        <div className="bg-gradient" />
        <div className="bg-static" />
        <div className="bg-scanlines" />
      </div>

      <div className="vignette" />

      {/* Main content */}
      <div className="creation-container">
        {/* Header */}
        <header className="creation-header">
          <button 
            className="back-button"
            onClick={handleBack}
            onMouseEnter={() => handleFocus('back')}
            onMouseLeave={() => setFocusedElement(null)}
            aria-label="Go back to menu"
          >
            <span className="back-icon">←</span>
            <span className="back-text">BACK</span>
          </button>
          
          <h1 className="creation-title">
            <span className="title-text" data-text="CREATE YOUR WORLD">CREATE YOUR WORLD</span>
          </h1>
        </header>

        {/* Form */}
        <div className="creation-form">
          {/* World Name Input */}
          <div className="form-group">
            <label htmlFor="world-name" className="form-label">
              <span className="label-icon">▸</span>
              <span className="label-text">WORLD NAME</span>
            </label>
            <div className="input-wrapper">
              <input
                id="world-name"
                type="text"
                className={`form-input ${focusedElement === 'name' ? 'focused' : ''}`}
                value={worldName}
                onChange={(e) => setWorldName(e.target.value)}
                onFocus={() => handleFocus('name')}
                onBlur={() => setFocusedElement(null)}
                placeholder="Enter world name..."
                maxLength={32}
                autoComplete="off"
              />
              <span className="input-border" />
            </div>
          </div>

          {/* Seed Input */}
          <div className="form-group">
            <label htmlFor="world-seed" className="form-label">
              <span className="label-icon">▸</span>
              <span className="label-text">WORLD SEED</span>
            </label>
            <div className="input-wrapper seed-wrapper">
              <input
                id="world-seed"
                type="text"
                className={`form-input ${focusedElement === 'seed' ? 'focused' : ''}`}
                value={seed}
                onChange={(e) => setSeed(e.target.value.replace(/[^0-9]/g, ''))}
                onFocus={() => handleFocus('seed')}
                onBlur={() => setFocusedElement(null)}
                placeholder="Random seed..."
                maxLength={10}
                autoComplete="off"
              />
              <button
                className="generate-button"
                onClick={generateRandomSeed}
                onMouseEnter={() => handleFocus('generate')}
                onMouseLeave={() => setFocusedElement(null)}
                aria-label="Generate random seed"
              >
                <span className="generate-icon">⟳</span>
              </button>
              <span className="input-border" />
            </div>
            <p className="form-hint">Leave empty for random generation</p>
          </div>

          {/* Difficulty Selection */}
          <div className="form-group">
            <label className="form-label">
              <span className="label-icon">▸</span>
              <span className="label-text">DIFFICULTY</span>
            </label>
            <div className="difficulty-grid">
              {(Object.keys(difficultyConfig) as Array<keyof typeof difficultyConfig>).map((diff) => (
                <button
                  key={diff}
                  className={`difficulty-card ${difficulty === diff ? 'selected' : ''} ${focusedElement === diff ? 'focused' : ''}`}
                  onClick={() => handleDifficultySelect(diff)}
                  onMouseEnter={() => handleFocus(diff)}
                  onMouseLeave={() => setFocusedElement(null)}
                  aria-label={`Select ${difficultyConfig[diff].label} difficulty`}
                >
                  <span className="difficulty-bg" />
                  <span className="difficulty-glow" />
                  <div className="difficulty-content">
                    <div className="difficulty-header">
                      <span className="difficulty-icon">{difficultyConfig[diff].icon}</span>
                      <span className="difficulty-label">{difficultyConfig[diff].label}</span>
                    </div>
                    <p className="difficulty-description">{difficultyConfig[diff].description}</p>
                  </div>
                  {difficulty === diff && <span className="selected-indicator" />}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Create Button */}
        <div className="creation-actions">
          <button
            className={`create-button ${!worldName.trim() ? 'disabled' : ''} ${isCreating ? 'creating' : ''}`}
            onClick={handleCreateWorld}
            disabled={!worldName.trim() || isCreating}
            onMouseEnter={() => handleFocus('create')}
            onMouseLeave={() => setFocusedElement(null)}
            aria-label="Create world"
          >
            <span className="button-bg" />
            <span className="button-glow" />
            <span className="button-content">
              <span className="button-icon">{isCreating ? '⟳' : '✓'}</span>
              <span className="button-text">{isCreating ? 'CREATING...' : 'CREATE WORLD'}</span>
            </span>
          </button>
        </div>

        {/* Footer info */}
        <footer className="creation-footer">
          <div className="footer-hint">
            <span className="hint-icon">ℹ</span>
            <span className="hint-text">Your world will be saved automatically</span>
          </div>
        </footer>
      </div>

      {/* Corner accents */}
      <div className="corner-accent top-left" />
      <div className="corner-accent top-right" />
      <div className="corner-accent bottom-left" />
      <div className="corner-accent bottom-right" />
    </div>
  );
};

export default WorldCreationMenu;