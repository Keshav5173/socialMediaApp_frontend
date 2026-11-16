import { io } from "socket.io-client";

export function connectWebSocket(){
    return io(import.meta.env.VITE_SOCKET_URL, {
        withCredentials: true,
    })
}