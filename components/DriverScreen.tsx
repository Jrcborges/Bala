import React, { useRef } from "react"
import { View, Text, TouchableOpacity, StyleSheet } from "react-native"
import MapLibreGL from "@maplibre/maplibre-react-native"

export default function DriverScreen({
  rideId,
  rideStatus,
  driverLocation,
  availableRides,
  onAcceptRide
}: any) {

  const cameraRef = useRef<any>(null)

  return (
    <View style={{ flex: 1 }}>

      {/* MAPA */}
      <MapLibreGL.MapView
        style={{ flex: 1 }}
        mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
      >

        <MapLibreGL.Camera
          ref={cameraRef}
          zoomLevel={15}
          centerCoordinate={
            driverLocation
              ? [driverLocation.longitude, driverLocation.latitude]
              : [-75.8219, 20.0247]
          }
        />

        {/* 🚗 TU UBICACIÓN */}
        {driverLocation && (
          <MapLibreGL.PointAnnotation
            id="driver"
            coordinate={[
              driverLocation.longitude,
              driverLocation.latitude
            ]}
          >
            <View style={styles.driverMarker} />
          </MapLibreGL.PointAnnotation>
        )}

      </MapLibreGL.MapView>

      {/* 🔵 HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerText}>
          🚗 CONDUCTOR EN LÍNEA
        </Text>
      </View>

      {/* 📦 NUEVO VIAJE */}
      {!rideId && availableRides.length > 0 && (
        <View style={styles.card}>

          <Text style={styles.title}>
            🚨 Nuevo viaje
          </Text>

          <Text>
            📍 {availableRides[0].origin_lat.toFixed(4)}, {availableRides[0].origin_lng.toFixed(4)}
          </Text>

          <Text>
            🏁 {availableRides[0].dest_lat.toFixed(4)}, {availableRides[0].dest_lng.toFixed(4)}
          </Text>

          <TouchableOpacity
            style={styles.acceptBtn}
            onPress={() => onAcceptRide(availableRides[0])}
          >
            <Text style={{ color: "#fff", textAlign: "center" }}>
              Aceptar viaje
            </Text>
          </TouchableOpacity>

        </View>
      )}

      {/* 📊 ESTADO DEL VIAJE */}
      {rideId && (
        <View style={styles.statusBox}>
          <Text style={styles.statusText}>
            {rideStatus === "accepted" && "📍 Dirígete al cliente"}
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

  card: {
    position: "absolute",
    bottom: 120,
    alignSelf: "center",
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 12,
    width: "90%",
    elevation: 5
  },

  title: {
    fontWeight: "700",
    marginBottom: 5
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
