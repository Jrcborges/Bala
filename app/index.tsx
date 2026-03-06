import React, { useEffect, useRef, useState } from "react"
import { StyleSheet, Text, TouchableOpacity, View } from "react-native"

import MapLibreGL from "@maplibre/maplibre-react-native"
import * as Location from "expo-location"

import RidePanel from "../components/RidePanel"

MapLibreGL.setAccessToken(null)

/* ================= UTILS ================= */

const toRad = (v: number) => v * Math.PI / 180

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

/* ================= SCREEN ================= */

export default function Index() {

  const cameraRef = useRef<any>(null)

  /* STATE */

  const [userLocation, setUserLocation] = useState<any>(null)

  const [pickup, setPickup] = useState<any>(null)
  const [destination, setDestination] = useState<any>(null)

  const [route, setRoute] = useState<any>(null)

  const [selecting, setSelecting] =
    useState<"pickup" | "destination">("destination")

  const [results, setResults] = useState<any[]>([])

  const [pickupText, setPickupText] = useState("")
  const [destText, setDestText] = useState("")

  /* ================= GPS TIEMPO REAL ================= */

  useEffect(() => {

    let sub: any

    ; (async () => {

      const { status } =
        await Location.requestForegroundPermissionsAsync()

      if (status !== "granted") return

      sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 5
        },
        (loc) => {

          const coords = {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude
          }

          setUserLocation(coords)

          /* ORIGEN = GPS */

          setPickup(coords)

        }
      )

    })()

    return () => sub?.remove()

  }, [])

  /* ================= SEARCH ================= */

  const searchAddress = async (text: string) => {

    if (selecting === "pickup") {
      setPickupText(text)
    } else {
      setDestText(text)
    }

    if (text.length < 3) {

      setResults([])
      return

    }

    const url =
      `https://nominatim.openstreetmap.org/search?q=${text}&format=json&limit=5`

    const res = await fetch(url)

    const data = await res.json()

    setResults(data)

  }

  /* ================= SELECT PLACE ================= */

  const selectPlace = async (place: any) => {

    const loc = {
      latitude: parseFloat(place.lat),
      longitude: parseFloat(place.lon)
    }

    if (selecting === "destination") {

      setDestination(loc)
      setDestText(place.display_name)

      await drawRoute(loc)

    }

    setResults([])

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
      geometry: data.routes[0].geometry
    }

    setRoute(routeGeoJSON)

  }

  /* ================= RESET ================= */

  const resetTrip = () => {

    setDestination(null)
    setRoute(null)

    setDestText("")
    setResults([])

  }

  /* ================= GO TO MY LOCATION ================= */

  const goToMyLocation = () => {

    if (!userLocation) return

    cameraRef.current?.setCamera({

      centerCoordinate: [
        userLocation.longitude,
        userLocation.latitude
      ],

      zoomLevel: 15,
      animationDuration: 800

    })

  }

  /* ================= UI ================= */

  return (

    <View style={{ flex: 1 }}>

      {/* MAP */}

      <MapLibreGL.MapView
        style={{ flex: 1 }}
        logoEnabled={false}
        attributionEnabled={false}
        mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
      >

        <MapLibreGL.Camera ref={cameraRef} />

        {/* ORIGEN */}

        {pickup && (

          <MapLibreGL.PointAnnotation
            id="pickup"
            coordinate={[
              pickup.longitude,
              pickup.latitude
            ]}
          >

            <View style={styles.pickupMarker} />

          </MapLibreGL.PointAnnotation>

        )}

        {/* DESTINO */}

        {destination && (

          <MapLibreGL.PointAnnotation
            id="dest"
            coordinate={[
              destination.longitude,
              destination.latitude
            ]}
          >

            <View style={styles.destMarker} />

          </MapLibreGL.PointAnnotation>

        )}

        {/* RUTA */}

        {route && (

          <MapLibreGL.ShapeSource
            id="routeSource"
            shape={route}
          >

            <MapLibreGL.LineLayer
              id="routeLine"
              style={{
                lineColor: "#FF6A00",
                lineWidth: 6
              }}
            />

          </MapLibreGL.ShapeSource>

        )}

      </MapLibreGL.MapView>

      {/* BOTON GPS */}

      <TouchableOpacity
        style={styles.gpsBtn}
        onPress={goToMyLocation}
      >

        <Text style={{ fontSize: 22 }}>
          📍
        </Text>

      </TouchableOpacity>

      {/* PANEL */}

      <RidePanel

        pickupText={"Tu ubicación"}
        destText={destText}

        results={results}

        onPickupFocus={() => { }}
        onDestFocus={() =>
          setSelecting("destination")
        }

        onSearch={searchAddress}

        onSelectResult={selectPlace}

        onCancel={resetTrip}

      />

    </View>

  )

}

/* ================= STYLES ================= */

const styles = StyleSheet.create({

  pickupMarker: {

    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#2ECC71",
    borderWidth: 3,
    borderColor: "#fff"

  },

  destMarker: {

    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#FF3B30",
    borderWidth: 3,
    borderColor: "#fff"

  },

  gpsBtn: {

    position: "absolute",
    bottom: 200,
    right: 20,

    backgroundColor: "#fff",

    padding: 12,
    borderRadius: 30,

    elevation: 5

  }

})