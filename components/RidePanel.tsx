import React,{useRef,useState} from "react"
import {
View,Text,StyleSheet,TextInput,TouchableOpacity,
Animated,PanResponder,Dimensions,ScrollView
} from "react-native"

const {height}=Dimensions.get("window")

export default function RidePanel({
pickupText,destText,results,distance,
onPickupFocus,onDestFocus,onSearch,onSelectResult,
onConfirmPin,onCancel
}){

const panelY=useRef(new Animated.Value(height*0.62)).current

const [transport,setTransport]=useState("moto")

/* Tarifas */

const rates={
moto:0.35,
carro:0.6,
triciclo:0.45
}

const prices={
moto:(distance*rates.moto).toFixed(2),
carro:(distance*rates.carro).toFixed(2),
triciclo:(distance*rates.triciclo).toFixed(2)
}

/* PANEL ARRASTRABLE */

const panResponder=useRef(PanResponder.create({

onMoveShouldSetPanResponder:(e,g)=>Math.abs(g.dy)>8,

onPanResponderMove:(e,g)=>{

let newY=height*0.62+g.dy

if(newY<80) newY=80
if(newY>height*0.75) newY=height*0.75

panelY.setValue(newY)

},

onPanResponderRelease:(e,g)=>{

if(g.dy<-60){
Animated.spring(panelY,{toValue:80,useNativeDriver:false}).start()
}else{
Animated.spring(panelY,{toValue:height*0.62,useNativeDriver:false}).start()
}

}

})).current

return(

<Animated.View style={[styles.panel,{top:panelY}]} {...panResponder.panHandlers}>

<View style={styles.handle}/>

<ScrollView showsVerticalScrollIndicator={false}>

{/* ORIGEN / DESTINO */}

<View style={styles.locationBox}>

<View style={styles.locationRow}>

<View style={styles.dotGreen}/>

<TextInput
placeholder="¿Dónde te recogemos?"
placeholderTextColor="#888"
value={pickupText}
onFocus={onPickupFocus}
onChangeText={(text)=>onSearch(text,"pickup")}
style={styles.input}
/>

<TouchableOpacity onPress={onConfirmPin}>
<Text style={styles.mapIcon}>🗺</Text>
</TouchableOpacity>

</View>

<View style={styles.line}/>

<View style={styles.locationRow}>

<View style={styles.dotRed}/>

<TextInput
placeholder="¿A dónde vas?"
placeholderTextColor="#888"
value={destText}
onFocus={onDestFocus}
onChangeText={(text)=>onSearch(text,"destination")}
style={styles.input}
/>

<TouchableOpacity onPress={onConfirmPin}>
<Text style={styles.mapIcon}>🗺</Text>
</TouchableOpacity>

<TouchableOpacity onPress={onCancel}>
<Text style={styles.close}>✕</Text>
</TouchableOpacity>

</View>

</View>

{/* BOTON MAPA EXTRA */}

<TouchableOpacity style={styles.mapButton} onPress={onConfirmPin}>
<Text style={styles.mapButtonText}>📍 Elegir ubicación directamente en el mapa</Text>
</TouchableOpacity>

{/* TRANSPORTE */}

<View style={styles.transportBox}>

<Text style={styles.sectionTitle}>Selecciona transporte</Text>

<View style={styles.transportRow}>

{["moto","carro","triciclo"].map((t)=>{

const active=transport===t

return(

<TouchableOpacity
key={t}
style={[styles.transportCard,active && styles.transportActive]}
onPress={()=>setTransport(t)}
>

<Text style={styles.transportIcon}>
{t==="moto"?"🛵":t==="carro"?"🚗":"🛺"}
</Text>

<Text style={styles.transportName}>
{t==="moto"?"Moto":t==="carro"?"Carro":"Triciclo"}
</Text>

{distance>0 && (
<Text style={styles.price}>
${prices[t]}
</Text>
)}

</TouchableOpacity>

)

})}

</View>

</View>

{/* RESULTADOS BUSQUEDA */}

{results.length>0 && (

<View style={styles.resultsBox}>

{results.map((item,i)=>(

<TouchableOpacity
key={i}
style={styles.result}
onPress={()=>onSelectResult(item)}
>

<Text style={styles.resultIcon}>📍</Text>

<Text style={styles.resultText}>
{item.name}
</Text>

</TouchableOpacity>

))}

</View>

)}

</ScrollView>

</Animated.View>

)

}

const styles=StyleSheet.create({

panel:{
position:"absolute",
left:0,
right:0,
height:height*0.82,
backgroundColor:"#121212",
borderTopLeftRadius:30,
borderTopRightRadius:30,
padding:20,
shadowColor:"#000",
shadowOpacity:0.4,
shadowRadius:10
},

handle:{
width:60,
height:6,
backgroundColor:"#444",
borderRadius:10,
alignSelf:"center",
marginBottom:20
},

locationBox:{
backgroundColor:"#1E1E1E",
borderRadius:16,
padding:15
},

locationRow:{
flexDirection:"row",
alignItems:"center"
},

line:{
height:20,
width:2,
backgroundColor:"#555",
marginLeft:6,
marginVertical:5
},

dotGreen:{
width:10,
height:10,
borderRadius:5,
backgroundColor:"#2ECC71",
marginRight:10
},

dotRed:{
width:10,
height:10,
borderRadius:5,
backgroundColor:"#FF3B30",
marginRight:10
},

input:{
flex:1,
color:"#fff",
fontSize:16
},

close:{
color:"#aaa",
fontSize:18,
marginLeft:10
},

mapIcon:{
fontSize:18,
marginLeft:10
},

mapButton:{
backgroundColor:"#18263a",
padding:15,
borderRadius:12,
marginTop:15
},

mapButtonText:{
color:"#fff",
fontSize:15
},

sectionTitle:{
color:"#fff",
fontSize:18,
marginBottom:10
},

transportBox:{
marginTop:20
},

transportRow:{
flexDirection:"row",
justifyContent:"space-between"
},

transportCard:{
backgroundColor:"#1E1E1E",
padding:15,
borderRadius:14,
width:"30%",
alignItems:"center"
},

transportActive:{
backgroundColor:"#FF6A00"
},

transportIcon:{
fontSize:22
},

transportName:{
color:"#fff",
marginTop:4
},

price:{
color:"#fff",
marginTop:4,
fontWeight:"bold"
},

resultsBox:{
marginTop:20,
backgroundColor:"#1E1E1E",
borderRadius:14
},

result:{
flexDirection:"row",
alignItems:"center",
padding:14,
borderBottomWidth:1,
borderBottomColor:"#333"
},

resultIcon:{
marginRight:10
},

resultText:{
color:"#fff",
flex:1
}

})
