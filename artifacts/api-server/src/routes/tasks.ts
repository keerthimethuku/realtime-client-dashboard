import { Router, type IRouter } from "express";
import { z } from "zod";
import { db, tasksTable, projectsTable, usersTable, activityTable, notificationsTable, eq, and, sql } from "@workspace/db";
import { authenticate, requireRole } from "../middlewares/auth.js";
import { emitToProject, emitToUser } from "../lib/socket.js";

const router: IRouter = Router();

router.use(authenticate);

async function getTaskWithNames(taskId: number) {
  const [task] = await db
    .select({
      id: tasksTable.id,
      title: tasksTable.title,
      description: tasksTable.description,
      status: tasksTable.status,
      priority: tasksTable.priority,
      dueDate: tasksTable.dueDate,
      isOverdue: tasksTable.isOverdue,
      projectId: tasksTable.projectId,
      assigneeId: tasksTable.assigneeId,
      createdById: tasksTable.createdById,
      createdAt: tasksTable.createdAt,
      updatedAt: tasksTable.updatedAt,
      projectName: projectsTable.name,
      assigneeName: usersTable.name,
    })
    .from(tasksTable)
    .leftJoin(projectsTable, eq(tasksTable.projectId, projectsTable.id))
    .leftJoin(usersTable, eq(tasksTable.assigneeId, usersTable.id))
    .where(eq(tasksTable.id, taskId))
    .limit(1);
  return task || null;
}

router.get("/", async (req, res) => {
  const user = req.user!;
  const { status, priority, dueDateFrom, dueDateTo } = req.query;
  let conditions: any[] = [];

  if (user.role === "developer") {
    conditions.push(eq(tasksTable.assigneeId, user.userId));
  }
  if (status) conditions.push(eq(tasksTable.status, status as any));
  if (priority) conditions.push(eq(tasksTable.priority, priority as any));
  if (dueDateFrom) conditions.push(sql`${tasksTable.dueDate} >= ${dueDateFrom}`);
  if (dueDateTo) conditions.push(sql`${tasksTable.dueDate} <= ${dueDateTo}`);

  const tasks = await db
    .select({
      id: tasksTable.id,
      title: tasksTable.title,
      description: tasksTable.description,
      status: tasksTable.status,
      priority: tasksTable.priority,
      dueDate: tasksTable.dueDate,
      isOverdue: tasksTable.isOverdue,
      projectId: tasksTable.projectId,
      assigneeId: tasksTable.assigneeId,
      createdById: tasksTable.createdById,
      createdAt: tasksTable.createdAt,
      updatedAt: tasksTable.updatedAt,
      projectName: projectsTable.name,
      assigneeName: usersTable.name,
    })
    .from(tasksTable)
    .leftJoin(projectsTable, eq(tasksTable.projectId, projectsTable.id))
    .leftJoin(usersTable, eq(tasksTable.assigneeId, usersTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(tasksTable.priority, tasksTable.dueDate);

  res.json(tasks);
});

router.get("/dashboard/developer", requireRole("developer"), async (req, res) => {
  const userId = req.user!.userId;
  const assignedTasks = await db
    .select({
      id: tasksTable.id,
      title: tasksTable.title,
      description: tasksTable.description,
      status: tasksTable.status,
      priority: tasksTable.priority,
      dueDate: tasksTable.dueDate,
      isOverdue: tasksTable.isOverdue,
      projectId: tasksTable.projectId,
      assigneeId: tasksTable.assigneeId,
      createdById: tasksTable.createdById,
      createdAt: tasksTable.createdAt,
      updatedAt: tasksTable.updatedAt,
      projectName: projectsTable.name,
      assigneeName: usersTable.name,
    })
    .from(tasksTable)
    .leftJoin(projectsTable, eq(tasksTable.projectId, projectsTable.id))
    .leftJoin(usersTable, eq(tasksTable.assigneeId, usersTable.id))
    .where(eq(tasksTable.assigneeId, userId))
    .orderBy(sql`CASE ${tasksTable.priority} WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 WHEN 'low' THEN 4 END`, tasksTable.dueDate);

  const tasksByStatus = { todo: 0, in_progress: 0, in_review: 0, done: 0, overdue: 0 };
  for (const t of assignedTasks) {
    if (t.status in tasksByStatus) (tasksByStatus as any)[t.status]++;
  }

  res.json({ assignedTasks, tasksByStatus });
});

router.get("/:id", async (req, res) => {
  const id = parseInt(req.params["id"]!);
  const user = req.user!;
  const task = await getTaskWithNames(id);
  if (!task) {
    res.status(404).json({ error: "Not Found", message: "Task not found", statusCode: 404 });
    return;
  }
  if (user.role === "developer" && task.assigneeId !== user.userId) {
    res.status(403).json({ error: "Forbidden", message: "Access denied", statusCode: 403 });
    return;
  }
  if (user.role === "project_manager") {
    const [project] = await db.select().from(projectsTable).where(
      and(eq(projectsTable.id, task.projectId), eq(projectsTable.createdById, user.userId))
    ).limit(1);
    if (!project) {
      res.status(403).json({ error: "Forbidden", message: "Access denied", statusCode: 403 });
      return;
    }
  }
  res.json(task);
});

const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.enum(["todo", "in_progress", "in_review", "done"]).optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).optional(),
  dueDate: z.string().optional(),
  assigneeId: z.number().int().positive().nullable().optional(),
});

