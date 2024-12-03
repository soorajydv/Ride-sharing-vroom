import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";

// Extend the Request interface to include the user property
declare module "express-serve-static-core" {
  interface Request {
    user?: IUser;
  }
}

interface IUser {
  username: string;
}

// JWT Authentication Middleware
export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const token = req.headers["authorization"]?.split(" ")[1];

  if (!token) {
    res.status(401).json({ error: "Access token is required" });
    return; // Terminate the middleware execution
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;

    if (typeof decoded === "object" && decoded.username) {
      req.user = { username: decoded.username };
      next(); // Pass control to the next middleware/route handler
    } else {
      throw new Error("Token payload does not contain valid user info");
    }
  } catch (err) {
    res.status(401).json({ error: "Invalid or expired access token" });
    return; // Terminate the middleware execution
  }
};
