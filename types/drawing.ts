// types/drawing.ts
import { SkPath } from '@shopify/react-native-skia';
import { ImageSourcePropType } from 'react-native'; 

export type DrawingTool = 'brush' | 'eraser';

export interface Stroke {
  path: SkPath;
  color: string;
  strokeWidth: number;
  isEraser: boolean;
}

export interface DrawingCanvasProps {
  cloudImageSource: ImageSourcePropType;
  onSubmit: (strokes: Stroke[]) => void;
}
