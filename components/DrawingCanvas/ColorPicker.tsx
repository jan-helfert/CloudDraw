// components/DrawingCanvas/ColorPicker.tsx
import React from 'react';
import {
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { PALETTE_COLORS } from '../../constants/drawing';

interface ColorPickerProps {
  selectedColor: string;
  isEraser: boolean;
  onColorSelect: (color: string) => void;
}

export const ColorPicker: React.FC<ColorPickerProps> = ({
  selectedColor,
  isEraser,
  onColorSelect,
}) => {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={styles.container}
    >
      {PALETTE_COLORS.map((color) => (
        <TouchableOpacity
          key={color}
          onPress={() => onColorSelect(color)}
          style={[
            styles.dot,
            { backgroundColor: color },
            !isEraser && selectedColor === color && styles.selectedDot,
            color === '#FFFFFF' && styles.whiteDot,
          ]}
        />
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scroll: {
    backgroundColor: '#12122a',
  },
  container: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
    alignItems: 'center',
  },
  dot: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  selectedDot: {
    borderWidth: 3,
    borderColor: '#007AFF',
    transform: [{ scale: 1.2 }],
  },
  whiteDot: {
    borderWidth: 1.5,
    borderColor: '#555',
  },
});