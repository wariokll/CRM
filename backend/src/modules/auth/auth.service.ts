import {
  OrganizationStatus,
  OrganizationType,
  Role,
  StoreStatus,
  UserStatus,
} from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import { AppError } from "../../shared/errors.js";
import { config } from "../../config.js";
import {
  createAccessToken,
  createRefreshToken,
  verifyRefreshToken,
} from "../../utils/tokens.js";
import {
  type LoginInput,
  type RegisterInput,
  publicUserSelect,
} from "./auth.schemas.js";

export function createAuthService(prisma: PrismaClient) {
  async function registerUser(body: RegisterInput) {
    const passwordHash = await bcrypt.hash(body.password, 12);
    return prisma.$transaction(async (transaction) => {
      const created = await transaction.user.create({
        data: {
          ipName: body.ipName,
          email: body.email.toLowerCase(),
          passwordHash,
          phone: body.phone,
          status: UserStatus.PENDING,
          role: Role.CLIENT,
        },
      });
      const organization = await transaction.organization.create({
        data: {
          type: /^\s*ип\b/i.test(body.ipName)
            ? OrganizationType.IP
            : /^\s*ооо\b/i.test(body.ipName)
              ? OrganizationType.OOO
              : OrganizationType.OTHER,
          legalName: body.ipName,
          shortName: body.ipName,
          phone: body.phone,
          email: body.email.toLowerCase(),
          status: OrganizationStatus.PENDING,
          createdByUserId: created.id,
          members: { create: { userId: created.id, isPrimary: true } },
          stores: {
            create: {
              ...body.store,
              userId: created.id,
              status: StoreStatus.PENDING,
            },
          },
        },
      });
      void organization;
      return transaction.user.findUniqueOrThrow({
        where: { id: created.id },
        select: publicUserSelect,
      });
    });
  }

  async function loginUser(body: LoginInput) {
    const user = await prisma.user.findUnique({
      where: { email: body.email.toLowerCase() },
    });
    if (!user || !(await bcrypt.compare(body.password, user.passwordHash)))
      throw new AppError("Неверный email или пароль", 401);
    if (user.status === UserStatus.BLOCKED)
      throw new AppError("Аккаунт заблокирован", 403);

    const payload = { userId: user.id, role: user.role };
    const userProfile = await prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      select: publicUserSelect,
    });
    return {
      accessToken: createAccessToken(payload),
      refreshToken: createRefreshToken(payload),
      user: userProfile,
    };
  }

  async function refreshUser(token: string | undefined) {
    if (!token) return null;
    try {
      const payload = verifyRefreshToken(token);
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: publicUserSelect,
      });
      if (!user || user.status === UserStatus.BLOCKED)
        throw new Error("blocked");
      return {
        accessToken: createAccessToken({ userId: user.id, role: user.role }),
        user,
      };
    } catch {
      return null;
    }
  }

  function currentUser(userId: number) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: publicUserSelect,
    });
  }

  return { registerUser, loginUser, refreshUser, currentUser };
}

export function refreshCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: config.cookieSecure,
    maxAge: 30 * 24 * 60 * 60 * 1000,
    path: "/api/auth",
  };
}
