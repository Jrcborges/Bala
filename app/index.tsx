import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { supabase } from "../lib/supabase";

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
  
/* ------------------ DETECTAR INTERSECCIÓN ------------------ */

function parseIntersection(text:string){

if(!text) return null

text=text.toLowerCase()

text=text
.replace("esquina","")
.replace("entre","")
.replace(" y ",",")
.replace(/\s+/g," ")
.trim()

let parts=text.split(",")

if(parts.length>=2){

return{
street1:parts[0].trim(),
street2:parts[1].trim()
}

}

return null
}

/* ------------------ BUSCAR INTERSECCIÓN ------------------ */

async function searchIntersection(street1:string,street2:string){

try{

const query=`${street1} ${street2} Santiago de Cuba`

const url=`https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=5`

const res=await fetch(url)

const data=await res.json()

if(data.features && data.features.length>0){

const coords=data.features[0].geometry.coordinates

return{
lat:coords[1],
lng:coords[0]
}

}

return null

}catch{

return null

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

if(data.driver_lat && data.driver_lng){

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
.channel("ride-status-"+rideId)
.on(
"postgres_changes",
{
event:"UPDATE",
schema:"public",
table:"rides",
},
(payload)=>{
console.log("Realtime payload recibido:", payload)
const ride = payload.new

setRideStatus(ride.status)

if(ride.driver_lat && ride.driver_lng){

setDriverLocation({
latitude:ride.driver_lat,
longitude:ride.driver_lng
})

}

}
)
.subscribe((status)=>console.log("Estado del canal:",status))

return ()=>{

supabase.removeChannel(channel)

}

},[rideId])
    
useEffect(()=>{

if(!rideId) return

cargarEstadoViaje()

},[rideId])
/* ------------------ BUSCADOR ------------------ */

const searchAddress=async(text:string)=>{

if(selecting==="pickup") setPickupText(text)
else setDestText(text)

if(text.length<3){setResults([]);return}

try{

/* detectar intersección */

const intersection=parseIntersection(text)

if(intersection){

const coords=await searchIntersection(
intersection.street1,
intersection.street2
)

if(coords){

setResults([])

const location={
latitude:coords.lat,
longitude:coords.lng
}

if(selecting==="pickup") setPickup(location)

if(selecting==="destination"){
setDestination(location)
await drawRoute(location)
}

cameraRef.current?.setCamera({
centerCoordinate:[coords.lng,coords.lat],
zoomLevel:16,
animationDuration:800
})

return

}

}

/* limpiar búsqueda */

let query=text
.toLowerCase()
.replace(/entre/g," ")
.replace(/ y /g," ")
.replace(/esquina/g," ")
.replace(/,/g," ")
.replace(/\s+/g," ")
.trim()

query=query+" Santiago de Cuba"

/* photon */

const url=`https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=5&lat=20.0247&lon=-75.8219`

const res=await fetch(url)

const data=await res.json()

const filtered=data.features.filter(
(f:any)=>f.properties.street||f.properties.name
)

if(filtered.length===0){

setResults([
{
properties:{name:"Dirección no encontrada"},
geometry:{coordinates:[0,0]},
error:true
}
])

return

}

setResults(filtered)

}catch{

setResults([])

}

}

/* ------------------ SELECCIONAR RESULTADO ------------------ */

const selectPlace=async(place:any)=>{

if(place.error) return

const coords={
latitude:place.geometry.coordinates[1],
longitude:place.geometry.coordinates[0]
}

const name=
place.properties.street||
place.properties.name||
"Ubicación"

if(selecting==="pickup"){
setPickup(coords)
setPickupText(name)
}

if(selecting==="destination"){
setDestination(coords)
setDestText(name)
await drawRoute(coords)
}

cameraRef.current?.setCamera({
centerCoordinate:[coords.longitude,coords.latitude],
zoomLevel:16,
animationDuration:800
})

setResults([])

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

return(

<View style={{flex:1}}>

<MapLibreGL.MapView
style={{flex:1}}
logoEnabled={false}
attributionEnabled={false}
mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
onRegionDidChange={(e)=>{
const center=e.geometry.coordinates
setMapCenter({longitude:center[0],latitude:center[1]})
}}
>

<MapLibreGL.Camera
ref={cameraRef}
defaultSettings={{
centerCoordinate:[-75.8219,20.0247],
zoomLevel:13
}}
/>

{pickup && (
<MapLibreGL.PointAnnotation
id="pickup"
coordinate={[pickup.longitude,pickup.latitude]}
>
<View style={styles.pickupMarker}/>
</MapLibreGL.PointAnnotation>
)}

{destination && (
    
<MapLibreGL.PointAnnotation
id="dest"
coordinate={[destination.longitude,destination.latitude]}
>
<View style={styles.destMarker}/>
</MapLibreGL.PointAnnotation>
)}
{driverLocation && (
<MapLibreGL.PointAnnotation
id="driver"
coordinate={[driverLocation.longitude,driverLocation.latitude]}
>
<View style={{
width:20,
height:20,
borderRadius:10,
backgroundColor:"#007AFF",
borderWidth:3,
borderColor:"#fff"
}}/>
</MapLibreGL.PointAnnotation>
)}
{route && (
<MapLibreGL.ShapeSource id="routeSource" shape={route}>
<MapLibreGL.LineLayer
id="routeLine"
style={{lineColor:"#FF6A00",lineWidth:6}}
/>
</MapLibreGL.ShapeSource>
)}

</MapLibreGL.MapView>
{rideId && (
<View style={styles.statusBox}>
<Text style={styles.statusText}>

{rideStatus === "searching"
? "🔎 Buscando conductor"
: rideStatus === "accepted"
? "✅ Conductor aceptó el viaje"
: rideStatus === "arriving"
? "🚗 El conductor va en camino"
: rideStatus === "in_trip"
? "🧭 Viaje en progreso"
: rideStatus === "completed"
? "🏁 Viaje terminado"
: "🔎 Buscando conductor"}

</Text>
</View>
)}
{mapSelectMode && (
<View style={styles.centerPin}>
<Text style={{fontSize:40}}>📍</Text>
</View>
)}

{mapSelectMode && (
<TouchableOpacity
style={styles.confirmBtn}
onPress={confirmLocation}
>
<Text style={{color:"#fff"}}>
Confirmar ubicación
</Text>
</TouchableOpacity>
)}

<TouchableOpacity
style={styles.gpsBtn}
onPress={goToMyLocation}
>
<Text style={{fontSize:22}}>📍</Text>
</TouchableOpacity>

{!rideId && (
<RidePanel
pickupText={pickupText}
destText={destText}
results={results}
distance={distance}
onPickupFocus={()=>setSelecting("pickup")}
onDestFocus={()=>setSelecting("destination")}
onSearch={searchAddress}
onSelectResult={selectPlace}
onConfirmPin={()=>setMapSelectMode(true)}
onCancel={resetTrip}
onRequestRide={pedirViaje}
/>
)}

</View>

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
}

})
