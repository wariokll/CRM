import { app } from "./app.js";
import { config } from "./config.js";
import { prisma } from "./db.js";
import { sendScheduledRequestReminders } from "./utils/scheduled-reminders.js";
import { generateRecurringRequests } from "./utils/recurring-requests.js";

const server = app.listen(config.port, () =>
  console.log(`БАЗИС CRM API listening on port ${config.port}`),
);
void sendScheduledRequestReminders();
void generateRecurringRequests();
const remindersTimer = setInterval(
  () => void sendScheduledRequestReminders(),
  5 * 60_000,
);
const recurringRequestsTimer = setInterval(
  () => void generateRecurringRequests(),
  60 * 60_000,
);
async function shutdown() {
  clearInterval(remindersTimer);
  clearInterval(recurringRequestsTimer);
  server.close();
  await prisma.$disconnect();
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
