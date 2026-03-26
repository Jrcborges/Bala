import React, { useEffect, useRef, useState } from "react"
import { View, Text, TouchableOpacity, StyleSheet, FlatList } from "react-native"
import MapLibreGL from "@maplibre/maplibre-react-native"
import * as Location from "expo-location"
import * as Linking from "expo-linking"
import { supabase } from "../lib/supabase"

export default function DriverScreen({
  rideId,
  rideStatus,
  availableRides,
  onAcceptRide
}: any) {

  const cameraRef = useRef<any>(null)

  const [myLocation, setMyLocation] = useState<any>(null)
  const [smoothLocation, setSmoothLocation] = useState<any>(null)
  const [route, setRoute] = useState<any>(null)

  /* 📡 GPS */
  useEffect(() => {
    let sub: Location.LocationSubscription  

    ;(async () => {  
      const { status } = await Location.requestForegroundPermissionsAsync()  
      if (status !== "granted") return  

      sub = await Location.watchPositionAsync(  
        { accuracy: Location.Accuracy.High, distanceInterval: 5 },  
        (loc) => {  
          const coords = {  
            latitude: loc.coords.latitude,  
            longitude: loc.coords.longitude  
          }  

          setMyLocation(coords)  

          cameraRef.current?.setCamera({  
            centerCoordinate: [coords.longitude, coords.latitude],  
            zoomLevel: 15,  
            animationDuration: 500  
          })  
        }  
      )  
    })()  

    return () => sub?.remove()
  }, [])

  /* 🚗 SUAVIZAR */
  useEffect(() => {
    if (!myLocation) return

    setSmoothLocation(prev => {
      if (!prev) return myLocation

      return {
        latitude: prev.latitude + (myLocation.latitude - prev.latitude) * 0.2,
        longitude: prev.longitude + (myLocation.longitude - prev.longitude) * 0.2
      }
    })
  }, [myLocation])

  /* 📏 DISTANCIA */
  const calculateDistance = (a: any, b: any) => {
    const R = 6371
    const dLat = (b.latitude - a.latitude) * Math.PI / 180
    const dLon = (b.longitude - a.longitude) * Math.PI / 180
    const x = dLon * Math.cos((a.latitude + b.latitude) / 2 * Math.PI / 180)
    return Math.sqrt(dLat * dLat + x * x) * R
  }

  /* 🛣️ RUTA */
  useEffect(() => {
    if (!myLocation) return  

    let target: any = null  

    if (!rideId && availableRides.length) {  
      const r = availableRides[0]  
      target = { latitude: r.origin_lat, longitude: r.origin_lng }  
    }  

    if (rideId && availableRides.length) {  
      const r = availableRides[0]  
      target = { latitude: r.dest_lat, longitude: r.dest_lng }  
    }  

    if (!target) return  

    const drawRoute = async () => {  
      try {  
        const url = `https://router.project-osrm.org/route/v1/driving/${myLocation.longitude},${myLocation.latitude};${target.longitude},${target.latitude}?overview=full&geometries=geojson`  

        const res = await fetch(url)  
        const data = await res.json()  

        if (!data.routes?.length) return  

        setRoute({  
          type: "Feature",  
          geometry: data.routes[0].geometry,  
          properties: {}  
        })  
      } catch {}  
    }  

    drawRoute()
  }, [myLocation, rideId, availableRides])

  return (
    <View style={{ flex: 1 }}>

      <MapLibreGL.MapView
        style={{ flex: 1 }}
        mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
      >
        <MapLibreGL.Camera ref={cameraRef} />

        {/* 🚗 DRIVER */}
        {smoothLocation && (
          <MapLibreGL.PointAnnotation
            id="driver"
            coordinate={[
              smoothLocation.longitude,
              smoothLocation.latitude
            ]}
          >
            <View style={styles.driverMarker} />
          </MapLibreGL.PointAnnotation>
        )}

        {/* 📍 CLIENTE */}
        {!rideId && availableRides.length > 0 && (
          <MapLibreGL.PointAnnotation
            id="client"
            coordinate={[
              availableRides[0].origin_lng,
              availableRides[0].origin_lat
            ]}
          >
            <View style={styles.clientMarker} />
          </MapLibreGL.PointAnnotation>
        )}

        {/* 🛣️ RUTA */}
        {route && (
          <MapLibreGL.ShapeSource id="routeSource" shape={route}>
            <MapLibreGL.LineLayer
              id="routeLine"
              style={{ lineColor: "#00FFAA", lineWidth: 5 }}
            />
          </MapLibreGL.ShapeSource>
        )}

      </MapLibreGL.MapView>

      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerText}>🚗 CONDUCTOR EN LÍNEA</Text>
      </View>

      {/* 🔥 LISTA DE VIAJES */}
      {!rideId && availableRides.length > 0 && (
        <View style={styles.listContainer}>

          <FlatList
            data={availableRides}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {

              const distance = myLocation
                ? calculateDistance(myLocation, {
                    latitude: item.origin_lat,
                    longitude: item.origin_lng
                  })
                : 0

              return (
                <View style={styles.rideCard}>

                  <Text style={styles.name}>
                    👤 {item.client_name || "Cliente"}
                  </Text>

                  <Text style={styles.phone}>
                    📞 {item.client_phone || "Sin teléfono"}
                  </Text>

                  <Text>
                    📍 {item.origin_lat.toFixed(4)}, {item.origin_lng.toFixed(4)}
                  </Text>

                  <Text>
                    🏁 {item.dest_lat.toFixed(4)}, {item.dest_lng.toFixed(4)}
                  </Text>

                  <Text>📏 {distance.toFixed(2)} km</Text>

                  <Text style={styles.price}>
                    💰 ${item.price?.toFixed(2)}
                  </Text>

                  <TouchableOpacity
                    onPress={() =>
                      Linking.openURL(`tel:${item.client_phone}`)
                    }
                  >
                    <Text style={styles.callBtn}>📞 Llamar</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.acceptBtn}
                    onPress={() => onAcceptRide(item)}
                  >
                    <Text style={{ color: "#fff", textAlign: "center" }}>
                      Aceptar viaje
                    </Text>
                  </TouchableOpacity>

                </View>
              )
            }}
          />

        </View>
      )}

      {/* STATUS */}
      {rideId && (
        <View style={styles.statusBox}>
          <Text style={styles.statusText}>
            {rideStatus === "accepted" && "📍 Ve al cliente"}
            {rideStatus === "arriving" && "🚗 Llegando"}
            {rideStatus === "in_trip" && "🧭 En viaje"}
            {rideStatus === "completed" && "🏁 Finalizado"}
          </Text>
        </View>
      )}

    </View>
  )
}

