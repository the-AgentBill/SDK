import { Router } from "express";
import { getStats } from "./store";
import { getHtml } from "./html";

export function createDashboard(): Router {
  const router = Router();

  router.get("/dashboard", (_req, res) => {
    res.type("html").send(getHtml());
  });

  router.get("/api/stats", (_req, res) => {
    res.json(getStats());
  });

  return router;
}
