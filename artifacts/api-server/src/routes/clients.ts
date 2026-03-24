import { Router, type IRouter } from "express";
import { z } from "zod";
import { db, clientsTable, eq } from "@workspace/db";
import { authenticate, requireRole } from "../middlewares/auth.js";

const router: IRouter = Router();

router.use(authenticate);

router.get("/", async (_req, res) => {
  const clients = await db.select().from(clientsTable).orderBy(clientsTable.name);
  res.json(clients);
});

const createClientSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  company: z.string().min(1),
});

router.post("/", requireRole("admin", "project_manager"), async (req, res) => {
  const parse = createClientSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: "Bad Request", message: "Invalid client data", statusCode: 400 });
    return;
  }
  const [client] = await db.insert(clientsTable).values(parse.data).returning();
  res.status(201).json(client);
});

export default router;
