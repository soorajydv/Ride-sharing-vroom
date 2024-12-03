import { Request, Response } from "express";
import bcrypt from "bcrypt";
import { signupSchema, loginSchema } from "../validation/auth";
import { dbConnection } from "../utils/dbConnection";
import { generateTokens } from "../middleware/tokenGenerator";
import { handleZodError } from "../utils/zodErrorHandler";

// Signup Controller
export const signup = async (req: Request, res: Response): Promise<any> => {
  try {
    const { username, password, userType } = signupSchema.parse(req.body);

    const db = await dbConnection();
    const usersCollection = db.collection("users");

    const existingUser = await usersCollection.findOne({ username });
    if (existingUser) {
      return res.status(409).json({ error: "Username already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const { accessToken, refreshToken } = generateTokens(username, userType);

    await usersCollection.insertOne({
      username,
      password: hashedPassword,
      userType,
      refreshToken,
    });

    res.status(201).json({ accessToken, refreshToken });
  } catch (err) {
    const errorMessage = handleZodError(err);
    res.status(400).json({ error: errorMessage });
  }
};

// Login Controller
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password } = loginSchema.parse(req.body);

    const db = await dbConnection();
    const usersCollection = db.collection("users");

    const user = await usersCollection.findOne({ username });
    if (!user) {
      res.status(401).json({ error: "Invalid credentials" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      res.status(401).json({ error: "Invalid credentials" });
    }

    const userType = user.userType;

    const { accessToken, refreshToken } = generateTokens(username, userType);
    await usersCollection.updateOne({ username }, { $set: { refreshToken } });

    res.json({ accessToken, refreshToken });
  } catch (err) {
    const errorMessage = handleZodError(err);
    res.status(400).json({ error: errorMessage });
  }
};
