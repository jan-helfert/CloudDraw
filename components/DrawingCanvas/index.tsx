// components/DrawingCanvas/index.tsx
import React, { useState, useCallback } from 'react';
import {
  View,
  Image,       // ← React Native Image (handles any URL perfectly)
  StyleSheet,
  Dimensions,
  Alert,
} from 'react-native';

// Skia imports — drawing engine
import {
  Canvas,
  Path,
  Group,
  Paint,
  Skia,
  BlendMode,
  notifyChange,    // ← Triggers Skia re-render WITHOUT going through React
} from '@shopify/react-native-skia';

// Gesture imports — detects finger movement
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

// Reanimated — shared values live on the UI thread (60fps)
import { useSharedValue, runOnJS, useDerivedValue } from 'react-native-reanimated';

import { Toolbar } from './Toolbar';
import { ColorPicker } from './ColorPicker';
import { Stroke, DrawingTool, DrawingCanvasProps } from '../../types/drawing';
import {
  DEFAULT_COLOR,
  DEFAULT_BRUSH_SIZE,
  DEFAULT_ERASER_SIZE,
} from '../../constants/drawing';

// Canvas fills the screen width and is square
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CANVAS_SIZE = SCREEN_WIDTH;

export const DrawingCanvas: React.FC<DrawingCanvasProps> = ({
  cloudImageUrl,
  onSubmit,
}) => {

  // ─────────────────────────────────────────────────────────────
  // REACT STATE  (JS thread — used for UI controls & completed strokes)
  // These only change between strokes, not during — so no lag.
  // ─────────────────────────────────────────────────────────────
  const [completedStrokes, setCompletedStrokes] = useState<Stroke[]>([]);
  const [activeTool, setActiveTool] = useState<DrawingTool>('brush');
  const [selectedColor, setSelectedColor] = useState<string>(DEFAULT_COLOR);
  const [brushSize, setBrushSize] = useState<number>(DEFAULT_BRUSH_SIZE);

  // ─────────────────────────────────────────────────────────────
  // SHARED VALUES  (UI thread — used inside gesture worklets)
  // These mirror the React state above but live on the UI thread
  // so the gesture callbacks can read them at 60fps without
  // crossing the JS bridge.
  // ─────────────────────────────────────────────────────────────
  const svColor = useSharedValue<string>(DEFAULT_COLOR);
  const svBrushSize = useSharedValue<number>(DEFAULT_BRUSH_SIZE);
  const svIsEraser = useSharedValue<boolean>(false);

  // The path currently being drawn (changes every finger move!)
  const currentPath = useSharedValue(Skia.Path.Make());

  // Previous touch point — used for smooth bezier curves
  const prevX = useSharedValue(0);
  const prevY = useSharedValue(0);

  // ─────────────────────────────────────────────────────────────
  // ANIMATED PROPS  (computed on UI thread, fed to Skia directly)
  // These let Skia read the current tool settings without
  // going through React state.
  // ─────────────────────────────────────────────────────────────
  const currentColor = useDerivedValue(() =>
    // Eraser is transparent so BlendMode.Clear removes pixels
    svIsEraser.value ? Skia.Color('transparent') : Skia.Color(svColor.value)
  );

  const currentStrokeWidth = useDerivedValue(() =>
    svIsEraser.value ? DEFAULT_ERASER_SIZE : svBrushSize.value
  );

  const currentBlendMode = useDerivedValue(() =>
    svIsEraser.value ? 'clear' : 'srcOver'
  );

  // ─────────────────────────────────────────────────────────────
  // STROKE COMPLETION  (runs on JS thread via runOnJS)
  // Called when the user lifts their finger.
  // Saves the finished stroke to React state.
  // ─────────────────────────────────────────────────────────────
  const addCompletedStroke = useCallback(
    (
      path: any,         // SkPath passed from worklet
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

  // ─────────────────────────────────────────────────────────────
  // PAN GESTURE  (runs on UI thread — no JS bridge = 60fps)
  //
  // onBegin  → User puts finger down: start a new path
  // onChange → Finger moves: extend path with smooth bezier curve
  // onEnd    → Finger lifts: save stroke to React state
  // ─────────────────────────────────────────────────────────────
  const gesture = Gesture.Pan()
    .minDistance(0)       // Detect even tiny movements
    .maxPointers(1)       // One finger only (no accidental multi-touch)
    .averageTouches(false)

    .onBegin(({ x, y }) => {
      // Create a fresh path starting at finger position
      const path = Skia.Path.Make();
      path.moveTo(x, y);
      path.lineTo(x, y); // Single dot for tap-without-move
      currentPath.value = path;

      // Remember start position for smooth curve calculation
      prevX.value = x;
      prevY.value = y;

      // Tell Skia to re-render (no React re-render needed!)
      notifyChange(currentPath);
    })

    .onChange(({ x, y }) => {
      // ✨ SMOOTH LINES: Quadratic Bezier midpoint technique
      // Instead of straight line segments, we draw a curve
      // through the midpoint between the last point and current point.
      // This makes strokes look like real brushstrokes, not jagged lines.
      const midX = (prevX.value + x) / 2;
      const midY = (prevY.value + y) / 2;

      currentPath.value.quadTo(
        prevX.value, prevY.value,  // Control point (where curve bends toward)
        midX, midY                 // End point (midpoint = smooth)
      );

      prevX.value = x;
      prevY.value = y;

      // Tell Skia to re-render with the updated path
      notifyChange(currentPath);
    })

    .onEnd(() => {
      // Send completed stroke to JS thread to save in React state
      runOnJS(addCompletedStroke)(
        currentPath.value,
        svColor.value,
        svBrushSize.value,
        svIsEraser.value
      );

      // Reset the live path for the next stroke
      currentPath.value = Skia.Path.Make();
      notifyChange(currentPath);
    });

  // ─────────────────────────────────────────────────────────────
  // TOOL CHANGE HANDLERS  (sync React state + shared values)
  // ─────────────────────────────────────────────────────────────
  const handleToolChange = (tool: DrawingTool) => {
    setActiveTool(tool);
    svIsEraser.value = tool === 'eraser';
  };

  const handleColorSelect = (color: string) => {
    setSelectedColor(color);
    svColor.value = color;
    // Picking a color auto-switches back to brush
    setActiveTool('brush');
    svIsEraser.value = false;
  };

  const handleSizeChange = (size: number) => {
    setBrushSize(size);
    svBrushSize.value = size;
  };

  // ─────────────────────────────────────────────────────────────
  // UNDO / CLEAR
  // ─────────────────────────────────────────────────────────────
  const handleUndo = () => {
    setCompletedStrokes((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    setCompletedStrokes([]);
  };

  // ─────────────────────────────────────────────────────────────
  // SUBMIT
  // ─────────────────────────────────────────────────────────────
  const handleSubmit = () => {
    if (completedStrokes.length === 0) {
      Alert.alert(
        'Nothing to submit!',
        'Draw something on the cloud first ☁️'
      );
      return;
    }
    onSubmit(completedStrokes);
  };

  // ─────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>

      {/* ── CANVAS AREA ── */}
      <View style={styles.canvasContainer}>

        {/* LAYER 1: Cloud Photo Background
            Using React Native's Image (not Skia's) because:
            - Handles Firebase URLs, http, https automatically
            - No extra loading logic needed */}
        <Image
          source={{ uri: cloudImageUrl }}
          style={styles.cloudImage}
          resizeMode="cover"
        />

        {/* LAYER 2: Skia Drawing Canvas (transparent background!)
            Floats on top of the cloud photo.
            Only handles drawing — no image loading here. */}
        <GestureDetector gesture={gesture}>
          <Canvas style={styles.skiaCanvas}>

            {/*  Group with layer={<Paint />} creates an OFFSCREEN BITMAP.
                This is crucial for the eraser to work correctly:
                - Without it, BlendMode.Clear would erase the cloud image too!
                - With it, Clear only erases pixels within this group's bitmap,
                  making it look like the drawing is being erased (not the photo). */}
            <Group layer={<Paint />}>

              {/* Completed strokes — rendered from React state */}
              {completedStrokes.map((stroke, index) => (
                <Path
                  key={index}
                  path={stroke.path}
                  color={stroke.isEraser ? 'transparent' : stroke.color}
                  style="stroke"
                  strokeWidth={stroke.strokeWidth}
                  strokeCap="round"   // ← Round ends = smooth, natural lines
                  strokeJoin="round"  // ← Round joins = no sharp corners
                  antiAlias={true}
                  blendMode={stroke.isEraser ? 'clear' : 'srcOver'}
                />
              ))}

              {/* Current stroke — rendered from shared value (60fps, UI thread)
                  Uses animated props (currentColor, currentStrokeWidth, currentBlendMode)
                  that are computed directly on the UI thread via useDerivedValue */}
              <Path
                path={currentPath}          // ← Animated SkPath shared value
                color={currentColor}        // ← Animated color
                style="stroke"
                strokeWidth={currentStrokeWidth}  // ← Animated size
                strokeCap="round"
                strokeJoin="round"
                antiAlias={true}
                blendMode={currentBlendMode}      // ← Animated blend mode
              />

            </Group>
          </Canvas>
        </GestureDetector>

      </View>
      {/* ── END CANVAS AREA ── */}

      {/* ── COLOR PICKER ── */}
      <ColorPicker
        selectedColor={selectedColor}
        isEraser={activeTool === 'eraser'}
        onColorSelect={handleColorSelect}
      />

      {/* ── TOOLBAR ── */}
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
    // Stack the image and canvas on top of each other
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
    // IMPORTANT: transparent so cloud image shows through!
    backgroundColor: 'transparent',
  },
});