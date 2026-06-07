const db = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// ── REGISTER ──────────────────────────────────────────────────────────────────
exports.register = async (req, res) => {
    const { name, email, password, role, department, usn, year_semester } = req.body;

    // Input validation
    if (!name || !email || !password || !role) {
        return res.status(400).json({ message: 'Name, email, password, and role are required.' });
    }
    if (!['admin', 'principal', 'hod', 'mentor', 'student'].includes(role)) {
        return res.status(400).json({ message: 'Invalid role.' });
    }
    if (role === 'student' && !usn) {
        return res.status(400).json({ message: 'USN is required for students.' });
    }
    if (password.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters.' });
    }

    // Duplicate email check
    const [existingEmail] = await db.execute('SELECT id FROM users WHERE email = ?', [email.toLowerCase().trim()]);
    if (existingEmail.length > 0) {
        return res.status(400).json({ message: 'This email is already registered. Please login.' });
    }

    // Duplicate USN check
    if (role === 'student' && usn) {
        const [existingUSN] = await db.execute('SELECT user_id FROM students WHERE usn = ?', [usn.toUpperCase().trim()]);
        if (existingUSN.length > 0) {
            return res.status(400).json({ message: 'This USN is already registered.' });
        }
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const isApproved = (role === 'admin' || role === 'principal') ? 1 : 0;

    const [result] = await db.execute(
        'INSERT INTO users (name, email, password, role, department, is_approved) VALUES (?, ?, ?, ?, ?, ?)',
        [name.trim(), email.toLowerCase().trim(), hashedPassword, role, department || null, isApproved]
    );
    const userId = result.insertId;

    if (role === 'student') {
        await db.execute(
            'INSERT INTO students (user_id, usn, year_semester) VALUES (?, ?, ?)',
            [userId, usn.toUpperCase().trim(), year_semester || '']
        );
    } else if (role === 'mentor') {
        await db.execute('INSERT INTO mentors (user_id, department) VALUES (?, ?)', [userId, department || '']);
    } else if (role === 'hod') {
        await db.execute('INSERT INTO hods (user_id, department) VALUES (?, ?)', [userId, department || '']);
    }

    await db.execute(
        'INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)',
        [userId, 'User Registered', `Role: ${role}`]
    );

    const message = isApproved
        ? '✅ Registration successful! You can now login.'
        : '⏳ Registration submitted! Awaiting admin approval before you can login.';

    res.status(201).json({ message, userId });
};

// ── LOGIN ─────────────────────────────────────────────────────────────────────
exports.login = async (req, res) => {
    const { email, password, usn } = req.body;

    if (!password) return res.status(400).json({ message: 'Password is required.' });
    if (!email && !usn) return res.status(400).json({ message: 'Email or USN is required.' });

    let user;
    if (email) {
        const [users] = await db.execute('SELECT * FROM users WHERE email = ?', [email.toLowerCase().trim()]);
        user = users[0];
    } else {
        const [students] = await db.execute(
            'SELECT u.* FROM users u JOIN students s ON u.id = s.user_id WHERE s.usn = ?',
            [usn.toUpperCase().trim()]
        );
        user = students[0];
    }

    if (!user) return res.status(404).json({ message: 'No account found with these credentials.' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Incorrect password.' });

    if (!user.is_approved) {
        return res.status(403).json({ message: 'Your account is pending admin approval.' });
    }

    await db.execute('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);

    const token = jwt.sign(
        { id: user.id, role: user.role, email: user.email, name: user.name },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
    );

    await db.execute('INSERT INTO activity_logs (user_id, action) VALUES (?, ?)', [user.id, 'User Logged In']);

    res.json({
        token,
        user: { id: user.id, name: user.name, email: user.email, role: user.role, department: user.department }
    });
};

// ── GET ME ────────────────────────────────────────────────────────────────────
exports.getMe = async (req, res) => {
    const [users] = await db.execute(
        'SELECT id, name, email, role, department, profile_pic FROM users WHERE id = ?',
        [req.user.id]
    );
    if (!users.length) return res.status(404).json({ message: 'User not found.' });

    let userInfo = users[0];
    if (userInfo.role === 'student') {
        const [sd] = await db.execute(
            'SELECT usn, year_semester, mentor_id, interests FROM students WHERE user_id = ?',
            [req.user.id]
        );
        userInfo.studentDetails = sd[0] || {};
    }
    res.json(userInfo);
};
