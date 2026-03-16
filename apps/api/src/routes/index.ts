import type { Hono } from "hono";
import type { AppEnv } from "../types";
import { apiKeyRoutes } from "./api-keys";
import { authRoutes } from "./auth";
import { datasetRoutes } from "./datasets";
import { evalConfigRoutes } from "./eval-configs";
import { evalRunRoutes } from "./eval-runs";
import { healthRoutes } from "./health";
import { orgRoutes } from "./orgs";
import { projectRoutes } from "./projects";
import { promptRoutes } from "./prompts";
import { runRoutes } from "./runs";

export function registerRoutes(app: Hono<AppEnv>) {
  app.route("/", apiKeyRoutes);
  app.route("/", authRoutes);
  app.route("/", datasetRoutes);
  app.route("/", evalConfigRoutes);
  app.route("/", evalRunRoutes);
  app.route("/", healthRoutes);
  app.route("/", orgRoutes);
  app.route("/", projectRoutes);
  app.route("/", promptRoutes);
  app.route("/", runRoutes);
}
