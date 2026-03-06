import { supabase } from "@/lib/supabase"
import { useAuth } from "@/providers/AuthProviders"
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet"
import MapLibreGL from "@maplibre/maplibre-react-native"
import * as Location from "expo-location"
import React, { useEffect, useMemo, useRef, useState } from "react"
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
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

export default function Index() {
  const { session } = useAuth()

  const [user, setUser] = useState<any>(null)

  const [pickup, setPickup] = useState<any>(null)
  const [destination, setDestination] = useState<any>(null)
  const [tempLocation, setTempLocation] = useState<any>(null)

  const [route, setRoute] = useState<any>(null)

  const [vehicle, setVehicle] = useState<Vehicle | null>(null)

  const [selecting, setSelecting] = useState<"pickup" | "destination">(
    "pickup"
  )

  const [loading, setLoading] = useState(false)
  const [ride, setRide] = useState<any>(null)

  const [searchText, setSearchText] = useState("")
  const [results, setResults] = useState<any[]>([])

  const mapRef = useRef<any>(null)
  const cameraRef = useRef<any>(null)

  const snapPoints = useMemo(() => ["20%", "55%"], [])

  /* ================= AUTH ================= */

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUser(data.user)
    })
  }, [])

  /* ================= LOCATION ================= */

  const [userLocation, setUserLocation] = useState<any>(null)

  useEffect(() => {
    ;(async () => {
      const { status } = await Location.requestForegroundPermissionsAsync()

      if (status !== "granted") return

      const loc = await Location.getCurrentPositionAsync({})

      const coords = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      }

      setUserLocation(coords)
      setTempLocation(coords)

      setTimeout(() => {
        cameraRef.current?.setCamera({
          centerCoordinate: [coords.longitude, coords.latitude],
          zoomLevel: 15,
          animationDuration: 1000,
        })
      }, 500)
    })()
  }, [])

  /* ================= SEARCH ================= */

  const searchAddress = async (text: string) => {
    setSearchText(text)

    if (text.length < 3) {
      setResults([])
      return
    }

    const url =
      `https://nominatim.openstreetmap.org/search?q=${text}+santiago+de+cuba&format=json&limit=5`

    const res = await fetch(url)

    const data = await res.json()

    setResults(data)
  }

  const selectPlace = (place: any) => {
    const loc = {
      latitude: parseFloat(place.lat),
      longitude: parseFloat(place.lon),
    }

    setTempLocation(loc)
    setResults([])
    setSearchText(place.display_name)

    cameraRef.current?.setCamera({
      centerCoordinate: [loc.longitude, loc.latitude],
      zoomLevel: 16,
      animationDuration: 800,
    })
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

  /* ================= CREATE RIDE ================= */

  const createRide = async () => {
    if (!user || !pickup || !destination || !vehicle) return

    setLoading(true)

    await supabase.from("rides").insert({
      client_id: user.id,
      origin_lat: pickup.latitude,
      origin_lng: pickup.longitude,
      dest_lat: destination.latitude,
      dest_lng: destination.longitude,
      vehicle_type: vehicle,
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
        logoEnabled={false}
        attributionEnabled={false}
        mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
      >
        <MapLibreGL.Camera ref={cameraRef} zoomLevel={14} />

        {pickup && (
          <MapLibreGL.PointAnnotation
            id="pickup"
            coordinate={[pickup.longitude, pickup.latitude]}
          >
            <View style={styles.pickupMarker} />
          </MapLibreGL.PointAnnotation>
        )}

        {destination && (
          <MapLibreGL.PointAnnotation
            id="dest"
            coordinate={[destination.longitude, destination.latitude]}
          >
            <View style={styles.destMarker} />
          </MapLibreGL.PointAnnotation>
        )}

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
        <View style={styles.centerMarker}>
          <Text style={{ fontSize: 35 }}>📍</Text>
        </View>
      ) : null}

      {/* BOTON MI UBICACION */}

      <TouchableOpacity
        style={styles.locateBtn}
        onPress={() => {
          if (!userLocation) return

          cameraRef.current?.setCamera({
            centerCoordinate: [
              userLocation.longitude,
              userLocation.latitude,
            ],
            zoomLevel: 15,
            animationDuration: 800,
          })
        }}
      >
        <Text style={{ fontSize: 20 }}>📍</Text>
      </TouchableOpacity>

      {/* SEARCH */}

      <View style={styles.searchBox}>
        <TextInput
          placeholder="Buscar dirección"
          value={searchText}
          onChangeText={searchAddress}
          style={{ color: "#fff" }}
        />

        {results.length > 0 && (
          <FlatList
            data={results}
            keyExtractor={(item) => item.place_id.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.resultItem}
                onPress={() => selectPlace(item)}
              >
                <Text style={{ color: "#fff" }}>
                  {item.display_name}
                </Text>
              </TouchableOpacity>
            )}
          />
        )}
      </View>

      {/* BOTTOM */}

      <BottomSheet index={0} snapPoints={snapPoints}>
        <BottomSheetView style={styles.sheet}>
          {ride ? (
            <Text>🔍 Buscando transporte...</Text>
          ) : (
            <>
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

              <TouchableOpacity
                style={styles.confirmBtn}
                onPress={confirmLocation}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.confirmText}>
                    {selecting === "pickup"
                      ? "Confirmar recogida"
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
  sheet: { padding: 20 },

  vehicleRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginVertical: 10,
  },

  vehicleButton: {
    backgroundColor: "#333",
    padding: 12,
    borderRadius: 10,
  },

  vehicleActive: {
    backgroundColor: "#FF6A00",
  },

  confirmBtn: {
    backgroundColor: "#FF6A00",
    padding: 18,
    borderRadius: 15,
    alignItems: "center",
  },

  confirmText: {
    color: "#fff",
    fontWeight: "bold",
  },

  centerMarker: {
    position: "absolute",
    top: "50%",
    left: "50%",
    marginLeft: -15,
    marginTop: -35,
  },

  locateBtn: {
    position: "absolute",
    bottom: 200,
    right: 20,
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 30,
  },

  searchBox: {
    position: "absolute",
    top: 60,
    width: "90%",
    alignSelf: "center",
    backgroundColor: "#1C1C1E",
    padding: 10,
    borderRadius: 12,
  },

  resultItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
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