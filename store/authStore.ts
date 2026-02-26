import { create } from 'zustand'

type User ={
    id:string
    email:string
} | null

type AuthState ={
    user: User | null
    setUser: (user:User | null)=>void
}

export const userAuthStore = create<AuthState>((set)=>({
    user:null,
    setUser:(user)=>set({user}),
}))