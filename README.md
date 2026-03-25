Real-Time Client Project Dashboard

#Overview
This project is a Real-Time Client Project Dashboard built as a full-stack monorepo application. The system allows an agency to manage clients, projects, tasks, and team activity with role-based access control, real-time activity feed, notifications, and automated overdue task tracking.
The application is designed with a monorepo architecture, shared libraries, API schema generation, database ORM, and WebSocket-based real-time updates.
Features
Authentication & Roles
JWT Authentication (Access Token + Refresh Token)
Refresh token stored securely
Role-based access control:
Admin – Full access to all data
Project Manager – Manage their projects and tasks
Developer – View and update only assigned tasks
Backend role enforcement via middleware
Project & Task Management
Clients, Projects, Tasks management
Task fields:
Title
Description
Assigned Developer
Status
Priority
Due Date
Activity log stored in database for every task update
Real-Time Activity Feed
Implemented using WebSocket (Socket.io)
Users see activity updates in real time without refresh
Role-filtered activity feed:
Admin → All activity
Project Manager → Their projects
Developer → Assigned tasks
Notifications
Task assignment notification
Task moved to review notification
Unread notification count
Real-time notification updates via WebSocket
Overdue Task Scheduler
Background job using cron scheduler
Automatically marks tasks as overdue when due date passes
Dashboards
Admin Dashboard
Total projects
Tasks by status
Overdue tasks
Active users online
Project Manager Dashboard
Project summary
Tasks by priority
Upcoming due dates
Developer Dashboard
Assigned tasks sorted by priority and due date
Filters
Tasks can be filtered by:
Status
Priority
Due date range
Filters implemented via query parameters
Tech Stack
Frontend
React
TypeScript
Vite
React Query
Socket.io client
Backend
Node.js
Express
TypeScript
Socket.io
Zod Validation
Database
PostgreSQL
Drizzle ORM
Other Tools
pnpm Workspaces (Monorepo)
OpenAPI Specification
Orval Code Generation
Cron Jobs
JWT Authentication
