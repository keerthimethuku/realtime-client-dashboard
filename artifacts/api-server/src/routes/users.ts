import { Router, type IRouter } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { db, usersTable, eq } from "@workspace/db";
import { authenticate, requireRole } from "../middlewares/auth.js";

const router: IRouter = Router();

router.use(authenticate);
router.use(requireRole("admin"));

router.get("/", async (_req, res) => {
  const users = await db.select({
    id: usersTable.id,
    email: usersTable.email,
    name: usersTable.name,
    role: usersTable.role,
    createdAt: usersTable.createdAt,
  }).from(usersTable).orderBy(usersTable.createdAt);
  res.json(users);
});

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  password: z.string().min(6),
  role: z.enum(["admin", "project_manager", "developer"]),
});

router.post("/", async (req, res) => {
  const parse = createUserSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: "Bad Request", message: "Invalid user data", statusCode: 400 });
    return;
  }
  const { email, name, password, role } = parse.data;
  const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (existing) {
    res.status(409).json({ error: "Conflict", message: "Email already in use", statusCode: 409 });
    return;
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const [user] = await db.insert(usersTable).values({ email, name, passwordHash, role }).returning({
    id: usersTable.id,
    email: usersTable.email,
    name: usersTable.name,
    role: usersTable.role,
    createdAt: usersTable.createdAt,
  });
  res.status(201).json(user);
});

router.get("/:id", async (req, res) => {
  const id = parseInt(req.params["id"]!);
  const [user] = await db.select({
    id: usersTable.id,
    email: usersTable.email,
    name: usersTable.name,
    role: usersTable.role,
    createdAt: usersTable.createdAt,
  }).from(usersTable).where(eq(usersTable.id, id)).limit(1);
  if (!user) {
    res.status(404).json({ error: "Not Found", message: "User not found", statusCode: 404 });
    return;
  }
  res.json(user);
});

const updateUserSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().min(1).optional(),
  role: z.enum(["admin", "project_manager", "developer"]).optional(),
});

router.patch("/:id", async (req, res) => {
  const id = parseInt(req.params["id"]!);
  const parse = updateUserSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: "Bad Request", message: "Invalid data", statusCode: 400 });
    return;
  }
  const [user] = await db.update(usersTable).set({ ...parse.data, updatedAt: new Date() }).where(eq(usersTable.id, id)).returning({
    id: usersTable.id,
    email: usersTable.email,
    name: usersTable.name,
    role: usersTable.role,
    createdAt: usersTable.createdAt,
  });
  if (!user) {
    res.status(404).json({ error: "Not Found", message: "User not found", statusCode: 404 });
    return;
  }
  res.json(user);
});

router.delete("/:id", async (req, res) => {
  const id = parseInt(req.params["id"]!);
  const [deleted] = await db.delete(usersTable).where(eq(usersTable.id, id)).returning({ id: usersTable.id });
  if (!deleted) {
    res.status(404).json({ error: "Not Found", message: "User not found", statusCode: 404 });
    return;
  }
  res.json({ success: true, message: "User deleted" });
});

export default router;
