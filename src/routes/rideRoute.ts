import { Router } from "express";
import {
  createRideRequest,
  getRideDetails,
  updateRideStatus,
} from "../controllers/rideController";
import { authMiddleware } from "../middleware/authMiddleware";

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *   schemas:
 *     RideRequest:
 *       type: object
 *       required:
 *         - userId
 *         - pickupLocation
 *         - dropoffLocation
 *         - rideType
 *       properties:
 *         pickupLocation:
 *           type: string
 *           description: Pickup location of the passenger
 *           example: "123 Main Street, Cityville"
 *         dropoffLocation:
 *           type: string
 *           description: Dropoff location of the passenger
 *           example: "456 Elm Street, Townville"
 *         rideType:
 *           type: string
 *           description: Type of ride (e.g., "economy", "luxury")
 *           example: "economy"
 *     RideStatusUpdate:
 *       type: object
 *       required:
 *         - status
 *       properties:
 *         status:
 *           type: string
 *           enum: [accepted, completed, canceled]
 *           description: New status of the ride
 *           example: "accepted"
 */

/**
 * @swagger
 * /rides/{rideId}:
 *   get:
 *     summary: Get details of a specific ride
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
 *         description: ID of the ride to fetch details for
 *     responses:
 *       200:
 *         description: Ride details successfully fetched
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Ride details fetched successfully."
 *                 rideDetails:
 *                   type: object
 *                   properties:
 *                     rideId:
 *                       type: string
 *                       example: "64e9fda99b8f2c0f12345678"
 *                     pickupLocation:
 *                       type: object
 *                       properties:
 *                         lat:
 *                           type: number
 *                           example: 34.0522
 *                         lon:
 *                           type: number
 *                           example: -118.2437
 *                     dropoffLocation:
 *                       type: object
 *                       properties:
 *                         lat:
 *                           type: number
 *                           example: 34.0522
 *                         lon:
 *                           type: number
 *                           example: -118.2437
 *                     rideType:
 *                       type: string
 *                       example: "economy"
 *                     status:
 *                       type: string
 *                       example: "pending"
 *                     requestedAt:
 *                       type: string
 *                       example: "2024-12-02T17:10:14.649Z"
 *                     acceptedBy:
 *                       type: object
 *                       nullable: true
 *                       properties:
 *                         id:
 *                           type: string
 *                           example: "64e9fda99b8f2c0f12345678"
 *                         username:
 *                           type: string
 *                           example: "driver123"
 *                     passenger:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           example: "64e9fda99b8f2c0f12345678"
 *                         username:
 *                           type: string
 *                           example: "passenger123"
 *       400:
 *         description: Validation or processing error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Invalid ride ID format."
 *       404:
 *         description: Ride not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Ride not found."
 */

/**
 * @swagger
 * tags:
 *   name: Ride
 *   description: Ride management APIs
 */

const router = Router();

/**
 * @swagger
 * /rides/request:
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
 *               - pickupLocation
 *               - dropoffLocation
 *               - rideType
 *               - acceptedBy
 *             properties:
 *               pickupLocation:
 *                 type: object
 *                 properties:
 *                   lat:
 *                     type: number
 *                     format: float
 *                     description: Latitude of the pickup location
 *                     example: 34.0522
 *                   lon:
 *                     type: number
 *                     format: float
 *                     description: Longitude of the pickup location
 *                     example: -118.2437
 *               dropoffLocation:
 *                 type: object
 *                 properties:
 *                   lat:
 *                     type: number
 *                     format: float
 *                     description: Latitude of the dropoff location
 *                     example: 34.0522
 *                   lon:
 *                     type: number
 *                     format: float
 *                     description: Longitude of the dropoff location
 *                     example: -118.2437
 *               rideType:
 *                 type: string
 *                 description: Type of ride (e.g., "economy", "luxury")
 *                 example: "economy"
 *               acceptedBy:
 *                 type: string
 *                 nullable: true
 *                 description: ID of the driver accepting the ride (initially null)
 *                 example: null
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
 *                   example: "674de9f64afba72e1cf7d61f"
 *                 status:
 *                   type: string
 *                   example: "pending"
 *                 requestedAt:
 *                   type: string
 *                   format: date-time
 *                   example: "2024-12-02T17:10:14.649Z"
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
 * /rides/{rideId}/status:
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
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [accepted, completed, canceled]
 *                 description: New status of the ride
 *                 example: "accepted"
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
 *       400:
 *         description: Validation or processing error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Invalid status provided."
 *       404:
 *         description: Ride or user not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Ride not found."
 */

router.get("/:rideId", authMiddleware, getRideDetails);
router.post("/request", authMiddleware, createRideRequest);
router.patch("/:rideId/status", authMiddleware, updateRideStatus);

export default router;
