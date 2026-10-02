import type { Role } from "@prisma/client";
import jwt from "jsonwebtoken";
import { config } from "../config.js";

type Payload = { userId: number; role: Role };
export const createAccessToken = (payload: Payload) =>
  jwt.sign(payload, config.accessSecret, { expiresIn: "15m" });
export const createRefreshToken = (payload: Payload) =>
  jwt.sign(payload, config.refreshSecret, { expiresIn: "30d" });
export const verifyAccessToken = (token: string) =>
  jwt.verify(token, config.accessSecret) as Payload;
export const verifyRefreshToken = (token: string) =>
  jwt.verify(token, config.refreshSecret) as Payload;
