import { io } from "../index";
import jwt, { JwtPayload } from "jsonwebtoken";

export const driverSockets: { username: string; socketId: string }[] = [];
export const passengerSockets: { username: string; socketId: string }[] = [];

export function socketServer() {
  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    // Listen to the 'ride:join' event from the client
    socket.on("ride:join", (data) => {
      const { rideId } = data;

      if (!rideId) {
        console.error("No rideId provided in 'ride:join' event.");
        return;
      }
    });

    const token = socket.handshake.query.token as string;

    // Check if the token is provided
    if (!token) {
      socket.emit("error", {
        message: "Authentication token is required.",
        code: 401,
        timestamp: new Date().toISOString(),
      });
      console.log(
        "Connection rejected: No token provided for socket:",
        socket.id
      );
      socket.disconnect();
      return;
    }

    try {
      // Verify the token
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;

      if (decoded && decoded.username) {
        const username = decoded.username;
        const role = decoded.userType;

        console.log(username, role);

        if (role === "driver") {
          // Push the socket data to driverSockets array
          driverSockets.push({ username, socketId: socket.id });
          console.log(
            `Driver ${username} connected with socket ID: ${socket.id}`
          );
        } else if (role === "passenger") {
          passengerSockets.push({ username, socketId: socket.id });
          console.log(
            `Passenger ${username} connected with socket ID: ${socket.id}`
          );
        } else {
          console.log("Unrecognized role:", role);
          socket.emit("error", {
            message: "Unrecognized role in token.",
            code: 400,
            timestamp: new Date().toISOString(),
          });
          socket.disconnect();
          return;
        }
      } else {
        throw new Error("Invalid token payload. Missing 'username' field.");
      }
    } catch (error) {
      socket.emit("error", {
        message:
          error instanceof Error ? error.message : "Token verification failed.",
        code: 401,
        timestamp: new Date().toISOString(),
      });
      console.error("JWT verification error for socket:", socket.id, error);
      socket.disconnect();
      return;
    }

    socket.on("disconnect", () => {
      if (driverSockets.length > 0) {
        const driverIndex = driverSockets.findIndex(
          (driver) => driver.socketId === socket.id
        );
        if (driverIndex !== -1) {
          console.log(
            `Driver ${driverSockets[driverIndex].username} disconnected`
          );
          driverSockets.splice(driverIndex, 1);
        }
      }

      if (passengerSockets.length > 0) {
        const passengerIndex = passengerSockets.findIndex(
          (passenger) => passenger.socketId === socket.id
        );
        if (passengerIndex !== -1) {
          console.log(
            `Passenger ${passengerSockets[passengerIndex].username} disconnected`
          );
          passengerSockets.splice(passengerIndex, 1);
        }
      }
    });
  });
}
