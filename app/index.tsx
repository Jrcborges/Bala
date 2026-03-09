import React,{useEffect,useRef,useState} from "react"
import {StyleSheet,Text,TouchableOpacity,View} from "react-native"

import MapLibreGL from "@maplibre/maplibre-react-native"
import * as Location from "expo-location"

import {createClient} from "@supabase/supabase-js"

import RidePanel from "../components/RidePanel"

MapLibreGL.setAccessToken(null)

/* SUPABASE */

const supabase=createClient(
"https://TU_PROYECTO.supabase.co",
"TU_PUBLIC_ANON_KEY"
)

export default function Index(){

const cameraRef=useRef(null)

const [userLocation,setUserLocation]=useState(null)
const [pickup,setPickup]=useState(null)
const [destination,setDestination]=useState(null)
const [route,setRoute]=useState(null)
const [distance,setDistance]=useState(0)

const [driverLocation,setDriverLocation]=useState(null)

const [results,setResults]=useState([])

const [pickupText,setPickupText]=useState("")
const [destText,setDestText]=useState("")

const tripId=847392 // aquí luego pondrás el viaje real

/* ---------------- GPS CLIENTE ---------------- */

useEffect(()=>{

let sub

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

/* ---------------- SUPABASE REALTIME ---------------- */

useEffect(()=>{

const channel=supabase
.channel("driver-location")
.on(
"postgres_changes",
{
event:"UPDATE",
schema:"public",
table:"trips",
filter:`id=eq.${tripId}`
},
(payload)=>{

const data=payload.new

setDriverLocation({
latitude:data.driver_lat,
longitude:data.driver_lng
})

}
)
.subscribe()

return()=>{
supabase.removeChannel(channel)
}

},[])

/* ---------------- BUSCADOR NOMINATIM ---------------- */

const searchAddress=async(text,type)=>{

if(type==="pickup"){
setPickupText(text)
}else{
setDestText(text)
}

if(text.length<3){
setResults([])
return
}

let query=text+", Santiago de Cuba, Cuba"

const url=`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`

const res=await fetch(url)

const data=await res.json()

const list=data.map(p=>({

name:p.display_name,

coords:{
latitude:parseFloat(p.lat),
longitude:parseFloat(p.lon)
}

}))

setResults(list)

}

/* ---------------- SELECCIONAR RESULTADO ---------------- */

const selectPlace=async(place)=>{

const coords=place.coords

setDestination(coords)
setDestText(place.name)

cameraRef.current?.setCamera({
centerCoordinate:[coords.longitude,coords.latitude],
zoomLevel:16,
animationDuration:800
})

await drawRoute(coords)

setResults([])

}

/* ---------------- RUTA ---------------- */

const drawRoute=async(dest)=>{

if(!pickup) return

const url=`https://router.project-osrm.org/route/v1/driving/${pickup.longitude},${pickup.latitude};${dest.longitude},${dest.latitude}?overview=full&geometries=geojson`

const res=await fetch(url)

const data=await res.json()

const routeGeoJSON={
type:"Feature",
geometry:data.routes[0].geometry
}

setRoute(routeGeoJSON)

const km=data.routes[0].distance/1000

setDistance(Number(km.toFixed(2)))

}

/* ---------------- GPS BOTON ---------------- */

const goToMyLocation=()=>{

if(!userLocation) return

cameraRef.current?.setCamera({
centerCoordinate:[userLocation.longitude,userLocation.latitude],
zoomLevel:15
})

}

/* ---------------- UI ---------------- */

return(

<View style={{flex:1}}>

<MapLibreGL.MapView
style={{flex:1}}
logoEnabled={false}
attributionEnabled={false}
mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
>

<MapLibreGL.Camera
ref={cameraRef}
defaultSettings={{
centerCoordinate:[-75.8219,20.0247],
zoomLevel:13
}}
/>

{/* PICKUP */}

{pickup && (
<MapLibreGL.PointAnnotation
id="pickup"
coordinate={[pickup.longitude,pickup.latitude]}
>
<View style={styles.pickupMarker}/>
</MapLibreGL.PointAnnotation>
)}

{/* DESTINO */}

{destination && (
<MapLibreGL.PointAnnotation
id="dest"
coordinate={[destination.longitude,destination.latitude]}
>
<View style={styles.destMarker}/>
</MapLibreGL.PointAnnotation>
)}

{/* RUTA */}

{route && (
<MapLibreGL.ShapeSource id="routeSource" shape={route}>
<MapLibreGL.LineLayer
id="routeLine"
style={{lineColor:"#FF6A00",lineWidth:6}}
/>
</MapLibreGL.ShapeSource>
)}

{/* CONDUCTOR */}

{driverLocation && (
<MapLibreGL.PointAnnotation
id="driver"
coordinate={[driverLocation.longitude,driverLocation.latitude]}
>
<Text style={{fontSize:28}}>🚗</Text>
</MapLibreGL.PointAnnotation>
)}

</MapLibreGL.MapView>

<TouchableOpacity
style={styles.gpsBtn}
onPress={goToMyLocation}
>
<Text style={{fontSize:22}}>📍</Text>
</TouchableOpacity>

<RidePanel
pickupText={pickupText}
destText={destText}
results={results}
distance={distance}
onSearch={searchAddress}
onSelectResult={selectPlace}
/>

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

gpsBtn:{
position:"absolute",
bottom:200,
right:20,
backgroundColor:"#fff",
padding:12,
borderRadius:30
}

})
