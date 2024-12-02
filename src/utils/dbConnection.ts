import { MongoClient } from "mongodb";

const url = "mongodb://localhost:27017";
const dbName = "vroom";

const client = new MongoClient(url);

export async function dbConnection() {
  try {
    await client.connect();
    console.log("Connected to MongoDB server.");

    return client.db(dbName); // Ensure this returns the database instance
  } catch (err) {
    console.error("Error connecting to MongoDB:", err);
    throw err;
  }
}
