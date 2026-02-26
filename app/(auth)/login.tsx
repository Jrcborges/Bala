import { supabase } from '@/lib/supabase'
import { userAuthStore } from '@/store/authStore'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { Button, Pressable, Text, TextInput, View } from 'react-native'

export default function Login() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const setUser = userAuthStore(s => s.setUser)
    const router = useRouter()

    

    const onLogin = async () => {
        const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
        })

        if (error) {
        alert(error.message)
        return
        }
        
        router.replace('/')

        
    }

    return (
        <View style={{ padding: 20,paddingTop:300 }}>
        <Text style={{ fontSize: 28, fontWeight: 'bold', marginBottom: 20 }}>
            Log in
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

        <Button title="Log in" onPress={onLogin} />

        {/* Link a registro */}
        <Pressable onPress={() => router.push('/(auth)/register')}>
            <Text style={{ marginTop: 20, textAlign: 'center' }}>
            ¿No tienes cuenta? <Text style={{ fontWeight: 'bold' }}>Crear cuenta</Text>
            </Text>
        </Pressable>
        </View>
    )
    }