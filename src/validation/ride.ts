import { z } from "zod";

export const rideRequestSchema = z.object({
  pickupLocation: z.object({
    lat: z.number().min(-90).max(90),
    lon: z.number().min(-180).max(180),
  }),
  dropoffLocation: z.object({
    lat: z.number().min(-90).max(90),
    lon: z.number().min(-180).max(180),
  }),
  rideType: z.enum(["economy", "luxury"]),
  acceptedBy: z.null(),
});

export const rideStatusUpdateSchema = z.object({
  status: z.enum([
    "pending",
    "accepted",
    "in-progress",
    "completed",
    "cancelled",
  ]),
});
