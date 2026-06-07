const db = require('../config/db');
const PDFDocument = require('pdfkit');
const { Parser } = require('json2csv');

// REGISTRATION APPROVAL
exports.getPendingApprovals = async (req, res) => {
    try {
        const [users] = await db.execute(
            'SELECT u.id, u.name, u.email, u.role, u.department, s.usn FROM users u LEFT JOIN students s ON u.id = s.user_id WHERE u.is_approved = FALSE ORDER BY u.created_at DESC'
        );
        res.json(users);
    } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.approveUser = async (req, res) => {
    try {
        const { userId } = req.params;
        await db.execute('UPDATE users SET is_approved = TRUE WHERE id = ?', [userId]);
        await db.execute('INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
            [userId, 'Account Approved', 'Your account has been approved by the admin. You can now login.', 'approval']);
        await db.execute('INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)',
            [req.user.id, 'Approved User', `User ID: ${userId}`]);
        res.json({ message: 'User approved successfully' });
    } catch (err) { res.status(500).json({ message: err.message }); }
};

// MENTOR ALLOCATION
exports.getMentors = async (req, res) => {
    try {
        const [mentors] = await db.execute("SELECT id, name, email, department FROM users WHERE role = 'mentor' AND is_approved = 1");
        res.json(mentors);
    } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.getUnallocatedStudents = async (req, res) => {
    try {
        const [students] = await db.execute(
            'SELECT u.id, u.name, s.usn, u.department, s.year_semester FROM users u JOIN students s ON u.id = s.user_id WHERE s.mentor_id IS NULL AND u.is_approved = TRUE'
        );
        res.json(students);
    } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.allocateMentor = async (req, res) => {
    try {
        const { studentIds, mentorId } = req.body;
        if (!studentIds?.length || !mentorId) return res.status(400).json({ message: 'Missing studentIds or mentorId' });
        for (const sid of studentIds) {
            await db.execute('UPDATE students SET mentor_id = ? WHERE user_id = ?', [mentorId, sid]);
            await db.execute('INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
                [sid, 'Mentor Allocated', 'A mentor has been assigned to you.', 'allocation']);
        }
        await db.execute('INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)',
            [req.user.id, 'Allocated Mentor', `Mentor ${mentorId} to ${studentIds.length} students`]);
        res.json({ message: 'Mentor allocated successfully' });
    } catch (err) { res.status(500).json({ message: err.message }); }
};

// MEETING MANAGEMENT
exports.getAllMeetings = async (req, res) => {
    try {
        const [meetings] = await db.execute(
            'SELECT m.*, u.name AS creator_name FROM meetings m JOIN users u ON m.created_by = u.id ORDER BY m.created_at DESC'
        );
        res.json(meetings);
    } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.getPendingMeetings = async (req, res) => {
    try {
        const [meetings] = await db.execute(
            "SELECT m.*, u.name AS creator_name FROM meetings m JOIN users u ON m.created_by = u.id WHERE m.status = 'pending'"
        );
        res.json(meetings);
    } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.scheduleMeeting = async (req, res) => {
    try {
        const { title, description, date, type } = req.body;
        const [result] = await db.execute(
            "INSERT INTO meetings (title, description, meeting_date, meeting_type, created_by, status) VALUES (?, ?, ?, ?, ?, 'pending')",
            [title, description, date, type, req.user.id]
        );
        // Admin-created meetings need mentor approval — set pending
        res.status(201).json({ message: 'Meeting created, awaiting mentor approval', meetingId: result.insertId });
    } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.approveMeeting = async (req, res) => {
    try {
        const { meetingId } = req.params;
        await db.execute("UPDATE meetings SET status = 'active', approved_by = ? WHERE id = ?", [req.user.id, meetingId]);
        const [participants] = await db.execute('SELECT student_id FROM meeting_participants WHERE meeting_id = ?', [meetingId]);
        for (const p of participants) {
            await db.execute('INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
                [p.student_id, 'Meeting Approved', 'A scheduled meeting has been approved.', 'meeting']);
        }
        res.json({ message: 'Meeting approved' });
    } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.rejectMeeting = async (req, res) => {
    try {
        const { meetingId } = req.params;
        await db.execute("UPDATE meetings SET status = 'cancelled' WHERE id = ?", [meetingId]);
        res.json({ message: 'Meeting rejected' });
    } catch (err) { res.status(500).json({ message: err.message }); }
};

// MARKS APPROVAL
exports.getPendingMarks = async (req, res) => {
    try {
        const [marks] = await db.execute(
            `SELECT m.*, u.name AS student_name, s.usn FROM marks m
             JOIN users u ON m.student_id = u.id JOIN students s ON u.id = s.user_id
             WHERE m.internal_status IN ('verified', 'pending') OR m.external_status = 'pending'`
        );
        res.json(marks);
    } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.approveMarks = async (req, res) => {
    try {
        const { markId, type } = req.body;
        if (type === 'internal') await db.execute("UPDATE marks SET internal_status = 'approved' WHERE id = ?", [markId]);
        else await db.execute("UPDATE marks SET external_status = 'approved' WHERE id = ?", [markId]);
        await db.execute('INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)',
            [req.user.id, 'Approved Marks', `Mark ID: ${markId}, Type: ${type}`]);
        res.json({ message: 'Marks approved' });
    } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.rejectMarks = async (req, res) => {
    try {
        const { markId, type } = req.body;
        if (type === 'internal') await db.execute("UPDATE marks SET internal_status = 'rejected' WHERE id = ?", [markId]);
        else await db.execute("UPDATE marks SET external_status = 'rejected' WHERE id = ?", [markId]);
        res.json({ message: 'Marks rejected' });
    } catch (err) { res.status(500).json({ message: err.message }); }
};

// REPORTS
exports.exportReport = async (req, res) => {
    try {
        const { reportType, format } = req.query;
        let data, fields;
        if (reportType === 'attendance') {
            [data] = await db.execute('SELECT u.name, s.usn, u.department, a.subject_code, a.attended_classes, a.total_classes FROM attendance a JOIN users u ON a.student_id = u.id JOIN students s ON u.id = s.user_id');
            fields = ['name', 'usn', 'department', 'subject_code', 'attended_classes', 'total_classes'];
        } else if (reportType === 'marks') {
            [data] = await db.execute('SELECT u.name, s.usn, u.department, m.subject_name, m.internal_marks, m.external_marks FROM marks m JOIN users u ON m.student_id = u.id JOIN students s ON u.id = s.user_id');
            fields = ['name', 'usn', 'department', 'subject_name', 'internal_marks', 'external_marks'];
        } else return res.status(400).json({ message: 'Invalid report type' });

        if (format === 'csv') {
            const parser = new Parser({ fields });
            const csv = parser.parse(data);
            res.header('Content-Type', 'text/csv');
            res.attachment(`${reportType}_report.csv`);
            return res.send(csv);
        } else {
            const doc = new PDFDocument({ margin: 50 });
            res.header('Content-Type', 'application/pdf');
            res.attachment(`${reportType}_report.pdf`);
            doc.pipe(res);
            doc.fontSize(18).text(`${reportType.toUpperCase()} REPORT`, { align: 'center' });
            doc.fontSize(10).text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
            doc.moveDown(1.5);
            data.forEach(item => {
                doc.fontSize(10).text(Object.values(item).join(' | '));
                doc.moveDown(0.3);
            });
            doc.end();
        }
    } catch (err) { res.status(500).json({ message: err.message }); }
};

// ACTIVITY LOGS
exports.getActivityLogs = async (req, res) => {
    try {
        const [logs] = await db.execute(
            'SELECT l.*, u.name AS user_name FROM activity_logs l JOIN users u ON l.user_id = u.id ORDER BY l.created_at DESC LIMIT 200'
        );
        res.json(logs);
    } catch (err) { res.status(500).json({ message: err.message }); }
};
