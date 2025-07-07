import { useContext, createContext, useState, useEffect } from 'react';
import io from "socket.io-client";

const Context = createContext();
export const useConnection = () => useContext(Context);

export const Provider = ({ children }) => {

    const [connection, setConnection] = useState(null);
    
    
    const data = {
        connection,
    };

    useEffect(() => {
        fetch("/api/socket");

        const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3000", {
        transports: ["websocket"],
        secure: true,
        rejectUnauthorized: false,
        });

        socket.connect();

        socket.on('connect', () => {
            const storedUsername = localStorage.getItem("username");
            const storedEmail = localStorage.getItem("email");
            if (storedUsername && storedEmail) {
                socket.emit("login", { username: storedUsername });
                socket.emit("email", { username: storedEmail });
            }
            
      
            setConnection(socket);
        });
        

        return () => {
            socket.off('connect');
        };
    }, []);

    return (
        <Context.Provider value={{ ...data }}>
            {children}
        </Context.Provider>
    );
};

export default Context;
