import React, { useEffect, useRef } from "react";
import { Animated, Text, StyleSheet } from "react-native";

const WelcomeScreen = () => {
  // Initialize animated values for opacity and scale
  const fadeAnim = useRef(new Animated.Value(0)).current; // For opacity
  const scaleAnim = useRef(new Animated.Value(0.5)).current; // For scaling (starting small)

  useEffect(() => {
    // Run both animations in parallel (fade in + scale up)
    Animated.parallel([
      // Fade in animation
      Animated.timing(fadeAnim, {
        toValue: 1, // Fully visible
        duration: 2000, // Animation duration (2 seconds)
        useNativeDriver: true, // Use native driver for better performance
      }),

      // Scale up animation
      Animated.timing(scaleAnim, {
        toValue: 1, // Scale to normal size
        duration: 3000, // Same duration as fade
        useNativeDriver: true, // Use native driver
      }),
    ]).start();
  }, [fadeAnim, scaleAnim]);

  return (
    <Animated.View
      style={[
        styles.centeredView,
        { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
      ]}
    >
      <Text style={styles.appName}>WakeUpMe</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  appName: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#007bff",
  },
});

export default WelcomeScreen;
