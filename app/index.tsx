import DriverScreen from "../components/DriverScreen"
import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import SideMenu from "../components/SideMenu"
import { supabase } from "../lib/supabase";
import DriverRegister from "../components/DriverRegister"
import MapLibreGL from "@maplibre/maplibre-react-native";
import * as Location from "expo-location";

import RidePanel from "../components/RidePanel";

type Coords = {
    latitude:number
    longitude:number
}
type RouteGeoJSON = {
    type:string
    geometry:any
}

MapLibreGL.setAccessToken(null)

export default function Index(){

const cameraRef=useRef<any>(null)

const [userLocation,setUserLocation]=useState<Coords|null>(null)
const [pickup,setPickup]=useState<Coords|null>(null)
const [destination,setDestination]=useState<Coords|null>(null)
const [route,setRoute]=useState<any>(null)
const [distance,setDistance]=useState(0)
const [rideId,setRideId] = useState<string | null>(null)
const [rideStatus,setRideStatus] = useState<string | null>(null)
const [driverLocation,setDriverLocation] = useState<Coords | null>(null)
const [mapCenter,setMapCenter]=useState<Coords|null>(null)
const [mapSelectMode,setMapSelectMode]=useState(false)

const [selecting,setSelecting]=useState("destination")

const [results,setResults]=useState<any[]>([])

const [pickupText,setPickupText]=useState("")
const [destText,setDestText]=useState("")
const [menuVisible,setMenuVisible] = useState(false)
const [showDriverRegister,setShowDriverRegister] = useState(false)
const [driverMode,setDriverMode] = useState(false)
const [driverRegistered,setDriverRegistered] = useState(false)

/*Supabase*/
const pedirViaje = async (vehicleType: string) => {

  const { data: userData } = await supabase.auth.getUser()
  const user = userData.user

  if (!pickup || !destination || !user) {
    console.log("❌ Falta pickup, destination o usuario")
    return
  }

  const { data, error } = await supabase
    .from("rides")
    .insert([
      {
        client_id: user.id,

        origin_lat: pickup.latitude,
        origin_lng: pickup.longitude,

        dest_lat: destination.latitude,
        dest_lng: destination.longitude,

        vehicle_type: vehicleType,

        price: distance * 0.35,

        status: "searching",

        driver_lat: null,
        driver_lng: null
      }
    ])
    .select()
    .single()

  if (error) {
    console.log("❌ Error al crear viaje", error)
  } else {
    console.log("✅ Viaje creado", data)
    console.log("ID del viaje:", data.id)
    setRideId(data.id)
    setRideStatus(data.status)
  }
}

/* ------------------ GPS ------------------ */

useEffect(()=>{

let sub:Location.LocationSubscription|undefined

;(async()=>{

const {status}=await Location.requestForegroundPermissionsAsync()

if(status!=="granted") return

sub=await Location.watchPositionAsync(
{accuracy:Location.Accuracy.High,distanceInterval:5},
(loc)=>{

const coords={
latitude:loc.coords.latitude,
longitude:loc.coords.longitude
}

setUserLocation(coords)

if(!pickup) setPickup(coords)

}
)

})()

return()=>sub?.remove()

},[])
/* ------------------ CARGAR ESTADO DEL VIAJE ------------------ */

const cargarEstadoViaje = async () => {

const { data } = await supabase
.from("rides")
.select("status,driver_lat,driver_lng")
.eq("id", rideId)
.single()

if(data){

setRideStatus(data.status)

if(data.driver_lat != null && data.driver_lng != null){

setDriverLocation({
latitude:data.driver_lat,
longitude:data.driver_lng
})

}

}

}
/*-------------------Escuchar estados del viaje-----*/
useEffect(()=>{

if(!rideId) return

const channel = supabase
.channel("ride-live-"+rideId)
.on(
"postgres_changes",
{
event:"UPDATE",
schema:"public",
table:"rides",
filter:`id=eq.${rideId}`
},
(payload)=>{

const ride = payload.new

setRideStatus(ride.status)

// 🔥 TRACKING EN VIVO DEL CONDUCTOR
if(ride.driver_lat != null && ride.driver_lng != null){
  setDriverLocation({
    latitude: ride.driver_lat,
    longitude: ride.driver_lng
  })
}

}
)
.subscribe()

return ()=> supabase.removeChannel(channel)

},[rideId]);
    
useEffect(()=>{

if(!rideId) return

const interval = setInterval(() => {
    cargarEstadoViaje();
  }, 3000);
return () => clearInterval(interval);

},[rideId]);
/*----------Ver si el chófer está registrado---------*/
useEffect(()=>{

async function checkDriver(){

const { data } = await supabase.auth.getUser()
const user = data.user

if(!user) return

const { data:driver } = await supabase
.from("drivers")
.select("*")
.eq("id",user.id)
.single()

if(driver){
setDriverRegistered(true)
}

}

checkDriver()

},[])
/*Conductor envía información */
useEffect(() => {
  if (!driverMode) return;

  let sub: Location.LocationSubscription;

  (async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return;

    sub = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        distanceInterval: 5
      },
      async (loc) => {
        const lat = loc.coords.latitude;
        const lng = loc.coords.longitude;

        // 🔥 solo si hay viaje activo
        if (rideId) {
          await supabase
            .from("rides")
            .update({
              driver_lat: lat,
              driver_lng: lng
            })
            .eq("id", rideId);
        }
      }
    );
  })();

  return () => sub?.remove();

}, [driverMode, rideId]);
/*--------Eschucha del chofer----------*/
const [availableRides,setAvailableRides] = useState<any[]>([])

