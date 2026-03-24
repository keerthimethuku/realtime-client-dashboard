import { Router, type IRouter } from "express";
import { z } from "zod";
import { db, projectsTable, tasksTable, usersTable, clientsTable, eq, and, sql } from "@workspace/db";
import { authenticate, requireRole } from "../middlewares/auth.js";
import { getOnlineUsersCount } from "../lib/socket.js";

const router: IRouter = Router();

router.use(authenticate);

async function getProjectWithStats(projectId: number) {
  const [project] = await db
    .select({
      id: projectsTable.id,
      name: projectsTable.name,
      description: projectsTable.description,
      status: projectsTable.status,
      clientId: projectsTable.clientId,
      clientName: clientsTable.name,
      createdById: projectsTable.createdById,
      createdByName: usersTable.name,
      createdAt: projectsTable.createdAt,
      updatedAt: projectsTable.updatedAt,
    })
    .from(projectsTable)
    .leftJoin(clientsTable, eq(projectsTable.clientId, clientsTable.id))
    .leftJoin(usersTable, eq(projectsTable.createdById, usersTable.id))
    .where(eq(projectsTable.id, projectId))
    .limit(1);
  if (!project) return null;

  const taskCounts = await db
    .select({ count: sql<number>`count(*)`, status: tasksTable.status })
    .from(tasksTable)
    .where(eq(tasksTable.projectId, projectId))
    .groupBy(tasksTable.status);

  let taskCount = 0;
  let completedTaskCount = 0;
  let overdueTaskCount = 0;
  for (const row of taskCounts) {
    taskCount += Number(row.count);
    if (row.status === "done") completedTaskCount += Number(row.count);
    if (row.status === "overdue") overdueTaskCount += Number(row.count);
  }

  return { ...project, taskCount, completedTaskCount, overdueTaskCount };
}

router.get("/", async (req, res) => {
  const user = req.user!;
  let conditions: any[] = [];
  if (user.role === "project_manager") {
    conditions.push(eq(projectsTable.createdById, user.userId));
  }
  const projects = await db
    .select({
      id: projectsTable.id,
      name: projectsTable.name,
      description: projectsTable.description,
      status: projectsTable.status,
      clientId: projectsTable.clientId,
      clientName: clientsTable.name,
      createdById: projectsTable.createdById,
      createdByName: usersTable.name,
      createdAt: projectsTable.createdAt,
      updatedAt: projectsTable.updatedAt,
    })
    .from(projectsTable)
    .leftJoin(clientsTable, eq(projectsTable.clientId, clientsTable.id))
    .leftJoin(usersTable, eq(projectsTable.createdById, usersTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(projectsTable.createdAt);

  const projectsWithStats = await Promise.all(
    projects.map(async (p) => {
      const taskCounts = await db
        .select({ count: sql<number>`count(*)`, status: tasksTable.status })
        .from(tasksTable)
        .where(eq(tasksTable.projectId, p.id))
        .groupBy(tasksTable.status);
      let taskCount = 0, completedTaskCount = 0, overdueTaskCount = 0;
      for (const row of taskCounts) {
        taskCount += Number(row.count);
        if (row.status === "done") completedTaskCount += Number(row.count);
        if (row.status === "overdue") overdueTaskCount += Number(row.count);
      }
      return { ...p, taskCount, completedTaskCount, overdueTaskCount };
    })
  );

  res.json(projectsWithStats);
});

const createProjectSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  clientId: z.number().int().positive(),
  status: z.enum(["active", "completed", "on_hold", "cancelled"]).default("active"),
});

router.post("/", requireRole("admin", "project_manager"), async (req, res) => {
  const parse = createProjectSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: "Bad Request", message: "Invalid project data", statusCode: 400 });
    return;
  }
  const [project] = await db.insert(projectsTable).values({
    ...parse.data,
    createdById: req.user!.userId,
  }).returning();
  const full = await getProjectWithStats(project.id);
  res.status(201).json(full);
});

router.get("/:id", async (req, res) => {
  const id = parseInt(req.params["id"]!);
  const user = req.user!;
  const project = await getProjectWithStats(id);
  if (!project) {
    res.status(404).json({ error: "Not Found", message: "Project not found", statusCode: 404 });
    return;
  }
  if (user.role === "project_manager" && project.createdById !== user.userId) {
    res.status(403).json({ error: "Forbidden", message: "Access denied", statusCode: 403 });
    return;
  }
  if (user.role === "developer") {
    const [task] = await db.select().from(tasksTable).where(
      and(eq(tasksTable.projectId, id), eq(tasksTable.assigneeId, user.userId))
    ).limit(1);
    if (!task) {
      res.status(403).json({ error: "Forbidden", message: "Access denied", statusCode: 403 });
      return;
    }
  }
  res.json(project);
});

const updateProjectSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.enum(["active", "completed", "on_hold", "cancelled"]).optional(),
  clientId: z.number().int().positive().optional(),
});

router.patch("/:id", requireRole("admin", "project_manager"), async (req, res) => {
  const id = parseInt(req.params["id"]!);
  const user = req.user!;
  const parse = updateProjectSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: "Bad Request", message: "Invalid data", statusCode: 400 });
    return;
  }
  const [existing] = await db.select().from(projectsTable).where(eq(projectsTable.id, id)).limit(1);
  if (!existing) {
    res.status(404).json({ error: "Not Found", message: "Project not found", statusCode: 404 });
    return;
  }
  if (user.role === "project_manager" && existing.createdById !== user.userId) {
    res.status(403).json({ error: "Forbidden", message: "Access denied", statusCode: 403 });
    return;
  }
  await db.update(projectsTable).set({ ...parse.data, updatedAt: new Date() }).where(eq(projectsTable.id, id));
  const full = await getProjectWithStats(id);
  res.json(full);
});

