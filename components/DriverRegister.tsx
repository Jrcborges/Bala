import React, { useState } from "react"
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native"
import { supabase } from "../lib/supabase"

type Props = {
onComplete: () => void
}

export default function DriverRegister({ onComplete }: Props) {

const [vehicleType,setVehicleType]=useState("")
const [vehicleModel,setVehicleModel]=useState("")
const [plate,setPlate]=useState("")
const [color,setColor]=useState("")

const registerDriver = async () => {

const { data } = await supabase.auth.getUser()
const user = data.user

if(!user) return

const { error } = await supabase
.from("drivers")
.insert({
id:user.id,
vehicle_type:vehicleType,
vehicle_model:vehicleModel,
plate:plate,
vehicle_color:color
})

if(error){

console.log("Error registrando conductor",error)

}else{

console.log("Conductor registrado")

onComplete()

}

}

return(

<View style={styles.container}>

<Text style={styles.title}>Registro de conductor</Text>

<TextInput
placeholder="Tipo de vehículo (carro, moto...)"
style={styles.input}
value={vehicleType}
onChangeText={setVehicleType}
/>

<TextInput
placeholder="Modelo del vehículo"
style={styles.input}
value={vehicleModel}
onChangeText={setVehicleModel}
/>

<TextInput
placeholder="Matrícula"
style={styles.input}
value={plate}
onChangeText={setPlate}
/>

<TextInput
placeholder="Color"
style={styles.input}
value={color}
onChangeText={setColor}
/>

<TouchableOpacity
style={styles.button}
onPress={registerDriver}
>

<Text style={{color:"#fff"}}>
Activar modo conductor
</Text>

</TouchableOpacity>

</View>

)

}

const styles = StyleSheet.create({

container:{
position:"absolute",
bottom:0,
width:"100%",
backgroundColor:"#fff",
padding:20,
borderTopLeftRadius:20,
borderTopRightRadius:20
},

title:{
fontSize:18,
fontWeight:"600",
marginBottom:15
},

input:{
borderWidth:1,
borderColor:"#ddd",
borderRadius:10,
padding:10,
marginBottom:10
},

button:{
backgroundColor:"#2ECC71",
padding:15,
borderRadius:10,
alignItems:"center"
}

})
