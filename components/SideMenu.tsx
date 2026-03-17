import React from "react"
import { View, Text, TouchableOpacity, StyleSheet } from "react-native"

type Props = {
visible:boolean
onClose:()=>void
onDriverPress:()=>void
}

export default function SideMenu({visible,onClose,onDriverPress}:Props){

if(!visible) return null

return(

<View style={styles.overlay}>

<View style={styles.menu}>

<Text style={styles.title}>Menú</Text>

<TouchableOpacity
style={styles.item}
onPress={onDriverPress}
>
<Text style={styles.text}>🚗 Ser conductor</Text>
</TouchableOpacity>

<TouchableOpacity
style={styles.item}
onPress={onClose}
>
<Text style={styles.text}>Cerrar</Text>
</TouchableOpacity>

</View>

<TouchableOpacity
style={styles.background}
onPress={onClose}
/>

</View>

)

}

const styles = StyleSheet.create({

overlay:{
position:"absolute",
width:"100%",
height:"100%",
flexDirection:"row",
zIndex:999
},

menu:{
width:260,
backgroundColor:"#fff",
padding:20,
height:"100%"
},

title:{
fontSize:20,
fontWeight:"600",
marginBottom:20
},

item:{
paddingVertical:15
},

text:{
fontSize:16
},

background:{
flex:1,
backgroundColor:"rgba(0,0,0,0.4)"
}

})
