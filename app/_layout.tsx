import { AuthProvider, useAuth } from '@/providers/AuthProviders'
import { Stack } from 'expo-router'
import { GestureHandlerRootView } from 'react-native-gesture-handler'

function RootNavigator() {
    const { session, loading } = useAuth()

    console.log(session)
    if (loading) return null

    return (
        <Stack screenOptions={{headerShown:false}}>
            {!session?(
                <Stack.Screen name="(auth)"/>
            ):(
                <Stack.Screen name="index"/>
            )}
        </Stack>
    );
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