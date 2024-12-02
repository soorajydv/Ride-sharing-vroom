// src/types.d.ts or src/middleware/types.d.ts
import { Request } from "express";

declare global {
  namespace Express {
    interface Request {
      user?: { username: string }; // Adjust the type based on the decoded JWT payload
    }
  }
}
