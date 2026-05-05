// app/index.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { DrawingCanvas } from '../components/DrawingCanvas';
import { Stroke } from '../types/drawing';

// 🌤️ Test cloud image (replace with Firebase URL later)
const TEST_CLOUD_URL =
  'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/' +
  'Cumulus_clouds_panorama.jpg/1280px-Cumulus_clouds_panorama.jpg';

export default function HomeScreen() {
  const [submitted, setSubmitted] = useState(false);
  const [strokeCount, setStrokeCount] = useState(0);

  const handleSubmit = (strokes: Stroke[]) => {
    setStrokeCount(strokes.length);
    setSubmitted(true);
    // TODO Step 12: Save strokes to Firebase here
    console.log(`✅ Submitted ${strokes.length} strokes`);
  };

  // ── SUCCESS SCREEN (shown after submit) ──
  if (submitted) {
    return (
      <View style={styles.successContainer}>
        <Text style={styles.successEmoji}>🎉</Text>
        <Text style={styles.successTitle}>Drawing Submitted!</Text>
        <Text style={styles.successSubtitle}>
          You drew {strokeCount} strokes
        </Text>
        <TouchableOpacity
          style={styles.seeOthersBtn}
          onPress={() => setSubmitted(false)} // TODO: navigate to Gallery
        >
          <Text style={styles.seeOthersText}>See What Others Drew ☁️</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.drawAgainBtn}
          onPress={() => setSubmitted(false)}
        >
          <Text style={styles.drawAgainText}>Draw Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── MAIN DRAWING SCREEN ──
  return (
    <SafeAreaView style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>☁️ What do you see?</Text>
        <Text style={styles.headerSubtitle}>
          Draw what this cloud looks like to you
        </Text>
      </View>

      {/* Drawing Canvas */}
      <DrawingCanvas
        cloudImageUrl={TEST_CLOUD_URL}
        onSubmit={handleSubmit}
      />

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#12122a',
  },
  header: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: '#AAAACC',
    fontSize: 13,
    marginTop: 4,
  },
  // ── Success Screen ──
  successContainer: {
    flex: 1,
    backgroundColor: '#12122a',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    padding: 30,
  },
  successEmoji: {
    fontSize: 60,
  },
  successTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: 'bold',
  },
  successSubtitle: {
    color: '#AAAACC',
    fontSize: 16,
  },
  seeOthersBtn: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 14,
    marginTop: 10,
  },
  seeOthersText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  drawAgainBtn: {
    paddingVertical: 10,
  },
  drawAgainText: {
    color: '#AAAACC',
    fontSize: 14,
  },
});