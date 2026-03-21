import React, { useEffect, useRef, useState } from "react"
import { View, Text, TouchableOpacity, StyleSheet } from "react-native"
import MapLibreGL from "@maplibre/maplibre-react-native"
import * as Location from "expo-location"
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

  /* 📡 GPS SIEMPRE ACTIVO */
  useEffect(()=>{

    let sub: Location.LocationSubscription

    ;(async()=>{

      const { status } = await Location.requestForegroundPermissionsAsync()
      if(status !== "granted") return

      sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, distanceInterval: 5 },
        (loc)=>{
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

    return ()=> sub?.remove()

  },[])

  /* 🚗 SUAVIZAR MOVIMIENTO */
  useEffect(()=>{
    if(!myLocation) return

    setSmoothLocation(prev=>{
      if(!prev) return myLocation

      return {
        latitude: prev.latitude + (myLocation.latitude - prev.latitude) * 0.2,
        longitude: prev.longitude + (myLocation.longitude - prev.longitude) * 0.2
      }
    })

  },[myLocation])

  /* 🛣️ RUTA DINÁMICA */
  useEffect(()=>{

    if(!myLocation) return

    let target:any = null

    // 👉 antes de aceptar → ir al cliente
    if(!rideId && availableRides.length){
      const r = availableRides[0]
      target = { latitude: r.origin_lat, longitude: r.origin_lng }
    }

    // 👉 después de aceptar → ir al destino
    if(rideId && availableRides.length){
      const r = availableRides[0]
      target = { latitude: r.dest_lat, longitude: r.dest_lng }
    }

    if(!target) return

    const drawRoute = async ()=>{
      try{
        const url = `https://router.project-osrm.org/route/v1/driving/${myLocation.longitude},${myLocation.latitude};${target.longitude},${target.latitude}?overview=full&geometries=geojson`

        const res = await fetch(url)
        const data = await res.json()

        if(!data.routes?.length) return

        setRoute({
          type:"Feature",
          geometry:data.routes[0].geometry,
          properties:{}
        })

      }catch{}
    }

    drawRoute()

  },[myLocation, rideId, availableRides])

  /* 📏 DISTANCIA */
  const calculateDistance = (a:any, b:any)=>{
    const R = 6371
    const dLat = (b.latitude - a.latitude) * Math.PI / 180
    const dLon = (b.longitude - a.longitude) * Math.PI / 180
    const x = dLon * Math.cos((a.latitude + b.latitude)/2 * Math.PI/180)
    return Math.sqrt(dLat*dLat + x*x) * R
  }

  /* 🧠 CAMBIO AUTOMÁTICO DE ESTADOS */
  useEffect(()=>{

    if(!rideId || !myLocation || !availableRides.length) return

    const ride = availableRides[0]

    const client = {
      latitude: ride.origin_lat,
      longitude: ride.origin_lng
    }

    const dest = {
      latitude: ride.dest_lat,
      longitude: ride.dest_lng
    }

    const updateStatus = async (status:string)=>{
      await supabase
        .from("rides")
        .update({ status })
        .eq("id", rideId)
    }

    const dClient = calculateDistance(myLocation, client)
    const dDest = calculateDistance(myLocation, dest)

    if(dClient < 0.5 && rideStatus === "accepted"){
      updateStatus("arriving")
    }

    if(dClient < 0.05 && rideStatus === "arriving"){
      updateStatus("in_trip")
    }

    if(dDest < 0.05 && rideStatus === "in_trip"){
      updateStatus("completed")
    }

  },[myLocation, rideId])

  /* 🔄 RESET */
  useEffect(()=>{
    if(rideStatus === "completed"){
      setTimeout(()=>{
        setRoute(null)
      },3000)
    }
  },[rideStatus])
const ride = availableRides[0]
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

      {/* CARD */}
{!rideId && ride && (
  <View style={styles.card}>
    <Text style={styles.title}>🚨 Nuevo viaje</Text>

    <Text>
      📍 Cliente: {ride.origin_lat?.toFixed?.(4) || "..."}, {ride.origin_lng?.toFixed?.(4) || "..."}
    </Text>

    <Text>
      🏁 Destino: {ride.dest_lat?.toFixed?.(4) || "..."}, {ride.dest_lng?.toFixed?.(4) || "..."}
    </Text>

    <TouchableOpacity
      style={styles.acceptBtn}
      onPress={() => onAcceptRide(ride)}
    >
      <Text style={{ color:"#fff", textAlign:"center" }}>
        Aceptar viaje
      </Text>
    </TouchableOpacity>
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

  driverMarker:{
    width:22,
    height:22,
    borderRadius:11,
    backgroundColor:"#007AFF",
    borderWidth:3,
    borderColor:"#fff"
  },

  clientMarker:{
    width:20,
    height:20,
    borderRadius:10,
    backgroundColor:"#2ECC71",
    borderWidth:3,
    borderColor:"#fff"
  },

  header:{
    position:"absolute",
    top:60,
    alignSelf:"center",
    backgroundColor:"#007AFF",
    padding:12,
    borderRadius:10
  },

  headerText:{
    color:"#fff",
    fontWeight:"600"
  },

  card:{
    position:"absolute",
    bottom:120,
    alignSelf:"center",
    backgroundColor:"#fff",
    padding:15,
    borderRadius:12,
    width:"90%",
    elevation:5
  },

  title:{
    fontWeight:"700",
    marginBottom:5
  },

  acceptBtn:{
    marginTop:10,
    backgroundColor:"#007AFF",
    padding:12,
    borderRadius:8
  },

  statusBox:{
    position:"absolute",
    bottom:40,
    alignSelf:"center",
    backgroundColor:"#000",
    padding:15,
    borderRadius:12
  },

  statusText:{
    color:"#fff",
    fontSize:16
  }

})
