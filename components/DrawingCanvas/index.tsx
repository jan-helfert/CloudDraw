// components/DrawingCanvas/index.tsx
import React, { useState, useCallback } from 'react';
import {
  View,
  Image,
  StyleSheet,
  Dimensions,
  Alert,
} from 'react-native';

// ─── Skia imports ─────────────────────────────────────────
// BlendMode enum REMOVED — Skia props use string literals instead
import {
  Canvas,
  Path,
  Group,
  Paint,
  Skia,
  notifyChange,
} from '@shopify/react-native-skia';

// ─── Gesture imports ──────────────────────────────────────
import {
  Gesture,
  GestureDetector,
} from 'react-native-gesture-handler';

// ─── Reanimated imports ───────────────────────────────────
import {
  useSharedValue,
  useDerivedValue,
  runOnJS,
} from 'react-native-reanimated';

import { Toolbar } from './Toolbar';
import { ColorPicker } from './ColorPicker';
import { Stroke, DrawingTool, DrawingCanvasProps } from '../../types/drawing';
import {
  DEFAULT_COLOR,
  DEFAULT_BRUSH_SIZE,
  DEFAULT_ERASER_SIZE,
} from '../../constants/drawing';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CANVAS_SIZE = SCREEN_WIDTH;

export const DrawingCanvas: React.FC<DrawingCanvasProps> = ({
  cloudImageSource,  // ← renamed
  onSubmit,
}) => {

  // ───────────────────────────────────────────────────────
  // REACT STATE — JS thread
  // Used for: UI controls, completed strokes list
  // These only update BETWEEN strokes — never during drawing
  // ───────────────────────────────────────────────────────
  const [completedStrokes, setCompletedStrokes] = useState<Stroke[]>([]);
  const [activeTool, setActiveTool] = useState<DrawingTool>('brush');
  const [selectedColor, setSelectedColor] = useState<string>(DEFAULT_COLOR);
  const [brushSize, setBrushSize] = useState<number>(DEFAULT_BRUSH_SIZE);

  // ───────────────────────────────────────────────────────
  // SHARED VALUES — UI thread
  // Mirror the React state above BUT readable inside worklets
  // The gesture handler runs on the UI thread and CANNOT
  // read React state — it can only read shared values
  // ───────────────────────────────────────────────────────
  const svColor = useSharedValue<string>(DEFAULT_COLOR);
  const svBrushSize = useSharedValue<number>(DEFAULT_BRUSH_SIZE);
  const svIsEraser = useSharedValue<boolean>(false);

  // The path being drawn RIGHT NOW (mutated every finger move)
  const currentPath = useSharedValue(Skia.Path.Make());

  // Previous touch point for smooth bezier curve calculation
  const prevX = useSharedValue(0);
  const prevY = useSharedValue(0);

  // ───────────────────────────────────────────────────────
  // DERIVED VALUES — computed on UI thread from shared values
  // These feed directly into Skia without touching React
  // ───────────────────────────────────────────────────────
  const currentColor = useDerivedValue(() =>
    svIsEraser.value ? 'transparent' : svColor.value
  );

  const currentStrokeWidth = useDerivedValue(() =>
    svIsEraser.value ? DEFAULT_ERASER_SIZE : svBrushSize.value
  );

  // ───────────────────────────────────────────────────────
  // STROKE COMPLETION — runs on JS thread via runOnJS
  // Called when finger lifts — saves finished stroke to state
  // ───────────────────────────────────────────────────────
  const addCompletedStroke = useCallback(
    (
      path: any,
      color: string,
      strokeWidth: number,
      isEraser: boolean
    ) => {
      setCompletedStrokes((prev) => [
        ...prev,
        { path, color, strokeWidth, isEraser },
      ]);
    },
    []
  );

  // ───────────────────────────────────────────────────────
  // PAN GESTURE — runs entirely on UI thread (60fps, no lag)
  //
  // onBegin  → finger down: start fresh path
  // onChange → finger moves: extend path with smooth curve
  // onEnd    → finger lifts: save stroke, reset path
  // ───────────────────────────────────────────────────────
  const gesture = Gesture.Pan()
    .minDistance(0)
    .maxPointers(1)
    .averageTouches(false)

    .onBegin(({ x, y }) => {
      'worklet';
      const path = Skia.Path.Make();
      path.moveTo(x, y);
      path.lineTo(x, y); // handles tap without movement
      currentPath.value = path;
      prevX.value = x;
      prevY.value = y;
      notifyChange(currentPath);
    })

    .onChange(({ x, y }) => {
      'worklet';
      // ✨ Quadratic Bezier midpoint — smooth natural lines
      const midX = (prevX.value + x) / 2;
      const midY = (prevY.value + y) / 2;
      currentPath.value.quadTo(
        prevX.value, prevY.value,
        midX, midY
      );
      prevX.value = x;
      prevY.value = y;
      notifyChange(currentPath);
    })

    .onEnd(() => {
      'worklet';
      runOnJS(addCompletedStroke)(
        currentPath.value,
        svColor.value,
        svBrushSize.value,
        svIsEraser.value
      );
      currentPath.value = Skia.Path.Make();
      notifyChange(currentPath);
    });

  // ───────────────────────────────────────────────────────
  // TOOL HANDLERS — keep React state + shared values in sync
  // ───────────────────────────────────────────────────────
  const handleToolChange = (tool: DrawingTool) => {
    setActiveTool(tool);
    svIsEraser.value = tool === 'eraser';
  };

  const handleColorSelect = (color: string) => {
    setSelectedColor(color);
    svColor.value = color;
    setActiveTool('brush');
    svIsEraser.value = false;
  };

  const handleSizeChange = (size: number) => {
    setBrushSize(size);
    svBrushSize.value = size;
  };

  const handleUndo = () => {
    setCompletedStrokes((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    setCompletedStrokes([]);
  };

  const handleSubmit = () => {
    if (completedStrokes.length === 0) {
      Alert.alert('Nothing to submit!', 'Draw something first ☁️');
      return;
    }
    onSubmit(completedStrokes);
  };

  // ───────────────────────────────────────────────────────
  // RENDER
  // ───────────────────────────────────────────────────────
  return (
    <View style={styles.container}>

      {/* ── CANVAS AREA ──────────────────────────────────*/}
      <View style={styles.canvasContainer}>

        {/* LAYER 1: Cloud photo — React Native Image
            Handles any URL. Sits under everything. */}
<Image
  source={cloudImageSource}   // ← accepts both local and remote now
  style={styles.cloudImage}
  resizeMode="cover"
/>

        {/* LAYER 2: Skia canvas — transparent, floats on top
            Only responsible for drawing strokes */}
        <GestureDetector gesture={gesture}>
          <Canvas style={styles.skiaCanvas}>

            {/* Offscreen bitmap group — ESSENTIAL for eraser:
                BlendMode "clear" only erases within this group,
                NOT the cloud photo underneath */}
            <Group layer={<Paint />}>

              {/* ── COMPLETED STROKES ── */}
              {completedStrokes.map((stroke, index) =>
                stroke.isEraser ? (
                  // Eraser stroke
                  // blendMode="clear" as string literal ✅
                  <Path
                    key={index}
                    path={stroke.path}
                    style="stroke"
                    strokeWidth={stroke.strokeWidth}
                    strokeCap="round"
                    strokeJoin="round"
                    antiAlias={true}
                  >
                    <Paint blendMode="clear" />
                  </Path>
                ) : (
                  // Brush stroke — no blend mode needed
                  <Path
                    key={index}
                    path={stroke.path}
                    color={stroke.color}
                    style="stroke"
                    strokeWidth={stroke.strokeWidth}
                    strokeCap="round"
                    strokeJoin="round"
                    antiAlias={true}
                  />
                )
              )}

              {/* ── CURRENT STROKE (live, 60fps) ──
                  Eraser:  Paint child with blendMode="clear" ✅
                  Brush:   animated color from derived value   ✅ */}
{activeTool === 'eraser' ? (
  <Path
    path={currentPath}
    style="stroke"
    strokeWidth={currentStrokeWidth}
    strokeCap="round"
    strokeJoin="round"
    antiAlias={true}
  >
    <Paint blendMode="clear" />
  </Path>
) : (
  <Path
    path={currentPath}
    color={currentColor}
    style="stroke"
    strokeWidth={currentStrokeWidth}
    strokeCap="round"
    strokeJoin="round"
    antiAlias={true}
  />
)}


            </Group>
          </Canvas>
        </GestureDetector>

      </View>
      {/* ── END CANVAS AREA ──────────────────────────────*/}

      {/* ── COLOR PICKER ─────────────────────────────────*/}
      <ColorPicker
        selectedColor={selectedColor}
        isEraser={activeTool === 'eraser'}
        onColorSelect={handleColorSelect}
      />

      {/* ── TOOLBAR ──────────────────────────────────────*/}
      <Toolbar
        activeTool={activeTool}
        brushSize={brushSize}
        canUndo={completedStrokes.length > 0}
        onToolChange={handleToolChange}
        onSizeChange={handleSizeChange}
        onUndo={handleUndo}
        onClear={handleClear}
        onSubmit={handleSubmit}
      />

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#12122a',
  },
  canvasContainer: {
    width: CANVAS_SIZE,
    height: CANVAS_SIZE,
    position: 'relative',
  },
  cloudImage: {
    width: CANVAS_SIZE,
    height: CANVAS_SIZE,
    position: 'absolute',
  },
  skiaCanvas: {
    width: CANVAS_SIZE,
    height: CANVAS_SIZE,
    position: 'absolute',
    backgroundColor: 'transparent',
  },
});