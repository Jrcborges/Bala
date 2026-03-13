import { supabase } from "@/lib/supabase"
import { useRouter } from "expo-router"
import { useState } from "react"
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View, Image } from "react-native"

export default function LoginScreen() {

const [phone,setPhone] = useState("")
const [password,setPassword] = useState("")
const [loading,setLoading] = useState(false)

const router = useRouter()

const normalizePhone = (num)=>{
return "+53" + num.replace(/\D/g,"")
}

const handleLogin = async ()=>{

if(!phone || !password){
return Alert.alert("Error","Completa todos los campos")
}

const normalizedPhone = normalizePhone(phone)

const email = normalizedPhone + "@bala.app"

setLoading(true)

const { error } = await supabase.auth.signInWithPassword({
email,
password
})

setLoading(false)

if(error){
Alert.alert("Error",error.message)
}

}

return(

<View style={styles.container}>

<Image
source={require("../../assets/imágenes/bala.png")}
style={styles.logo}
/>

<Text style={styles.title}>Entrar</Text>

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
onPress={handleLogin}
disabled={loading}
>
<Text style={styles.buttonText}>
{loading ? "Entrando..." : "Entrar"}
</Text>
</TouchableOpacity>

<TouchableOpacity
style={{marginTop:20}}
onPress={()=>router.push("/(auth)/register")}
>
<Text style={styles.link}>
Crear cuenta
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
},

link:{
color:"#ff6a00",
fontWeight:"bold"
}

})
