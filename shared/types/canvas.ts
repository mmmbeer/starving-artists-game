import { PaintColor } from './game';

export interface CanvasSquare {
  x: number;
  y: number;
  color: PaintColor;
}

export interface CanvasDefinition {
  id: string;
  title: string;
  artist?: string;
  year?: string;
  starValue: number;
  paintValue: number;
  foodValue: number;
  layout: CanvasSquare[];
}
