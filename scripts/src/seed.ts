import bcrypt from "bcryptjs";
import {
  db,
  usersTable,
  clientsTable,
  projectsTable,
  tasksTable,
  activityTable,
  notificationsTable,
} from "@workspace/db";

async function seed() {
  console.log("🌱 Seeding database...");

  const adminHash = await bcrypt.hash("admin123", 10);
  const pmHash = await bcrypt.hash("pm123456", 10);
  const devHash = await bcrypt.hash("dev12345", 10);

  const [admin] = await db.insert(usersTable).values({
    email: "admin@velozity.com",
    name: "Alice Admin",
    passwordHash: adminHash,
    role: "admin",
  }).returning();

  const [pm1] = await db.insert(usersTable).values({
    email: "pm1@velozity.com",
    name: "Bob Manager",
    passwordHash: pmHash,
    role: "project_manager",
  }).returning();

  const [pm2] = await db.insert(usersTable).values({
    email: "pm2@velozity.com",
    name: "Carol Manager",
    passwordHash: pmHash,
    role: "project_manager",
  }).returning();

  const [dev1] = await db.insert(usersTable).values({
    email: "dev1@velozity.com",
    name: "Dave Developer",
    passwordHash: devHash,
    role: "developer",
  }).returning();

  const [dev2] = await db.insert(usersTable).values({
    email: "dev2@velozity.com",
    name: "Eve Engineer",
    passwordHash: devHash,
    role: "developer",
  }).returning();

  const [dev3] = await db.insert(usersTable).values({
    email: "dev3@velozity.com",
    name: "Frank Frontend",
    passwordHash: devHash,
    role: "developer",
  }).returning();

  const [dev4] = await db.insert(usersTable).values({
    email: "dev4@velozity.com",
    name: "Grace Fullstack",
    passwordHash: devHash,
    role: "developer",
  }).returning();

  console.log("✅ Users created");

  const [client1] = await db.insert(clientsTable).values({
    name: "TechCorp Inc",
    email: "contact@techcorp.com",
    company: "TechCorp Inc",
  }).returning();

  const [client2] = await db.insert(clientsTable).values({
    name: "StartupXYZ",
    email: "hello@startupxyz.io",
    company: "StartupXYZ LLC",
  }).returning();

  const [client3] = await db.insert(clientsTable).values({
    name: "Enterprise Solutions",
    email: "info@enterprise.com",
    company: "Enterprise Solutions Corp",
  }).returning();

  console.log("✅ Clients created");

  const [project1] = await db.insert(projectsTable).values({
    name: "E-commerce Platform Redesign",
    description: "Complete redesign of TechCorp's e-commerce platform with modern UI and improved UX",
    status: "active",
    clientId: client1!.id,
    createdById: pm1!.id,
  }).returning();

  const [project2] = await db.insert(projectsTable).values({
    name: "Mobile App MVP",
    description: "Build the MVP for StartupXYZ's mobile application for iOS and Android",
    status: "active",
    clientId: client2!.id,
    createdById: pm1!.id,
  }).returning();

  const [project3] = await db.insert(projectsTable).values({
    name: "Enterprise Dashboard",
    description: "Internal analytics dashboard for Enterprise Solutions management team",
    status: "active",
    clientId: client3!.id,
    createdById: pm2!.id,
  }).returning();

  console.log("✅ Projects created");

  const now = new Date();
  const pastDate = (daysAgo: number) => new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
  const futureDate = (daysAhead: number) => new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

  const project1Tasks = await db.insert(tasksTable).values([
    {
      title: "Design system setup",
      description: "Set up Figma design system with color palette, typography, and components",
      status: "done",
      priority: "high",
      dueDate: pastDate(10),
      projectId: project1!.id,
      assigneeId: dev1!.id,
      createdById: pm1!.id,
      isOverdue: false,
    },
    {
      title: "Product listing page",
      description: "Build responsive product listing with filtering and pagination",
      status: "in_progress",
      priority: "critical",
      dueDate: futureDate(3),
      projectId: project1!.id,
      assigneeId: dev2!.id,
      createdById: pm1!.id,
      isOverdue: false,
    },
    {
      title: "Shopping cart implementation",
      description: "Implement cart with local state and server sync",
      status: "todo",
      priority: "high",
      dueDate: futureDate(7),
      projectId: project1!.id,
      assigneeId: dev1!.id,
      createdById: pm1!.id,
      isOverdue: false,
    },
    {
      title: "Payment gateway integration",
      description: "Integrate Stripe for checkout flow",
      status: "todo",
      priority: "critical",
      dueDate: futureDate(14),
      projectId: project1!.id,
      assigneeId: dev3!.id,
      createdById: pm1!.id,
      isOverdue: false,
    },
    {
      title: "Performance optimization",
      description: "Achieve Core Web Vitals passing scores, image optimization",
      status: "overdue",
      priority: "medium",
      dueDate: pastDate(3),
      projectId: project1!.id,
      assigneeId: dev2!.id,
      createdById: pm1!.id,
      isOverdue: true,
    },
    {
      title: "API rate limiting",
      description: "Implement rate limiting on all public API endpoints",
      status: "overdue",
      priority: "high",
      dueDate: pastDate(5),
      projectId: project1!.id,
      assigneeId: dev3!.id,
      createdById: pm1!.id,
      isOverdue: true,
    },
  ]).returning();

  const project2Tasks = await db.insert(tasksTable).values([
    {
      title: "User authentication screens",
      description: "Login, signup, forgot password flows with biometric support",
      status: "done",
      priority: "critical",
      dueDate: pastDate(7),
      projectId: project2!.id,
      assigneeId: dev4!.id,
      createdById: pm1!.id,
      isOverdue: false,
    },
    {
      title: "Dashboard home screen",
      description: "Main app dashboard with KPIs and quick actions",
      status: "in_review",
      priority: "high",
      dueDate: futureDate(2),
      projectId: project2!.id,
      assigneeId: dev1!.id,
      createdById: pm1!.id,
      isOverdue: false,
    },
    {
      title: "Push notifications setup",
      description: "Configure FCM for Android and APNs for iOS",
      status: "in_progress",
      priority: "medium",
      dueDate: futureDate(5),
      projectId: project2!.id,
      assigneeId: dev4!.id,
      createdById: pm1!.id,
      isOverdue: false,
    },
    {
      title: "Offline data sync",
      description: "Implement offline-first architecture with background sync",
      status: "todo",
      priority: "high",
      dueDate: futureDate(10),
      projectId: project2!.id,
      assigneeId: dev2!.id,
      createdById: pm1!.id,
      isOverdue: false,
    },
    {
      title: "App store submission prep",
      description: "Screenshots, descriptions, privacy policy for App Store and Play Store",
      status: "todo",
      priority: "low",
      dueDate: futureDate(21),
      projectId: project2!.id,
      assigneeId: dev4!.id,
      createdById: pm1!.id,
      isOverdue: false,
    },
  ]).returning();

  const project3Tasks = await db.insert(tasksTable).values([
    {
      title: "Data pipeline design",
      description: "Design ETL pipeline architecture for pulling enterprise data",
      status: "done",
      priority: "critical",
      dueDate: pastDate(14),
      projectId: project3!.id,
      assigneeId: dev3!.id,
      createdById: pm2!.id,
      isOverdue: false,
    },
    {
      title: "Real-time charts implementation",
      description: "Build interactive charts using D3.js with live data streaming",
      status: "in_progress",
      priority: "high",
      dueDate: futureDate(4),
      projectId: project3!.id,
      assigneeId: dev3!.id,
      createdById: pm2!.id,
      isOverdue: false,
    },
    {
      title: "Role-based access control",
      description: "Implement RBAC for different management levels",
      status: "in_review",
      priority: "critical",
      dueDate: futureDate(1),
      projectId: project3!.id,
      assigneeId: dev2!.id,
      createdById: pm2!.id,
      isOverdue: false,
    },
    {
      title: "Export to PDF/Excel",
      description: "Report generation with customizable templates",
      status: "todo",
      priority: "medium",
      dueDate: futureDate(12),
      projectId: project3!.id,
      assigneeId: dev4!.id,
      createdById: pm2!.id,
      isOverdue: false,
    },
    {
      title: "Mobile responsiveness",
      description: "Ensure all dashboard views are usable on tablets and mobile devices",
      status: "todo",
      priority: "low",
      dueDate: futureDate(18),
      projectId: project3!.id,
      assigneeId: dev1!.id,
      createdById: pm2!.id,
      isOverdue: false,
    },
  ]).returning();

  console.log("✅ Tasks created");

  const activityEntries = [
    {
      taskId: project1Tasks[0]!.id,
      projectId: project1!.id,
      userId: dev1!.id,
      action: "status_change",
      fromStatus: "in_progress",
      toStatus: "done",
      description: `Dave Developer moved Design system setup from In Progress → Done`,
      createdAt: pastDate(10),
    },
    {
      taskId: project1Tasks[1]!.id,
      projectId: project1!.id,
      userId: dev2!.id,
      action: "status_change",
      fromStatus: "todo",
      toStatus: "in_progress",
      description: `Eve Engineer moved Product listing page from To Do → In Progress`,
      createdAt: pastDate(2),
    },
    {
      taskId: project2Tasks[1]!.id,
      projectId: project2!.id,
      userId: dev1!.id,
      action: "status_change",
      fromStatus: "in_progress",
      toStatus: "in_review",
      description: `Dave Developer moved Dashboard home screen from In Progress → In Review`,
      createdAt: pastDate(1),
    },
    {
      taskId: project3Tasks[2]!.id,
      projectId: project3!.id,
      userId: dev2!.id,
      action: "status_change",
      fromStatus: "in_progress",
      toStatus: "in_review",
      description: `Eve Engineer moved Role-based access control from In Progress → In Review`,
      createdAt: pastDate(0),
    },
    {
      taskId: project1Tasks[0]!.id,
      projectId: project1!.id,
      userId: pm1!.id,
      action: "created",
      description: `Bob Manager created task Design system setup`,
      createdAt: pastDate(20),
    },
    {
      taskId: project2Tasks[2]!.id,
      projectId: project2!.id,
      userId: dev4!.id,
      action: "status_change",
      fromStatus: "todo",
      toStatus: "in_progress",
      description: `Grace Fullstack moved Push notifications setup from To Do → In Progress`,
      createdAt: pastDate(3),
    },
  ];

  for (const entry of activityEntries) {
    await db.insert(activityTable).values(entry as any);
  }

  console.log("✅ Activity log entries created");

  await db.insert(notificationsTable).values([
    {
      userId: pm1!.id,
      type: "task_in_review",
      title: "Task in Review",
      message: "Dashboard home screen has been moved to In Review",
      taskId: project2Tasks[1]!.id,
      projectId: project2!.id,
      isRead: false,
    },
    {
      userId: dev1!.id,
      type: "task_assigned",
      title: "Task Assigned",
      message: "You have been assigned to: Shopping cart implementation",
      taskId: project1Tasks[2]!.id,
      projectId: project1!.id,
      isRead: false,
    },
    {
      userId: dev3!.id,
      type: "task_assigned",
      title: "Task Assigned",
      message: "You have been assigned to: Payment gateway integration",
      taskId: project1Tasks[3]!.id,
      projectId: project1!.id,
      isRead: true,
    },
  ]);

  console.log("✅ Notifications created");

  console.log("\n🎉 Seed complete!\n");
  console.log("Test accounts:");
  console.log("  Admin:   admin@velozity.com / admin123");
  console.log("  PM 1:    pm1@velozity.com   / pm123456");
  console.log("  PM 2:    pm2@velozity.com   / pm123456");
  console.log("  Dev 1:   dev1@velozity.com  / dev12345");
  console.log("  Dev 2:   dev2@velozity.com  / dev12345");
  console.log("  Dev 3:   dev3@velozity.com  / dev12345");
  console.log("  Dev 4:   dev4@velozity.com  / dev12345");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
