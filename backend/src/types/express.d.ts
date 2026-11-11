import type { Role } from "@prisma/client";
import type { UserAccess } from "../shared/middleware/authorization.js";

declare global {
  namespace Express {
    interface Request {
      auth?: { userId: number; role: Role };
      access?: UserAccess;
    }
  }
}

export {};