const styles = StyleSheet.create({

  driverMarker: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#007AFF",
    borderWidth: 3,
    borderColor: "#fff"
  },

  clientMarker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#2ECC71",
    borderWidth: 3,
    borderColor: "#fff"
  },

  header: {
    position: "absolute",
    top: 60,
    alignSelf: "center",
    backgroundColor: "#007AFF",
    padding: 12,
    borderRadius: 10
  },

  headerText: {
    color: "#fff",
    fontWeight: "600"
  },

  listContainer: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    maxHeight: 320
  },

  rideCard: {
    backgroundColor: "#fff",
    marginHorizontal: 10,
    marginVertical: 6,
    padding: 15,
    borderRadius: 12,
    elevation: 4
  },

  name: {
    fontWeight: "700",
    fontSize: 16
  },

  phone: {
    color: "#555",
    marginBottom: 5
  },

  price: {
    marginTop: 5,
    fontWeight: "600",
    color: "#27AE60"
  },

  callBtn: {
    color: "#007AFF",
    marginTop: 5
  },

  acceptBtn: {
    marginTop: 10,
    backgroundColor: "#007AFF",
    padding: 12,
    borderRadius: 8
  },

  statusBox: {
    position: "absolute",
    bottom: 40,
    alignSelf: "center",
    backgroundColor: "#000",
    padding: 15,
    borderRadius: 12
  },

  statusText: {
    color: "#fff",
    fontSize: 16
  }

})
