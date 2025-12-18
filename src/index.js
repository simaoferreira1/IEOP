import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import { requireInternalKey } from "./middleware/auth.middleware.js";
import productsRoutes from "./routes/products.routes.js";
import customersRoutes from "./routes/customers.routes.js";
import ordersRoutes from "./routes/orders.routes.js";

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

// Tudo abaixo é protegido
app.use(requireInternalKey);

// Rotas
app.use("/products", productsRoutes);
app.use("/customers", customersRoutes);
app.use("/orders", ordersRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`API a correr em http://localhost:${PORT}`);
});
