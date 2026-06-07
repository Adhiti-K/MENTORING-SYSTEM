const db = require('../config/db');

// ASSIGNED MENTEES
exports.getMyMentees = async (req, res) => {
    try {
        const [mentees] = await db.execute(
            `SELECT u.id, u.name, s.usn, u.department, s.year_semester,
             COALESCE((SELECT ROUND(AVG(a.attended_classes * 100.0 / a.total_classes), 1) 
                       FROM attendance a 
                       WHERE a.student_id = u.id AND a.total_classes > 0), 100) AS attendance
             FROM users u 
             JOIN students s ON u.id = s.user_id 
             WHERE s.mentor_id = ?`,
            [req.user.id]
        );
        res.json(mentees);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching mentees', error: err.message });
    }
};

// MEETING SYSTEM
exports.scheduleMeeting = async (req, res) => {
    try {
        const { title, description, date, type, studentIds } = req.body;
        
        // Insert meeting
        const [result] = await db.execute(
            'INSERT INTO meetings (title, description, meeting_date, meeting_type, created_by, status) VALUES (?, ?, ?, ?, ?, ?)',
            [title, description, date, type, req.user.id, 'pending']
        );
        
        const meetingId = result.insertId;

        // Add participants
        for (const studentId of studentIds) {
            await db.execute('INSERT INTO meeting_participants (meeting_id, student_id) VALUES (?, ?)', [meetingId, studentId]);
        }

        // Notify Admin for approval
        const [admins] = await db.execute("SELECT id FROM users WHERE role = 'admin'");
        for (const admin of admins) {
            await db.execute('INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)', 
                [admin.id, 'New Meeting Approval Request', `Mentor ${req.user.name} has scheduled a meeting.`, 'approval']);
        }

        res.status(201).json({ message: 'Meeting scheduled and pending admin approval', meetingId });
    } catch (err) {
        res.status(500).json({ message: 'Error scheduling meeting', error: err.message });
    }
};

exports.addProceedings = async (req, res) => {
    try {
        const { meetingId, notes, outcome } = req.body;
        await db.execute(
            'INSERT INTO meeting_proceedings (meeting_id, notes, outcome) VALUES (?, ?, ?)',
            [meetingId, notes, outcome]
        );
        await db.execute("UPDATE meetings SET status = 'completed' WHERE id = ?", [meetingId]);
        res.json({ message: 'Meeting proceedings added' });
    } catch (err) {
        res.status(500).json({ message: 'Error adding proceedings', error: err.message });
    }
};

// MARKS MANAGEMENT
exports.verifyInternalMarks = async (req, res) => {
    try {
        const { markId } = req.params;
        await db.execute("UPDATE marks SET internal_status = 'verified', mentor_id = ? WHERE id = ?", [req.user.id, markId]);
        res.json({ message: 'Internal marks verified and sent to Admin' });
    } catch (err) {
        res.status(500).json({ message: 'Error verifying marks', error: err.message });
    }
};

exports.uploadExternalMarks = async (req, res) => {
    try {
        const { studentId, subjectCode, subjectName, marks } = req.body;
        const [existing] = await db.execute(
            'SELECT id FROM marks WHERE student_id = ? AND subject_code = ?',
            [studentId, subjectCode]
        );
        if (existing.length > 0) {
            await db.execute(
                "UPDATE marks SET external_marks = ?, external_status = 'pending', mentor_id = ? WHERE student_id = ? AND subject_code = ?",
                [marks, req.user.id, studentId, subjectCode]
            );
        } else {
            await db.execute(
                "INSERT INTO marks (student_id, subject_code, subject_name, external_marks, external_status, mentor_id) VALUES (?, ?, ?, ?, 'pending', ?)",
                [studentId, subjectCode, subjectName, marks, req.user.id]
            );
        }
        res.json({ message: 'External marks uploaded and pending approval' });
    } catch (err) {
        res.status(500).json({ message: 'Error uploading external marks', error: err.message });
    }
};

// ALERTS & RISK DETECTION
exports.getAtRiskStudents = async (req, res) => {
    try {
        // Low attendance < 75%
        const [lowAttendance] = await db.execute(
            'SELECT u.name, s.usn, ROUND((a.attended_classes * 100.0 / a.total_classes), 2) AS percentage FROM attendance a JOIN users u ON a.student_id = u.id JOIN students s ON u.id = s.user_id WHERE s.mentor_id = ? AND a.total_classes > 0 AND (a.attended_classes * 100.0 / a.total_classes) < 75',
            [req.user.id]
        );
        
        // Low marks < 40% (20/50 for internals, or similar)
        const [lowMarks] = await db.execute(
            'SELECT u.name, s.usn, m.subject_name, m.internal_marks FROM marks m JOIN users u ON m.student_id = u.id JOIN students s ON u.id = s.user_id WHERE s.mentor_id = ? AND m.internal_marks < 20',
            [req.user.id]
        );

        res.json({ lowAttendance, lowMarks });
    } catch (err) {
        res.status(500).json({ message: 'Error fetching at-risk students', error: err.message });
    }
};

// ISSUE MANAGEMENT
exports.getIssues = async (req, res) => {
    try {
        const [issues] = await db.execute(
            'SELECT i.*, u.name as student_name, s.usn FROM issues i JOIN users u ON i.student_id = u.id JOIN students s ON u.id = s.user_id WHERE s.mentor_id = ?',
            [req.user.id]
        );
        res.json(issues);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching issues', error: err.message });
    }
};

exports.respondToIssue = async (req, res) => {
    try {
        const { issueId, response, status } = req.body;
        await db.execute(
            'UPDATE issues SET mentor_response = ?, status = ? WHERE id = ?',
            [response, status, issueId]
        );
        res.json({ message: 'Issue updated' });
    } catch (err) {
        res.status(500).json({ message: 'Error responding to issue', error: err.message });
    }
};

exports.getPendingMenteeMarks = async (req, res) => {
    try {
        const [marks] = await db.execute(
            `SELECT m.*, u.name AS student_name, s.usn 
             FROM marks m
             JOIN users u ON m.student_id = u.id 
             JOIN students s ON u.id = s.user_id
             WHERE s.mentor_id = ? AND (m.internal_status = 'pending' OR m.external_status = 'pending')`,
            [req.user.id]
        );
        res.json(marks);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching pending marks', error: err.message });
    }
};
