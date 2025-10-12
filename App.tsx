import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View } from "react-native";
import WelcomeScreen from "./src/screens/WelcomeScreen";
import { useEffect, useState } from "react";
import HomeScreen from "./src/screens/HomeScreen";
import React from "react";

export default function App() {
  const [showWelcome, setShowWelcome] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowWelcome(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);
  return showWelcome ? <WelcomeScreen /> : <HomeScreen />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
