import rateLimit from "express-rate-limit";
import { config } from "../../config.js";

export const authLoginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: config.isTest ? 100 : 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
});
