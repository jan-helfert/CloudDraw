// types/drawing.ts
import { SkPath } from '@shopify/react-native-skia';

export type DrawingTool = 'brush' | 'eraser';

export interface Stroke {
  path: SkPath;
  color: string;
  strokeWidth: number;
  isEraser: boolean;
}

export interface DrawingCanvasProps {
  cloudImageUrl: string;
  onSubmit: (strokes: Stroke[]) => void;
}