useEffect(() => {
  console.log("🔥 DRIVER EFFECT CORRIENDO")

  if (!driverMode) return

  // 🔥 1. CARGAR VIAJES PENDIENTES (IMPORTANTÍSIMO)
  const loadExistingRides = async () => {
    const { data, error } = await supabase
      .from("rides_admin_view")
      .select("*")
      .eq("status", "searching") // 👈 aquí traes los pending

    if (error) {
      console.log("❌ Error cargando rides:", error)
    } else {
      console.log("📦 VIAJES EXISTENTES:", data)
      setAvailableRides(data || [])
    }
  }

  loadExistingRides()

  // 🔥 2. ESCUCHAR NUEVOS VIAJES EN TIEMPO REAL
  const channel = supabase
    .channel("drivers-search")
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "rides"
      },
      (payload) => {
        const ride = payload.new

        if (ride.status === "searching") {
          setAvailableRides(prev => [ride, ...prev])
        }
      }
    )
    .subscribe((status) => {
      console.log("📡 STATUS DEL CANAL:", status)
    })

  return () => supabase.removeChannel(channel)

}, [driverMode])
/*funcion aceptar viaje*/
const acceptRide = async (ride:any)=>{

const { data:userData } = await supabase.auth.getUser()
const user = userData.user

if(!user) return

const { error } = await supabase
.from("rides")
.update({
status:"accepted",
driver_id:user.id
})
.eq("id",ride.id)

if(error){
console.log("❌ Error aceptando viaje", error)
}else{
console.log("✅ Viaje aceptado")

setAvailableRides([]) // limpiar lista
setRideId(ride.id)   // activar tracking
}

}

