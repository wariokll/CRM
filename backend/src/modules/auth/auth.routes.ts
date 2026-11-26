import { Router } from "express";
import type { PrismaClient } from "@prisma/client";
import { authenticate } from "../../shared/middleware/auth.js";
import { authLoginRateLimit } from "../../shared/middleware/rate-limit.js";
import { validateBody } from "../../shared/middleware/validate.js";
import { createAuthControllers } from "./auth.controller.js";
import { createAuthService } from "./auth.service.js";
import { loginSchema, registerSchema } from "./auth.schemas.js";

export function createAuthRouter(prisma: PrismaClient) {
  const router = Router();
  const controllers = createAuthControllers(createAuthService(prisma));
  router.post(
    "/register",
    validateBody(registerSchema),
    controllers.registerController,
  );
  router.post(
    "/login",
    authLoginRateLimit,
    validateBody(loginSchema),
    controllers.loginController,
  );
  router.post("/refresh", controllers.refreshController);
  router.post("/logout", controllers.logoutController);
  router.get("/me", authenticate, controllers.currentUserController);
  return router;
}
