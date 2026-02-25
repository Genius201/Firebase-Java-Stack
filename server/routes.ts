import type { Express } from "express";
import { createServer, type Server } from "node:http";
import { handleFeedback } from "./feedback";

export async function registerRoutes(app: Express): Promise<Server> {
  app.post("/api/feedback", handleFeedback);

  const httpServer = createServer(app);
  return httpServer;
}
