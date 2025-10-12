import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  ActivityIndicator,
  Keyboard,
} from "react-native";

export type Suggestion = { label: string; latitude: number; longitude: number };

type Props = {
  onClose: () => void;
  destInput: string;
  onChangeDestInput: (text: string) => void;
  suggestions: Suggestion[];
  suggestLoading: boolean;
  onSelectSuggestion: (s: Suggestion) => void;
  onPickOnMap: () => void;
  routeError?: string | null;
  // Settings
  graceDistance: number; // meters
  onChangeGraceDistance: (m: number) => void;
};

const DestinationDrawer: React.FC<Props> = ({
  onClose,
  destInput,
  onChangeDestInput,
  suggestions,
  suggestLoading,
  onSelectSuggestion,
  onPickOnMap,
  routeError,
  graceDistance,
  onChangeGraceDistance,
}) => {
  const [kbHeight, setKbHeight] = useState(0);
  const [activeTab, setActiveTab] = useState<"dest" | "settings">("dest");

  useEffect(() => {
    const showEvt =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvt =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSub = Keyboard.addListener(showEvt, (e: any) => {
      setKbHeight(
        Platform.OS === "android" ? e.endCoordinates?.height ?? 0 : 0
      );
    });
    const hideSub = Keyboard.addListener(hideEvt, () => setKbHeight(0));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      style={[
        styles.drawerWrapper,
        Platform.OS === "android" ? { bottom: kbHeight } : null,
      ]}
    >
      <View style={styles.drawer}>
        <TouchableOpacity
          accessibilityLabel="Close"
          onPress={onClose}
          style={styles.drawerClose}
          activeOpacity={0.8}
        >
          <Text style={styles.drawerCloseText}>✕</Text>
        </TouchableOpacity>

        <View style={styles.drawerHandle} />
        {/* Tabs */}
        <View style={styles.tabsRow}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === "dest" && styles.tabBtnActive]}
            onPress={() => setActiveTab("dest")}
            accessibilityLabel="Destination tab"
          >
            <Text style={[styles.tabText, activeTab === "dest" && styles.tabTextActive]}>Destination</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === "settings" && styles.tabBtnActive]}
            onPress={() => setActiveTab("settings")}
            accessibilityLabel="Settings tab"
          >
            <Text style={[styles.tabText, activeTab === "settings" && styles.tabTextActive]}>Settings</Text>
          </TouchableOpacity>
        </View>

        {activeTab === "dest" ? (
          <>
            <Text style={styles.drawerTitle}>Choose destination</Text>
            <TextInput
              style={styles.input}
              placeholder="Type address (optional) or pick on map"
              value={destInput}
              onChangeText={onChangeDestInput}
              returnKeyType="search"
            />

            <View style={styles.suggestPanel}>
              {suggestLoading ? (
                <View style={styles.suggestLoadingRow}>
                  <ActivityIndicator size="small" />
                  <Text style={styles.suggestLoadingText}>Searching…</Text>
                </View>
              ) : (
                <FlatList
                  keyboardShouldPersistTaps="handled"
                  data={suggestions}
                  keyExtractor={(_, i) => String(i)}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.suggestItem}
                      onPress={() => onSelectSuggestion(item)}
                    >
                      <Text numberOfLines={2} style={styles.suggestText}>
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  )}
                  
                  style={{ maxHeight: 180 }}
                />
              )}
            </View>

            <View style={styles.row}>
              <TouchableOpacity
                style={[styles.button, styles.secondaryBtn]}
                onPress={onPickOnMap}
                activeOpacity={0.9}
              >
                <Text style={styles.buttonText}>Pick on Map</Text>
              </TouchableOpacity>
            </View>

            {routeError ? (
              <Text style={styles.routeError}>{routeError}</Text>
            ) : null}
          </>
        ) : (
          <>
            <Text style={styles.drawerTitle}>Settings</Text>
            <Text style={styles.label}>Grace distance (meters)</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={String(Math.max(0, Math.floor(graceDistance || 0)))}
              onChangeText={(t) => {
                const m = parseInt(t.replace(/[^0-9]/g, "")) || 0;
                onChangeGraceDistance(m);
              }}
              placeholder="e.g. 200"
            />
            <Text style={styles.helpText}>
              We'll draw a circle around your destination using this radius. You'll be alerted when you enter this area.
            </Text>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  drawerWrapper: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
  },
  drawer: {
    backgroundColor: "#fff",
    paddingTop: 8,
    paddingHorizontal: 16,
    paddingBottom: 20,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
  },
  drawerHandle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#ccc",
    marginBottom: 10,
  },
  drawerTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 8,
  },
  label: {
    fontSize: 13,
    color: "#374151",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: Platform.select({ ios: 12, android: 8 }),
    fontSize: 14,
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  button: {
    flex: 1,
    borderRadius: 10,
    alignItems: "center",
    paddingVertical: 12,
  },
  secondaryBtn: {
    backgroundColor: "#2c8f6d",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "700",
  },
  routeError: {
    color: "#b91c1c",
    textAlign: "center",
  },
  suggestPanel: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    marginBottom: 12,
    overflow: "hidden",
    backgroundColor: "#fff",
  },
  suggestItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  suggestText: {
    fontSize: 14,
    color: "#111827",
  },
  suggestLoadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  suggestLoadingText: {
    fontSize: 12,
    color: "#6b7280",
  },
  suggestEmpty: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    color: "#6b7280",
    fontSize: 12,
  },
  helpText: {
    color: "#6b7280",
    fontSize: 12,
  },
  drawerClose: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  drawerCloseText: {
    fontSize: 20,
    color: "#111827",
  },
  tabsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  tabBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 999,
    paddingVertical: 8,
    alignItems: "center",
    backgroundColor: "#f3f4f6",
  },
  tabBtnActive: {
    backgroundColor: "#2c8f6d",
    borderColor: "#2c8f6d",
  },
  tabText: {
    fontSize: 13,
    color: "#111827",
    fontWeight: "600",
  },
  tabTextActive: {
    color: "#fff",
  },
});

export default DestinationDrawer;
