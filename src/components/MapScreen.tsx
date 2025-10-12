import { useEffect, useState } from "react";
import { Text, StyleSheet, View, ActivityIndicator } from "react-native";
import * as Location from "expo-location";
import { WebView } from "react-native-webview";

const MapScreen = () => {
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setLocationError("Location permission denied");
          setLoading(false);
          return;
        }

        const current = await Location.getCurrentPositionAsync({});
        setCoords({
          latitude: current.coords.latitude,
          longitude: current.coords.longitude,
        });
      } catch (e: any) {
        setLocationError(e?.message ?? "Failed to get location");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // no-op: WebView map is centered from injected HTML

  return (
    <View style={styles.container}>
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" />
          <Text style={styles.loadingText}>Fetching your location…</Text>
        </View>
      )}

      {!loading && coords && (
        <WebView
          style={styles.map}
          originWhitelist={["*"]}
          javaScriptEnabled
          domStorageEnabled
          setSupportMultipleWindows={false}
          source={{ html: buildLeafletHtml(coords.latitude, coords.longitude) }}
        />
      )}

      {/* OSM attribution (required) */}
      {!loading && coords && (
        <View style={styles.attributionWrapper} pointerEvents="none">
          <Text style={styles.attributionText}>© OpenStreetMap contributors</Text>
        </View>
      )}

      {locationError && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{locationError}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  map: {
    flex: 1,
  },
  attributionWrapper: {
    position: "absolute",
    bottom: 6,
    right: 8,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  attributionText: {
    fontSize: 11,
    color: "#333",
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  loadingText: {
    marginTop: 8,
  },
  errorBanner: {
    position: "absolute",
    top: 40,
    left: 20,
    right: 20,
    backgroundColor: "#fee2e2",
    borderColor: "#fecaca",
    borderWidth: 1,
    padding: 8,
    borderRadius: 6,
  },
  errorText: {
    color: "#b91c1c",
    textAlign: "center",
  },
});

export default MapScreen;

function buildLeafletHtml(lat: number, lon: number) {
  // Simple Leaflet page rendered inside WebView. For production, consider hosting a local HTML template.
  return `
  <!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
        crossorigin=""
      />
      <style>
        html, body, #map { height: 100%; margin: 0; padding: 0; }
        .leaflet-control-container .leaflet-bottom.leaflet-right { margin-bottom: 22px; }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
        integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin=""></script>
      <script>
        const map = L.map('map', { zoomControl: true }).setView([${lat}, ${lon}], 15);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 19,
        }).addTo(map);
        L.marker([${lat}, ${lon}]).addTo(map).bindPopup('You are here').openPopup();
      </script>
    </body>
  </html>`;
}
