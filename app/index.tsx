import React,{useEffect,useRef,useState} from "react"
import {StyleSheet,Text,TouchableOpacity,View} from "react-native"

import MapLibreGL from "@maplibre/maplibre-react-native"
import * as Location from "expo-location"

import RidePanel from "../components/RidePanel"

MapLibreGL.setAccessToken(null)

export default function Index(){

const cameraRef=useRef(null)
const debounceRef=useRef(null)

const [userLocation,setUserLocation]=useState(null)
const [pickup,setPickup]=useState(null)
const [destination,setDestination]=useState(null)
const [route,setRoute]=useState(null)
const [distance,setDistance]=useState(0)

const [mapCenter,setMapCenter]=useState(null)
const [mapSelectMode,setMapSelectMode]=useState(false)

const [selecting,setSelecting]=useState("destination")

const [results,setResults]=useState([])

const [pickupText,setPickupText]=useState("")
const [destText,setDestText]=useState("")

/* ---------------- INTERSECCION ---------------- */

function parseIntersection(text){

if(!text) return null

text=text.toLowerCase()

text=text
.replace("esquina","")
.replace("entre","")
.replace(" con ",",")
.replace(" y ",",")
.replace("&",",")
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

/* ---------------- BUSCAR INTERSECCION ---------------- */

async function searchIntersection(street1,street2){

try{

const query=`${street1} & ${street2} Santiago de Cuba`

const url=`https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=5&lat=20.0247&lon=-75.8219`

const res=await fetch(url)
const data=await res.json()

if(data.features?.length){

const coords=data.features[0].geometry.coordinates

return{
latitude:coords[1],
longitude:coords[0]
}

}

return null

}catch{
return null
}

}

/* ---------------- GPS ---------------- */

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

/* ---------------- BUSCADOR ---------------- */

const searchAddress=(text,type)=>{

if(type==="pickup"){
setSelecting("pickup")
setPickupText(text)
}else{
setSelecting("destination")
setDestText(text)
}

if(debounceRef.current){
clearTimeout(debounceRef.current)
}

debounceRef.current=setTimeout(()=>doSearch(text),400)

}

async function doSearch(text){

if(text.length<3){
setResults([])
return
}

try{

/* detectar esquina */

const intersection=parseIntersection(text)

if(intersection){

const coords=await searchIntersection(
intersection.street1,
intersection.street2
)

if(coords){

setResults([
{
name:`${intersection.street1} y ${intersection.street2}`,
coords
}
])

return
}

}

/* photon */

let query=text+" Santiago de Cuba"

const url=`https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=5&lat=20.0247&lon=-75.8219`

const res=await fetch(url)

const data=await res.json()

if(data.features?.length){

const list=data.features.map(f=>({

name:
f.properties.street||
f.properties.name||
"Ubicación",

coords:{
latitude:f.geometry.coordinates[1],
longitude:f.geometry.coordinates[0]
}

}))

setResults(list)
return

}

/* fallback nominatim */

const url2=`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`

const res2=await fetch(url2)

const data2=await res2.json()

if(data2?.length){

const list=data2.map(p=>({

name:p.display_name,

coords:{
latitude:parseFloat(p.lat),
longitude:parseFloat(p.lon)
}

}))

setResults(list)
return

}

setResults([])

}catch{

setResults([])

}

}

/* ---------------- SELECCIONAR RESULTADO ---------------- */

const selectPlace=async(place)=>{

const coords=place.coords

if(selecting==="pickup"){
setPickup(coords)
setPickupText(place.name)
}

if(selecting==="destination"){
setDestination(coords)
setDestText(place.name)
await drawRoute(coords)
}

cameraRef.current?.setCamera({
centerCoordinate:[coords.longitude,coords.latitude],
zoomLevel:16,
animationDuration:800
})

setResults([])

}

/* ---------------- RUTA ---------------- */

const drawRoute=async(dest)=>{

if(!pickup) return

try{

const url=`https://router.project-osrm.org/route/v1/driving/${pickup.longitude},${pickup.latitude};${dest.longitude},${dest.latitude}?overview=full&geometries=geojson`

const res=await fetch(url)

const data=await res.json()

if(!data.routes?.length) return

const routeGeoJSON={
type:"Feature",
geometry:data.routes[0].geometry
}

setRoute(routeGeoJSON)

const km=data.routes[0].distance/1000

setDistance(Number(km.toFixed(2)))

}catch{}

}

/* ---------------- CONFIRMAR PIN ---------------- */

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

/* ---------------- GPS BOTON ---------------- */

const goToMyLocation=()=>{

if(!userLocation) return

cameraRef.current?.setCamera({
centerCoordinate:[userLocation.longitude,userLocation.latitude],
zoomLevel:15,
animationDuration:800
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

{route && (
<MapLibreGL.ShapeSource id="routeSource" shape={route}>
<MapLibreGL.LineLayer
id="routeLine"
style={{lineColor:"#FF6A00",lineWidth:6}}
/>
</MapLibreGL.ShapeSource>
)}

</MapLibreGL.MapView>

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
}

})
