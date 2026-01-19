import { useEffect, useState, useContext } from "react";
import { AuthContext } from "../contexts/AuthContext";

const WS_URL = "ws://localhost:8080";

export const useSocket = () => {
    const [socket, setSocket] = useState<WebSocket | null>(null);
    const { token } = useContext(AuthContext);

    useEffect(() => {
        if (!token) {
            // No token, don't connect
            setSocket(null);
            return;
        }

        // Connect with token in query params
        const ws = new WebSocket(`${WS_URL}?token=${token}`);
        
        ws.onopen = () => {
            console.log('WebSocket connected');
            setSocket(ws);
        }

        ws.onclose = () => {
            console.log('WebSocket disconnected');
            setSocket(null);
        }

        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        }

        return () => {
            ws.close();
        }
    }, [token])

    return socket;  
}