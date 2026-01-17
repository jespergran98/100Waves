import { useState, useEffect } from 'react';
import type { Particle } from '../types';

/**
 * Custom hook for managing atmospheric particles
 * @param count - Number of particles to generate
 */
export const useParticles = (count: number = 30): Particle[] => {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    const newParticles: Particle[] = Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * 15,
      duration: 20 + Math.random() * 15,
      size: 2 + Math.random() * 3
    }));
    
    setParticles(newParticles);
  }, [count]);

  return particles;
};