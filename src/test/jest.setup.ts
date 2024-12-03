import { dbConnection } from "../utils/dbConnection";

// Global setup for Jest
beforeAll(async () => {
  // Set up a test database or mock the database connection
  process.env.MONGO_URI = "mongodb://localhost:27017/test_vroom";
});

afterAll(async () => {
  // Clean up database connections after tests are done
  await dbConnection().then((db) => db.dropDatabase());
});
