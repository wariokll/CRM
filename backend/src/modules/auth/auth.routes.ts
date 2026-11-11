import { Router } from "express";
import { authenticate } from "../../shared/middleware/auth.js";
import { authLoginRateLimit } from "../../shared/middleware/rate-limit.js";
import { validateBody } from "../../shared/middleware/validate.js";
import {
  currentUserController,
  loginController,
  logoutController,
  refreshController,
  registerController,
} from "./auth.controller.js";
import { loginSchema, registerSchema } from "./auth.schemas.js";

export const authRouter = Router();

authRouter.post("/register", validateBody(registerSchema), registerController);
authRouter.post(
  "/login",
  authLoginRateLimit,
  validateBody(loginSchema),
  loginController,
);
authRouter.post("/refresh", refreshController);
authRouter.post("/logout", logoutController);
authRouter.get("/me", authenticate, currentUserController);
