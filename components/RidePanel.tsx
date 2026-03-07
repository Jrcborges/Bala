import React,{useRef} from "react"
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

}:any){

const panelY=useRef(new Animated.Value(height*0.65)).current

const panResponder=useRef(
PanResponder.create({

onMoveShouldSetPanResponder:(e,g)=>Math.abs(g.dy)>10,

onPanResponderMove:(e,g)=>{

let newY=height*0.65+g.dy

if(newY<100)newY=100
if(newY>height*0.75)newY=height*0.75

panelY.setValue(newY)

},

onPanResponderRelease:(e,g)=>{

if(g.dy<-80){

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

<View style={styles.inputs}>

<View style={styles.row}>

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

<TouchableOpacity
style={styles.action}
onPress={onConfirmPin}
>
<Text style={styles.actionText}>
📍 Fijar ubicación en el mapa
</Text>
</TouchableOpacity>

{results.length>0&&(

<View style={styles.results}>

{results.map((item:any,i:number)=>(
<TouchableOpacity
key={i}
style={styles.result}
onPress={()=>onSelectResult(item)}
>
<Text style={styles.resultText}>
{item.properties.name || "Dirección"}
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
height:height*0.8,
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

})
