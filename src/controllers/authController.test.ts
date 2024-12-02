import { signup, login } from "../controllers/authController";
import { Request, Response } from "express";
import { dbConnection } from "../utils/dbConnection";
import { generateTokens } from "../utils/tokenGenerator";
import bcrypt from "bcrypt";
import { signupSchema, loginSchema } from "../validation/auth";
import { handleZodError } from "../utils/zodErrorHandler";

// Mock external dependencies
jest.mock("../utils/dbConnection");
jest.mock("../utils/tokenGenerator");
jest.mock("bcrypt");
jest.mock("../validation/auth", () => ({
  signupSchema: { parse: jest.fn() },
  loginSchema: { parse: jest.fn() },
}));
jest.mock("../utils/zodErrorHandler");

describe("Auth Controller", () => {
  let mockDb: any;
  let mockCollection: any;

  beforeEach(() => {
    // Mock the database collection
    mockCollection = {
      findOne: jest.fn(),
      insertOne: jest.fn(),
      updateOne: jest.fn(),
    };
    mockDb = {
      collection: jest.fn().mockReturnValue(mockCollection),
    };
    (dbConnection as jest.Mock).mockResolvedValue(mockDb);

    // Mock token generation
    (generateTokens as jest.Mock).mockReturnValue({
      accessToken: "access-token",
      refreshToken: "refresh-token",
    });

    // Mock bcrypt hashing and comparison
    (bcrypt.hash as jest.Mock).mockResolvedValue("hashed-password");
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("signup", () => {
    it("should create a new user and return tokens", async () => {
      const req = {
        body: {
          username: "testuser",
          password: "password123",
          userType: "user",
        },
      } as Request;

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as unknown as Response;

      // Mock successful validation
      (signupSchema.parse as jest.Mock).mockReturnValue(req.body);

      // Mock the database response for an existing user
      mockCollection.findOne.mockResolvedValue(null);

      // Call the signup controller
      await signup(req, res);

      // Verify that the collection method was called
      expect(mockDb.collection).toHaveBeenCalledWith("users");
      expect(mockCollection.insertOne).toHaveBeenCalledWith({
        username: req.body.username,
        password: "hashed-password",
        userType: req.body.userType,
        refreshToken: "refresh-token",
      });

      // Verify token generation
      expect(generateTokens).toHaveBeenCalledWith(
        req.body.username,
        req.body.userType
      );

      // Verify response status and tokens
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        accessToken: "access-token",
        refreshToken: "refresh-token",
      });
    });

    it("should return 409 if the username already exists", async () => {
      const req = {
        body: {
          username: "existinguser",
          password: "password123",
          userType: "user",
        },
      } as Request;

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as unknown as Response;

      // Mock the validation
      (signupSchema.parse as jest.Mock).mockReturnValue(req.body);

      // Mock an existing user in the database
      mockCollection.findOne.mockResolvedValue({ username: "existinguser" });

      await signup(req, res);

      // Verify that the response status is 409
      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        error: "Username already exists",
      });
    });

    it("should return 400 if validation fails", async () => {
      const req = {
        body: {},
      } as Request;

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as unknown as Response;

      // Mock validation failure
      (signupSchema.parse as jest.Mock).mockImplementation(() => {
        throw new Error("Validation error");
      });

      await signup(req, res);

      // Verify that the response status is 400
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "Validation error" });
    });
  });

  describe("login", () => {
    it("should return tokens for valid credentials", async () => {
      const req = {
        body: {
          username: "testuser",
          password: "password123",
        },
      } as Request;

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as unknown as Response;

      // Mock successful validation
      (loginSchema.parse as jest.Mock).mockReturnValue(req.body);

      // Mock database user lookup
      mockCollection.findOne.mockResolvedValue({
        username: req.body.username,
        password: "hashed-password",
        userType: "user",
      });

      // Call the login controller
      await login(req, res);

      // Verify that bcrypt.compare was called
      expect(bcrypt.compare).toHaveBeenCalledWith(
        req.body.password,
        "hashed-password"
      );

      // Verify token generation
      expect(generateTokens).toHaveBeenCalledWith(req.body.username, "user");

      // Verify response status and tokens
      expect(res.json).toHaveBeenCalledWith({
        accessToken: "access-token",
        refreshToken: "refresh-token",
      });
    });

    it("should return 401 if credentials are invalid", async () => {
      const req = {
        body: {
          username: "testuser",
          password: "wrongpassword",
        },
      } as Request;

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as unknown as Response;

      // Mock successful validation
      (loginSchema.parse as jest.Mock).mockReturnValue(req.body);

      // Mock database user lookup
      mockCollection.findOne.mockResolvedValue({
        username: req.body.username,
        password: "hashed-password",
        userType: "user",
      });

      // Mock bcrypt comparison failure
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await login(req, res);

      // Verify that the response status is 401
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: "Invalid credentials" });
    });

    it("should return 400 if validation fails", async () => {
      const req = {
        body: {},
      } as Request;

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as unknown as Response;

      // Mock validation failure
      (loginSchema.parse as jest.Mock).mockImplementation(() => {
        throw new Error("Validation error");
      });

      await login(req, res);

      // Verify that the response status is 400
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "Validation error" });
    });
  });
});
