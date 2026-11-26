import type { Prisma } from "@prisma/client";
import type { z } from "zod";
import { createRequestSchema } from "./request.contracts.js";

export type RequestCreationBody = z.infer<typeof createRequestSchema>;
export type ActiveRequestType = Prisma.RequestTypeGetPayload<{
  include: { department: true };
}>;
