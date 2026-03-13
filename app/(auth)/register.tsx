import { supabase } from "@/lib/supabase"
import { useState } from "react"
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View, Image } from "react-native"

export default function RegisterScreen(){

const [name,setName] = useState("")
const [phone,setPhone] = useState("")
const [code,setCode] = useState("")
const [step,setStep] = useState(1)
const [loading,setLoading] = useState(false)
const [cooldown,setCooldown] = useState(false)

const normalizePhone = (num)=>{
return "+53" + num.replace(/\D/g,"")
}

const sendCode = async ()=>{

if(!name || !phone){
return Alert.alert("Completa todos los campos")
}

if(cooldown){
return Alert.alert("Espera 60 segundos para pedir otro código")
}

const normalizedPhone = normalizePhone(phone)

const { data:existing } = await supabase
.from("profiles")
.select("phone")
.eq("phone",normalizedPhone)
.maybeSingle()

if(existing){
return Alert.alert("Este número ya tiene una cuenta")
}

setLoading(true)

const { error } = await supabase.auth.signInWithOtp({
phone: normalizedPhone
})

setLoading(false)

if(error){
Alert.alert("Error",error.message)
}else{

setCooldown(true)

setTimeout(()=>{
setCooldown(false)
},60000)

setStep(2)

}

}

const verifyCode = async ()=>{

if(!code){
return Alert.alert("Ingresa el código")
}

const normalizedPhone = normalizePhone(phone)

setLoading(true)

const { data,error } = await supabase.auth.verifyOtp({
phone: normalizedPhone,
token: code,
type:"sms"
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

}

return(

<View style={styles.container}>

<Image
source={require("../../assets/bala.png")}
style={styles.logo}
/>

<Text style={styles.title}>Crear cuenta</Text>

{step === 1 && (

<>

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

<TouchableOpacity
style={styles.button}
onPress={sendCode}
disabled={loading}
>
<Text style={styles.buttonText}>
{loading ? "Enviando..." : "Enviar código"}
</Text>
</TouchableOpacity>

</>

)}

{step === 2 && (

<>

<TextInput
placeholder="Código SMS"
style={styles.input}
keyboardType="number-pad"
value={code}
onChangeText={setCode}
/>

<TouchableOpacity
style={styles.button}
onPress={verifyCode}
disabled={loading}
>
<Text style={styles.buttonText}>
{loading ? "Verificando..." : "Confirmar"}
</Text>
</TouchableOpacity>

</>

)}

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
