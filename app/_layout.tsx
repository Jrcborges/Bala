import { AuthProvider, useAuth } from '@/providers/AuthProviders'
import { Redirect, Slot } from 'expo-router'
import { GestureHandlerRootView } from 'react-native-gesture-handler'

function RootNavigator() {
  const { session, loading } = useAuth()

  if (loading) return null

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