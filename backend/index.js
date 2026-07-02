import dotenv from  "dotenv";
import { prisma } from "./src/database/db.js";
import app from "./src/app.js";

dotenv.config();

const port = process.env.PORT || 3000;

async function startServer() {
  try {
    await prisma.$connect();
    console.log("✅ DB connected.");

    app.listen(port, () => {
      console.log(`Server is listening at http://localhost:${port}`);
    });
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

startServer();
