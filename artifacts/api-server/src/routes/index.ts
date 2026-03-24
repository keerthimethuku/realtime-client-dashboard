import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import usersRouter from "./users.js";
import clientsRouter from "./clients.js";
import projectsRouter from "./projects.js";
import projectTasksRouter from "./projectTasks.js";
import tasksRouter from "./tasks.js";
import activityRouter from "./activity.js";
import notificationsRouter from "./notifications.js";
import dashboardRouter from "./dashboard.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/users", usersRouter);
router.use("/clients", clientsRouter);
router.use("/projects/:id/tasks", projectTasksRouter);
router.use("/projects", projectsRouter);
router.use("/tasks", tasksRouter);
router.use("/activity", activityRouter);
router.use("/notifications", notificationsRouter);
router.use("/dashboard", dashboardRouter);

export default router;
