const db = require('../config/db');

// NOTIFICATIONS
exports.getNotifications = async (req, res) => {
    try {
        const [notifs] = await db.execute(
            'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
            [req.user.id]
        );
        res.json(notifs);
    } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.markAllRead = async (req, res) => {
    try {
        await db.execute('UPDATE notifications SET is_read = TRUE WHERE user_id = ?', [req.user.id]);
        res.json({ message: 'All marked read' });
    } catch (err) { res.status(500).json({ message: err.message }); }
};

// MESSAGING
exports.getMessages = async (req, res) => {
    try {
        const { otherUserId } = req.params;
        const [messages] = await db.execute(
            'SELECT * FROM messages WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?) ORDER BY created_at ASC',
            [req.user.id, otherUserId, otherUserId, req.user.id]
        );
        res.json(messages);
    } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.sendMessage = async (req, res) => {
    try {
        const { receiverId, message } = req.body;
        if (!receiverId || !message) return res.status(400).json({ message: 'Missing receiverId or message' });
        await db.execute(
            'INSERT INTO messages (sender_id, receiver_id, message) VALUES (?, ?, ?)',
            [req.user.id, receiverId, message]
        );
        // Notify receiver
        await db.execute('INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
            [receiverId, 'New Message', `You have a new message.`, 'message']);
        res.status(201).json({ message: 'Message sent' });
    } catch (err) { res.status(500).json({ message: err.message }); }
};

// STUDENT PROFILE SEARCH (used by HOD, Mentor, Principal)
exports.getStudentFullProfile = async (req, res) => {
    try {
        const { usn } = req.params;
        const [student] = await db.execute(
            'SELECT u.id, u.name, u.email, u.department, s.usn, s.year_semester FROM users u JOIN students s ON u.id = s.user_id WHERE s.usn = ?',
            [usn]
        );
        if (!student.length) return res.status(404).json({ message: 'Student not found' });
        const uid = student[0].id;
        const [attendance] = await db.execute('SELECT * FROM attendance WHERE student_id = ?', [uid]);
        const [marks] = await db.execute('SELECT * FROM marks WHERE student_id = ?', [uid]);
        const [achievements] = await db.execute('SELECT * FROM achievements WHERE student_id = ?', [uid]);
        res.json({ profile: student[0], attendance, marks, achievements });
    } catch (err) { res.status(500).json({ message: err.message }); }
};

// DEPARTMENT ANALYTICS (shared for HOD/Principal)
exports.getDepartmentAnalytics = async (req, res) => {
    try {
        const dept = req.query.department || req.user.department;
        const [attendance] = await db.execute(
            'SELECT AVG(a.attended_classes/a.total_classes*100) AS avg_attendance FROM attendance a JOIN users u ON a.student_id=u.id WHERE u.department=? AND a.total_classes>0',
            [dept]
        );
        const [marks] = await db.execute(
            'SELECT AVG(m.internal_marks) AS avg_internal, AVG(m.external_marks) AS avg_external FROM marks m JOIN users u ON m.student_id=u.id WHERE u.department=?',
            [dept]
        );
        res.json({ attendance: attendance[0], marks: marks[0] });
    } catch (err) { res.status(500).json({ message: err.message }); }
};
