// components/DrawingCanvas/Toolbar.tsx
import React from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Alert,
} from 'react-native';
import { DrawingTool } from '../../types/drawing';
import { BRUSH_SIZES } from '../../constants/drawing';

interface ToolbarProps {
  activeTool: DrawingTool;
  brushSize: number;
  canUndo: boolean;
  onToolChange: (tool: DrawingTool) => void;
  onSizeChange: (size: number) => void;
  onUndo: () => void;
  onClear: () => void;
  onSubmit: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  activeTool,
  brushSize,
  canUndo,
  onToolChange,
  onSizeChange,
  onUndo,
  onClear,
  onSubmit,
}) => {

  const handleClear = () => {
    Alert.alert(
      'Clear Drawing',
      'Wipe everything and start fresh?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', style: 'destructive', onPress: onClear },
      ]
    );
  };

  return (
    <View style={styles.container}>

      {/* ── ROW 1: Tool Buttons ── */}
      <View style={styles.row}>

        <TouchableOpacity
          style={[styles.toolBtn, activeTool === 'brush' && styles.activeTool]}
          onPress={() => onToolChange('brush')}
        >
          <Text style={styles.toolIcon}>✏️</Text>
          <Text style={styles.toolLabel}>Brush</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.toolBtn, activeTool === 'eraser' && styles.activeTool]}
          onPress={() => onToolChange('eraser')}
        >
          <Text style={styles.toolIcon}>🧹</Text>
          <Text style={styles.toolLabel}>Eraser</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.toolBtn, !canUndo && styles.disabledBtn]}
          onPress={onUndo}
          disabled={!canUndo}
        >
          <Text style={styles.toolIcon}>↩️</Text>
          <Text style={styles.toolLabel}>Undo</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.toolBtn, !canUndo && styles.disabledBtn]}
          onPress={handleClear}
          disabled={!canUndo}
        >
          <Text style={styles.toolIcon}>🗑️</Text>
          <Text style={styles.toolLabel}>Clear</Text>
        </TouchableOpacity>

      </View>

      {/* ── ROW 2: Brush Sizes ── */}
      <View style={styles.row}>
        <Text style={styles.sizeLabel}>Size:</Text>
        {BRUSH_SIZES.map((size) => (
          <TouchableOpacity
            key={size}
            style={[styles.sizeBtn, brushSize === size && styles.activeSizeBtn]}
            onPress={() => onSizeChange(size)}
          >
            {/* Dot scales with size but is capped visually */}
            <View
              style={[
                styles.sizeDot,
                {
                  width: Math.min(size, 22),
                  height: Math.min(size, 22),
                  borderRadius: Math.min(size, 22) / 2,
                },
              ]}
            />
          </TouchableOpacity>
        ))}
      </View>

      {/* ── SUBMIT BUTTON ── */}
      <TouchableOpacity style={styles.submitBtn} onPress={onSubmit}>
        <Text style={styles.submitText}>✅  Submit My Drawing</Text>
      </TouchableOpacity>

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#12122a',
    paddingHorizontal: 10,
    paddingBottom: 16,
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  toolBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#2a2a45',
    minWidth: 70,
  },
  activeTool: {
    backgroundColor: '#007AFF',
  },
  disabledBtn: {
    opacity: 0.35,
  },
  toolIcon: {
    fontSize: 20,
  },
  toolLabel: {
    color: '#FFFFFF',
    fontSize: 10,
    marginTop: 3,
    fontWeight: '600',
  },
  sizeLabel: {
    color: '#AAAACC',
    fontSize: 13,
    marginRight: 4,
  },
  sizeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2a2a45',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  activeSizeBtn: {
    borderColor: '#007AFF',
    backgroundColor: '#1e1e3a',
  },
  sizeDot: {
    backgroundColor: '#FFFFFF',
  },
  submitBtn: {
    marginHorizontal: 16,
    marginTop: 4,
    paddingVertical: 14,
    backgroundColor: '#34C759',
    borderRadius: 14,
    alignItems: 'center',
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.3,
  },
});
