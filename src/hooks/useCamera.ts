// src/hooks/useCamera.ts

import { useState, useCallback, useRef } from 'react';
import type { Camera } from '../types/rendering.types';

interface UseCameraOptions {
  initialX?: number;
  initialY?: number;
  initialZoom?: number;
}

interface UseCameraReturn {
  camera: Camera;
  isDragging: boolean;
  startDrag: (clientX: number, clientY: number) => void;
  updateDrag: (clientX: number, clientY: number) => void;
  endDrag: () => void;
  setCamera: (camera: Camera) => void;
}

export const useCamera = (options: UseCameraOptions = {}): UseCameraReturn => {
  const { initialX = 0, initialY = 0, initialZoom = 1 } = options;

  const [camera, setCamera] = useState<Camera>({
    x: initialX,
    y: initialY,
    zoom: initialZoom
  });

  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  const startDrag = useCallback((clientX: number, clientY: number) => {
    setIsDragging(true);
    dragStartRef.current = { 
      x: clientX - camera.x, 
      y: clientY - camera.y 
    };
  }, [camera.x, camera.y]);

  const updateDrag = useCallback((clientX: number, clientY: number) => {
    if (!isDragging) return;

    setCamera(prev => ({
      ...prev,
      x: clientX - dragStartRef.current.x,
      y: clientY - dragStartRef.current.y
    }));
  }, [isDragging]);

  const endDrag = useCallback(() => {
    setIsDragging(false);
  }, []);

  return {
    camera,
    isDragging,
    startDrag,
    updateDrag,
    endDrag,
    setCamera
  };
};