import type { Hono } from "hono";
import type { AppEnv } from "../types";
import { authRoutes } from "./auth";
import { healthRoutes } from "./health";

export function registerRoutes(app: Hono<AppEnv>) {
  app.route("/", authRoutes);
  app.route("/", healthRoutes);
}
