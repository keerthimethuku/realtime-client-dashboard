import { Router, type IRouter } from "express";
import { db, activityTable, tasksTable, projectsTable, usersTable, eq, and, sql } from "@workspace/db";
import { authenticate } from "../middlewares/auth.js";

const router: IRouter = Router();

router.use(authenticate);

router.get("/", async (req, res) => {
  const user = req.user!;
  const { projectId, limit = "50", before } = req.query;

  let conditions: any[] = [];

  if (user.role === "developer") {
    conditions.push(eq(activityTable.userId, user.userId));
  } else if (user.role === "project_manager") {
    const pmProjects = await db
      .select({ id: projectsTable.id })
      .from(projectsTable)
      .where(eq(projectsTable.createdById, user.userId));
    const pmProjectIds = pmProjects.map((p) => p.id);
    if (pmProjectIds.length === 0) {
      res.json([]);
      return;
    }
    conditions.push(sql`${activityTable.projectId} = ANY(ARRAY[${sql.raw(pmProjectIds.join(","))}])`);
  }

  if (projectId) conditions.push(eq(activityTable.projectId, parseInt(projectId as string)));
  if (before) conditions.push(sql`${activityTable.createdAt} < ${before}`);

  const events = await db
    .select({
      id: activityTable.id,
      taskId: activityTable.taskId,
      taskTitle: tasksTable.title,
      projectId: activityTable.projectId,
      projectName: projectsTable.name,
      userId: activityTable.userId,
      userName: usersTable.name,
      action: activityTable.action,
      fromStatus: activityTable.fromStatus,
      toStatus: activityTable.toStatus,
      description: activityTable.description,
      createdAt: activityTable.createdAt,
    })
    .from(activityTable)
    .leftJoin(tasksTable, eq(activityTable.taskId, tasksTable.id))
    .leftJoin(projectsTable, eq(activityTable.projectId, projectsTable.id))
    .leftJoin(usersTable, eq(activityTable.userId, usersTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(sql`${activityTable.createdAt} DESC`)
    .limit(parseInt(limit as string));

  res.json(events);
});

router.get("/tasks/:id", async (req, res) => {
  const taskId = parseInt(req.params["id"]!);
  const user = req.user!;

  const [task] = await db.select().from(tasksTable).where(eq(tasksTable.id, taskId)).limit(1);
  if (!task) {
    res.status(404).json({ error: "Not Found", message: "Task not found", statusCode: 404 });
    return;
  }

  if (user.role === "developer" && task.assigneeId !== user.userId) {
    res.status(403).json({ error: "Forbidden", message: "Access denied", statusCode: 403 });
    return;
  }

  const events = await db
    .select({
      id: activityTable.id,
      taskId: activityTable.taskId,
      taskTitle: tasksTable.title,
      projectId: activityTable.projectId,
      projectName: projectsTable.name,
      userId: activityTable.userId,
      userName: usersTable.name,
      action: activityTable.action,
      fromStatus: activityTable.fromStatus,
      toStatus: activityTable.toStatus,
      description: activityTable.description,
      createdAt: activityTable.createdAt,
    })
    .from(activityTable)
    .leftJoin(tasksTable, eq(activityTable.taskId, tasksTable.id))
    .leftJoin(projectsTable, eq(activityTable.projectId, projectsTable.id))
    .leftJoin(usersTable, eq(activityTable.userId, usersTable.id))
    .where(eq(activityTable.taskId, taskId))
    .orderBy(sql`${activityTable.createdAt} DESC`);

  res.json(events);
});

export default router;
