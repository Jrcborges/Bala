import { AuthProvider, useAuth } from '@/providers/AuthProviders'
import { Slot, useRouter, useSegments } from 'expo-router'
import { useEffect } from 'react'
import { Text } from "react-native"
import { GestureHandlerRootView } from 'react-native-gesture-handler'

function RootNavigator() {
  const { session, loading } = useAuth()
  const segments = useSegments()
  const router = useRouter()

  useEffect(() => {
    if (loading) return

    const inAuthGroup = segments[0] === "(auth)"

    if (!session && !inAuthGroup) {
      router.replace("/(auth)/login")
    }

    if (session && inAuthGroup) {
      router.replace("/")
    }
  }, [session, loading])

  if (loading) {
    return (
      <GestureHandlerRootView style={{flex:1,justifyContent:"center",alignItems:"center"}}>
        <Text>Cargando...</Text>
      </GestureHandlerRootView>
    )
  }

  return <Slot />
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <RootNavigator />
      </GestureHandlerRootView>
    </AuthProvider>
  )
}