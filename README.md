# Real-Time Client Project Dashboard

## Overview
The Real-Time Client Project Dashboard is a full-stack web application designed to manage clients, projects, tasks, and team activity with role-based access control and real-time updates. The system supports Admin, Project Manager, and Developer roles with strictly enforced permissions at the API level.

The application includes project and task management, activity logging, notifications, dashboards, filtering, real-time activity feed, and automated overdue task tracking through background jobs. The project is built using a monorepo architecture with shared database schema, API validation, and generated API client to ensure consistency between frontend and backend.

The primary focus of this project was backend architecture, role-based authorization, real-time systems, and database design rather than building a simple CRUD application.


## Features

### Authentication & Authorization
* JWT Authentication (Access Token + Refresh Token)
* Role-Based Access Control
* API-level authorization middleware
* Roles:
  * Admin
  * Project Manager
  * Developer

### Project & Task Management
* Clients, Projects, and Tasks management
* Task status workflow (To Do, In Progress, In Review, Done)
* Task priority and due date tracking
* Task activity logging with timestamp and user tracking

### Real-Time Activity Feed
* Implemented using WebSocket
* Users receive live updates when task status changes
* Activity visibility filtered based on role and project access
* Activity logs stored in database and fetched for missed events

### Notifications
* In-app notifications stored in database
* Notifications generated for task assignment, task updates, and overdue tasks
* Notification count displayed in dashboard

### Overdue Task Scheduler
* Background scheduler automatically marks tasks as overdue when due date passes
* Activity log entry created for overdue tasks

### Dashboards
* Admin Dashboard – Projects overview and overdue tasks
* Project Manager Dashboard – Project summary and tasks
* Developer Dashboard – Assigned tasks sorted by priority and due date

### Filtering
* Tasks can be filtered by:
  * Status
  * Priority
  * Due date range

### Seed Data
* Seed script populates database with users, projects, tasks, overdue tasks, activity logs, and notifications


## Tech Stack

### Frontend
* React
* TypeScript
* Vite
* React Query
* Socket.io Client

### Backend
* Node.js
* Express
* TypeScript
* Socket.io
* Zod Validation

### Database
* PostgreSQL
* Drizzle ORM

### Architecture & Tooling
* pnpm Workspaces (Monorepo)
* OpenAPI Specification
* API Client & Schema Code Generation
* Cron Jobs for Background Tasks
* Shared Libraries for database schema and validation


## Monorepo Project Structure
realtime-client-dashboard
├── artifacts
│   ├── api-server
│   └── dashboard
├── lib
│   ├── api-client-react
│   ├── api-spec
│   ├── api-zod
│   └── db
├── scripts
│   └── src
│        └── seed.ts
├── README.md
├── .env.example
└── pnpm-workspace.yaml


## System Architecture
The system is built using a monorepo architecture where backend, frontend, database schema, API validation, and API client are maintained as separate workspace packages.

* Backend built using Express with modular routes and middleware
* PostgreSQL database accessed through Drizzle ORM with relational schema
* API request and response validation implemented using Zod schemas
* Real-time activity updates implemented using WebSocket
* Overdue tasks handled by a scheduled background job
* Frontend dashboard built using React and TypeScript
* Shared libraries ensure consistent API contracts between frontend and backend


## Database Design
Main tables used in the system:
* users
* clients
* projects
* tasks
* activity_logs
* notifications

Relationships:
* Client → Projects
* Project → Tasks
* Task → Activity Logs
* User → Tasks
* User → Notifications


## Conclusion
This project demonstrates a full-stack system with role-based access control, real-time activity updates, background job scheduling, relational database design, API validation, and monorepo architecture. The main objective of this project was to design a scalable backend architecture with proper authorization, real-time communication, and structured database design rather than a simple CRUD application.

