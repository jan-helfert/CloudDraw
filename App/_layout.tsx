// app/_layout.tsx
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Stack } from 'expo-router';
import { StyleSheet } from 'react-native';

export default function RootLayout() {
  return (
    // GestureHandlerRootView MUST be the outermost wrapper
    // for react-native-gesture-handler to work
    <GestureHandlerRootView style={styles.root}>
      <Stack>
        <Stack.Screen
          name="index"
          options={{ headerShown: false }} // Full screen canvas
        />
      </Stack>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});