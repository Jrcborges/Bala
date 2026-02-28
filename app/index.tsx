import MapLibreGL from "@maplibre/maplibre-react-native"
import * as Location from "expo-location"
import { useEffect, useState } from "react"
import { StyleSheet, View } from "react-native"

MapLibreGL.setAccessToken(null)

export default function Index() {
  const [userLocation, setUserLocation] = useState<{
    latitude: number
    longitude: number
  } | null>(null)

  const [pickup, setPickup] = useState<{
    latitude: number
    longitude: number
  } | null>(null)

  const [destination, setDestination] = useState<{
    latitude: number
    longitude: number
  } | null>(null)

  const [mode, setMode] = useState<"pickup" | "destination">("pickup")

  // 📍 Obtener ubicación del usuario
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
      setPickup(coords)
    })()
  }, [])

  if (!userLocation) return null

  return (
    <View style={styles.container}>
      <MapLibreGL.MapView
        style={styles.map}
        logoEnabled={false}
        attributionEnabled={false}
        onPress={(e) => {
          if (e.geometry.type !== "Point") return

          const coords = e.geometry.coordinates
          if (!coords || coords.length < 2) return

          const [longitude, latitude] = coords

          if (mode === "pickup") {
            setPickup({ latitude, longitude })
          } else {
            setDestination({ latitude, longitude })
          }
        }}
      >
        <MapLibreGL.Camera
          zoomLevel={15}
          centerCoordinate={[
            userLocation.longitude,
            userLocation.latitude,
          ]}
          followUserLocation={true}
          followUserMode="compass"
        />

        {/* OpenStreetMap tiles */}
        <MapLibreGL.RasterSource
          id="osm"
          tileUrlTemplates={[
            "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
          ]}
          tileSize={256}
        >
          <MapLibreGL.RasterLayer id="osmLayer" sourceID="osm" />
        </MapLibreGL.RasterSource>

        {/* Pickup Marker */}
        {pickup && (
          <MapLibreGL.PointAnnotation
            id="pickup"
            coordinate={[pickup.longitude, pickup.latitude]}
          >
            <View style={styles.pickupMarker} />
          </MapLibreGL.PointAnnotation>
        )}

        {/* Destination Marker */}
        {destination && (
          <MapLibreGL.PointAnnotation
            id="destination"
            coordinate={[destination.longitude, destination.latitude]}
          >
            <View style={styles.destinationMarker} />
          </MapLibreGL.PointAnnotation>
        )}
      </MapLibreGL.MapView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  pickupMarker: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "green",
  },
  destinationMarker: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#FF6A00",
  },
})