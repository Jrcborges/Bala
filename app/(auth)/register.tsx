import { supabase } from "@/lib/supabase"
import { useRouter } from "expo-router"
import { useState } from "react"
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View, Image } from "react-native"

export default function RegisterScreen(){

const [name,setName] = useState("")
const [phone,setPhone] = useState("")
const [password,setPassword] = useState("")
const [loading,setLoading] = useState(false)

const router = useRouter()

const normalizePhone = (num)=>{
return "+53" + num.replace(/\D/g,"")
}

const handleRegister = async ()=>{

if(!name || !phone || !password){
return Alert.alert("Completa todos los campos")
}

const normalizedPhone = normalizePhone(phone)

const email = normalizedPhone + "@bala.app"

const { data:existing } = await supabase
.from("profiles")
.select("phone")
.eq("phone",normalizedPhone)
.maybeSingle()

if(existing){
return Alert.alert("Este número ya tiene una cuenta")
}

setLoading(true)

const { data,error } = await supabase.auth.signUp({
email,
password
})

if(error){
setLoading(false)
return Alert.alert("Error",error.message)
}

await supabase.from("profiles").insert({
id:data.user.id,
name:name,
phone:normalizedPhone
})

setLoading(false)

Alert.alert("Cuenta creada")

router.replace("/")

}

return(

<View style={styles.container}>

<Image
source={require("../../assets/imágenes/bala.png")}
style={styles.logo}
/>

<Text style={styles.title}>Crear cuenta</Text>

<TextInput
placeholder="Nombre"
style={styles.input}
value={name}
onChangeText={setName}
/>

<TextInput
placeholder="Número de teléfono"
style={styles.input}
keyboardType="phone-pad"
value={phone}
onChangeText={setPhone}
/>

<TextInput
placeholder="Contraseña"
style={styles.input}
secureTextEntry
value={password}
onChangeText={setPassword}
/>

<TouchableOpacity
style={styles.button}
onPress={handleRegister}
disabled={loading}
>
<Text style={styles.buttonText}>
{loading ? "Creando..." : "Crear cuenta"}
</Text>
</TouchableOpacity>

</View>

)
}

const styles = StyleSheet.create({

container:{
flex:1,
justifyContent:"center",
alignItems:"center",
padding:20,
backgroundColor:"#fff"
},

logo:{
width:220,
height:90,
resizeMode:"contain",
marginBottom:40
},

title:{
fontSize:26,
fontWeight:"bold",
marginBottom:30
},

input:{
width:"100%",
padding:15,
borderWidth:1,
borderColor:"#ddd",
borderRadius:12,
marginBottom:20,
fontSize:16
},

button:{
backgroundColor:"#ff6a00",
padding:16,
borderRadius:12,
width:"100%"
},

buttonText:{
color:"#fff",
fontWeight:"bold",
textAlign:"center",
fontSize:16
}

})
