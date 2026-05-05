// components/DrawingCanvas/index.tsx
import React, { useState, useCallback } from 'react';
import {
  View,
  Image,
  StyleSheet,
  Dimensions,
  Alert,
} from 'react-native';

import {
  Canvas,
  Path,
  Group,
  Paint,
  Skia,
  notifyChange,
} from '@shopify/react-native-skia';

import {
  Gesture,
  GestureDetector,
} from 'react-native-gesture-handler';

import {
  useSharedValue,
  useDerivedValue,
  runOnJS,
} from 'react-native-reanimated';

import { Toolbar } from './Toolbar';
import { ColorPicker } from './ColorPicker';
import { Stroke, DrawingCanvasProps } from '../../types/drawing';
import {
  DEFAULT_COLOR,
  DEFAULT_BRUSH_SIZE,
} from '../../constants/drawing';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CANVAS_SIZE = SCREEN_WIDTH;

export const DrawingCanvas: React.FC<DrawingCanvasProps> = ({
  cloudImageSource,
  onSubmit,
}) => {

  // ─────────────────────────────────────────────────────
  // REACT STATE
  // ─────────────────────────────────────────────────────
  const [completedStrokes, setCompletedStrokes] = useState<Stroke[]>([]);
  const [selectedColor, setSelectedColor] = useState<string>(DEFAULT_COLOR);
  const [brushSize, setBrushSize] = useState<number>(DEFAULT_BRUSH_SIZE);

  // ─────────────────────────────────────────────────────
  // SHARED VALUES — UI thread
  // ─────────────────────────────────────────────────────
  const svColor = useSharedValue<string>(DEFAULT_COLOR);
  const svBrushSize = useSharedValue<number>(DEFAULT_BRUSH_SIZE);
  const currentPath = useSharedValue(Skia.Path.Make());
  const prevX = useSharedValue(0);
  const prevY = useSharedValue(0);

  // ─────────────────────────────────────────────────────
  // DERIVED VALUES
  // ─────────────────────────────────────────────────────
  const currentColor = useDerivedValue(() => svColor.value);
  const currentStrokeWidth = useDerivedValue(() => svBrushSize.value);

  // ─────────────────────────────────────────────────────
  // STROKE COMPLETION
  // ─────────────────────────────────────────────────────
  const addCompletedStroke = useCallback(
    (path: any, color: string, strokeWidth: number) => {
      setCompletedStrokes((prev) => [
        ...prev,
        { path, color, strokeWidth },
      ]);
    },
    []
  );

  // ─────────────────────────────────────────────────────
  // PAN GESTURE
  // ─────────────────────────────────────────────────────
  const gesture = Gesture.Pan()
    .minDistance(0)
    .maxPointers(1)
    .averageTouches(false)

    .onBegin(({ x, y }) => {
      'worklet';
      const path = Skia.Path.Make();
      path.moveTo(x, y);
      path.lineTo(x, y);
      currentPath.value = path;
      prevX.value = x;
      prevY.value = y;
      notifyChange(currentPath);
    })

    .onChange(({ x, y }) => {
      'worklet';
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
      );
      currentPath.value = Skia.Path.Make();
      notifyChange(currentPath);
    });

  // ─────────────────────────────────────────────────────
  // HANDLERS
  // ─────────────────────────────────────────────────────
  const handleColorSelect = (color: string) => {
    setSelectedColor(color);
    svColor.value = color;
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

  // ─────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────
  return (
    <View style={styles.container}>

      {/* ── CANVAS AREA ── */}
      <View style={styles.canvasContainer}>

        {/* LAYER 1: Cloud photo */}
        <Image
          source={cloudImageSource}
          style={styles.cloudImage}
          resizeMode="cover"
        />

        {/* LAYER 2: Skia drawing canvas */}
        <GestureDetector gesture={gesture}>
          <Canvas style={styles.skiaCanvas}>
            <Group layer={<Paint />}>

              {/* Completed strokes */}
              {completedStrokes.map((stroke, index) => (
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
              ))}

              {/* Current stroke — live 60fps */}
              <Path
                path={currentPath}
                color={currentColor}
                style="stroke"
                strokeWidth={currentStrokeWidth}
                strokeCap="round"
                strokeJoin="round"
                antiAlias={true}
              />

            </Group>
          </Canvas>
        </GestureDetector>

      </View>

      {/* ── COLOR PICKER ── */}
      <ColorPicker
        selectedColor={selectedColor}
        onColorSelect={handleColorSelect}
      />

      {/* ── TOOLBAR ── */}
      <Toolbar
        brushSize={brushSize}
        canUndo={completedStrokes.length > 0}
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
