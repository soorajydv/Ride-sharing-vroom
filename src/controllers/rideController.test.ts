import {
  createRideRequest,
  updateRideStatus,
} from "../controllers/rideController";
import { Request, Response } from "express";
import { dbConnection } from "../utils/dbConnection";
import { ObjectId } from "mongodb";
import { io } from "../index";
import { rideRequestSchema, rideStatusUpdateSchema } from "../validation/ride";

jest.mock("../utils/dbConnection");
jest.mock("../index", () => ({
  io: { emit: jest.fn(), sockets: { sockets: new Map() } },
}));

describe("Ride Controller", () => {
  let mockDb: any;
  let mockCollection: any;

  beforeEach(() => {
    // Mock the collection method to return a mocked collection with necessary methods
    mockCollection = {
      insertOne: jest.fn(),
      updateOne: jest.fn(),
      findOne: jest.fn(),
    };
    mockDb = {
      collection: jest.fn().mockReturnValue(mockCollection),
    };
    (dbConnection as jest.Mock).mockResolvedValue(mockDb);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("createRideRequest", () => {
    it("should create a new ride request and emit an event", async () => {
      const req = {
        body: {
          userId: "64e9fda99b8f2c0f12345678",
          pickupLocation: "123 Main Street, Cityville",
          dropoffLocation: "456 Elm Street, Townville",
        },
      } as Request;

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as unknown as Response;

      const mockInsertedId = new ObjectId();
      mockCollection.insertOne.mockResolvedValue({
        insertedId: mockInsertedId,
      });

      await createRideRequest(req, res);

      // Verify collection method call for "rides"
      expect(mockDb.collection).toHaveBeenCalledWith("rides");
      expect(mockCollection.insertOne).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: req.body.userId,
          pickupLocation: req.body.pickupLocation,
          dropoffLocation: req.body.dropoffLocation,
          status: "pending",
        })
      );

      // Verify event emission
      expect(io.emit).toHaveBeenCalledWith("ride:request", {
        rideId: mockInsertedId.toString(),
        passengerId: req.body.userId,
        pickup: req.body.pickupLocation,
        destination: req.body.dropoffLocation,
        message: "A new ride request is available.",
        timestamp: expect.any(String),
      });

      // Verify response status and message
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: "Ride request successfully created.",
        rideId: mockInsertedId.toString(),
        status: "pending",
        requestedAt: expect.any(String),
      });
    });

    it("should return 400 if validation fails", async () => {
      const req = { body: {} } as Request; // Missing required fields
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as unknown as Response;

      jest.spyOn(rideRequestSchema, "parse").mockImplementation(() => {
        throw new Error("Validation error");
      });

      await createRideRequest(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "Validation error" });
    });
  });

  describe("updateRideStatus", () => {
    it("should update ride status and emit an event", async () => {
      const rideId = "64e9fda99b8f2c0f12345678";
      const req = {
        params: { rideId },
        body: { status: "accepted", userId: "driverId123" },
      } as unknown as Request;

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as unknown as Response;

      const rideMock = { _id: new ObjectId(rideId), acceptedBy: null } as {
        _id: ObjectId;
        acceptedBy: string | null;
      };

      mockCollection.findOne.mockResolvedValue(rideMock);
      mockCollection.updateOne.mockResolvedValue({ modifiedCount: 1 });

      await updateRideStatus(req, res);

      // Verify collection method call for updateOne
      expect(mockDb.collection).toHaveBeenCalledWith("rides");
      expect(mockCollection.updateOne).toHaveBeenCalledWith(
        { _id: new ObjectId(rideId) },
        {
          $set: {
            status: "accepted",
            acceptedBy: req.body.userId,
          },
        }
      );

      // Verify event emission
      expect(io.emit).toHaveBeenCalledWith(`ride:${rideId}`, {
        rideId,
        status: "accepted",
        message: "The ride status has been updated to accepted.",
        timestamp: expect.any(String),
      });

      // Verify response status and message
      expect(res.json).toHaveBeenCalledWith({
        message: "Ride status updated successfully.",
        rideId,
        driverSocketId: undefined, // Mocked sockets are not connected in this test
        status: "accepted",
      });
    });

    it("should return 404 if ride is not found", async () => {
      const req = {
        params: { rideId: "64e9fda99b8f2c0f12345678" },
        body: { status: "accepted", userId: "driverId123" },
      } as unknown as Request;

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as unknown as Response;

      mockCollection.findOne.mockResolvedValue(null);

      await updateRideStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: "Ride not found" });
    });
  });
});
