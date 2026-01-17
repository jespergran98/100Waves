import { useState, useEffect, useRef } from 'react';
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

interface BloodSplatter {
  id: number;
  x: number;
  y: number;
  rotation: number;
  scale: number;
}

const MainMenu = ({ onPlay, onSettings, onQuit }: MainMenuProps) => {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [bloodSplatters, setBloodSplatters] = useState<BloodSplatter[]>([]);
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });
  const [isHovering, setIsHovering] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Generate particles on mount
  useEffect(() => {
    const particleCount = 30;
    const newParticles: Particle[] = Array.from({ length: particleCount }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * 8,
      duration: 12 + Math.random() * 8,
      size: 2 + Math.random() * 3
    }));
    setParticles(newParticles);

    // Generate static blood splatters
    const splatterCount = 8;
    const newSplatters: BloodSplatter[] = Array.from({ length: splatterCount }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      rotation: Math.random() * 360,
      scale: 0.5 + Math.random() * 1
    }));
    setBloodSplatters(newSplatters);
  }, []);

  // Parallax mouse tracking
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth) * 100;
      const y = (e.clientY / window.innerHeight) * 100;
      setMousePos({ x, y });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="main-menu" ref={menuRef}>
      {/* Atmospheric background layers */}
      <div className="bg-layer bg-base" />
      
      <div 
        className="bg-layer bg-gradient-red"
        style={{
          transform: `translate(${(mousePos.x - 50) * 0.015}px, ${(mousePos.y - 50) * 0.015}px)`
        }}
      />
      
      <div 
        className="bg-layer bg-gradient-green"
        style={{
          transform: `translate(${(mousePos.x - 50) * -0.02}px, ${(mousePos.y - 50) * -0.02}px)`
        }}
      />

      <div 
        className="bg-layer bg-grid"
        style={{
          transform: `translate(${(mousePos.x - 50) * 0.03}px, ${(mousePos.y - 50) * 0.03}px)`
        }}
      />

      {/* Blood splatters */}
      <div className="blood-splatters">
        {bloodSplatters.map(splatter => (
          <div
            key={splatter.id}
            className="blood-splatter"
            style={{
              left: `${splatter.x}%`,
              top: `${splatter.y}%`,
              transform: `rotate(${splatter.rotation}deg) scale(${splatter.scale})`
            }}
          />
        ))}
      </div>

      {/* Floating particles (ash/debris) */}
      <div className="particles-container">
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

      {/* Vignette and effects */}
      <div className="vignette" />
      <div className="scanlines" />
      <div className="film-grain" />

      {/* Main content container */}
      <div className="menu-content">
        {/* Title section */}
        <div className="title-section">
          <div className="title-container">
            <div className="title-glow" />
            <h1 className="game-title">
              <span className="title-number">100</span>
              <span className="title-text">WAVES</span>
            </h1>
            <div className="title-underline" />
          </div>
          
          <div className="subtitle-container">
            <div className="subtitle-decoration left">
              <span className="skull-icon">☠</span>
              <div className="decoration-line" />
            </div>
            <h2 className="subtitle">ZOMBIE SURVIVAL</h2>
            <div className="subtitle-decoration right">
              <div className="decoration-line" />
              <span className="skull-icon">☠</span>
            </div>
          </div>

          <p className="tagline">
            <span className="tagline-text">FIGHT. SURVIVE. CONQUER.</span>
          </p>
        </div>

        {/* Navigation menu */}
        <nav className="menu-navigation" role="navigation" aria-label="Main menu">
          <button 
            className={`menu-btn menu-btn-play ${isHovering === 'play' ? 'is-hovering' : ''}`}
            onClick={onPlay}
            onMouseEnter={() => setIsHovering('play')}
            onMouseLeave={() => setIsHovering(null)}
            aria-label="Start game"
          >
            <span className="btn-bg" />
            <span className="btn-glow" />
            <span className="btn-content">
              <span className="btn-icon">▶</span>
              <span className="btn-text">START GAME</span>
              <span className="btn-arrow">→</span>
            </span>
          </button>

          <button 
            className={`menu-btn menu-btn-settings ${isHovering === 'settings' ? 'is-hovering' : ''}`}
            onClick={onSettings}
            onMouseEnter={() => setIsHovering('settings')}
            onMouseLeave={() => setIsHovering(null)}
            aria-label="Open settings"
          >
            <span className="btn-bg" />
            <span className="btn-glow" />
            <span className="btn-content">
              <span className="btn-icon">⚙</span>
              <span className="btn-text">SETTINGS</span>
              <span className="btn-arrow">→</span>
            </span>
          </button>

          <button 
            className={`menu-btn menu-btn-quit ${isHovering === 'quit' ? 'is-hovering' : ''}`}
            onClick={onQuit}
            onMouseEnter={() => setIsHovering('quit')}
            onMouseLeave={() => setIsHovering(null)}
            aria-label="Quit game"
          >
            <span className="btn-bg" />
            <span className="btn-glow" />
            <span className="btn-content">
              <span className="btn-icon">✕</span>
              <span className="btn-text">QUIT</span>
              <span className="btn-arrow">→</span>
            </span>
          </button>
        </nav>

        {/* Footer information */}
        <footer className="menu-footer">
          <p className="version-info">v1.0.0 • BETA</p>
          <p className="copyright">© {new Date().getFullYear()} • SURVIVE OR DIE</p>
        </footer>
      </div>

      {/* Corner UI decorations */}
      <div className="corner-ui corner-tl" aria-hidden="true">
        <div className="corner-line corner-line-h" />
        <div className="corner-line corner-line-v" />
        <div className="corner-dot" />
      </div>
      <div className="corner-ui corner-tr" aria-hidden="true">
        <div className="corner-line corner-line-h" />
        <div className="corner-line corner-line-v" />
        <div className="corner-dot" />
      </div>
      <div className="corner-ui corner-bl" aria-hidden="true">
        <div className="corner-line corner-line-h" />
        <div className="corner-line corner-line-v" />
        <div className="corner-dot" />
      </div>
      <div className="corner-ui corner-br" aria-hidden="true">
        <div className="corner-line corner-line-h" />
        <div className="corner-line corner-line-v" />
        <div className="corner-dot" />
      </div>

      {/* Ambient sound indicator (visual only) */}
      <div className="sound-indicator" aria-hidden="true">
        <span className="sound-wave" />
        <span className="sound-wave" />
        <span className="sound-wave" />
      </div>
    </div>
  );
};

export default MainMenu;