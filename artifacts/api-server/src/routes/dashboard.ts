import { Router, type IRouter } from "express";
import { db, projectsTable, tasksTable, usersTable, clientsTable, eq, sql } from "@workspace/db";
import { authenticate, requireRole } from "../middlewares/auth.js";
import { getOnlineUsersCount } from "../lib/socket.js";

const router: IRouter = Router();

router.use(authenticate);

router.get("/admin", requireRole("admin"), async (_req, res) => {
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

router.get("/pm", requireRole("project_manager"), async (req, res) => {
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

  let tasksByPriority = { low: 0, medium: 0, high: 0, critical: 0 };
  let upcomingDueDates: any[] = [];

  if (projectIds.length > 0) {
    const taskPriorityCounts = await db
      .select({ count: sql<number>`count(*)`, priority: tasksTable.priority })
      .from(tasksTable)
      .where(sql`${tasksTable.projectId} = ANY(ARRAY[${sql.raw(projectIds.join(","))}])`)
      .groupBy(tasksTable.priority);

    for (const row of taskPriorityCounts) {
      (tasksByPriority as any)[row.priority] = Number(row.count);
    }

    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    upcomingDueDates = await db
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
      .limit(10);
  }

  res.json({ projects, tasksByPriority, upcomingDueDates });
});

router.get("/developer", requireRole("developer"), async (req, res) => {
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

export default router;
