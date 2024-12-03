import { Request, Response } from "express";
import { dbConnection } from "../utils/dbConnection";
import { ObjectId } from "mongodb";
import { driverSockets, passengerSockets } from "../websocket/webSocketServer";
import { rideRequestSchema, rideStatusUpdateSchema } from "../validation/ride";
import { io } from "../index";
import { handleZodError } from "../utils/zodErrorHandler";

export const getRideDetails = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { rideId } = req.params;

    // Validate the rideId format
    if (!ObjectId.isValid(rideId)) {
      return res.status(400).json({ error: "Invalid ride ID format." });
    }

    const db = await dbConnection();
    const ridesCollection = db.collection("rides");
    const usersCollection = db.collection("users");

    // Fetch ride details
    const ride = await ridesCollection.findOne({ _id: new ObjectId(rideId) });

    if (!ride) {
      return res.status(404).json({ error: "Ride not found." });
    }

    // Fetch passenger and driver details if available
    const passenger = await usersCollection.findOne({
      _id: new ObjectId(ride.passengerId),
    });
    const driver = ride.acceptedBy
      ? await usersCollection.findOne({ _id: new ObjectId(ride.acceptedBy) })
      : null;

    // Format the response
    const rideDetails = {
      rideId: ride._id.toString(),
      pickupLocation: ride.pickupLocation,
      dropoffLocation: ride.dropoffLocation,
      rideType: ride.rideType,
      status: ride.status,
      requestedAt: ride.requestedAt,
    };

    res.json({ message: "Ride details fetched successfully.", rideDetails });
  } catch (err) {
    const errorMessage = handleZodError(err);
    res.status(400).json({ error: errorMessage });
  }
};

export const createRideRequest = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    // Validate incoming data
    const validatedData = rideRequestSchema.parse(req.body);

    const db = await dbConnection();
    const ridesCollection = db.collection("rides");
    const userCollection = db.collection("users");

    const userName = req.user?.username;

    const user = await userCollection.findOne({ username: userName });
    const userId = user._id.toString();

    const newRide = {
      ...validatedData,
      passengerId: userId,
      status: "pending", // Initial status
      requestedAt: new Date().toISOString(),
    };

    const { insertedId } = await ridesCollection.insertOne(newRide);

    // Broadcast ride request to all connected drivers
    io.emit("ride:request", {
      rideId: insertedId.toString(),
      passengerName: req.user.username,
      pickup: validatedData.pickupLocation,
      destination: validatedData.dropoffLocation,
      message: "A new ride request is available.",
      timestamp: new Date().toISOString(),
    });

    res.status(201).json({
      message: "Ride request successfully created.",
      rideId: insertedId.toString(),
      status: newRide.status,
      requestedAt: newRide.requestedAt,
    });
  } catch (err) {
    const errorMessage = handleZodError(err);
    res.status(400).json({ error: errorMessage });
  }
};

export const updateRideStatus = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { rideId } = req.params;
    const validatedData = rideStatusUpdateSchema.parse(req.body);

    const db = await dbConnection();
    const ridesCollection = db.collection("rides");
    const usersCollection = db.collection("users");

    // Find the ride to update
    const ride = await ridesCollection.findOne({ _id: new ObjectId(rideId) });

    if (!ride) {
      return res.status(404).json({ error: "Ride not found" });
    }

    const drivername = req.user.username;
    const user = await usersCollection.findOne({ username: drivername });
    const userId = user._id.toString();

    const driverId = userId;
    const passengerId = ride.passengerId.toString();

    const driver = await usersCollection.findOne({
      _id: ObjectId.createFromHexString(driverId),
    });
    const passenger = await usersCollection.findOne({
      _id: ObjectId.createFromHexString(passengerId),
    });

    if (!driver || !passenger) {
      return res.status(404).json({ error: "Driver or Passenger not found" });
    }

    const driverName = driver.username;
    const passengerName = passenger.username;

    const ridestatus = validatedData.status;

    await ridesCollection.updateOne(
      { _id: new ObjectId(rideId) },
      {
        $set: {
          status: ridestatus,
          acceptedBy: driverId,
        },
      }
    );

    console.log(`Ride updated to ${ridestatus}`);

    // Find the driver and passenger socket IDs by their respective usernames
    const driverSocket = driverSockets.find(
      (driver) => driver.username === driverName
    );
    const passengerSocket = passengerSockets.find(
      (passenger) => passenger.username === passengerName
    );

    // Get the socket IDs if they exist
    const driverSocketId = driverSocket?.socketId;
    const passengerSocketId = passengerSocket?.socketId;

    // Log the socket IDs
    console.log("Driver Socket ID:", driverSocketId);
    console.log("Passenger Socket ID:", passengerSocketId);

    if (!driverSocketId || !passengerSocketId) {
      return res
        .status(400)
        .json({ error: "Driver or passenger not connected." });
    }

    // Create a room with the ride ID (so both the driver and passenger join this room)
    const rideRoom = `ride:${rideId}`;

    io.sockets.sockets.get(driverSocketId)?.join(rideRoom);
    io.sockets.sockets.get(passengerSocketId)?.join(rideRoom);

    console.log(`Driver and passenger joined the room: ${rideRoom}`);

    // Emit ride status update to both driver and passenger
    io.to(rideRoom).emit("ride:status:update", {
      rideId,
      status: ridestatus,
      message: `The ride status has been updated to ${ridestatus}.`,
      timestamp: new Date().toISOString(),
    });

    // Emit ride status update to both driver and passenger
    io.to(rideRoom).emit("ride:join", {
      rideId,
      status: "in-progress",
      message: `The driver is on the way.`,
      timestamp: new Date().toISOString(),
    });

    res.json({
      message: "Ride status updated successfully.",
      rideId,
      driverSocketId,
      status: ridestatus,
    });
  } catch (err) {
    const errorMessage = handleZodError(err);
    res.status(400).json({ error: errorMessage });
  }
};