/**/
const parseIntersection = (text: string) => {
  const clean = text
    .toLowerCase()
    .replace(/,/g, " ")
    .replace(/\s+/g, " ")
    .trim()

  // formatos soportados:
  // "entre calle1 y calle2"
  // "calle1 y calle2"
  // "esquina calle1 y calle2"

  let match = clean.match(/entre (.+) y (.+)/)
  if (!match) match = clean.match(/esquina (.+) y (.+)/)
  if (!match) match = clean.match(/^(.+) y (.+)$/)

  if (!match) return null

  return {
    street1: match[1].trim(),
    street2: match[2].trim()
  }
}
/**/
const searchIntersection = async (street1: string, street2: string) => {
  try {
    const queries = [
      `${street1} y ${street2} Santiago de Cuba`,
      `${street1} esquina ${street2} Santiago de Cuba`,
      `${street1} ${street2} Santiago de Cuba`
    ]

    for (let q of queries) {
      const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=3`
      const res = await fetch(url)
      const data = await res.json()

      if (data.features.length) {
        const best = data.features[0]

        return {
          lat: best.geometry.coordinates[1],
          lng: best.geometry.coordinates[0]
        }
      }
    }

    return null

  } catch {
    return null
  }
}
/*esto es parte del buscador de calles */
const getRealIntersection = async (lat:number, lon:number) => {

  try {

    const url = `https://photon.komoot.io/reverse?lat=${lat}&lon=${lon}&limit=5`

    const res = await fetch(url)
    const data = await res.json()

    const streets = data.features
      .map((f:any) => f.properties.street || f.properties.name)
      .filter(Boolean)

    const unique = [...new Set(streets)]

    if (unique.length >= 2) {
      return `${unique[0]} y ${unique[1]}`
    }

    return unique[0] || "Ubicación"

  } catch {
    return "Ubicación"
  }
}
/* ------------------ BUSCADOR ------------------ */


const fixSearchText = (text: string) => {
  let t = text.toLowerCase().trim()

  // quitar acentos
  t = t.normalize("NFD").replace(/[\u0300-\u036f]/g, "")

  // correcciones comunes
  t = t
    .replace(/z/g, "s")
    .replace(/ce/g, "se")
    .replace(/ci/g, "si")
    .replace(/k/g, "c")
    .replace(/h/g, "")

  return t
}

const searchAddress = async (text: string) => {

  if (selecting === "pickup") setPickupText(text)
  else setDestText(text)

  if (text.length < 3) {
    setResults([])
    return
  }

  try {

    // 🔥 1. INTERSECCIONES
    const intersection = parseIntersection(text)

    if (intersection) {
      const coords = await searchIntersection(
        intersection.street1,
        intersection.street2
      )

      if (coords) {

        const location = {
          latitude: coords.lat,
          longitude: coords.lng
        }

        if (selecting === "pickup") setPickup(location)

        if (selecting === "destination") {
          setDestination(location)
          await drawRoute(location)
        }

        cameraRef.current?.setCamera({
          centerCoordinate: [coords.lng, coords.lat],
          zoomLevel: 16,
          animationDuration: 800
        })

        setResults([])
        return
      }
    }

    // 🔥 2. BUSCAR NORMAL
    const baseQuery = text + " Santiago de Cuba"

    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(baseQuery)}&limit=5`

    const res = await fetch(url, {
      headers: {
        "User-Agent": "tu-app (tuemail@email.com)"
      }
    })

    let data = await res.json()

    // 🔥 3. SI FALLA → FUZZY
    if (!data.length) {

      const fixedText = fixSearchText(text)

      const retryUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fixedText + " Santiago de Cuba")}&limit=5`

      const retryRes = await fetch(retryUrl, {
        headers: {
          "User-Agent": "tu-app (tuemail@email.com)"
        }
      })

      data = await retryRes.json()
    }

    // 🔥 4. VALIDAR RESULTADOS
    if (!data.length) {
      setResults([
        {
          name: "Dirección no encontrada",
          lat: 0,
          lon: 0,
          error: true
        }
      ])
      return
    }

    // 🔥 5. FORMATEAR (ANTI-CRASH)
    const formatted = data
      .filter((item: any) => item.lat && item.lon)
      .map((item: any) => ({
        geometry: {
          coordinates: [
            Number(item.lon),
            Number(item.lat)
          ]
        },
        properties: {
          name: item.display_name || "Ubicación"
        }
      }))

    if (!formatted.length) {
      setResults([])
      return
    }

    setResults(formatted)

  } catch (err) {
    console.log("❌ ERROR BUSCANDO:", err)
    setResults([])
  }
}
let timeout:any

const searchAddressDebounced = (text:string)=>{
  clearTimeout(timeout)

  timeout = setTimeout(()=>{
    searchAddress(text)
  }, 400)
}
   

