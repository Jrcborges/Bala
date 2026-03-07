import React,{useEffect,useRef,useState} from "react"
import {StyleSheet,Text,TouchableOpacity,View} from "react-native"

import MapLibreGL from "@maplibre/maplibre-react-native"
import * as Location from "expo-location"

import RidePanel from "../components/RidePanel"

MapLibreGL.setAccessToken(null)

const toRad=(v:number)=>v*Math.PI/180

const getDistanceKm=(lat1:number,lon1:number,lat2:number,lon2:number)=>{

const R=6371

const dLat=toRad(lat2-lat1)
const dLon=toRad(lon2-lon1)

const a=
Math.sin(dLat/2)**2+
Math.cos(toRad(lat1))*
Math.cos(toRad(lat2))*
Math.sin(dLon/2)**2

return R*(2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a)))

}

export default function Index(){

const cameraRef=useRef<any>(null)

const lastCall=useRef(0)

const [userLocation,setUserLocation]=useState<any>(null)

const [pickup,setPickup]=useState<any>(null)
const [destination,setDestination]=useState<any>(null)

const [route,setRoute]=useState<any>(null)

const [mapCenter,setMapCenter]=useState<any>(null)

const [centerAddress,setCenterAddress]=useState("")

const [distance,setDistance]=useState(0)

const [selecting,setSelecting]=
useState<"pickup"|"destination">("destination")

const [results,setResults]=useState<any[]>([])

const [pickupText,setPickupText]=useState("")
const [destText,setDestText]=useState("")

/* GPS */

useEffect(()=>{

let sub:any

;(async()=>{

const {status}=await Location.requestForegroundPermissionsAsync()

if(status!=="granted")return

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

setPickup(coords)

}

)

})()

return()=>sub?.remove()

},[])

/* centrar mapa */

useEffect(()=>{

if(!userLocation)return

cameraRef.current?.setCamera({

centerCoordinate:[
userLocation.longitude,
userLocation.latitude
],

zoomLevel:15,
animationDuration:1000

})

},[userLocation])

/* SEARCH */

const searchAddress=async(text:string)=>{

if(selecting==="pickup") setPickupText(text)
else setDestText(text)

if(text.length<3){
setResults([])
return
}

const url=
`https://nominatim.openstreetmap.org/search?q=${text}&format=json&limit=5`

const res=await fetch(url)

const data=await res.json()

setResults(data)

}

/* SELECT RESULT */

const selectPlace=async(place:any)=>{

const loc={
latitude:parseFloat(place.lat),
longitude:parseFloat(place.lon)
}

if(selecting==="pickup"){

setPickup(loc)
setPickupText(place.display_name)

}

if(selecting==="destination"){

setDestination(loc)
setDestText(place.display_name)

await drawRoute(loc)

}

cameraRef.current?.setCamera({
centerCoordinate:[loc.longitude,loc.latitude],
zoomLevel:15,
animationDuration:800
})

setResults([])

}

/* ROUTE */

const drawRoute=async(dest:any)=>{

if(!pickup)return

const url=
`https://router.project-osrm.org/route/v1/driving/`+
`${pickup.longitude},${pickup.latitude};${dest.longitude},${dest.latitude}`+
`?overview=full&geometries=geojson`

const res=await fetch(url)

const data=await res.json()

if(!data.routes?.length)return

const routeGeoJSON={
type:"Feature",
geometry:data.routes[0].geometry
}

setRoute(routeGeoJSON)

const km=data.routes[0].distance/1000

setDistance(km)

}

/* MAP MOVE */

const onMapMove=async(e:any)=>{

const now=Date.now()

if(now-lastCall.current<1200) return

lastCall.current=now

const center=e.properties.center

const coords={
longitude:center[0],
latitude:center[1]
}

setMapCenter(coords)

const url=
`https://nominatim.openstreetmap.org/reverse?lat=${coords.latitude}&lon=${coords.longitude}&format=json`

const res=await fetch(url)

const data=await res.json()

setCenterAddress(data.display_name)

}

/* CONFIRM PIN */

const confirmLocation=async()=>{

if(!mapCenter)return

if(selecting==="pickup"){

setPickup(mapCenter)
setPickupText(centerAddress)

}

if(selecting==="destination"){

setDestination(mapCenter)
setDestText(centerAddress)

await drawRoute(mapCenter)

}

}

/* RESET */

const resetTrip=()=>{

setDestination(null)
setRoute(null)
setDestText("")
setResults([])

}

/* GPS BUTTON */

const goToMyLocation=()=>{

if(!userLocation)return

cameraRef.current?.setCamera({

centerCoordinate:[
userLocation.longitude,
userLocation.latitude
],

zoomLevel:15,
animationDuration:800

})

}

/* UI */

return(

<View style={{flex:1}}>

<MapLibreGL.MapView
style={{flex:1}}
logoEnabled={false}
attributionEnabled={false}
mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
onRegionDidChange={onMapMove}
>

<MapLibreGL.Camera ref={cameraRef} zoomLevel={14}/>

{pickup&&(

<MapLibreGL.PointAnnotation
id="pickup"
coordinate={[
pickup.longitude,
pickup.latitude
]}
>
<View style={styles.pickupMarker}/>
</MapLibreGL.PointAnnotation>

)}

{destination&&(

<MapLibreGL.PointAnnotation
id="dest"
coordinate={[
destination.longitude,
destination.latitude
]}
>
<View style={styles.destMarker}/>
</MapLibreGL.PointAnnotation>

)}

{route&&(

<MapLibreGL.ShapeSource
id="routeSource"
shape={route}
>
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

{!destination &&(

<View style={styles.centerPin}>
<Text style={{fontSize:40}}>📍</Text>
</View>

)}

{centerAddress!==""&&(

<View style={styles.addressBox}>
<Text style={styles.addressText}>{centerAddress}</Text>
</View>

)}

<TouchableOpacity
style={styles.confirmBtn}
onPress={confirmLocation}
>
<Text style={{color:"#fff"}}>
Confirmar ubicación
</Text>
</TouchableOpacity>

{distance>0&&(

<View style={styles.distanceBox}>
<Text style={{color:"#fff"}}>
Distancia {distance.toFixed(2)} km
</Text>
</View>

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
onPickupFocus={()=>setSelecting("pickup")}
onDestFocus={()=>setSelecting("destination")}
onSearch={searchAddress}
onSelectResult={selectPlace}
onConfirmPin={confirmLocation}
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

addressBox:{
position:"absolute",
top:120,
alignSelf:"center",
backgroundColor:"#121212",
padding:10,
borderRadius:10
},

addressText:{
color:"#fff",
maxWidth:250
},

confirmBtn:{
position:"absolute",
top:"45%",
alignSelf:"center",
backgroundColor:"#FF6A00",
padding:12,
borderRadius:10
},

distanceBox:{
position:"absolute",
bottom:120,
alignSelf:"center",
backgroundColor:"#121212",
padding:10,
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
