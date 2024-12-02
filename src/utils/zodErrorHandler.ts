import { ZodError } from "zod";

/**
 * Handles Zod validation errors and other errors.
 * @param error The error object
 * @returns A clean error message string
 */

export function handleZodError(err: unknown): string {
  if (err instanceof ZodError) {
    // Collect all errors into a readable format
    const detailedErrors = err.errors.map((error) => {
      const field = error.path.join(".");
      return `${field}: ${error.message}`;
    });
    return detailedErrors.join(", ") || "Validation failed";
  }

  if (err instanceof Error) {
    if (err.message.includes("E11000")) {
      return "Duplicate value error";
    }
    return err.message;
  }

  return "An unexpected error occurred";
}
