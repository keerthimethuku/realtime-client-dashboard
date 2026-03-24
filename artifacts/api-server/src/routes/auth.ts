import { Router, type IRouter } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { db, usersTable, eq } from "@workspace/db";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../lib/jwt.js";
import { authenticate } from "../middlewares/auth.js";

const router: IRouter = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

router.post("/login", async (req, res) => {
  const parse = loginSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: "Bad Request", message: "Invalid email or password format", statusCode: 400 });
    return;
  }
  const { email, password } = parse.data;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (!user) {
    res.status(401).json({ error: "Unauthorized", message: "Invalid credentials", statusCode: 401 });
    return;
  }
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Unauthorized", message: "Invalid credentials", statusCode: 401 });
    return;
  }
  const payload = { userId: user.id, role: user.role, email: user.email };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);
  const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
  await db.update(usersTable).set({ refreshTokenHash, updatedAt: new Date() }).where(eq(usersTable.id, user.id));

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env["NODE_ENV"] === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/api/auth",
  });

  res.json({
    accessToken,
    user: { id: user.id, email: user.email, name: user.name, role: user.role, createdAt: user.createdAt },
  });
});

router.post("/refresh", async (req, res) => {
  const token = req.cookies?.["refreshToken"];
  if (!token) {
    res.status(401).json({ error: "Unauthorized", message: "No refresh token", statusCode: 401 });
    return;
  }
  try {
    const payload = verifyRefreshToken(token);
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, payload.userId)).limit(1);
    if (!user || !user.refreshTokenHash) {
      res.status(401).json({ error: "Unauthorized", message: "Invalid refresh token", statusCode: 401 });
      return;
    }
    const valid = await bcrypt.compare(token, user.refreshTokenHash);
    if (!valid) {
      res.status(401).json({ error: "Unauthorized", message: "Invalid refresh token", statusCode: 401 });
      return;
    }
    const newPayload = { userId: user.id, role: user.role, email: user.email };
    const newAccessToken = signAccessToken(newPayload);
    const newRefreshToken = signRefreshToken(newPayload);
    const newRefreshTokenHash = await bcrypt.hash(newRefreshToken, 10);
    await db.update(usersTable).set({ refreshTokenHash: newRefreshTokenHash, updatedAt: new Date() }).where(eq(usersTable.id, user.id));

    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: process.env["NODE_ENV"] === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/api/auth",
    });

    res.json({
      accessToken: newAccessToken,
      user: { id: user.id, email: user.email, name: user.name, role: user.role, createdAt: user.createdAt },
    });
  } catch {
    res.status(401).json({ error: "Unauthorized", message: "Invalid or expired refresh token", statusCode: 401 });
  }
});

router.post("/logout", authenticate, async (req, res) => {
  await db.update(usersTable)
    .set({ refreshTokenHash: null, updatedAt: new Date() })
    .where(eq(usersTable.id, req.user!.userId));
  res.clearCookie("refreshToken", { path: "/api/auth" });
  res.json({ success: true, message: "Logged out" });
});

router.get("/me", authenticate, async (req, res) => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId)).limit(1);
  if (!user) {
    res.status(404).json({ error: "Not Found", message: "User not found", statusCode: 404 });
    return;
  }
  res.json({ id: user.id, email: user.email, name: user.name, role: user.role, createdAt: user.createdAt });
});

export default router;
