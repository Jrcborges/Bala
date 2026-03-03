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
  View
} from "react-native"
import { GestureHandlerRootView } from "react-native-gesture-handler"

type Vehicle = "motor" | "carro" | "triciclo"
type Mode = "pickup" | "destination"

/* =========================
   NOTIFICATIONS CONFIG
========================= */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound:true,
    shouldSetBadge: false,
  }),
})

/* =========================
   DISTANCE + TIME
========================= */
const toRad = (v: number) => (v * Math.PI) / 180
const getDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
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
const estimateTimeMinutes = (distanceKm: number, vehicle: Vehicle) => {
  const speeds = { motor: 22, carro: 18, triciclo: 15 }
  return Math.round(((distanceKm / speeds[vehicle]) * 60) * 1.2)
}
const estimateDriverEta = (vehicle: Vehicle) => {
  const avgKm = { motor: 1.2, carro: 1.8, triciclo: 1.5 }
  return estimateTimeMinutes(avgKm[vehicle], vehicle)
}

MapLibreGL.setAccessToken(null)

export default function Index() {
  const {session}=useAuth()
  const [user, setUser] = useState<any>(null)
  const [pickup, setPickup] = useState<any>(null)
  const [destination, setDestination] = useState<any>(null)
  const [userLocation, setUserLocation] = useState<any>(null)
  const [mode, setMode] = useState<Mode>("destination")
  const [vehicle, setVehicle] = useState<Vehicle | null>(null)
  const [addressText, setAddressText] = useState("")
  const [ride, setRide] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const sheetRef = useRef<BottomSheet>(null)
  const snapPoints = useMemo(() => ["20%", "55%", "90%"], [])

  /* =========================
      AUTH + PUSH TOKEN
  ========================== */
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUser(data.user)
        registerForPush().then((token) => {
          if (token) {
            supabase
              .from("profiles")
              .update({ push_token: token })
              .eq("id", data.user.id)
          }
        })
      }
    })
  }, [])

  const registerForPush = async () => {
    const { status } = await Notifications.requestPermissionsAsync()
    if (status !== "granted") return null
    return (await Notifications.getExpoPushTokenAsync()).data
  }

  /* =========================
      USER LOCATION
  ========================== */
  useEffect(() => {
    let locationSubscription: Location.LocationSubscription
    ;(async () => {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== "granted") return

      const loc = await Location.getCurrentPositionAsync({})
      const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude }
      setPickup(coords)
      setUserLocation(coords)

      locationSubscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Highest, distanceInterval: 5 },
        (locUpdate) => {
          const newCoords = { latitude: locUpdate.coords.latitude, longitude: locUpdate.coords.longitude }
          setUserLocation(newCoords)
          if (mode === "pickup") setPickup(newCoords)
        }
      )
    })()

    return () => {
      if (locationSubscription) locationSubscription.remove()
    }
  }, [])

  /* =========================
      RIDE STATUS LISTENER
  ========================== */
  useEffect(() => {
    if (!ride) return
    const interval = setInterval(async () => {
      const { data } = await supabase
        .from("rides")
        .select("status, driver_eta_min")
        .eq("id", ride.id)
        .single()
      if (data && data.status !== ride.status) {
        setRide((prev: any) => ({ ...prev, ...data }))
      }
    }, 5000)
    return () => clearInterval(interval)
  }, [ride])

  /* =========================
      PRICE
  ========================== */
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

  /* =========================
      CREATE RIDE
  ========================== */
  const createRide = async () => {
    if (!user || !pickup || !destination || !vehicle) return
    setLoading(true)

    const distanceKm = getDistanceKm(
      pickup.latitude,
      pickup.longitude,
      destination.latitude,
      destination.longitude
    )

    const { data, error } = await supabase
      .from("rides")
      .insert({
        client_id: user.id,
        origin_lat: pickup.latitude,
        origin_lng: pickup.longitude,
        dest_lat: destination.latitude,
        dest_lng: destination.longitude,
        pickup_address: mode === "pickup" ? addressText : null,
        destination_address: mode === "destination" ? addressText : null,
        vehicle_type: vehicle,
        distance_km: distanceKm,
        estimated_time_min: estimateTimeMinutes(distanceKm, vehicle),
        driver_eta_min: estimateDriverEta(vehicle),
        price: calculatePrice(),
        payment_method: "cash",
        status: "pending",
      })
      .select()
      .single()

    setLoading(false)
    if (!error) setRide(data)
  }

  /* =========================
      MAP HANDLER
  ========================== */
  const onMapPress = (coords: { latitude: number; longitude: number }) => {
    mode === "pickup" ? setPickup(coords) : setDestination(coords)
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={{ flex: 1 }}>
        <MapLibreGL.MapView
          style={[StyleSheet.absoluteFillObject,{zIndex: 0}]} 
          logoEnabled={false}
          attributionEnabled={false}
          onPress={(e) => {
            if(e.geometry.type === "Point"){
              const coords = e.geometry.coordinates
              if (coords && coords.length >= 2) {
                onMapPress({ latitude: coords[1], longitude: coords[0] })
              }
          }}}
        >
          {userLocation && (
            <MapLibreGL.Camera
              centerCoordinate={[userLocation.longitude, userLocation.latitude]}
              zoomLevel={16}
              followUserLocation
            />
          )}

          {pickup && (
            <MapLibreGL.PointAnnotation
              id="pickup"
              coordinate={[pickup.longitude, pickup.latitude]}
            >
              <View
                style={{
                  width:20,
                  height:20,
                  backgroundColor:"#FF6A00",
                  borderRadius:10,
                  borderWidth:2,
                  borderColor:"#fff"
                }}
            /></MapLibreGL.PointAnnotation>
          )}
          {destination && (
            <MapLibreGL.PointAnnotation
              id="destination"
              coordinate={[destination.longitude, destination.latitude]}
            >
              <View
                style={{
                  width:20,
                  height:20,
                  backgroundColor:"#000",
                  borderRadius:10,
                  borderWidth:2,
                  borderColor:"#fff"
                }}
            />
            </MapLibreGL.PointAnnotation>
          )}

          <MapLibreGL.RasterSource
            id="osmTiles"
            tileUrlTemplates={["https://tile.openstreetmap.org/{z}/{x}/{y}.png"]}
            tileSize={256}
          >
            <MapLibreGL.RasterLayer id="osmLayer" sourceID="osmTiles" />
          </MapLibreGL.RasterSource>
        </MapLibreGL.MapView>

        <BottomSheet ref={sheetRef} index={0} snapPoints={snapPoints} style={{ zIndex: 10 ,elevation: 10}}>
          <BottomSheetView style={styles.container}>
            {ride && (
              <Text style={styles.status}>
                {ride.status === "pending" && "🔍 Buscando transporte"}
                {ride.status === "accepted" &&
                  `🚕 Asignado · llega en ${ride.driver_eta_min} min`}
                {ride.status === "on_the_way" && "🛣️ Transporte en camino"}
                {ride.status === "arrived" && "📍 Transporte llegó"}
              </Text>
            )}

            {!ride && (
              <>
                <View style={styles.row}>
                  {["pickup", "destination"].map((m) => (
                    <TouchableOpacity
                      key={m}
                      style={[styles.mode, mode === m && styles.active]}
                      onPress={() => setMode(m as Mode)}
                    >
                      <Text>{m === "pickup" ? "Encuentro" : "Destino"}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TextInput
                  placeholder="Ej: Parque Cespedes"
                  style={styles.input}
                  value={addressText}
                  onChangeText={setAddressText}
                />

                <View style={styles.row}>
                  {(["motor", "carro", "triciclo"] as Vehicle[]).map((v) => (
                    <TouchableOpacity
                      key={v}
                      style={[styles.vehicle, vehicle === v && styles.active]}
                      onPress={() => setVehicle(v)}
                    >
                      <Text>{v.toUpperCase()}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity
                  style={styles.confirm}
                  onPress={createRide}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.confirmText}>
                      Confirmar ${calculatePrice()}
                    </Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </BottomSheetView>
        </BottomSheet>
      </View>
    </GestureHandlerRootView>
  )
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  status: { textAlign: "center", fontWeight: "600", marginBottom: 10 },
  row: { flexDirection: "row", marginBottom: 10 },
  mode: {
    flex: 1,
    padding: 12,
    backgroundColor: "#eee",
    borderRadius: 10,
    alignItems: "center",
    marginHorizontal: 4,
  },
  vehicle: {
    flex: 1,
    padding: 14,
    backgroundColor: "#eee",
    borderRadius: 12,
    alignItems: "center",
    marginHorizontal: 4,
  },
  active: { backgroundColor: "#FF6A00" },
  input: {
    backgroundColor: "#f2f2f2",
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
  },
  confirm: {
    backgroundColor: "#FF6A00",
    padding: 18,
    borderRadius: 16,
    alignItems: "center",
  },
  confirmText: { color: "#fff", fontWeight: "700", fontSize: 16 },
})