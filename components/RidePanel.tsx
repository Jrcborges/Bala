import React,{useRef,useState} from "react"
import {
View,
Text,
StyleSheet,
TextInput,
TouchableOpacity,
Animated,
PanResponder,
Dimensions,
ScrollView
} from "react-native"

const {height}=Dimensions.get("window")

type Props={

pickupText:string
destText:string

results:any[]

distance:number

onPickupFocus:()=>void
onDestFocus:()=>void

onSearch:(text:string)=>void
onSelectResult:(place:any)=>void

onConfirmPin:()=>void
onCancel:()=>void

}

export default function RidePanel({

pickupText,
destText,
results,
distance,

onPickupFocus,
onDestFocus,

onSearch,
onSelectResult,

onConfirmPin,
onCancel

}:Props){

const panelY=useRef(new Animated.Value(height*0.65)).current

const [transport,setTransport]=useState("moto")

/* TARIFAS */

const rates={
moto:0.35,
carro:0.60,
triciclo:0.45
}

const prices={
moto:(distance*rates.moto).toFixed(2),
carro:(distance*rates.carro).toFixed(2),
triciclo:(distance*rates.triciclo).toFixed(2)
}

/* PANEL DRAG */

const panResponder=useRef(

PanResponder.create({

onMoveShouldSetPanResponder:(e,gesture)=>{
return Math.abs(gesture.dy)>10
},

onPanResponderMove:(e,gesture)=>{

let newY=height*0.65+gesture.dy

if(newY<100)newY=100
if(newY>height*0.75)newY=height*0.75

panelY.setValue(newY)

},

onPanResponderRelease:(e,gesture)=>{

if(gesture.dy<-80){

Animated.spring(panelY,{
toValue:100,
useNativeDriver:false
}).start()

}else{

Animated.spring(panelY,{
toValue:height*0.65,
useNativeDriver:false
}).start()

}

}

})

).current

return(

<Animated.View
style={[styles.panel,{top:panelY}]}
{...panResponder.panHandlers}
>

<View style={styles.handle}/>

<ScrollView>

{/* INPUTS */}

<View style={styles.inputs}>

<View style={styles.row}>

<View style={styles.dot}/>

<TextInput
placeholder="Origen"
placeholderTextColor="#aaa"
value={pickupText}
onFocus={onPickupFocus}
onChangeText={onSearch}
style={styles.input}
/>

<TouchableOpacity onPress={onCancel}>
<Text style={styles.close}>✕</Text>
</TouchableOpacity>

</View>

<View style={styles.row}>

<View style={styles.pin}/>

<TextInput
placeholder="Destino"
placeholderTextColor="#aaa"
value={destText}
onFocus={onDestFocus}
onChangeText={onSearch}
style={styles.input}
/>

</View>

</View>

{/* PIN */}

<TouchableOpacity
style={styles.action}
onPress={onConfirmPin}
>
<Text style={styles.actionText}>
📍 Fijar ubicación en el mapa
</Text>
</TouchableOpacity>

{/* TRANSPORT */}

<View style={styles.transportBox}>

<Text style={styles.transportTitle}>
Tipo de transporte
</Text>

<View style={styles.transportRow}>

<TouchableOpacity
style={[
styles.transportButton,
transport==="moto"&&styles.transportActive
]}
onPress={()=>setTransport("moto")}
>
<Text style={styles.transportText}>
🛵 Moto
</Text>

{distance>0&&(
<Text style={styles.price}>
${prices.moto}
</Text>
)}

</TouchableOpacity>

<TouchableOpacity
style={[
styles.transportButton,
transport==="carro"&&styles.transportActive
]}
onPress={()=>setTransport("carro")}
>
<Text style={styles.transportText}>
🚗 Carro
</Text>

{distance>0&&(
<Text style={styles.price}>
${prices.carro}
</Text>
)}

</TouchableOpacity>

<TouchableOpacity
style={[
styles.transportButton,
transport==="triciclo"&&styles.transportActive
]}
onPress={()=>setTransport("triciclo")}
>
<Text style={styles.transportText}>
🛺 Triciclo
</Text>

{distance>0&&(
<Text style={styles.price}>
${prices.triciclo}
</Text>
)}

</TouchableOpacity>

</View>

</View>

{/* RESULTS */}

{results.length>0&&(

<View style={styles.results}>

{results.map((item)=>(
<TouchableOpacity
key={item.place_id}
style={styles.result}
onPress={()=>onSelectResult(item)}
>
<Text style={styles.resultText}>
{item.display_name}
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
height:height,
backgroundColor:"#121212",
borderTopLeftRadius:25,
borderTopRightRadius:25,
padding:20
},

handle:{
width:60,
height:6,
backgroundColor:"#555",
borderRadius:10,
alignSelf:"center",
marginBottom:15
},

inputs:{
backgroundColor:"#1E1E1E",
borderRadius:15,
padding:15
},

row:{
flexDirection:"row",
alignItems:"center",
marginBottom:10
},

dot:{
width:12,
height:12,
borderRadius:6,
backgroundColor:"#4DA3FF",
marginRight:10
},

pin:{
width:12,
height:12,
borderRadius:6,
backgroundColor:"#FF6A00",
marginRight:10
},

input:{
flex:1,
color:"#fff",
fontSize:16
},

close:{
color:"#fff",
fontSize:20,
marginLeft:10
},

action:{
backgroundColor:"#0f1f36",
padding:15,
borderRadius:12,
marginTop:15
},

actionText:{
color:"#fff",
fontSize:16
},

transportBox:{
marginTop:20
},

transportTitle:{
color:"#fff",
fontSize:18,
marginBottom:10
},

transportRow:{
flexDirection:"row",
justifyContent:"space-between"
},

transportButton:{
backgroundColor:"#1E1E1E",
padding:15,
borderRadius:12,
width:"30%",
alignItems:"center"
},

transportActive:{
backgroundColor:"#FF6A00"
},

transportText:{
color:"#fff",
fontSize:16
},

price:{
color:"#fff",
marginTop:5,
fontWeight:"bold"
},

results:{
marginTop:20
},

result:{
padding:15,
borderBottomWidth:1,
borderBottomColor:"#333"
},

resultText:{
color:"#fff"
}

}
