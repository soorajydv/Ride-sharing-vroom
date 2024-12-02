import express, { Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";
import { swaggerDocs } from "./utils/swagger";
import { dbConnection } from "./utils/dbConnection";
import authRouter from "./routes/authRoute";
import rideRouter from "./routes/rideRoute";
import { authMiddleware } from "./middleware/authMiddleware";
import { socketServer } from "./websocket/webSocketServer";

dotenv.config();

const app = express();

app.use(express.json());

swaggerDocs(app, parseInt(process.env.PORT));

dbConnection();

app.get("/", (req, res) => {
  res.send("Hompage");
});

app.use("/api/auth", authRouter);
app.use("/api/rides", authMiddleware, rideRouter);

const server = createServer(app);
export const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

socketServer();

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Socket.IO server running on ws://localhost:${PORT}`);
});
