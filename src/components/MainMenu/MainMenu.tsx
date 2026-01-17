import { useState, useEffect, useRef, useCallback } from 'react';
import './MainMenu.css';

interface MainMenuProps {
  onPlay: () => void;
  onSettings: () => void;
  onQuit: () => void;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  delay: number;
  duration: number;
  size: number;
}

const MainMenu = ({ onPlay, onSettings, onQuit }: MainMenuProps) => {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [focusedButton, setFocusedButton] = useState<string | null>(null);
  const [glitchActive, setGlitchActive] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Initialize atmospheric particles
  useEffect(() => {
    const particleCount = 30;
    const newParticles: Particle[] = Array.from({ length: particleCount }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * 15,
      duration: 20 + Math.random() * 15,
      size: 2 + Math.random() * 3
    }));
    setParticles(newParticles);

    // Periodic glitch effect on title
    const glitchInterval = setInterval(() => {
      if (Math.random() > 0.6) {
        setGlitchActive(true);
        setTimeout(() => setGlitchActive(false), 150 + Math.random() * 200);
      }
    }, 4000);

    return () => clearInterval(glitchInterval);
  }, []);

  // Smooth mouse tracking
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 2;
      const y = (e.clientY / window.innerHeight - 0.5) * 2;
      setMousePos({ x, y });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

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

  const handleButtonFocus = useCallback((buttonId: string) => {
    setFocusedButton(buttonId);
    playSound(900);
  }, [playSound]);

  const handleButtonClick = useCallback((action: () => void) => {
    playSound(1200);
    setTimeout(action, 150);
  }, [playSound]);

  return (
    <div className={`main-menu ${glitchActive ? 'glitch-active' : ''}`} ref={menuRef}>
      {/* Gradient background */}
      <div className="menu-bg">
        <div 
          className="bg-gradient"
          style={{
            transform: `translate(${mousePos.x * 15}px, ${mousePos.y * 15}px)`
          }}
        />
        <div className="bg-static" />
        <div className="bg-scanlines" />
      </div>

      {/* Subtle particles */}
      <div className="particles">
        {particles.map(particle => (
          <div
            key={particle.id}
            className="particle"
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              animationDelay: `${particle.delay}s`,
              animationDuration: `${particle.duration}s`
            }}
          />
        ))}
      </div>

      {/* Vignette overlay */}
      <div className="vignette" />

      {/* Main content */}
      <div className="menu-container">
        {/* Title section */}
        <div className={`title-section ${glitchActive ? 'glitch-active' : ''}`}>
          <div className="title-primary">
            <span className="title-number">100</span>
            <span className="title-divider" />
            <span className="title-text">WAVES</span>
          </div>
          <div className="title-subtitle">
            <span className="subtitle-text">ZOMBIE SURVIVAL</span>
          </div>
        </div>

        {/* Navigation buttons */}
        <nav className="menu-nav">
          <button
            className={`menu-button primary ${focusedButton === 'play' ? 'focused' : ''}`}
            onMouseEnter={() => handleButtonFocus('play')}
            onMouseLeave={() => setFocusedButton(null)}
            onFocus={() => handleButtonFocus('play')}
            onBlur={() => setFocusedButton(null)}
            onClick={() => handleButtonClick(onPlay)}
            aria-label="Start new game"
          >
            <span className="button-bg" />
            <span className="button-content">
              <span className="button-icon">▶</span>
              <span className="button-text">START GAME</span>
            </span>
            <span className="button-glow" />
          </button>

          <button
            className={`menu-button secondary ${focusedButton === 'settings' ? 'focused' : ''}`}
            onMouseEnter={() => handleButtonFocus('settings')}
            onMouseLeave={() => setFocusedButton(null)}
            onFocus={() => handleButtonFocus('settings')}
            onBlur={() => setFocusedButton(null)}
            onClick={() => handleButtonClick(onSettings)}
            aria-label="Open settings"
          >
            <span className="button-bg" />
            <span className="button-content">
              <span className="button-icon">⚙</span>
              <span className="button-text">SETTINGS</span>
            </span>
            <span className="button-glow" />
          </button>

          <button
            className={`menu-button tertiary ${focusedButton === 'quit' ? 'focused' : ''}`}
            onMouseEnter={() => handleButtonFocus('quit')}
            onMouseLeave={() => setFocusedButton(null)}
            onFocus={() => handleButtonFocus('quit')}
            onBlur={() => setFocusedButton(null)}
            onClick={() => handleButtonClick(onQuit)}
            aria-label="Quit game"
          >
            <span className="button-bg" />
            <span className="button-content">
              <span className="button-icon">✕</span>
              <span className="button-text">QUIT</span>
            </span>
            <span className="button-glow" />
          </button>
        </nav>

        {/* Footer */}
        <footer className="menu-footer">
          <div className="footer-status">
            <span className="status-dot" />
            <span className="status-text">READY</span>
          </div>
          <div className="footer-info">
            <span className="info-text">v1.0.0</span>
            <span className="info-divider">•</span>
            <span className="info-text">© {new Date().getFullYear()}</span>
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

export default MainMenu;