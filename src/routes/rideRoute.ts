import { Router } from "express";
import {
  createRideRequest,
  updateRideStatus,
} from "../controllers/rideController";
import { authMiddleware } from "../middleware/authMiddleware";

/**
 * @swagger
 * tags:
 *   name: Ride
 *   description: Ride management APIs
 */

const router = Router();

/**
 * @swagger
 * /ride/request:
 *   post:
 *     summary: Create a new ride request
 *     tags: [Ride]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - pickupLocation
 *               - dropoffLocation
 *             properties:
 *               userId:
 *                 type: string
 *                 description: ID of the passenger requesting the ride
 *                 example: "64e9fda99b8f2c0f12345678"
 *               pickupLocation:
 *                 type: string
 *                 description: Pickup location of the passenger
 *                 example: "123 Main Street, Cityville"
 *               dropoffLocation:
 *                 type: string
 *                 description: Dropoff location of the passenger
 *                 example: "456 Elm Street, Townville"
 *     responses:
 *       201:
 *         description: Ride request successfully created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Ride request successfully created."
 *                 rideId:
 *                   type: string
 *                   example: "64e9fda99b8f2c0f12345678"
 *                 status:
 *                   type: string
 *                   example: "pending"
 *                 requestedAt:
 *                   type: string
 *                   example: "2024-12-02T12:00:00.000Z"
 *       400:
 *         description: Validation or processing error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Invalid data provided"
 */

/**
 * @swagger
 * /ride/{rideId}/status:
 *   patch:
 *     summary: Update the status of an existing ride
 *     tags: [Ride]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: rideId
 *         required: true
 *         schema:
 *           type: string
 *           example: "64e9fda99b8f2c0f12345678"
 *         description: ID of the ride to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *               - userId
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [accepted, completed, canceled]
 *                 description: New status of the ride
 *                 example: "accepted"
 *               userId:
 *                 type: string
 *                 description: ID of the driver accepting the ride
 *                 example: "64e9fda99b8f2c0f12345678"
 *     responses:
 *       200:
 *         description: Ride status successfully updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Ride status updated successfully."
 *                 rideId:
 *                   type: string
 *                   example: "64e9fda99b8f2c0f12345678"
 *                 status:
 *                   type: string
 *                   example: "accepted"
 *                 driverSocketId:
 *                   type: string
 *                   example: "driver-socket-id-12345"
 *       400:
 *         description: Validation or processing error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Driver or passenger not connected."
 *       404:
 *         description: Ride or user not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Ride not found"
 */

router.post("/request", authMiddleware, createRideRequest);
router.patch("/:rideId/status", authMiddleware, updateRideStatus);

export default router;
