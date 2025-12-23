import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import { requireInternalKey } from "./middleware/auth.middleware.js";
import productsRoutes from "./routes/products.routes.js";

dotenv.config();

const app = express();

app.use(express.json());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "x-api-key"]
  })
);

// Público
app.get("/health", (req, res) => {
  res.json({ ok: true, status: "API a funcionar" });
});

// Protegido
app.use(requireInternalKey);
app.use("/products", productsRoutes);

if (process.env.VERCEL !== "1") {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`Local: http://localhost:${PORT}`));
}

export default app;
