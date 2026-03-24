import cron from "node-cron";
import { db, tasksTable, eq, and, sql } from "@workspace/db";
import { logger } from "../lib/logger.js";

export function startOverdueScheduler(): void {
  cron.schedule("*/5 * * * *", async () => {
    try {
      const now = new Date();
      const updated = await db
        .update(tasksTable)
        .set({ status: "overdue", isOverdue: true, updatedAt: now })
        .where(
          and(
            sql`${tasksTable.dueDate} < ${now.toISOString()}`,
            sql`${tasksTable.status} NOT IN ('done', 'overdue')`,
          )
        )
        .returning({ id: tasksTable.id });

      if (updated.length > 0) {
        logger.info({ count: updated.length }, "Marked tasks as overdue");
      }
    } catch (err) {
      logger.error({ err }, "Error in overdue scheduler");
    }
  });

  logger.info("Overdue task scheduler started (runs every 5 minutes)");
}
