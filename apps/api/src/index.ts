import { API_HEALTH_PATH } from "@promptops/shared";
import { Hono } from "hono";
import { cors } from "hono/cors";

export type AppBindings = {
  DB?: D1Database;
  STORAGE?: R2Bucket;
};

const app = new Hono<{ Bindings: AppBindings }>();

app.use("/api/*", cors());

app.get(API_HEALTH_PATH, (c) => {
  return c.json({
    status: "ok",
    service: "promptops-api",
    timestamp: new Date().toISOString()
  });
});

export default app;
