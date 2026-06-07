# College ERP Mentoring System

A complete, full-stack ERP Mentoring System built with Node.js, Express, MySQL, and Vanilla JavaScript.

## Features
- **5 Dashboards**: Admin, Principal, HOD, Mentor, Student.
- **Role-Based Access**: Secure JWT-based authentication and role authorization.
- **Registration Approval**: Students/Mentors/HODs require Admin approval.
- **Mentor Allocation**: Admin can bulk assign students to mentors via USN.
- **Meeting Workflow**: Mentor/Admin scheduling with mutual approval logic.
- **Marks Management**: Internal/External marks tracking with verification flow.
- **Course Recommendations**: Based on student interests and academic performance.
- **Analytics & Charts**: Beautiful Chart.js visualizations for all roles.
- **Notifications**: System-wide notifications and cron-based reminders.
- **Reports**: Export attendance and marks as PDF/CSV.
- **Issue Tracking**: Student support system with status updates.

## Tech Stack
- **Frontend**: HTML, CSS, Vanilla JS, Lucide Icons, Chart.js.
- **Backend**: Node.js, Express.js.
- **Database**: MySQL.
- **Auth**: JWT, Bcrypt.

## Setup Instructions

### 1. Database Setup
1. Open your MySQL client (e.g., XAMPP, MySQL Workbench).
2. Create a database: `CREATE DATABASE mentoring_system;`.
3. Import the schema: `mysql -u root -p mentoring_system < database/schema.sql`.

### 2. Backend Setup
1. Navigate to the project root.
2. Install dependencies: `npm install`.
3. Configure `.env` file (update `DB_USER` and `DB_PASS` if necessary).

### 3. Seed Initial Data
Run the following command to create initial users:
```bash
npm run seed
```

### 4. Run the Project
```bash
npm start
```
The server will run on `http://localhost:5000`. 
The frontend is served statically at the same address.

## Initial Login Credentials
- **Admin**: `admin@gmail.com` / `admin123`
- **Principal**: `principal@gmail.com` / `principal123`
- **Mentor**: `smith@gmail.com` / `mentor123`
- **Student**: `john@gmail.com` / `student123` (or USN: `1XY20CS001`)
