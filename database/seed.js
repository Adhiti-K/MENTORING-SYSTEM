/**
 * seed.js — Creates default admin user in the SQLite database
 * Run with: npm run seed
 */
const bcrypt = require('bcrypt');
const db = require('../config/db');

async function seed() {
    console.log('🌱 Seeding database...\n');

    const users = [
        { name: 'System Admin',     email: 'admin@eduerp.com',     password: 'admin123',     role: 'admin',     department: 'Administration', approved: 1 },
        { name: 'Dr. Principal',    email: 'principal@eduerp.com', password: 'principal123', role: 'principal', department: 'Management',     approved: 1 },
        { name: 'Dr. HOD CSE',      email: 'hod@eduerp.com',       password: 'hod123',       role: 'hod',       department: 'CSE',           approved: 1 },
        { name: 'Prof. Mentor One', email: 'mentor@eduerp.com',    password: 'mentor123',    role: 'mentor',    department: 'CSE',           approved: 1 },
        { name: 'Student Demo',     email: 'student@eduerp.com',   password: 'student123',   role: 'student',   department: 'CSE',           approved: 1 },
    ];

    for (const u of users) {
        try {
            // Check if already exists
            const [existing] = await db.execute('SELECT id FROM users WHERE email = ?', [u.email]);
            if (existing.length > 0) {
                console.log(`  ⚠  Skipped (already exists): ${u.email}`);
                continue;
            }

            const hash = await bcrypt.hash(u.password, 10);
            const [result] = await db.execute(
                'INSERT INTO users (name, email, password, role, department, is_approved) VALUES (?, ?, ?, ?, ?, ?)',
                [u.name, u.email, hash, u.role, u.department, u.approved]
            );
            const userId = result.insertId;

            // Role-specific inserts
            if (u.role === 'student') {
                await db.execute(
                    'INSERT INTO students (user_id, usn, year_semester) VALUES (?, ?, ?)',
                    [userId, '1XY20CS001', '3rd Year / 6th Sem']
                );
            } else if (u.role === 'mentor') {
                await db.execute('INSERT INTO mentors (user_id, department) VALUES (?, ?)', [userId, u.department]);
            } else if (u.role === 'hod') {
                await db.execute('INSERT INTO hods (user_id, department) VALUES (?, ?)', [userId, u.department]);
            }

            console.log(`  ✅  Created: ${u.email} (${u.role}) — password: ${u.password}`);
        } catch (err) {
            console.error(`  ❌  Error seeding ${u.email}:`, err.message);
        }
    }

    // Assign the demo student to the mentor
    try {
        const [mentors] = await db.execute('SELECT id FROM users WHERE role = ? AND email = ?', ['mentor', 'mentor@eduerp.com']);
        const [students] = await db.execute('SELECT user_id FROM students WHERE usn = ?', ['1XY20CS001']);
        if (mentors.length && students.length) {
            await db.execute('UPDATE students SET mentor_id = ? WHERE user_id = ?', [mentors[0].id, students[0].user_id]);
            console.log('\n  🔗  Assigned demo student → mentor');
        }
    } catch (err) { /* ignore if already done */ }

    console.log('\n✅ Seeding complete!\n');
    console.log('─────────────────────────────────────────');
    console.log('  Login credentials:');
    console.log('  Admin:     admin@eduerp.com / admin123');
    console.log('  Principal: principal@eduerp.com / principal123');
    console.log('  HOD:       hod@eduerp.com / hod123');
    console.log('  Mentor:    mentor@eduerp.com / mentor123');
    console.log('  Student:   student@eduerp.com / student123');
    console.log('             USN: 1XY20CS001');
    console.log('─────────────────────────────────────────\n');
    process.exit(0);
}

seed();
