/**
 * db.js — SQLite adapter with mysql2-compatible promise API
 * Uses better-sqlite3 under the hood but exposes db.execute()
 * so all controllers work unchanged.
 */
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', 'database', 'mentoring.db');

// Ensure database directory exists
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ── Auto-initialize schema on first run ──────────────────────────────────────
function initSchema() {
    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT NOT NULL CHECK(role IN ('admin','principal','hod','mentor','student')),
            department TEXT,
            is_approved INTEGER DEFAULT 0,
            profile_pic TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            last_login DATETIME
        );

        CREATE TABLE IF NOT EXISTS students (
            user_id INTEGER PRIMARY KEY,
            usn TEXT UNIQUE NOT NULL,
            year_semester TEXT,
            mentor_id INTEGER,
            interests TEXT,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (mentor_id) REFERENCES users(id) ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS hods (
            user_id INTEGER PRIMARY KEY,
            department TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS mentors (
            user_id INTEGER PRIMARY KEY,
            department TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS meetings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT,
            meeting_date DATETIME NOT NULL,
            meeting_type TEXT NOT NULL CHECK(meeting_type IN ('individual','group')),
            created_by INTEGER NOT NULL,
            status TEXT DEFAULT 'pending' CHECK(status IN ('pending','approved','active','completed','cancelled')),
            approved_by INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (created_by) REFERENCES users(id),
            FOREIGN KEY (approved_by) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS meeting_participants (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            meeting_id INTEGER NOT NULL,
            student_id INTEGER NOT NULL,
            attendance_status TEXT DEFAULT 'absent',
            FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE,
            FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS meeting_proceedings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            meeting_id INTEGER UNIQUE NOT NULL,
            notes TEXT,
            outcome TEXT,
            is_approved INTEGER DEFAULT 0,
            approved_by INTEGER,
            FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS marks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER NOT NULL,
            subject_code TEXT NOT NULL,
            subject_name TEXT,
            internal_marks INTEGER DEFAULT 0,
            external_marks INTEGER DEFAULT 0,
            internal_status TEXT DEFAULT 'pending' CHECK(internal_status IN ('pending','verified','approved','rejected')),
            external_status TEXT DEFAULT 'pending' CHECK(external_status IN ('pending','approved','rejected')),
            mentor_id INTEGER,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (mentor_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS attendance (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER NOT NULL,
            subject_code TEXT,
            total_classes INTEGER DEFAULT 0,
            attended_classes INTEGER DEFAULT 0,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(student_id, subject_code),
            FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS achievements (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            description TEXT,
            certificate_path TEXT,
            achievement_date DATE,
            FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS goals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER NOT NULL,
            goal_type TEXT NOT NULL CHECK(goal_type IN ('attendance','marks','skill')),
            target_value TEXT,
            deadline DATE,
            status TEXT DEFAULT 'pending' CHECK(status IN ('pending','achieved','missed')),
            mentor_comment TEXT,
            FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS feedback (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            meeting_id INTEGER NOT NULL,
            from_user_id INTEGER NOT NULL,
            to_user_id INTEGER NOT NULL,
            rating INTEGER CHECK(rating BETWEEN 1 AND 5),
            comments TEXT,
            FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS courses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT,
            category TEXT,
            url TEXT NOT NULL,
            duration TEXT
        );

        CREATE TABLE IF NOT EXISTS student_courses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER NOT NULL,
            course_id INTEGER NOT NULL,
            status TEXT DEFAULT 'recommended' CHECK(status IN ('recommended','in_progress','completed')),
            progress_days INTEGER DEFAULT 0,
            FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS issues (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER NOT NULL,
            category TEXT NOT NULL CHECK(category IN ('Academic','Personal','Career','Technical')),
            title TEXT NOT NULL,
            description TEXT,
            status TEXT DEFAULT 'Pending' CHECK(status IN ('Pending','In Progress','Solved')),
            mentor_response TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS notifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            message TEXT,
            is_read INTEGER DEFAULT 0,
            type TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sender_id INTEGER NOT NULL,
            receiver_id INTEGER NOT NULL,
            message TEXT NOT NULL,
            is_read INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (sender_id) REFERENCES users(id),
            FOREIGN KEY (receiver_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS activity_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            action TEXT NOT NULL,
            details TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
    `);

    // Seed courses
    const existing = db.prepare('SELECT COUNT(*) as c FROM courses').get();
    if (existing.c === 0) {
        db.exec(`
            INSERT INTO courses (title, description, category, url, duration) VALUES
            ('NPTEL DBMS Course','Database Management Systems by NPTEL','DBMS','https://nptel.ac.in/courses/106/105/106105175/','12 Weeks'),
            ('Java Programming Tutorial','Complete Java for beginners','Java','https://www.youtube.com/watch?v=eIrMbLywjZ0','30 Days'),
            ('Full Stack Web Development','MERN Stack learning path','Full Stack','https://www.freecodecamp.org/learn/2022/responsive-web-design/','6 Months'),
            ('AI/ML Foundations','Introduction to Machine Learning by Google','AI/ML','https://developers.google.com/machine-learning/crash-course','4 Weeks'),
            ('Cloud Computing Basics','AWS Cloud Practitioner Essentials','Cloud Computing','https://aws.amazon.com/training/digital/aws-cloud-practitioner-essentials/','10 Days'),
            ('Cybersecurity Essentials','Cisco Cybersecurity course','Cybersecurity','https://www.netacad.com/courses/cybersecurity/cybersecurity-essentials','15 Days'),
            ('Advanced Python','Deep dive into Python programming','Python','https://docs.python.org/3/tutorial/','20 Days'),
            ('React JS Mastery','Building modern UIs with React','Frontend','https://react.dev/learn','30 Days'),
            ('Node.js & Express','Backend development with Node.js','Backend','https://nodejs.org/en/docs/guides/','25 Days');
        `);
    }

    console.log('✅ SQLite database ready:', DB_PATH);
}

try {
    initSchema();
} catch (err) {
    console.error('❌ Schema init error:', err.message);
}

// ── mysql2-compatible async execute() wrapper ─────────────────────────────────
// Returns [rows, fields] just like mysql2 does so all controllers work unchanged
const adapter = {
    execute: (sql, params = []) => {
        return new Promise((resolve, reject) => {
            try {
                // Sanitize params — replace undefined/null with null for SQLite
                const safeParams = (params || []).map(p => (p === undefined ? null : p));

                const trimmed = sql.trim().toUpperCase();

                if (trimmed.startsWith('SELECT') || trimmed.startsWith('SHOW') || trimmed.startsWith('WITH')) {
                    const stmt = db.prepare(sql);
                    const rows = stmt.all(safeParams);
                    resolve([rows, []]);
                } else if (trimmed.startsWith('INSERT')) {
                    const stmt = db.prepare(sql);
                    const info = stmt.run(safeParams);
                    resolve([{ insertId: info.lastInsertRowid, affectedRows: info.changes, length: 0 }, []]);
                } else {
                    // UPDATE, DELETE, PRAGMA, etc.
                    const stmt = db.prepare(sql);
                    const info = stmt.run(safeParams);
                    resolve([{ affectedRows: info.changes, length: 0 }, []]);
                }
            } catch (err) {
                console.error('DB Error:', err.message, '\nSQL:', sql, '\nParams:', params);
                // Map SQLite errors to mysql2-style error codes
                if (err.message && err.message.includes('UNIQUE constraint failed')) {
                    err.code = 'ER_DUP_ENTRY';
                }
                reject(err);
            }
        });
    },

    // Also expose the raw db for transactions if needed
    raw: db
};

module.exports = adapter;