/* ------------------ SELECCIONAR RESULTADO ------------------ */
const selectPlace = async (place:any) => {

  if (
    !place ||
    !place.geometry ||
    !place.geometry.coordinates ||
    place.geometry.coordinates.length < 2
  ) return

  if (place.error) return

  const coords = {
    latitude: place.geometry.coordinates[1],
    longitude: place.geometry.coordinates[0]
  }

  if (!coords.latitude || !coords.longitude) return

  const name =
    place.properties?.street ||
    place.properties?.name ||
    "Ubicación"

  if (selecting === "pickup") {
    setPickup(coords)
    setPickupText(name)
  }

  if (selecting === "destination") {
    setDestination(coords)
    setDestText(name)
    await drawRoute(coords)
  }

  cameraRef.current?.setCamera({
    centerCoordinate: [coords.longitude, coords.latitude],
    zoomLevel: 16,
    animationDuration: 800
  })

  setResults([])
}
const timeoutRef = useRef<any>(null)

const searchAddressDebounced = (text:string)=>{
  if (timeoutRef.current) {
    clearTimeout(timeoutRef.current)
  }

  timeoutRef.current = setTimeout(()=>{
    searchAddress(text)
  }, 400)
}


/* ------------------ RUTA ------------------ */

const drawRoute=async(dest:Coords)=>{

if(!pickup||!dest) return

try{

const url=`https://router.project-osrm.org/route/v1/driving/${pickup.longitude},${pickup.latitude};${dest.longitude},${dest.latitude}?overview=full&geometries=geojson`

const res=await fetch(url)

const data=await res.json()

if(!data.routes?.length) return

const routeGeoJSON={
type:"Feature",
geometry:data.routes[0].geometry,
properties:{}
}

setRoute(routeGeoJSON)

const km=data.routes[0].distance/1000

setDistance(Number(km.toFixed(2)))

}catch{}

}

/* ------------------ CONFIRMAR PIN ------------------ */

const confirmLocation=async()=>{

if(!mapCenter) return

if(selecting==="pickup"){
setPickup(mapCenter)
setPickupText("Ubicación seleccionada")
}

if(selecting==="destination"){
setDestination(mapCenter)
setDestText("Ubicación seleccionada")
await drawRoute(mapCenter)
}

setMapSelectMode(false)

}

const resetTrip=()=>{
setDestination(null)
setRoute(null)
setDestText("")
setResults([])
}

/* ------------------ GPS BOTON ------------------ */

const goToMyLocation=()=>{

if(!userLocation) return

cameraRef.current?.setCamera({
centerCoordinate:[userLocation.longitude,userLocation.latitude],
zoomLevel:15,
animationDuration:800
})

}
          
/* ------------------ UI ------------------ */

// 🔥 SEPARACIÓN TOTAL DE MODOS

if (driverMode) {
  return (
    <DriverScreen
      rideId={rideId}
      rideStatus={rideStatus}
      driverLocation={driverLocation}
      availableRides={availableRides}
      onAcceptRide={acceptRide}
    />
  )
}

