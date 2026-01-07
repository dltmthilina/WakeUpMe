import React, { forwardRef, useImperativeHandle, useRef } from "react";
import { StyleSheet, View } from "react-native";
import { WebView } from "react-native-webview";
export type MapScreenHandle = {
  enablePickMode: (enable: boolean) => void;
  setDestination: (lat: number, lon: number) => void;
  drawRoute: (
    fromLat: number,
    fromLon: number,
    toLat: number,
    toLon: number
  ) => void;
  setGrace: (lat: number, lon: number, radiusMeters: number) => void;
  clearGrace: () => void;
  setCurrentLocation: (lat: number, lon: number) => void;
  clearTrip: () => void;
};

type Props = {
  initialLat: number;
  initialLon: number;
  onMapClick: (lat: number, lon: number) => void;
  onRouteError?: (message?: string) => void;
  onMapReady?: () => void;
};

const MapScreen = forwardRef<MapScreenHandle, Props>(
  ({ initialLat, initialLon, onMapClick, onRouteError, onMapReady }, ref) => {
    const webViewRef = useRef<WebView | null>(null);

    useImperativeHandle(ref, () => ({
      enablePickMode: (enable: boolean) => {
        webViewRef.current?.injectJavaScript(
          `window.enablePickMode && window.enablePickMode(${
            enable ? "true" : "false"
          }); true;`
        );
      },
      setDestination: (lat: number, lon: number) => {
        webViewRef.current?.injectJavaScript(
          `window.setDestination && window.setDestination(${lat}, ${lon}); true;`
        );
      },
      drawRoute: (fromLat, fromLon, toLat, toLon) => {
        webViewRef.current?.injectJavaScript(
          `window.drawRoute && window.drawRoute(${fromLat}, ${fromLon}, ${toLat}, ${toLon}); true;`
        );
      },
      setGrace: (lat, lon, r) => {
        webViewRef.current?.injectJavaScript(
          `window.setGrace && window.setGrace(${lat}, ${lon}, ${r}); true;`
        );
      },
      clearGrace: () => {
        webViewRef.current?.injectJavaScript(
          `window.clearGrace && window.clearGrace(); true;`
        );
      },
      setCurrentLocation: (lat, lon) => {
        webViewRef.current?.injectJavaScript(
          `window.setCurrentLocation && window.setCurrentLocation(${lat}, ${lon}); true;`
        );
      },
      clearTrip: () => {
        webViewRef.current?.injectJavaScript(
          `window.clearTrip && window.clearTrip(); true;`
        );
      },
    }));

    return (
      <View style={styles.container}>
        <WebView
          ref={webViewRef}
          style={styles.map}
          originWhitelist={["*"]}
          javaScriptEnabled
          domStorageEnabled
          setSupportMultipleWindows={false}
          onMessage={(e) => {
            try {
              const data = JSON.parse(e.nativeEvent.data);
              if (data?.type === "mapClick") {
                onMapClick(data.lat, data.lon);
              } else if (data?.type === "routeError") {
                onRouteError?.(data.message || "Failed to draw route");
              } else if (data?.type === "ready") {
                onMapReady?.();
              }
            } catch {}
          }}
          source={{ html: buildLeafletHtml(initialLat, initialLon) }}
        />
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  map: { flex: 1 },
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
        const current = { lat: ${lat}, lon: ${lon} };
        const map = L.map('map', { zoomControl: true }).setView([current.lat, current.lon], 15);
        const base = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 19,
        }).addTo(map);
  let you = L.marker([current.lat, current.lon]).addTo(map).bindPopup('You are here');

        let pickMode = false;
        let destMarker = null;
  let routeLayer = L.layerGroup().addTo(map);
  let graceCircle = null;

        function sendMessage(obj) {
          try {
            if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
              window.ReactNativeWebView.postMessage(JSON.stringify(obj));
            }
          } catch (e) {}
        }

        // Enable/disable pick mode from RN
        window.enablePickMode = function (enable) {
          pickMode = !!enable;
        };

        // Allow RN to set destination marker explicitly (e.g., after text geocoding)
        window.setDestination = function(lat, lon) {
          if (!destMarker) {
            destMarker = L.marker([lat, lon]).addTo(map).bindPopup('Destination');
          } else {
            destMarker.setLatLng([lat, lon]);
          }
          map.panTo([lat, lon]);
        };

        // Update current location marker
        window.setCurrentLocation = function(lat, lon) {
          if (!you) {
            you = L.marker([lat, lon]).addTo(map).bindPopup('You are here');
          } else {
            you.setLatLng([lat, lon]);
          }
        };

        // Draw route using OSRM demo server (for development only)
        window.drawRoute = async function(fromLat, fromLon, toLat, toLon) {
          try {
            routeLayer.clearLayers();
            var url = 'https://router.project-osrm.org/route/v1/driving/' + fromLon + ',' + fromLat + ';' + toLon + ',' + toLat + '?overview=full&geometries=geojson';
            var res = await fetch(url);
            var json = await res.json();
            if (!json || json.code !== 'Ok' || !json.routes || !json.routes[0]) {
              sendMessage({ type: 'routeError', message: 'No route found' });
              return;
            }
            var coords = json.routes[0].geometry.coordinates.map(function(p) { return [p[1], p[0]]; });
            var poly = L.polyline(coords, { color: '#1e90ff', weight: 4 });
            routeLayer.addLayer(poly);
            map.fitBounds(poly.getBounds(), { padding: [30, 30] });
          } catch (e) {
            sendMessage({ type: 'routeError', message: String(e) });
          }
        };

        // Grace circle controls
        window.setGrace = function(lat, lon, radiusMeters) {
          if (graceCircle) {
            graceCircle.setLatLng([lat, lon]);
            graceCircle.setRadius(radiusMeters);
          } else {
            graceCircle = L.circle([lat, lon], { radius: radiusMeters, color: '#f59e0b', fillColor: '#fbbf24', fillOpacity: 0.2 });
            graceCircle.addTo(map);
          }
        };
        window.clearGrace = function() {
          if (graceCircle) {
            map.removeLayer(graceCircle);
            graceCircle = null;
          }
        };

        // Clear destination, route and grace circle
        window.clearTrip = function() {
          if (destMarker) {
            map.removeLayer(destMarker);
            destMarker = null;
          }
          if (routeLayer) {
            routeLayer.clearLayers();
          }
          if (graceCircle) {
            map.removeLayer(graceCircle);
            graceCircle = null;
          }
        };

        map.on('click', function(e) {
          if (!pickMode) return;
          var lat = e.latlng.lat;
          var lng = e.latlng.lng;
          if (!destMarker) {
            destMarker = L.marker([lat, lng]).addTo(map).bindPopup('Destination');
          } else {
            destMarker.setLatLng([lat, lng]);
          }
          pickMode = false; // auto-exit pick mode after selection
          sendMessage({ type: 'mapClick', lat: lat, lon: lng });
        });

        // Notify RN the map is ready
        setTimeout(function(){ sendMessage({ type: 'ready' }); }, 0);
      </script>
    </body>
  </html>`;
}