router.patch("/:id", async (req, res) => {
  const id = parseInt(req.params["id"]!);
  const user = req.user!;
  const parse = updateTaskSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: "Bad Request", message: "Invalid data", statusCode: 400 });
    return;
  }

  const existingTask = await getTaskWithNames(id);
  if (!existingTask) {
    res.status(404).json({ error: "Not Found", message: "Task not found", statusCode: 404 });
    return;
  }

  if (user.role === "developer") {
    if (existingTask.assigneeId !== user.userId) {
      res.status(403).json({ error: "Forbidden", message: "Access denied", statusCode: 403 });
      return;
    }
    const { status, ...rest } = parse.data;
    if (Object.keys(rest).length > 0) {
      res.status(403).json({ error: "Forbidden", message: "Developers can only update task status", statusCode: 403 });
      return;
    }
  } else if (user.role === "project_manager") {
    const [project] = await db.select().from(projectsTable).where(
      and(eq(projectsTable.id, existingTask.projectId), eq(projectsTable.createdById, user.userId))
    ).limit(1);
    if (!project) {
      res.status(403).json({ error: "Forbidden", message: "Access denied", statusCode: 403 });
      return;
    }
  }

  const oldStatus = existingTask.status;
  const updateData: any = { ...parse.data, updatedAt: new Date() };
  if (parse.data.dueDate) updateData.dueDate = new Date(parse.data.dueDate);

  await db.update(tasksTable).set(updateData).where(eq(tasksTable.id, id));
  const updatedTask = await getTaskWithNames(id);

  if (parse.data.status && parse.data.status !== oldStatus) {
    const [actingUser] = await db.select().from(usersTable).where(eq(usersTable.id, user.userId)).limit(1);
    const userName = actingUser?.name || "Unknown";
    const description = `${userName} moved ${existingTask.title} from ${formatStatus(oldStatus)} → ${formatStatus(parse.data.status)}`;

    const [activityRecord] = await db.insert(activityTable).values({
      taskId: id,
      projectId: existingTask.projectId,
      userId: user.userId,
      action: "status_change",
      fromStatus: oldStatus,
      toStatus: parse.data.status,
      description,
    }).returning();

    const activityEvent = {
      ...activityRecord,
      taskTitle: existingTask.title,
      projectName: existingTask.projectName,
      userName,
    };

    emitToProject(existingTask.projectId, "task_updated", { task: updatedTask, activity: activityEvent });
    emitToProject(existingTask.projectId, "activity_event", { event: activityEvent });

    if (parse.data.status === "in_review") {
      const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, existingTask.projectId)).limit(1);
      if (project) {
        const [notification] = await db.insert(notificationsTable).values({
          userId: project.createdById,
          type: "task_in_review",
          title: "Task in Review",
          message: `${existingTask.title} has been moved to In Review`,
          taskId: id,
          projectId: existingTask.projectId,
        }).returning();
        emitToUser(project.createdById, "notification", { notification });
      }
    }
  }

  if (parse.data.assigneeId && parse.data.assigneeId !== existingTask.assigneeId) {
    const [notification] = await db.insert(notificationsTable).values({
      userId: parse.data.assigneeId,
      type: "task_assigned",
      title: "Task Assigned",
      message: `You have been assigned to: ${existingTask.title}`,
      taskId: id,
      projectId: existingTask.projectId,
    }).returning();
    emitToUser(parse.data.assigneeId, "notification", { notification });
  }

  res.json(updatedTask);
});

router.delete("/:id", requireRole("admin", "project_manager"), async (req, res) => {
  const id = parseInt(req.params["id"]!);
  const user = req.user!;
  const task = await getTaskWithNames(id);
  if (!task) {
    res.status(404).json({ error: "Not Found", message: "Task not found", statusCode: 404 });
    return;
  }
  if (user.role === "project_manager") {
    const [project] = await db.select().from(projectsTable).where(
      and(eq(projectsTable.id, task.projectId), eq(projectsTable.createdById, user.userId))
    ).limit(1);
    if (!project) {
      res.status(403).json({ error: "Forbidden", message: "Access denied", statusCode: 403 });
      return;
    }
  }
  await db.delete(tasksTable).where(eq(tasksTable.id, id));
  res.json({ success: true, message: "Task deleted" });
});

function formatStatus(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default router;
