import { useRef, useCallback } from 'react';

interface UseAudioFeedbackReturn {
  playSound: (frequency?: number) => void;
}

/**
 * Custom hook for UI audio feedback
 * Provides subtle audio cues for user interactions
 */
export const useAudioFeedback = (): UseAudioFeedbackReturn => {
  const audioContextRef = useRef<AudioContext | null>(null);

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
    } catch (error) {
      // Silently fail if audio context not available
      console.debug('Audio feedback unavailable:', error);
    }
  }, []);

  return { playSound };
};