import type { RequestHandler } from "express";
import { refreshCookieOptions } from "./auth.service.js";
import type { createAuthService } from "./auth.service.js";
import type { LoginInput, RegisterInput } from "./auth.schemas.js";

type AuthService = ReturnType<typeof createAuthService>;

export function createAuthControllers(service: AuthService) {
  const registerController: RequestHandler = async (req, res) => {
    const user = await service.registerUser(req.body as RegisterInput);
    return res.status(201).json({
      user,
      message: "Заявка на регистрацию отправлена на модерацию",
    });
  };

  const loginController: RequestHandler = async (req, res) => {
    const result = await service.loginUser(req.body as LoginInput);
    res.cookie("refreshToken", result.refreshToken, refreshCookieOptions());
    return res.json({ accessToken: result.accessToken, user: result.user });
  };

  const refreshController: RequestHandler = async (req, res) => {
    const result = await service.refreshUser(req.cookies.refreshToken);
    if (!result) return res.status(401).json({ message: "Сессия истекла" });
    return res.json(result);
  };

  const logoutController: RequestHandler = (_req, res) => {
    res.clearCookie("refreshToken", { path: "/api/auth" });
    return res.status(204).end();
  };

  const currentUserController: RequestHandler = async (req, res) =>
    res.json(await service.currentUser(req.auth!.userId));

  return {
    registerController,
    loginController,
    refreshController,
    logoutController,
    currentUserController,
  };
}
