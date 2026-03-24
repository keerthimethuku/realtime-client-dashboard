import { Server as HttpServer } from "http";
import { Server as SocketServer, Socket } from "socket.io";
import { logger } from "./logger.js";
import { verifyAccessToken } from "./jwt.js";

let io: SocketServer | null = null;
const onlineUsers = new Map<number, Set<string>>();

export function initSocket(httpServer: HttpServer): SocketServer {
  io = new SocketServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
    path: "/socket.io",
  });

  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth["token"] as string | undefined;
    if (!token) {
      return next(new Error("Authentication required"));
    }
    try {
      const payload = verifyAccessToken(token);
      (socket as any).user = payload;
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket: Socket) => {
    const user = (socket as any).user as { userId: number; role: string; email: string };
    logger.info({ userId: user.userId, socketId: socket.id }, "Socket connected");

    if (!onlineUsers.has(user.userId)) {
      onlineUsers.set(user.userId, new Set());
    }
    onlineUsers.get(user.userId)!.add(socket.id);
    broadcastOnlineCount();

    socket.on("join_project", (data: { projectId: number }) => {
      socket.join(`project:${data.projectId}`);
      logger.info({ userId: user.userId, projectId: data.projectId }, "Joined project room");
    });

    socket.on("leave_project", (data: { projectId: number }) => {
      socket.leave(`project:${data.projectId}`);
    });

    socket.on("disconnect", () => {
      const sockets = onlineUsers.get(user.userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          onlineUsers.delete(user.userId);
        }
      }
      broadcastOnlineCount();
      logger.info({ userId: user.userId, socketId: socket.id }, "Socket disconnected");
    });
  });

  return io;
}

export function getIO(): SocketServer | null {
  return io;
}

export function getOnlineUsersCount(): number {
  return onlineUsers.size;
}

function broadcastOnlineCount(): void {
  if (io) {
    io.emit("online_users_count", { count: onlineUsers.size });
  }
}

export function emitToProject(projectId: number, event: string, data: unknown): void {
  if (io) {
    io.to(`project:${projectId}`).emit(event, data);
  }
}

export function emitToUser(userId: number, event: string, data: unknown): void {
  if (io) {
    io.sockets.sockets.forEach((socket) => {
      const socketUser = (socket as any).user as { userId: number } | undefined;
      if (socketUser?.userId === userId) {
        socket.emit(event, data);
      }
    });
  }
}

export function emitToAll(event: string, data: unknown): void {
  if (io) {
    io.emit(event, data);
  }
}
