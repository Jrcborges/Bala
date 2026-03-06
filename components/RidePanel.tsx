import React from "react"
import {
FlatList,
StyleSheet,
Text,
TextInput,
TouchableOpacity,
View
} from "react-native"

type Props={

pickupText:string
destText:string

results:any[]

onPickupFocus:()=>void
onDestFocus:()=>void

onSearch:(text:string)=>void

onSelectResult:(place:any)=>void

onCancel:()=>void

}

export default function RidePanel({

pickupText,
destText,

results,

onPickupFocus,
onDestFocus,

onSearch,

onSelectResult,

onCancel

}:Props){

return(

<View style={styles.container}>

<View style={styles.card}>

<View style={styles.header}>

<Text style={styles.label}>
Origen
</Text>

<TouchableOpacity
onPress={onCancel}
>
<Text style={styles.close}>
✕
</Text>
</TouchableOpacity>

</View>

<TextInput
placeholder="Tu ubicación"
placeholderTextColor="#aaa"
value={pickupText}
onFocus={onPickupFocus}
onChangeText={onSearch}
style={styles.input}
/>

<TextInput
placeholder="¿A dónde vas?"
placeholderTextColor="#aaa"
value={destText}
onFocus={onDestFocus}
onChangeText={onSearch}
style={styles.input}
/>

</View>

{results.length>0 && (

<View style={styles.resultsBox}>

<FlatList
data={results}

keyExtractor={(item)=>
item.place_id.toString()
}

renderItem={({item})=>(

<TouchableOpacity
style={styles.result}
onPress={()=>
onSelectResult(item)
}
>

<Text style={styles.resultText}>
{item.display_name}
</Text>

</TouchableOpacity>

)}

 />

</View>

)}

</View>

)

}

const styles=StyleSheet.create({

container:{
position:"absolute",
top:60,
width:"90%",
alignSelf:"center"
},

card:{
backgroundColor:"#1C1C1E",
borderRadius:20,
padding:15
},

header:{
flexDirection:"row",
justifyContent:"space-between",
alignItems:"center"
},

label:{
color:"#aaa",
fontSize:14
},

close:{
color:"#fff",
fontSize:20
},

input:{
color:"#fff",
fontSize:18,
marginTop:10
},

resultsBox:{
backgroundColor:"#1C1C1E",
marginTop:10,
borderRadius:15,
maxHeight:250
},

result:{
padding:15,
borderBottomWidth:1,
borderBottomColor:"#333"
},

resultText:{
color:"#fff"
}

})
