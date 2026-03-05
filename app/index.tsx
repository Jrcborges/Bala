import { supabase } from "@/lib/supabase"
import { useAuth } from "@/providers/AuthProviders"
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet"
import MapLibreGL from "@maplibre/maplibre-react-native"
import * as Location from "expo-location"
import * as Notifications from "expo-notifications"
import React, { useEffect, useMemo, useRef, useState } from "react"
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native"

/* ===== TYPES ===== */
type Vehicle = "motor" | "carro" | "triciclo"

type Coords = {
  latitude: number
  longitude: number
}

/* ===== UTILS ===== */
const toRad = (v: number) => (v * Math.PI) / 180

const getDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)))
}

const estimateTimeMinutes = (distanceKm: number, vehicle: Vehicle) => {
  const speeds = { motor: 22, carro: 18, triciclo: 15 }
  return Math.round(((distanceKm / speeds[vehicle]) * 60) * 1.2)
}

const estimateDriverEta = (vehicle: Vehicle) => {
  const avgKm = { motor: 1.2, carro: 1.8, triciclo: 1.5 }
  return estimateTimeMinutes(avgKm[vehicle], vehicle)
}

MapLibreGL.setAccessToken(null)

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
})

export default function Index() {
  const { session } = useAuth()

  const [user, setUser] = useState<any>(null)
  const [pickup, setPickup] = useState<Coords | null>(null)
  const [destination, setDestination] = useState<Coords | null>(null)
  const [userLocation, setUserLocation] = useState<Coords | null>(null)
  const [vehicle, setVehicle] = useState<Vehicle | null>(null)
  const [addressText, setAddressText] = useState("")
  const [ride, setRide] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const sheetRef = useRef<BottomSheet>(null)
  const snapPoints = useMemo(() => ["20%", "55%"], [])

  /* ===== AUTH ===== */
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUser(data.user)
    })
  }, [])

  /* ===== LOCATION ===== */
  useEffect(() => {
    ;(async () => {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== "granted") return

      const loc = await Location.getCurrentPositionAsync({})
      const coords = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      }

      setPickup(coords)
      setUserLocation(coords)
    })()
  }, [])

  /* ===== PRICE ===== */
  const calculatePrice = () => {
    if (!pickup || !destination || vehicle === null) return 0

    const km = getDistanceKm(
      pickup.latitude,
      pickup.longitude,
      destination.latitude,
      destination.longitude
    )

    const pricing: Record<Vehicle, { base: number; perKm: number; min: number }> = {
      motor: { base: 100, perKm: 35, min: 150 },
      carro: { base: 150, perKm: 60, min: 300 },
      triciclo: { base: 120, perKm: 45, min: 200 },
    }

    const { base, perKm, min } = pricing[vehicle]
    const price = Math.round(base + km * perKm)
    return price < min ? min : price
  }

  /* ===== CREATE RIDE ===== */
  const createRide = async () => {
    if (!user || !pickup || !destination || !vehicle) return

    setLoading(true)

    const distanceKm = getDistanceKm(
      pickup.latitude,
      pickup.longitude,
      destination.latitude,
      destination.longitude
    )

    await supabase.from("rides").insert({
      client_id: user.id,
      origin_lat: pickup.latitude,
      origin_lng: pickup.longitude,
      dest_lat: destination.latitude,
      dest_lng: destination.longitude,
      vehicle_type: vehicle,
      distance_km: distanceKm,
      estimated_time_min: estimateTimeMinutes(distanceKm, vehicle),
      driver_eta_min: estimateDriverEta(vehicle),
      price: calculatePrice(),
      payment_method: "cash",
      status: "pending",
    })

    setLoading(false)
    setRide({ status: "pending" })
    setVehicle(null)
  }

  /* ===== MAP PRESS ===== */
  const onMapPress = (e: any) => {
    if (e.geometry?.type === "Point") {
      const coords = e.geometry.coordinates
      const selected = { latitude: coords[1], longitude: coords[0] }

      if (!pickup) setPickup(selected)
      else setDestination(selected)
    }
  }

  return (
    <View style={{ flex: 1 }}>
      <MapLibreGL.MapView
        style={StyleSheet.absoluteFillObject}
        logoEnabled={false}
        attributionEnabled={false}
        onPress={onMapPress}
      >
        {/* CAMERA */}
        <MapLibreGL.Camera
          zoomLevel={14}
          centerCoordinate={
            userLocation
              ? [userLocation.longitude, userLocation.latitude]
              : [-75.8267, 20.0247] // Santiago fallback
          }
        />

        {/* OPENSTREETMAP */}
        <MapLibreGL.RasterSource
          id="osm"
          tileUrlTemplates={["https://tile.openstreetmap.org/{z}/{x}/{y}.png"]}
          tileSize={256}
        >
          <MapLibreGL.RasterLayer id="osmLayer" sourceID="osm" />
        </MapLibreGL.RasterSource>

        {pickup && (
          <MapLibreGL.PointAnnotation
            id="pickup"
            coordinate={[pickup.longitude, pickup.latitude]}
          >
            <View style={styles.markerPickup} />
          </MapLibreGL.PointAnnotation>
        )}

        {destination && (
          <MapLibreGL.PointAnnotation
            id="destination"
            coordinate={[destination.longitude, destination.latitude]}
          >
            <View style={styles.markerDestination} />
          </MapLibreGL.PointAnnotation>
        )}
      </MapLibreGL.MapView>

      {/* SEARCH */}
      <View style={styles.searchBar}>
        <TextInput
          placeholder="¿A dónde vamos?"
          placeholderTextColor="#888"
          style={styles.searchInput}
          value={addressText}
          onChangeText={setAddressText}
        />
      </View>

      {/* BOTTOM SHEET */}
      <BottomSheet ref={sheetRef} index={0} snapPoints={snapPoints}>
        <BottomSheetView style={styles.sheet}>
          {ride ? (
            <Text style={styles.statusText}>🔍 Buscando transporte...</Text>
          ) : (
            <>
              <View style={styles.vehicleRow}>
                {(["motor", "carro", "triciclo"] as Vehicle[]).map((v) => (
                  <TouchableOpacity
                    key={v}
                    style={[
                      styles.vehicleButton,
                      vehicle === v && styles.vehicleActive,
                    ]}
                    onPress={() => setVehicle(v)}
                  >
                    <Text style={{ color: "#fff" }}>{v.toUpperCase()}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={[
                  styles.confirmBtn,
                  (!destination || !vehicle) && { opacity: 0.4 },
                ]}
                onPress={createRide}
                disabled={!destination || !vehicle}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.confirmText}>
                    {destination
                      ? `Confirmar $${calculatePrice()}`
                      : "Selecciona destino"}
                  </Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </BottomSheetView>
      </BottomSheet>
    </View>
  )
}

const styles = StyleSheet.create({
  searchBar: {
    position: "absolute",
    top: 110,
    alignSelf: "center",
    backgroundColor: "#1C1C1E",
    borderRadius: 15,
    width: "90%",
    paddingHorizontal: 15,
    paddingVertical: 10,
    zIndex: 10,
  },
  searchInput: { color: "#fff", fontSize: 16 },
  sheet: { padding: 20, backgroundColor: "#1C1C1E" },
  vehicleRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginVertical: 10,
  },
  vehicleButton: {
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#2C2C2E",
    flex: 1,
    marginHorizontal: 4,
    alignItems: "center",
  },
  vehicleActive: { backgroundColor: "#FF6A00" },
  confirmBtn: {
    backgroundColor: "#FF6A00",
    padding: 18,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 10,
  },
  confirmText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  statusText: { color: "#fff", textAlign: "center", fontWeight: "600" },
  markerPickup: {
    width: 20,
    height: 20,
    backgroundColor: "#FF6A00",
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#fff",
  },
  markerDestination: {
    width: 20,
    height: 20,
    backgroundColor: "#000",
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#fff",
  },
})