router.delete("/:id", requireRole("admin", "project_manager"), async (req, res) => {
  const id = parseInt(req.params["id"]!);
  const user = req.user!;
  const [existing] = await db.select().from(projectsTable).where(eq(projectsTable.id, id)).limit(1);
  if (!existing) {
    res.status(404).json({ error: "Not Found", message: "Project not found", statusCode: 404 });
    return;
  }
  if (user.role === "project_manager" && existing.createdById !== user.userId) {
    res.status(403).json({ error: "Forbidden", message: "Access denied", statusCode: 403 });
    return;
  }
  await db.delete(projectsTable).where(eq(projectsTable.id, id));
  res.json({ success: true, message: "Project deleted" });
});

router.get("/dashboard/admin", requireRole("admin"), async (_req, res) => {
  const allProjects = await db.select({ id: projectsTable.id }).from(projectsTable);
  const totalProjects = allProjects.length;

  const taskStatusCounts = await db
    .select({ count: sql<number>`count(*)`, status: tasksTable.status })
    .from(tasksTable)
    .groupBy(tasksTable.status);

  const tasksByStatus = { todo: 0, in_progress: 0, in_review: 0, done: 0, overdue: 0 };
  let totalTasks = 0;
  for (const row of taskStatusCounts) {
    const count = Number(row.count);
    totalTasks += count;
    if (row.status in tasksByStatus) {
      (tasksByStatus as any)[row.status] = count;
    }
  }
  const overdueTaskCount = tasksByStatus.overdue;
  const activeUsersOnline = getOnlineUsersCount();

  res.json({ totalProjects, totalTasks, tasksByStatus, overdueTaskCount, activeUsersOnline });
});

router.get("/dashboard/pm", requireRole("project_manager"), async (req, res) => {
  const userId = req.user!.userId;
  const pmProjects = await db
    .select({
      id: projectsTable.id,
      name: projectsTable.name,
      description: projectsTable.description,
      status: projectsTable.status,
      clientId: projectsTable.clientId,
      clientName: clientsTable.name,
      createdById: projectsTable.createdById,
      createdByName: usersTable.name,
      createdAt: projectsTable.createdAt,
      updatedAt: projectsTable.updatedAt,
    })
    .from(projectsTable)
    .leftJoin(clientsTable, eq(projectsTable.clientId, clientsTable.id))
    .leftJoin(usersTable, eq(projectsTable.createdById, usersTable.id))
    .where(eq(projectsTable.createdById, userId))
    .orderBy(projectsTable.createdAt);

  const projectIds = pmProjects.map((p) => p.id);

  const projects = await Promise.all(
    pmProjects.map(async (p) => {
      const taskCounts = await db
        .select({ count: sql<number>`count(*)`, status: tasksTable.status })
        .from(tasksTable)
        .where(eq(tasksTable.projectId, p.id))
        .groupBy(tasksTable.status);
      let taskCount = 0, completedTaskCount = 0, overdueTaskCount = 0;
      for (const row of taskCounts) {
        taskCount += Number(row.count);
        if (row.status === "done") completedTaskCount += Number(row.count);
        if (row.status === "overdue") overdueTaskCount += Number(row.count);
      }
      return { ...p, taskCount, completedTaskCount, overdueTaskCount };
    })
  );

  const taskPriorityCounts = projectIds.length > 0
    ? await db
      .select({ count: sql<number>`count(*)`, priority: tasksTable.priority })
      .from(tasksTable)
      .where(sql`${tasksTable.projectId} = ANY(${sql`ARRAY[${sql.raw(projectIds.join(","))}]`})`)
      .groupBy(tasksTable.priority)
    : [];

  const tasksByPriority = { low: 0, medium: 0, high: 0, critical: 0 };
  for (const row of taskPriorityCounts) {
    (tasksByPriority as any)[row.priority] = Number(row.count);
  }

  const now = new Date();
  const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const upcomingTasks = projectIds.length > 0
    ? await db
      .select({
        id: tasksTable.id,
        title: tasksTable.title,
        description: tasksTable.description,
        status: tasksTable.status,
        priority: tasksTable.priority,
        dueDate: tasksTable.dueDate,
        projectId: tasksTable.projectId,
        assigneeId: tasksTable.assigneeId,
        createdById: tasksTable.createdById,
        isOverdue: tasksTable.isOverdue,
        createdAt: tasksTable.createdAt,
        updatedAt: tasksTable.updatedAt,
        projectName: projectsTable.name,
        assigneeName: usersTable.name,
      })
      .from(tasksTable)
      .leftJoin(projectsTable, eq(tasksTable.projectId, projectsTable.id))
      .leftJoin(usersTable, eq(tasksTable.assigneeId, usersTable.id))
      .where(sql`${tasksTable.projectId} = ANY(ARRAY[${sql.raw(projectIds.join(","))}]) AND ${tasksTable.dueDate} BETWEEN ${now.toISOString()} AND ${weekFromNow.toISOString()}`)
      .orderBy(tasksTable.dueDate)
      .limit(10)
    : [];

  res.json({ projects, tasksByPriority, upcomingDueDates: upcomingTasks });
});

export default router;
