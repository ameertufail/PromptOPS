import type { Hono } from "hono";
import type { AppEnv } from "../types";
import { authRoutes } from "./auth";
import { healthRoutes } from "./health";
import { orgRoutes } from "./orgs";
import { projectRoutes } from "./projects";

export function registerRoutes(app: Hono<AppEnv>) {
  app.route("/", authRoutes);
  app.route("/", healthRoutes);
  app.route("/", orgRoutes);
  app.route("/", projectRoutes);
}
