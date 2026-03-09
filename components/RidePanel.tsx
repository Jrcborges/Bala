import React from "react"
import {
View,
Text,
StyleSheet,
TextInput,
TouchableOpacity,
ScrollView
} from "react-native"

export default function RidePanel({
pickupText,
destText,
results,
distance,
onSearch,
onSelectResult,
onConfirmPin
}){

return(

<View style={styles.panel}>

<TextInput
placeholder="¿Dónde te recogemos?"
placeholderTextColor="#888"
value={pickupText}
onChangeText={(text)=>onSearch(text,"pickup")}
style={styles.input}
/>

<TextInput
placeholder="¿A dónde vas?"
placeholderTextColor="#888"
value={destText}
onChangeText={(text)=>onSearch(text,"destination")}
style={styles.input}
/>

<TouchableOpacity
style={styles.mapButton}
onPress={onConfirmPin}
>
<Text style={styles.mapButtonText}>
📍 Elegir ubicación en el mapa
</Text>
</TouchableOpacity>

{distance>0 && (
<Text style={styles.distance}>
Distancia: {distance} km
</Text>
)}

<ScrollView style={{maxHeight:200}}>

{results.map((item,i)=>(

<TouchableOpacity
key={i}
style={styles.result}
onPress={()=>onSelectResult(item)}
>

<Text style={styles.resultText}>
📍 {item.name}
</Text>

</TouchableOpacity>

))}

</ScrollView>

</View>

)

}

const styles=StyleSheet.create({

panel:{
position:"absolute",
bottom:0,
left:0,
right:0,
backgroundColor:"#121212",
padding:20,
borderTopLeftRadius:30,
borderTopRightRadius:30
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

distance:{
color:"#fff",
marginBottom:10
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
