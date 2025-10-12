import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from "react-native";
import * as Location from "expo-location";
import * as Haptics from "expo-haptics";
import { Audio } from "expo-av";
import MapScreen, { MapScreenHandle } from "./MapScreen";
import DestinationDrawer, { Suggestion } from "./DestinationDrawer";


const TripContainer: React.FC = () => {
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [initialCoords, setInitialCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [placeLabel, setPlaceLabel] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [pickMode, setPickMode] = useState(false);
  const [destCoords, setDestCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [destInput, setDestInput] = useState("");
  const [routeError, setRouteError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [graceDistance, setGraceDistance] = useState<number>(200);

  const suggestTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const watchSub = useRef<Location.LocationSubscription | null>(null);
  const alarmedRef = useRef(false);
  const soundRef = useRef<Audio.Sound | null>(null);
  const mapRef = useRef<MapScreenHandle | null>(null);

  // Initial location + reverse geocode + watcher
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
        const lat = current.coords.latitude;
        const lon = current.coords.longitude;
  const first = { latitude: lat, longitude: lon };
  setCoords(first);
  setInitialCoords(first);

        // Reverse geocode for banner
        try {
          const results = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lon });
          if (results && results.length > 0) {
            const a: any = results[0];
            const locality = a.city || a.district || a.subregion || a.name;
            const admin = a.region;
            const country = a.country;
            const label = [locality, admin].filter(Boolean).join(", ") || country || "Unknown location";
            setPlaceLabel(label);
          }
        } catch {}

        // start watcher
        try {
          watchSub.current = await Location.watchPositionAsync(
            { accuracy: Location.Accuracy.Balanced, timeInterval: 2000, distanceInterval: 5 },
            (update) => {
              const clat = update.coords.latitude;
              const clon = update.coords.longitude;
              setCoords({ latitude: clat, longitude: clon });
              // move marker
              mapRef.current?.setCurrentLocation(clat, clon);
              // arrival check
              if (destCoords && graceDistance > 0) {
                const d = distanceMeters(clat, clon, destCoords.latitude, destCoords.longitude);
                if (d <= graceDistance && !alarmedRef.current) {
                  alarmedRef.current = true;
                  triggerAlarm();
                }
              }
            }
          );
        } catch {}
      } catch (e: any) {
        setLocationError(e?.message ?? "Failed to get location");
      } finally {
        setLoading(false);
      }
    })();

    return () => {
      if (watchSub.current) {
        watchSub.current.remove();
        watchSub.current = null;
      }
      if (soundRef.current) {
        soundRef.current.unloadAsync();
        soundRef.current = null;
      }
    };
  }, []);

  // Suggestions debounce
  useEffect(() => {
    if (!drawerOpen) {
      setSuggestions([]);
      return;
    }
    if (suggestTimer.current) {
      clearTimeout(suggestTimer.current);
      suggestTimer.current = null;
    }
    const text = destInput.trim();
    if (text.length < 2) {
      setSuggestions([]);
      return;
    }
    suggestTimer.current = setTimeout(async () => {
      setSuggestLoading(true);
      try {
        const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(text)}&lang=en`;
        const resp = await fetch(url);
        const data = await resp.json();
        const list: Suggestion[] = Array.isArray(data?.features)
          ? data.features
              .slice(0, 10)
              .map((f: any) => {
                const name = f?.properties?.name;
                const city = f?.properties?.city || f?.properties?.town || f?.properties?.village || f?.properties?.state;
                const country = f?.properties?.country;
                const label = [name, city, country].filter(Boolean).join(", ");
                const lon = f?.geometry?.coordinates?.[0];
                const lat = f?.geometry?.coordinates?.[1];
                return {
                  label: label || name || "Unknown",
                  latitude: typeof lat === "number" ? lat : parseFloat(lat),
                  longitude: typeof lon === "number" ? lon : parseFloat(lon),
                };
              })
              .filter((x: any) => isFinite(x.latitude) && isFinite(x.longitude))
          : [];
        setSuggestions(list);
      } catch (e) {
        setSuggestions([]);
      } finally {
        setSuggestLoading(false);
      }
    }, 300);

    return () => {
      if (suggestTimer.current) {
        clearTimeout(suggestTimer.current);
        suggestTimer.current = null;
      }
    };
  }, [destInput, drawerOpen]);

  const triggerAlarm = async () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    try {
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true, staysActiveInBackground: false });
      if (!soundRef.current) {
        const { sound } = await Audio.Sound.createAsync(
          { uri: "https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg" },
          { shouldPlay: true, isLooping: true, volume: 1.0 }
        );
        soundRef.current = sound;
        setTimeout(async () => {
          try {
            await sound.stopAsync();
            await sound.unloadAsync();
          } catch {}
          if (soundRef.current === sound) soundRef.current = null;
        }, 8000);
      }
    } catch {}
  };

  return (
    <View style={styles.container}>
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" />
          <Text style={styles.loadingText}>Fetching your location…</Text>
        </View>
      )}

      {!loading && initialCoords && (
        <MapScreen
          ref={mapRef}
          initialLat={initialCoords.latitude}
          initialLon={initialCoords.longitude}
          onMapClick={(lat, lon) => {
            setDestCoords({ latitude: lat, longitude: lon });
            setDestInput(`${lat.toFixed(5)}, ${lon.toFixed(5)}`);
            setPickMode(false);
            setRouteError(null);
            if (coords) {
              mapRef.current?.drawRoute(
                coords.latitude,
                coords.longitude,
                lat,
                lon
              );
            }
            if (graceDistance > 0) {
              mapRef.current?.setGrace(lat, lon, graceDistance);
            }
            alarmedRef.current = false;
          }}
          onRouteError={(msg) => setRouteError(msg || "Failed to draw route")}
          onMapReady={() => {
            // Re-apply current state if WebView ever reloads
            if (destCoords) {
              mapRef.current?.setDestination(
                destCoords.latitude,
                destCoords.longitude
              );
              if (coords) {
                mapRef.current?.drawRoute(
                  coords.latitude,
                  coords.longitude,
                  destCoords.latitude,
                  destCoords.longitude
                );
              }
              if (graceDistance > 0) {
                mapRef.current?.setGrace(
                  destCoords.latitude,
                  destCoords.longitude,
                  graceDistance
                );
              }
            }
          }}
        />
      )}

      {/* OSM attribution (required) */}
      {!loading && coords && (
        <View style={styles.attributionWrapper} pointerEvents="none">
          <Text style={styles.attributionText}>
            © OpenStreetMap contributors
          </Text>
        </View>
      )}

      {locationError && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{locationError}</Text>
        </View>
      )}

      {!loading && !locationError && placeLabel && (
        <View style={styles.locationBanner} pointerEvents="none">
          <Text style={styles.locationBannerText} numberOfLines={1}>
            {placeLabel}
          </Text>
        </View>
      )}

      {!loading && !locationError && (
        <>
          <TouchableOpacity
            style={styles.fab}
            onPress={() => triggerAlarm()}
            activeOpacity={0.85}
          >
            <Text style={styles.fabText}>Start Trip</Text>
          </TouchableOpacity>
          <TouchableOpacity
            
            onPress={() => triggerAlarm()}
            activeOpacity={0.85}
          >
            <Text style={styles.fabText}>Start Trip</Text>
          </TouchableOpacity>
        </>
      )}

      {pickMode && (
        <View style={styles.pickOverlay} pointerEvents="none">
          <Text style={styles.pickOverlayText}>
            Tap on the map to choose destination
          </Text>
        </View>
      )}

      {drawerOpen && (
        <DestinationDrawer
          onClose={() => setDrawerOpen(false)}
          destInput={destInput}
          onChangeDestInput={setDestInput}
          suggestions={destInput.trim().length >= 2 ? suggestions : []}
          suggestLoading={suggestLoading}
          routeError={routeError}
          graceDistance={graceDistance}
          onChangeGraceDistance={(m) => {
            setGraceDistance(m);
            if (destCoords && m > 0) {
              mapRef.current?.setGrace(
                destCoords.latitude,
                destCoords.longitude,
                m
              );
            } else {
              mapRef.current?.clearGrace();
            }
          }}
          onPickOnMap={() => {
            setPickMode(true);
            setRouteError(null);
            mapRef.current?.enablePickMode(true);
          }}
          onSelectSuggestion={(item: Suggestion) => {
            setDestInput(item.label);
            const dc = { latitude: item.latitude, longitude: item.longitude };
            setDestCoords(dc);
            setSuggestions([]);
            mapRef.current?.setDestination(dc.latitude, dc.longitude);
            if (coords) {
              mapRef.current?.drawRoute(
                coords.latitude,
                coords.longitude,
                dc.latitude,
                dc.longitude
              );
            }
            if (graceDistance > 0) {
              mapRef.current?.setGrace(
                dc.latitude,
                dc.longitude,
                graceDistance
              );
            }
            alarmedRef.current = false;
          }}
        />
      )}
    </View>
  );
};

export default TripContainer;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  attributionWrapper: {
    position: "absolute",
    bottom: 6,
    right: 8,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  attributionText: { fontSize: 11, color: "#333" },
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
  loadingText: { marginTop: 8 },
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
  errorText: { color: "#b91c1c", textAlign: "center" },
  locationBanner: {
    position: "absolute",
    top: 40,
    left: 16,
    right: 16,
    backgroundColor: "rgba(34, 112, 82, 0.7)",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  locationBannerText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  fab: {
    position: "absolute",
    bottom: 24,
    left: 0,
    right: 0,
    marginHorizontal: 16,
    alignSelf: "center",
    backgroundColor: "#226f52",
    paddingVertical: 14,
    borderRadius: 28,
    alignItems: "center",
    elevation: 3,
  },
  fabText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  pickOverlay: {
    position: "absolute",
    top: 80,
    left: 16,
    right: 16,
    backgroundColor: "rgba(0,0,0,0.6)",
    padding: 10,
    borderRadius: 8,
  },
  pickOverlayText: { color: "#fff", textAlign: "center" },
});

// Utility: Haversine distance in meters
function distanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // meters
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
