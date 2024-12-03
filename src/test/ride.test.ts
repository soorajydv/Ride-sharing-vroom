//integration testing

import request from "supertest";
import { app } from "../index";
import { dbConnection } from "../utils/dbConnection";
import { ObjectId } from "mongodb";

const testRideData = {
  rideId: new ObjectId().toString(),
  pickupLocation: { lat: 34.0522, lon: -118.2437 },
  dropoffLocation: { lat: 34.0522, lon: -118.2437 },
  rideType: "economy",
  status: "pending",
  requestedAt: new Date().toISOString(),
  passengerId: new ObjectId(),
  acceptedBy: null as null,
};

const testPassengerData = {
  _id: new ObjectId(),
  username: "diwas",
};

const testDriverData = {
  _id: new ObjectId(),
  username: "sooraj",
};

// Setup DB before tests
beforeAll(async () => {
  const db = await dbConnection();
  const ridesCollection = db.collection("rides");
  const usersCollection = db.collection("users");

  // Insert test passenger and driver
  await usersCollection.insertOne(testPassengerData);
  await usersCollection.insertOne(testDriverData);

  // Insert a test ride
  await ridesCollection.insertOne({
    ...testRideData,
    passengerId: testPassengerData._id,
    acceptedBy: testDriverData._id,
  });
});

// Test Cleanup after tests
afterAll(async () => {
  const db = await dbConnection();
  const ridesCollection = db.collection("rides");
  const usersCollection = db.collection("users");

  // Drop test data
  await ridesCollection.deleteMany({});
  await usersCollection.deleteMany({});
});

describe("GET /rides/:rideId", () => {
  it("should return 200 and valid ride details for a valid rideId", async () => {
    const res = await request(app).get(`/api/rides/${testRideData.rideId}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Ride details fetched successfully.");
    expect(res.body.rideDetails).toHaveProperty("rideId", testRideData.rideId);
    expect(res.body.rideDetails.passenger).toHaveProperty(
      "id",
      testPassengerData._id.toString()
    );
    expect(res.body.rideDetails.acceptedBy).toHaveProperty(
      "id",
      testDriverData._id.toString()
    );
  });

  it("should return 400 for invalid rideId format", async () => {
    const res = await request(app).get("/rides/invalidRideId");

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Invalid ride ID format.");
  });

  it("should return 404 if ride is not found", async () => {
    const nonExistingRideId = new ObjectId().toString();
    const res = await request(app).get(`/rides/${nonExistingRideId}`);

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Ride not found.");
  });

  it("should return 400 for invalid validation (invalid ride details format)", async () => {
    const res = await request(app).get(`/rides/${testRideData.rideId}`).send({
      // Send an invalid format
      invalidValue: "test",
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Validation failed");
    expect(res.body.details).toContainEqual(
      expect.objectContaining({
        message: "Invalid date format",
      })
    );
  });
});
