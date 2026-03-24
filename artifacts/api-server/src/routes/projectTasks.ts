import { Router, type IRouter } from "express";
import { z } from "zod";
import { db, tasksTable, projectsTable, usersTable, activityTable, notificationsTable, eq, and, sql } from "@workspace/db";
import { authenticate, requireRole } from "../middlewares/auth.js";
import { emitToProject, emitToUser } from "../lib/socket.js";

const router: IRouter = Router({ mergeParams: true });

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
  const projectId = parseInt(req.params["id"]!);
  const user = req.user!;
  const { status, priority, dueDateFrom, dueDateTo, assigneeId } = req.query;

  if (user.role === "project_manager") {
    const [project] = await db.select().from(projectsTable).where(
      and(eq(projectsTable.id, projectId), eq(projectsTable.createdById, user.userId))
    ).limit(1);
    if (!project) {
      res.status(403).json({ error: "Forbidden", message: "Access denied", statusCode: 403 });
      return;
    }
  } else if (user.role === "developer") {
    const [assigned] = await db.select().from(tasksTable).where(
      and(eq(tasksTable.projectId, projectId), eq(tasksTable.assigneeId, user.userId))
    ).limit(1);
    if (!assigned) {
      res.status(403).json({ error: "Forbidden", message: "Access denied", statusCode: 403 });
      return;
    }
  }

  let conditions: any[] = [eq(tasksTable.projectId, projectId)];
  if (user.role === "developer") conditions.push(eq(tasksTable.assigneeId, user.userId));
  if (status) conditions.push(eq(tasksTable.status, status as any));
  if (priority) conditions.push(eq(tasksTable.priority, priority as any));
  if (assigneeId) conditions.push(eq(tasksTable.assigneeId, parseInt(assigneeId as string)));
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
    .where(and(...conditions))
    .orderBy(tasksTable.priority, tasksTable.dueDate);

  res.json(tasks);
});

const createTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(["todo", "in_progress", "in_review", "done"]).default("todo"),
  priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  dueDate: z.string().optional(),
  assigneeId: z.number().int().positive().optional(),
});

router.post("/", requireRole("admin", "project_manager"), async (req, res) => {
  const projectId = parseInt(req.params["id"]!);
  const user = req.user!;
  const parse = createTaskSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: "Bad Request", message: "Invalid task data", statusCode: 400 });
    return;
  }

  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, projectId)).limit(1);
  if (!project) {
    res.status(404).json({ error: "Not Found", message: "Project not found", statusCode: 404 });
    return;
  }
  if (user.role === "project_manager" && project.createdById !== user.userId) {
    res.status(403).json({ error: "Forbidden", message: "Access denied", statusCode: 403 });
    return;
  }

  const insertData: any = {
    ...parse.data,
    projectId,
    createdById: user.userId,
  };
  if (parse.data.dueDate) insertData.dueDate = new Date(parse.data.dueDate);

  const [task] = await db.insert(tasksTable).values(insertData).returning();

  const [actingUser] = await db.select().from(usersTable).where(eq(usersTable.id, user.userId)).limit(1);
  const userName = actingUser?.name || "Unknown";

  const [activityRecord] = await db.insert(activityTable).values({
    taskId: task.id,
    projectId,
    userId: user.userId,
    action: "created",
    description: `${userName} created task ${task.title}`,
  }).returning();

  emitToProject(projectId, "activity_event", {
    event: { ...activityRecord, taskTitle: task.title, projectName: project.name, userName },
  });

  if (parse.data.assigneeId) {
    const [notification] = await db.insert(notificationsTable).values({
      userId: parse.data.assigneeId,
      type: "task_assigned",
      title: "Task Assigned",
      message: `You have been assigned to: ${task.title}`,
      taskId: task.id,
      projectId,
    }).returning();
    emitToUser(parse.data.assigneeId, "notification", { notification });
  }

  const full = await getTaskWithNames(task.id);
  res.status(201).json(full);
});

export default router;
