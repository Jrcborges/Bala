import React, { useMemo } from "react"
import {
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native"

import BottomSheet from "@gorhom/bottom-sheet"

type Coords={
latitude:number
longitude:number
}

type Place={
name:string
coords:Coords
}

type Props={
pickupText:string
destText:string
results:Place[]
distance:number
duration:number
price:number
onSearch:(text:string,type:string)=>void
onSelectResult:(place:Place)=>void
onConfirmPin:()=>void
}

export default function RidePanel(props:Props){

const snapPoints=useMemo(()=>["15%","50%"],[])

return(

<BottomSheet
index={0}
snapPoints={snapPoints}
backgroundStyle={{backgroundColor:"#121212"}}
handleIndicatorStyle={{backgroundColor:"#555"}}
>

<View style={styles.content}>

<TextInput
placeholder="¿Dónde te recogemos?"
placeholderTextColor="#888"
value={props.pickupText}
onChangeText={(text)=>props.onSearch(text,"pickup")}
style={styles.input}
/>

<TextInput
placeholder="¿A dónde vas?"
placeholderTextColor="#888"
value={props.destText}
onChangeText={(text)=>props.onSearch(text,"destination")}
style={styles.input}
/>

<TouchableOpacity
style={styles.mapButton}
onPress={props.onConfirmPin}
>
<Text style={styles.mapButtonText}>
📍 Elegir ubicación
</Text>
</TouchableOpacity>

{props.distance>0 &&(

<View style={styles.info}>

<Text style={styles.infoText}>
📏 {props.distance} km
</Text>

<Text style={styles.infoText}>
⏱ {props.duration} min
</Text>

<Text style={styles.price}>
💰 ${props.price}
</Text>

</View>

)}

<ScrollView style={{maxHeight:200}}>

{props.results.map((item,i)=>(

<TouchableOpacity
key={i}
style={styles.result}
onPress={()=>props.onSelectResult(item)}
>

<Text style={styles.resultText}>
📍 {item.name}
</Text>

</TouchableOpacity>

))}

</ScrollView>

</View>

</BottomSheet>

)

}

const styles=StyleSheet.create({

content:{
padding:20
},

input:{
backgroundColor:"#1E1E1E",
color:"#fff",
padding:12,
borderRadius:10,
marginBottom:10
},

mapButton:{
backgroundColor:"#FF6A00",
padding:14,
borderRadius:12,
alignItems:"center",
marginBottom:10
},

mapButtonText:{
color:"#fff",
fontWeight:"bold"
},

info:{
flexDirection:"row",
justifyContent:"space-between",
marginBottom:10
},

infoText:{
color:"#fff"
},

price:{
color:"#00E676",
fontWeight:"bold"
},

result:{
padding:12,
borderBottomWidth:1,
borderBottomColor:"#333"
},

resultText:{
color:"#fff"
}

})