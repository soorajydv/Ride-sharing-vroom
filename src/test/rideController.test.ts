import {
  createRideRequest,
  updateRideStatus,
} from "../controllers/rideController";
import { Request, Response } from "express";
import { dbConnection } from "../utils/dbConnection";
import { Db, ObjectId } from "mongodb";
import { io } from "../index";

jest.mock("../utils/dbConnection");
jest.mock("../index", () => ({
  io: { emit: jest.fn(), sockets: { sockets: new Map() } },
}));
jest.mock("mongodb", () => ({
  ObjectId: jest.fn(),
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
          pickupLocation: { lat: 40.7128, lon: -74.006 },
          dropoffLocation: { lat: 34.0522, lon: -118.2437 },
          rideType: "economy",
          acceptedBy: null,
        },
        user: { username: "testUser" },
      } as unknown as Request;

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as unknown as Response;

      const mockInsertedId = new ObjectId();
      mockCollection.insertOne.mockResolvedValue({
        insertedId: mockInsertedId,
      });

      mockCollection.findOne.mockResolvedValue({
        _id: new ObjectId(),
        username: "testUser",
      });

      console.log("Mock request body:", req.body);
      console.log("Mock user:", req.user);

      await createRideRequest(req, res);

      // Debugging mocks
      console.log("Collection mock calls:", mockDb.collection.mock.calls);
      console.log("InsertOne mock calls:", mockCollection.insertOne.mock.calls);

      // Verify collection method call for "rides"
      expect(mockDb.collection).toHaveBeenCalledWith("rides");
      expect(mockCollection.insertOne).toHaveBeenCalledWith(
        expect.objectContaining({
          pickupLocation: req.body.pickupLocation,
          dropoffLocation: req.body.dropoffLocation,
          status: "pending",
          rideType: "economy",
          acceptedBy: null,
        })
      );

      // Verify event emission
      expect(io.emit).toHaveBeenCalledWith("ride:request", {
        rideId: mockInsertedId.toString(),
        passengerName: req.user.username,
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
  });

  describe("updateRideStatus", () => {
    let mockDb: Db;
    let mockCollection: any;
    let mockUsersCollection: any;

    beforeEach(() => {
      // Create mocks for collections
      mockCollection = {
        findOne: jest.fn(),
        updateOne: jest.fn(),
      };

      mockUsersCollection = {
        findOne: jest.fn(),
      };

      // Create a mock for dbConnection
      mockDb = {
        collection: jest.fn().mockImplementation((name: string) => {
          if (name === "rides") return mockCollection;
          if (name === "users") return mockUsersCollection;
          return null;
        }),
      } as unknown as Db;

      // Mock dbConnection to return mockDb
      (dbConnection as jest.Mock).mockResolvedValue(mockDb);
    });

    it("should update ride status and emit an event", async () => {
      const rideId = "64e9fda99b8f2c0f12345678";
      const driverId = "64e9fda99b8f2c0f87654321";
      const passengerId = "64e9fda99b8f2c0f98765432";
      const username = "driverUsername";
      const rideMock = {
        _id: new ObjectId(rideId),
        passengerId: new ObjectId(passengerId),
      };
      const driverMock = { _id: new ObjectId(driverId), username };
      const passengerMock = { _id: new ObjectId(passengerId) };

      const req = {
        params: { rideId },
        body: { status: "accepted" },
        user: { username }, // Mocked user from JWT token
      } as unknown as Request;

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as unknown as Response;

      // Mock database responses
      mockCollection.findOne.mockResolvedValueOnce(rideMock); // Mock the ride
      mockUsersCollection.findOne.mockResolvedValueOnce(driverMock); // Mock the driver
      mockUsersCollection.findOne.mockResolvedValueOnce(passengerMock); // Mock the passenger
      mockCollection.updateOne.mockResolvedValueOnce({ modifiedCount: 1 }); // Simulate successful update

      console.log("Mock ride ID:", rideId);
      console.log("Mock request body:", req.body);

      await updateRideStatus(req, res);

      // Debugging mocks and flow
      console.log("FindOne mock calls:", mockCollection.findOne.mock.calls);
      console.log("UpdateOne mock calls:", mockCollection.updateOne.mock.calls);

      // Verify the findOne calls for ride and users
      expect(mockCollection.findOne).toHaveBeenCalledWith({
        _id: new ObjectId(rideId),
      });
      expect(mockUsersCollection.findOne).toHaveBeenCalledWith({
        username: username,
      });

      // Verify collection method call for updateOne
      expect(mockCollection.updateOne).toHaveBeenCalledWith(
        { _id: new ObjectId(rideId) },
        {
          $set: {
            status: "accepted",
            acceptedBy: driverId,
          },
        }
      );

      // Verify response status and message
      expect(res.json).toHaveBeenCalledWith({
        message: "Ride status updated successfully.",
        rideId,
        driverSocketId: undefined, // Assuming socket IDs are mocked
        status: "accepted",
      });

      // Verify event emission (you can add more checks for the emit logic if needed)
      // Assuming you are using the "io" object for socket emissions
      expect(io.emit).toHaveBeenCalledWith(`ride:${rideId}`, {
        rideId,
        status: "accepted",
        message: "The ride status has been updated to accepted.",
        timestamp: expect.any(String),
      });
    });
  });
});
