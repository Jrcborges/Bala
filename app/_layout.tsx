import { AuthProvider, useAuth } from '@/providers/AuthProviders'
import { Redirect, Slot } from 'expo-router'
import { Text } from "react-native"
import { GestureHandlerRootView } from 'react-native-gesture-handler'

function RootNavigator() {
  const { session, loading } = useAuth()

  if (loading) {
    return(
      <GestureHandlerRootView style={{flex:1,justifyContent:"center",alignItems:"center"}}>
        <Text>Cargando...</Text>
      </GestureHandlerRootView>
    )
  }

  if (!session) {
    return <Redirect href="/(auth)/login" />
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