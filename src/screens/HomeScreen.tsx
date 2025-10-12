import { View, Text, StyleSheet } from "react-native";
import TripContainer from "../components/TripContainer";

const HomeScreen = () => {
  return (
    <View style={styles.container}>
      <TripContainer />
    </View>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
