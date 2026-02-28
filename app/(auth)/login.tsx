import { supabase } from "@/lib/supabase"
import { Ionicons } from "@expo/vector-icons"
import BottomSheet from "@gorhom/bottom-sheet"
import MapLibreGL from "@maplibre/maplibre-react-native"
import * as Location from "expo-location"
import { useEffect, useMemo, useRef, useState } from "react"
import {
    Dimensions,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native"

MapLibreGL.setAccessToken(null)

const { width, height } = Dimensions.get("window")

export default function Index() {
  const sheetRef = useRef<BottomSheet>(null)
  const snapPoints = useMemo(() => ["20%", "45%"], [])

  const [userLocation, setUserLocation] = useState<any>(null)
  const [cameraCenter, setCameraCenter] = useState<any>(null)
  const [mode, setMode] = useState<"pickup" | "destination">("pickup")

  useEffect(() => {
    ;(async () => {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== "granted") return

      const location = await Location.getCurrentPositionAsync({})
      const coords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      }

      setUserLocation(coords)
      setCameraCenter(coords)
    })()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  if (!userLocation) return null

  return (
    <View style={{ flex: 1 }}>
      <MapLibreGL.MapView
        style={{ flex: 1 }}
        logoEnabled={false}
        attributionEnabled={false}
        onRegionDidChange={(e) => {
          const coords = e.geometry.coordinates
          if (coords) {
            setCameraCenter({
              latitude: coords[1],
              longitude: coords[0],
            })
          }
        }}
      >
        <MapLibreGL.Camera
          zoomLevel={15}
          centerCoordinate={[
            cameraCenter.longitude,
            cameraCenter.latitude,
          ]}
        />

        <MapLibreGL.RasterSource
          id="osm"
          tileUrlTemplates={[
            "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
          ]}
          tileSize={256}
        >
          <MapLibreGL.RasterLayer id="osmLayer" sourceID="osm" />
        </MapLibreGL.RasterSource>
      </MapLibreGL.MapView>

      {/* Pin centrado estilo Uber */}
      <View pointerEvents="none" style={styles.centerMarker}>
        <Ionicons
          name="location-sharp"
          size={40}
          color={mode === "pickup" ? "green" : "#FF6A00"}
        />
      </View>

      {/* Botón centrar ubicación */}
      <TouchableOpacity
        style={styles.locateButton}
        onPress={() => setCameraCenter(userLocation)}
      >
        <Ionicons name="locate" size={22} color="#000" />
      </TouchableOpacity>

      {/* Bottom Sheet */}
      <BottomSheet ref={sheetRef} snapPoints={snapPoints} index={0}>
        <View style={styles.sheetContent}>
          <Text style={styles.title}>
            {mode === "pickup"
              ? "Selecciona punto de recogida"
              : "Selecciona destino"}
          </Text>

          <TouchableOpacity
            style={[
              styles.modeButton,
              mode === "pickup" && styles.activeButton,
            ]}
            onPress={() => setMode("pickup")}
          >
            <Text style={styles.buttonText}>Pickup</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.modeButton,
              mode === "destination" && styles.activeButton,
            ]}
            onPress={() => setMode("destination")}
          >
            <Text style={styles.buttonText}>Destination</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.logout} onPress={handleLogout}>
            <Text style={{ color: "red" }}>Cerrar sesión</Text>
          </TouchableOpacity>
        </View>
      </BottomSheet>
    </View>
  )
}

const styles = StyleSheet.create({
  centerMarker: {
    position: "absolute",
    top: height / 2 - 20,
    left: width / 2 - 20,
  },
  locateButton: {
    position: "absolute",
    right: 20,
    bottom: 180,
    backgroundColor: "white",
    padding: 12,
    borderRadius: 30,
    elevation: 5,
  },
  sheetContent: {
    padding: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
  },
  modeButton: {
    padding: 14,
    borderRadius: 10,
    backgroundColor: "#eee",
    marginBottom: 10,
  },
  activeButton: {
    backgroundColor: "#000",
  },
  buttonText: {
    textAlign: "center",
    color: "#000",
    fontWeight: "bold",
  },
  logout: {
    marginTop: 20,
    alignItems: "center",
  },
})