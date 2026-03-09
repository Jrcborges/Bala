import React, { useCallback, useEffect, useRef, useState } from "react"
import { StyleSheet, Text, TouchableOpacity, View } from "react-native"

import MapLibreGL from "@maplibre/maplibre-react-native"
import * as Location from "expo-location"

import { createClient } from "@supabase/supabase-js"

import RidePanel from "../components/RidePanel"

const supabase=createClient(
"https://TU_PROYECTO.supabase.co",
"TU_PUBLIC_ANON_KEY"
)

type Coords={
latitude:number
longitude:number
}

type Place={
name:string
coords:Coords
}

export default function Index(){

const cameraRef=useRef<any>(null)

const [userLocation,setUserLocation]=useState<Coords | null>(null)
const [pickup,setPickup]=useState<Coords | null>(null)
const [destination,setDestination]=useState<Coords | null>(null)

const [driverLocation,setDriverLocation]=useState<Coords | null>(null)

const [route,setRoute]=useState<any>(null)

const [distance,setDistance]=useState(0)
const [duration,setDuration]=useState(0)
const [price,setPrice]=useState(0)

const [mapCenter,setMapCenter]=useState<Coords | null>(null)
const [mapSelectMode,setMapSelectMode]=useState(false)

const [results,setResults]=useState<Place[]>([])

const [pickupText,setPickupText]=useState("")
const [destText,setDestText]=useState("")

const [selecting,setSelecting]=useState<"pickup"|"destination">("destination")

const tripId=1

/* GPS */

useEffect(()=>{

let sub:any

const start=async()=>{

const {status}=await Location.requestForegroundPermissionsAsync()

if(status!=="granted") return

sub=await Location.watchPositionAsync(
{
accuracy:Location.Accuracy.High,
distanceInterval:5
},
(loc)=>{

const coords={
latitude:loc.coords.latitude,
longitude:loc.coords.longitude
}

setUserLocation(coords)

if(!pickup){

setPickup(coords)

cameraRef.current?.setCamera({
centerCoordinate:[coords.longitude,coords.latitude],
zoomLevel:15
})

}

}
)

}

start()

return()=>sub?.remove()

},[])

/* DRIVER REALTIME */

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

if(!data?.driver_lat) return

setDriverLocation({
latitude:data.driver_lat,
longitude:data.driver_lng
})

}
)
.subscribe()

return()=>{supabase.removeChannel(channel)}

},[])

/* SEARCH ADDRESS */

const searchAddress=useCallback(async(text:string,type:string)=>{

if(type==="pickup"){
setSelecting("pickup")
setPickupText(text)
}else{
setSelecting("destination")
setDestText(text)
}

if(text.length<3){
setResults([])
return
}

try{

const query=text+", Santiago de Cuba, Cuba"

const url=`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`

const res=await fetch(url)

const data=await res.json()

const list:Place[]=data.map((p:any)=>({

name:p.display_name,

coords:{
latitude:parseFloat(p.lat),
longitude:parseFloat(p.lon)
}

}))

setResults(list)

}catch(e){

console.log("Search error",e)

}

},[])

/* SELECT PLACE */

const selectPlace=useCallback(async(place:Place)=>{

const coords=place.coords

if(selecting==="pickup"){
setPickup(coords)
setPickupText(place.name)
}

if(selecting==="destination"){

setDestination(coords)
setDestText(place.name)

await drawRoute(coords)

cameraRef.current?.setCamera({
centerCoordinate:[coords.longitude,coords.latitude],
zoomLevel:16,
animationDuration:800
})

}

setResults([])

},[selecting,pickup])

/* ROUTE */

const drawRoute=async(dest:Coords)=>{

if(!pickup) return

try{

const url=`https://router.project-osrm.org/route/v1/driving/${pickup.longitude},${pickup.latitude};${dest.longitude},${dest.latitude}?overview=full&geometries=geojson`

const res=await fetch(url)

const data=await res.json()

if(!data.routes?.length) return

const r=data.routes[0]

const routeGeoJSON={
type:"Feature",
geometry:r.geometry
}

setRoute(routeGeoJSON)

const km=r.distance/1000

setDistance(Number(km.toFixed(2)))

setDuration(Math.round(r.duration/60))

const base=1
const pricePerKm=0.8

const cost=base+(km*pricePerKm)

setPrice(Number(cost.toFixed(2)))

}catch(e){

console.log("Route error",e)

}

}

/* GPS BUTTON */

const goToMyLocation=()=>{

if(!userLocation) return

cameraRef.current?.setCamera({
centerCoordinate:[userLocation.longitude,userLocation.latitude],
zoomLevel:15,
animationDuration:800
})

}

return(

<View style={{flex:1}}>

<MapLibreGL.MapView
style={{flex:1}}
logoEnabled={false}
attributionEnabled={false}
mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
onRegionDidChange={(e:any)=>{

const c=e.geometry.coordinates

setMapCenter({
longitude:c[0],
latitude:c[1]
})

}}
>

<MapLibreGL.Camera
ref={cameraRef}
zoomLevel={14}
/>

{pickup && (
<MapLibreGL.PointAnnotation
id="pickup"
coordinate={[pickup.longitude,pickup.latitude]}
>
<View style={styles.pickup}/>
</MapLibreGL.PointAnnotation>
)}

{destination && (
<MapLibreGL.PointAnnotation
id="dest"
coordinate={[destination.longitude,destination.latitude]}
>
<View style={styles.dest}/>
</MapLibreGL.PointAnnotation>
)}

{driverLocation && (
<MapLibreGL.PointAnnotation
id="driver"
coordinate={[driverLocation.longitude,driverLocation.latitude]}
>
<Text style={{fontSize:28}}>🚗</Text>
</MapLibreGL.PointAnnotation>
)}

{route && (
<MapLibreGL.ShapeSource id="routeSource" shape={route}>
<MapLibreGL.LineLayer
id="routeLine"
style={{
lineColor:"#FF6A00",
lineWidth:6
}}
/>
</MapLibreGL.ShapeSource>
)}

</MapLibreGL.MapView>

<TouchableOpacity
style={styles.gps}
onPress={goToMyLocation}
>
<Text style={{fontSize:22}}>📍</Text>
</TouchableOpacity>

<RidePanel
pickupText={pickupText}
destText={destText}
results={results}
distance={distance}
duration={duration}
price={price}
onSearch={searchAddress}
onSelectResult={selectPlace}
onConfirmPin={()=>setMapSelectMode(true)}
/>

</View>

)

}

const styles=StyleSheet.create({

pickup:{
width:20,
height:20,
borderRadius:10,
backgroundColor:"#2ECC71",
borderWidth:3,
borderColor:"#fff"
},

dest:{
width:20,
height:20,
borderRadius:10,
backgroundColor:"#FF3B30",
borderWidth:3,
borderColor:"#fff"
},

gps:{
position:"absolute",
bottom:220,
right:20,
backgroundColor:"#fff",
padding:12,
borderRadius:30
}

})