import { pgTable, serial, text, timestamp, integer, pgEnum, boolean, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { projectsTable } from "./projects";

export const taskStatusEnum = pgEnum("task_status", ["todo", "in_progress", "in_review", "done", "overdue"]);
export const taskPriorityEnum = pgEnum("task_priority", ["low", "medium", "high", "critical"]);

export const tasksTable = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  status: taskStatusEnum("status").notNull().default("todo"),
  priority: taskPriorityEnum("priority").notNull().default("medium"),
  dueDate: timestamp("due_date"),
  isOverdue: boolean("is_overdue").notNull().default(false),
  projectId: integer("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
  assigneeId: integer("assignee_id").references(() => usersTable.id, { onDelete: "set null" }),
  createdById: integer("created_by_id").notNull().references(() => usersTable.id, { onDelete: "restrict" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("tasks_project_idx").on(table.projectId),
  index("tasks_assignee_idx").on(table.assigneeId),
  index("tasks_status_idx").on(table.status),
  index("tasks_priority_idx").on(table.priority),
  index("tasks_due_date_idx").on(table.dueDate),
  index("tasks_overdue_idx").on(table.isOverdue),
]);

export const insertTaskSchema = createInsertSchema(tasksTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  isOverdue: true,
});

export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasksTable.$inferSelect;
