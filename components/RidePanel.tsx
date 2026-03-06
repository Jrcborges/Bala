import React from "react"
import {
    FlatList,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native"

export default function RidePanel({

pickupText,
destText,
results,

onPickupFocus,
onDestFocus,

onSearch,
onSelectResult,

onCancel

}:any){

return(

<View style={styles.container}>

{/* ORIGEN */}

<View style={styles.box}>

<Text style={styles.label}>
Origen
</Text>

<View style={styles.row}>

<TextInput
placeholder="¿Desde dónde?"
placeholderTextColor="#aaa"
value={pickupText}
onFocus={onPickupFocus}
onChangeText={onSearch}
style={styles.input}
/>

<TouchableOpacity onPress={onCancel}>
<Text style={styles.cancel}>✕</Text>
</TouchableOpacity>

</View>

</View>

{/* DESTINO */}

<View style={styles.box}>

<View style={styles.row}>

<TextInput
placeholder="¿A dónde vas?"
placeholderTextColor="#aaa"
value={destText}
onFocus={onDestFocus}
onChangeText={onSearch}
style={styles.input}
/>

</View>

</View>

{/* RESULTADOS */}

{results.length > 0 && (

<FlatList
data={results}
keyExtractor={(item)=>item.place_id.toString()}
renderItem={({item})=>(

<TouchableOpacity
style={styles.result}
onPress={()=>onSelectResult(item)}
>

<Text style={styles.resultText}>
{item.display_name}
</Text>

</TouchableOpacity>

)}
/>

)}

</View>

)

}

const styles = StyleSheet.create({

container:{
position:"absolute",
top:60,
width:"90%",
alignSelf:"center",
backgroundColor:"#1C1C1E",
borderRadius:15,
padding:15
},

box:{
marginBottom:10
},

label:{
color:"#aaa",
marginBottom:5
},

row:{
flexDirection:"row",
alignItems:"center"
},

input:{
flex:1,
color:"#fff",
fontSize:16
},

cancel:{
color:"#fff",
fontSize:20,
marginLeft:10
},

result:{
paddingVertical:10,
borderBottomWidth:1,
borderBottomColor:"#333"
},

resultText:{
color:"#fff"
}

})