return (
  <>
    <View style={{ flex: 1 }}>

      <MapLibreGL.MapView
        style={{ flex: 1 }}
        logoEnabled={false}
        attributionEnabled={false}
        mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
        onRegionDidChange={(e) => {
          const center = e.geometry.coordinates
          setMapCenter({
            longitude: center[0],
            latitude: center[1]
          })
        }}
      >

        <MapLibreGL.Camera
          ref={cameraRef}
          defaultSettings={{
            centerCoordinate: [-75.8219, 20.0247],
            zoomLevel: 13
          }}
        />

        {/* 📍 PICKUP */}
        {pickup && (
          <MapLibreGL.PointAnnotation
            id="pickup"
            coordinate={[pickup.longitude, pickup.latitude]}
          >
            <View style={styles.pickupMarker} />
          </MapLibreGL.PointAnnotation>
        )}

        {/* 🏁 DESTINO */}
        {destination && (
          <MapLibreGL.PointAnnotation
            id="dest"
            coordinate={[destination.longitude, destination.latitude]}
          >
            <View style={styles.destMarker} />
          </MapLibreGL.PointAnnotation>
        )}

        {/* 🚗 CHOFER */}
        {driverLocation && (
          <MapLibreGL.PointAnnotation
            id="driver"
            coordinate={[driverLocation.longitude, driverLocation.latitude]}
          >
            <View style={styles.driverMarker} />
          </MapLibreGL.PointAnnotation>
        )}

        {/* 🛣️ RUTA */}
        {route && (
          <MapLibreGL.ShapeSource id="routeSource" shape={route}>
            <MapLibreGL.LineLayer
              id="routeLine"
              style={{ lineColor: "#FF6A00", lineWidth: 6 }}
            />
          </MapLibreGL.ShapeSource>
        )}

      </MapLibreGL.MapView>

      {/* 📊 ESTADO */}
      {rideId && (
        <View style={styles.statusBox}>
          <Text style={styles.statusText}>
            {rideStatus === "searching" && "🔎 Buscando conductor"}
            {rideStatus === "accepted" && "✅ Conductor aceptó"}
            {rideStatus === "arriving" && "🚗 En camino"}
            {rideStatus === "in_trip" && "🧭 En viaje"}
            {rideStatus === "completed" && "🏁 Finalizado"}
          </Text>
        </View>
      )}

      {/* 📍 PIN */}
      {mapSelectMode && (
        <View style={styles.centerPin}>
          <Text style={{ fontSize: 40 }}>📍</Text>
        </View>
      )}

      {mapSelectMode && (
        <TouchableOpacity
          style={styles.confirmBtn}
          onPress={confirmLocation}
        >
          <Text style={{ color: "#fff" }}>
            Confirmar ubicación
          </Text>
        </TouchableOpacity>
      )}

      {/* 📡 GPS */}
      <TouchableOpacity
        style={styles.gpsBtn}
        onPress={goToMyLocation}
      >
        <Text style={{ fontSize: 22 }}>📍</Text>
      </TouchableOpacity>

      {/* 🧾 PANEL PASAJERO */}
      {!rideId && (
  <RidePanel
    pickupText={pickupText}
    destText={destText}
    results={results}
    distance={distance}
    onPickupFocus={() => setSelecting("pickup")}
    onDestFocus={() => setSelecting("destination")}
    onSearch={searchAddressDebounced}
    onSelectResult={selectPlace}
    onConfirmPin={() => setMapSelectMode(true)}
    onCancel={resetTrip}
    onRequestRide={pedirViaje}
  />
)}

      {/* ☰ MENU */}
      <TouchableOpacity
        style={styles.menuBtn}
        onPress={() => setMenuVisible(true)}
      >
        <Text style={{ fontSize: 24 }}>☰</Text>
      </TouchableOpacity>

    </View>

    <SideMenu
      visible={menuVisible}
      onClose={() => setMenuVisible(false)}
      onDriverPress={() => {
        setMenuVisible(false)

        if (driverRegistered) {
          setDriverMode(true)
        } else {
          setShowDriverRegister(true)
        }
      }}
    />

    {showDriverRegister && (
      <DriverRegister
        onComplete={() => {
          setShowDriverRegister(false)
          setDriverRegistered(true)
          setDriverMode(true)
        }}
      />
    )}
  </>
 )
}
const styles=StyleSheet.create({

pickupMarker:{
width:20,
height:20,
borderRadius:10,
backgroundColor:"#2ECC71",
borderWidth:3,
borderColor:"#fff"
},

destMarker:{
width:20,
height:20,
borderRadius:10,
backgroundColor:"#FF3B30",
borderWidth:3,
borderColor:"#fff"
},

centerPin:{
position:"absolute",
top:"50%",
left:"50%",
marginLeft:-20,
marginTop:-40
},

confirmBtn:{
position:"absolute",
top:"45%",
alignSelf:"center",
backgroundColor:"#FF6A00",
padding:14,
borderRadius:10
},

gpsBtn:{
position:"absolute",
bottom:200,
right:20,
backgroundColor:"#fff",
padding:12,
borderRadius:30,
elevation:5
},
statusBox:{
position:"absolute",
top:60,
alignSelf:"center",
backgroundColor:"#000",
padding:15,
borderRadius:12,
zIndex:999
},

statusText:{
color:"#fff",
fontSize:16,
fontWeight:"600"
},
menuBtn:{
position:"absolute",
top:60,
left:20,
backgroundColor:"#fff",
padding:10,
borderRadius:10,
zIndex:999
},
driverMarker: {
  width: 20,
  height: 20,
  borderRadius: 10,
  backgroundColor: "#007AFF",
  borderWidth: 3,
  borderColor: "#fff"
},

})
