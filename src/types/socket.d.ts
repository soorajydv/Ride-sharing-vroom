// src/types/socket.d.ts
import Socket from "socket.io";

declare module "socket.io" {
  interface Socket {
    user?: { username: string }; // Add your custom user data type
  }
}
