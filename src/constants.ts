/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GameSettings } from './types';

export const SETTINGS: GameSettings = {
  gridSize: 20,
  canvasWidth: 800,
  canvasHeight: 600,
  initialSpeed: 150,
  speedIncrement: 2,
};

export const DIRECTIONS: Record<string, { x: number; y: number }> = {
  UP: { x: 0, y: -1 },
  DOWN: { x: 0, y: 1 },
  LEFT: { x: -1, y: 0 },
  RIGHT: { x: 1, y: 0 },
};

export const INITIAL_SNAKE = [
  { x: 10, y: 10 },
  { x: 9, y: 10 },
  { x: 8, y: 10 },
];
