import React,{useEffect,useRef,useState} from "react"
import {StyleSheet,Text,TouchableOpacity,View} from "react-native"

import MapLibreGL from "@maplibre/maplibre-react-native"
import * as Location from "expo-location"

import RidePanel from "../components/RidePanel"

MapLibreGL.setAccessToken(null)

export default function Index(){

  const cameraRef=useRef<any>(null)

  const [userLocation,setUserLocation]=useState<any>(null)
  const [pickup,setPickup]=useState<any>(null)
  const [destination,setDestination]=useState<any>(null)
  const [route,setRoute]=useState<any>(null)
  const [distance,setDistance]=useState(0)
  const [mapCenter,setMapCenter]=useState<any>(null)
  const [mapSelectMode,setMapSelectMode]=useState(false)
  const [selecting,setSelecting]=useState<"pickup"|"destination">("destination")
  const [results,setResults]=useState<any[]>([])
  const [pickupText,setPickupText]=useState("")
  const [destText,setDestText]=useState("")

  /* CENTRAR SOLO AL INICIO EN SANTIAGO DE CUBA */
  useEffect(()=>{
    cameraRef.current?.setCamera({
      centerCoordinate: [-75.8219,20.0247],
      zoomLevel:15,
      animationDuration:1000
    })
  },[])

  /* GPS opcional */
  useEffect(()=>{
    let sub:any
    ;(async()=>{
      const {status}=await Location.requestForegroundPermissionsAsync()
      if(status!=="granted") return
      sub=await Location.watchPositionAsync(
        {accuracy:Location.Accuracy.High,distanceInterval:5},
        (loc)=>{
          const coords={latitude:loc.coords.latitude,longitude:loc.coords.longitude}
          setUserLocation(coords)
          if(!pickup) setPickup(coords)
        }
      )
    })()
    return()=>sub?.remove()
  },[])

  /* AUTOCOMPLETE */
  const searchAddress=async(text:string)=>{
    if(selecting==="pickup") setPickupText(text)
    else setDestText(text)
    if(text.length<3){setResults([]); return}
    try{
      let query=text.toLowerCase()
                    .replace("entre"," ")
                    .replace(" y "," ")
                    .replace("esquina"," ")
      query=query+" Santiago de Cuba"
      const url=`https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=5&lat=20.0247&lon=-75.8219`
      const res=await fetch(url)
      const data=await res.json()
      const filtered=data.features.filter((f:any)=>f.properties.street||f.properties.name)
      if(filtered.length===0){
        setResults([{properties:{name:"Dirección no encontrada"},geometry:{coordinates:[0,0]},error:true}])
        return
      }
      setResults(filtered)
    }catch{setResults([])}
  }

  /* SELECT RESULTADO */
  const selectPlace=async(place:any)=>{
    if(place.error) return
    const coords={latitude:place.geometry.coordinates[1],longitude:place.geometry.coordinates[0]}
    const name=place.properties.street||place.properties.name||"Ubicación"
    if(selecting==="pickup"){setPickup(coords); setPickupText(name)}
    if(selecting==="destination"){setDestination(coords); setDestText(name); await drawRoute(coords)}
    setResults([])
  }

  /* DIBUJAR RUTA */
  const drawRoute=async(dest:any)=>{
    if(!pickup) return
    try{
      const url=`https://router.project-osrm.org/route/v1/driving/${pickup.longitude},${pickup.latitude};${dest.longitude},${dest.latitude}?overview=full&geometries=geojson`
      const res=await fetch(url)
      const data=await res.json()
      if(!data.routes?.length) return
      const routeGeoJSON={type:"Feature",geometry:data.routes[0].geometry}
      setRoute(routeGeoJSON)
      const km=data.routes[0].distance/1000
      setDistance(Number(km.toFixed(2)))
    }catch{}
  }

  /* CONFIRMAR UBICACIÓN EN EL MAPA */
  const confirmLocation=async()=>{
    if(!mapCenter) return
    if(selecting==="pickup"){setPickup(mapCenter); setPickupText("Ubicación seleccionada")}
    if(selecting==="destination"){setDestination(mapCenter); setDestText("Ubicación seleccionada"); await drawRoute(mapCenter)}
    setMapSelectMode(false)
  }

  const resetTrip=()=>{setDestination(null); setRoute(null); setDestText(""); setResults([])}

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
        onRegionDidChange={(e)=>{
          const center=e.geometry.coordinates
          setMapCenter({longitude:center[0],latitude:center[1]})
        }}
      >
        <MapLibreGL.Camera ref={cameraRef} zoomLevel={14}/>
        {pickup && <MapLibreGL.PointAnnotation id="pickup" coordinate={[pickup.longitude,pickup.latitude]}><View style={styles.pickupMarker}/></MapLibreGL.PointAnnotation>}
        {destination && <MapLibreGL.PointAnnotation id="dest" coordinate={[destination.longitude,destination.latitude]}><View style={styles.destMarker}/></MapLibreGL.PointAnnotation>}
        {route && <MapLibreGL.ShapeSource id="routeSource" shape={route}><MapLibreGL.LineLayer id="routeLine" style={{lineColor:"#FF6A00",lineWidth:6}}/></MapLibreGL.ShapeSource>}
      </MapLibreGL.MapView>

      {/* SOLO MOSTRAR PIN Y BOTON CUANDO SE SELECCIONA UBICACION */}
      {mapSelectMode && <View style={styles.centerPin}><Text style={{fontSize:40}}>📍</Text></View>}
      {mapSelectMode && <TouchableOpacity style={styles.confirmBtn} onPress={confirmLocation}><Text style={{color:"#fff"}}>Confirmar ubicación</Text></TouchableOpacity>}

      <TouchableOpacity style={styles.gpsBtn} onPress={goToMyLocation}><Text style={{fontSize:22}}>📍</Text></TouchableOpacity>

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
  pickupMarker:{width:20,height:20,borderRadius:10,backgroundColor:"#2ECC71",borderWidth:3,borderColor:"#fff"},
  destMarker:{width:20,height:20,borderRadius:10,backgroundColor:"#FF3B30",borderWidth:3,borderColor:"#fff"},
  centerPin:{position:"absolute",top:"50%",left:"50%",marginLeft:-20,marginTop:-40},
  confirmBtn:{position:"absolute",top:"45%",alignSelf:"center",backgroundColor:"#FF6A00",padding:14,borderRadius:10},
  gpsBtn:{position:"absolute",bottom:200,right:20,backgroundColor:"#fff",padding:12,borderRadius:30,elevation:5}
})
