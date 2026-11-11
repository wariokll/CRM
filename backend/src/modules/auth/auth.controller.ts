import type { RequestHandler } from "express";
import { refreshCookieOptions } from "./auth.service.js";
import {
  currentUser,
  loginUser,
  refreshUser,
  registerUser,
} from "./auth.service.js";
import type { LoginInput, RegisterInput } from "./auth.schemas.js";

export const registerController: RequestHandler = async (req, res) => {
  const user = await registerUser(req.body as RegisterInput);
  return res.status(201).json({
    user,
    message: "Заявка на регистрацию отправлена на модерацию",
  });
};

export const loginController: RequestHandler = async (req, res) => {
  const result = await loginUser(req.body as LoginInput);
  res.cookie("refreshToken", result.refreshToken, refreshCookieOptions());
  return res.json({ accessToken: result.accessToken, user: result.user });
};

export const refreshController: RequestHandler = async (req, res) => {
  const result = await refreshUser(req.cookies.refreshToken);
  if (!result) return res.status(401).json({ message: "Сессия истекла" });
  return res.json(result);
};

export const logoutController: RequestHandler = (_req, res) => {
  res.clearCookie("refreshToken", { path: "/api/auth" });
  return res.status(204).end();
};

export const currentUserController: RequestHandler = async (req, res) =>
  res.json(await currentUser(req.auth!.userId));
