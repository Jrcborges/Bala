import { supabase } from '@/lib/supabase'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { Button, Pressable, Text, TextInput, View } from 'react-native'

export default function Register() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const router = useRouter()

    const onRegister = async () => {
        const { error } = await supabase.auth.signUp({
        email,
        password,
        })

        if (error) {
        alert(error.message)
        return
        }

        alert('Cuenta creada correctamente')
        
    }

    return (
        <View style={{ padding: 20,paddingTop:250 }}>
        <Text style={{ fontSize: 28, fontWeight: 'bold', marginBottom: 20 }}>
            Crear cuenta
        </Text>

        <Text>Email</Text>
        <TextInput
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            style={{ borderWidth: 1, padding: 10, marginBottom: 15 }}
        />

        <Text>Password</Text>
        <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            style={{ borderWidth: 1, padding: 10, marginBottom: 20 }}
        />

        <Button title="Crear cuenta" onPress={onRegister} />

        {/* Volver al login */}
        <Pressable onPress={() => router.back()}>
            <Text style={{ marginTop: 20, textAlign: 'center' }}>
            ¿Ya tienes cuenta? <Text style={{ fontWeight: 'bold' }}>Inicia sesión</Text>
            </Text>
        </Pressable>
        </View>
    )
}