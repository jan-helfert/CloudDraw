// types/drawing.ts
import { SkPath } from '@shopify/react-native-skia';

// The two tools the user can use
export type DrawingTool = 'brush' | 'eraser';

// One complete stroke drawn by the user
export interface Stroke {
  path: SkPath;      // The actual drawn path (Skia object)
  color: string;     // Hex color e.g. "#FF0000"
  strokeWidth: number;
  isEraser: boolean;
}

// Props for the main DrawingCanvas component
export interface DrawingCanvasProps {
  cloudImageUrl: string;              // URL of the cloud photo
  onSubmit: (strokes: Stroke[]) => void; // Called when user taps Submit
}
