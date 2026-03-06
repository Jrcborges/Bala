import { supabase } from "@/lib/supabase"
import { useAuth } from "@/providers/AuthProviders"
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet"
import MapLibreGL from "@maplibre/maplibre-react-native"
import * as Location from "expo-location"
import React, { useEffect, useMemo, useRef, useState } from "react"
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native"

/* ================= UTILS ================= */

const toRad = (v: number) => (v * Math.PI) / 180

const getDistanceKm = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) => {
  const R = 6371
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) ** 2

  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)))
}

type Vehicle = "motor" | "carro" | "triciclo"

/* ================= MAIN ================= */

export default function Index() {
  const { session } = useAuth()

  const [user, setUser] = useState<any>(null)

  const [pickup, setPickup] = useState<any>(null)
  const [destination, setDestination] = useState<any>(null)
  const [tempLocation, setTempLocation] = useState<any>(null)

  const [route, setRoute] = useState<any>(null)

  const [vehicle, setVehicle] = useState<Vehicle | null>(null)

  const [selecting, setSelecting] = useState<"pickup" | "destination">("pickup")

  const [loading, setLoading] = useState(false)
  const [ride, setRide] = useState<any>(null)

  const mapRef = useRef<any>(null)

  const snapPoints = useMemo(() => ["20%", "50%"], [])

  /* ================= AUTH ================= */

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUser(data.user)
    })
  }, [])

  /* ================= LOCATION ================= */

  useEffect(() => {
    ;(async () => {
      const { status } = await Location.requestForegroundPermissionsAsync()

      if (status !== "granted") return

      const loc = await Location.getCurrentPositionAsync({})

      const coords = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      }

      setTempLocation(coords)
    })()
  }, [])

  /* ================= PRICE ================= */

  const calculatePrice = () => {
    if (!pickup || !destination || !vehicle) return 0

    const km = getDistanceKm(
      pickup.latitude,
      pickup.longitude,
      destination.latitude,
      destination.longitude
    )

    const pricing = {
      motor: { base: 100, perKm: 35, min: 150 },
      carro: { base: 150, perKm: 60, min: 300 },
      triciclo: { base: 120, perKm: 45, min: 200 },
    }

    const { base, perKm, min } = pricing[vehicle]

    const price = Math.round(base + km * perKm)

    return price < min ? min : price
  }

  /* ================= ROUTE ================= */

  const drawRoute = async (dest: any) => {
    if (!pickup) return

    const url =
      `https://router.project-osrm.org/route/v1/driving/` +
      `${pickup.longitude},${pickup.latitude};${dest.longitude},${dest.latitude}` +
      `?overview=full&geometries=geojson`

    const res = await fetch(url)
    const data = await res.json()

    if (!data.routes?.length) return

    const routeGeoJSON = {
      type: "Feature",
      geometry: data.routes[0].geometry,
    }

    setRoute(routeGeoJSON)
  }

  /* ================= CREATE RIDE ================= */

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
      price: calculatePrice(),
      status: "pending",
    })

    setRide({ status: "pending" })
    setLoading(false)
  }

  /* ================= CONFIRM ================= */

  const confirmLocation = async () => {
    if (!tempLocation) return

    if (selecting === "pickup") {
      setPickup(tempLocation)
      setSelecting("destination")
    } else if (!destination) {
      setDestination(tempLocation)
      await drawRoute(tempLocation)
    } else {
      await createRide()
    }
  }

  return (
    <View style={{ flex: 1 }}>
      {/* ================= MAP ================= */}

      <MapLibreGL.MapView
        ref={mapRef}
        style={{ flex: 1 }}
        mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
        logoEnabled={false}
        attributionEnabled={false}
        onRegionDidChange={async () => {
          const center = await mapRef.current.getCenter()

          setTempLocation({
            latitude: center[1],
            longitude: center[0],
          })
        }}
      >
        <MapLibreGL.Camera
          zoomLevel={13}
          centerCoordinate={
            tempLocation
              ? [tempLocation.longitude, tempLocation.latitude]
              : [-75.8267, 20.0208]
          }
        />

        {/* PICKUP MARKER */}

        {pickup && (
          <MapLibreGL.PointAnnotation
            id="pickup"
            coordinate={[pickup.longitude, pickup.latitude]}
          >
            <View style={styles.pickupMarker} />
          </MapLibreGL.PointAnnotation>
        )}

        {/* DESTINATION MARKER */}

        {destination && (
          <MapLibreGL.PointAnnotation
            id="dest"
            coordinate={[destination.longitude, destination.latitude]}
          >
            <View style={styles.destMarker} />
          </MapLibreGL.PointAnnotation>
        )}

        {/* ROUTE */}

        {route && (
          <MapLibreGL.ShapeSource id="routeSource" shape={route}>
            <MapLibreGL.LineLayer
              id="routeLine"
              style={{
                lineColor: "#FF6A00",
                lineWidth: 6,
                lineCap: "round",
                lineJoin: "round",
              }}
            />
          </MapLibreGL.ShapeSource>
        )}
      </MapLibreGL.MapView>

      {/* PIN CENTRAL */}

      {!pickup || !destination ? (
        <View style={styles.centerMarkerContainer}>
          <Image
            source={require("../assets/images/pin.png")}
            style={styles.centerMarker}
          />
        </View>
      ) : null}

      {/* ================= BOTTOM SHEET ================= */}

      <BottomSheet index={0} snapPoints={snapPoints}>
        <BottomSheetView style={styles.sheet}>
          {ride ? (
            <Text style={styles.statusText}>
              🔍 Buscando transporte...
            </Text>
          ) : (
            <>
              {/* VEHICLES */}

              <View style={styles.vehicleRow}>
                {["motor", "carro", "triciclo"].map((v) => (
                  <TouchableOpacity
                    key={v}
                    style={[
                      styles.vehicleButton,
                      vehicle === v && styles.vehicleActive,
                    ]}
                    onPress={() => setVehicle(v as Vehicle)}
                  >
                    <Text style={{ color: "#fff" }}>
                      {v.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* CONFIRM BUTTON */}

              <TouchableOpacity
                style={styles.confirmBtn}
                onPress={confirmLocation}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.confirmText}>
                    {selecting === "pickup"
                      ? "Confirmar punto de recogida"
                      : !destination
                      ? "Confirmar destino"
                      : `Confirmar $${calculatePrice()}`}
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

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  sheet: {
    padding: 20,
    backgroundColor: "#1C1C1E",
  },

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

  vehicleActive: {
    backgroundColor: "#FF6A00",
  },

  confirmBtn: {
    backgroundColor: "#FF6A00",
    padding: 18,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 10,
  },

  confirmText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },

  statusText: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "600",
  },

  centerMarkerContainer: {
    position: "absolute",
    top: "50%",
    left: "50%",
    marginLeft: -20,
    marginTop: -40,
  },

  centerMarker: {
    width: 40,
    height: 40,
  },

  pickupMarker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#2ECC71",
    borderWidth: 3,
    borderColor: "#fff",
  },

  destMarker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#FF3B30",
    borderWidth: 3,
    borderColor: "#fff",
  },
})