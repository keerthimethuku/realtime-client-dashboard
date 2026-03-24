import { Router, type IRouter } from "express";
import { db, notificationsTable, eq, and, sql } from "@workspace/db";
import { authenticate } from "../middlewares/auth.js";

const router: IRouter = Router();

router.use(authenticate);

router.get("/", async (req, res) => {
  const userId = req.user!.userId;
  const { unreadOnly } = req.query;

  let conditions: any[] = [eq(notificationsTable.userId, userId)];
  if (unreadOnly === "true") conditions.push(eq(notificationsTable.isRead, false));

  const notifications = await db
    .select()
    .from(notificationsTable)
    .where(and(...conditions))
    .orderBy(sql`${notificationsTable.createdAt} DESC`)
    .limit(50);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(notificationsTable)
    .where(and(eq(notificationsTable.userId, userId), eq(notificationsTable.isRead, false)));

  res.json({ notifications, unreadCount: Number(count) });
});

router.patch("/:id/read", async (req, res) => {
  const id = parseInt(req.params["id"]!);
  const userId = req.user!.userId;

  const [notification] = await db
    .update(notificationsTable)
    .set({ isRead: true })
    .where(and(eq(notificationsTable.id, id), eq(notificationsTable.userId, userId)))
    .returning();

  if (!notification) {
    res.status(404).json({ error: "Not Found", message: "Notification not found", statusCode: 404 });
    return;
  }

  res.json(notification);
});

router.patch("/read-all", async (req, res) => {
  await db
    .update(notificationsTable)
    .set({ isRead: true })
    .where(eq(notificationsTable.userId, req.user!.userId));

  res.json({ success: true, message: "All notifications marked as read" });
});

export default router;
