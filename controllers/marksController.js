const db = require('../config/db');

// STUDENT: Submit Internal Marks
exports.submitInternalMarks = async (req, res) => {
    try {
        const { subjectCode, subjectName, marks } = req.body;
        if (marks > 50) return res.status(400).json({ message: 'Internal marks cannot exceed 50' });

        const [existing] = await db.execute(
            'SELECT id FROM marks WHERE student_id = ? AND subject_code = ?',
            [req.user.id, subjectCode]
        );
        if (existing.length > 0) {
            await db.execute("UPDATE marks SET internal_marks = ?, internal_status = 'pending' WHERE student_id = ? AND subject_code = ?",
                [marks, req.user.id, subjectCode]);
        } else {
            await db.execute(
                "INSERT INTO marks (student_id, subject_code, subject_name, internal_marks, internal_status) VALUES (?, ?, ?, ?, 'pending')",
                [req.user.id, subjectCode, subjectName, marks]
            );
        }

        // Notify mentor
        const [student] = await db.execute('SELECT mentor_id FROM students WHERE user_id = ?', [req.user.id]);
        if (student[0]?.mentor_id) {
            await db.execute('INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
                [student[0].mentor_id, 'Marks Submission', `A student submitted internal marks for ${subjectName}. Please verify.`, 'marks']);
        }

        await db.execute('INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)',
            [req.user.id, 'Submitted Internal Marks', `Subject: ${subjectCode}`]);

        res.json({ message: 'Marks submitted for mentor verification' });
    } catch (err) {
        res.status(500).json({ message: 'Error submitting marks', error: err.message });
    }
};

// STUDENT: Get own marks
exports.getMyMarks = async (req, res) => {
    try {
        const [marks] = await db.execute('SELECT * FROM marks WHERE student_id = ? ORDER BY subject_code', [req.user.id]);
        res.json(marks);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching marks', error: err.message });
    }
};

// STUDENT: Get own meetings
exports.getMyMeetings = async (req, res) => {
    try {
        const [meetings] = await db.execute(
            `SELECT m.*, mp.attendance_status, u.name AS created_by_name
             FROM meetings m
             JOIN meeting_participants mp ON m.id = mp.meeting_id
             JOIN users u ON m.created_by = u.id
             WHERE mp.student_id = ?
             ORDER BY m.meeting_date DESC`,
            [req.user.id]
        );
        res.json(meetings);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching meetings', error: err.message });
    }
};

// STUDENT: Get meeting proceedings
exports.getMeetingProceeding = async (req, res) => {
    try {
        const { meetingId } = req.params;
        const [proc] = await db.execute(
            `SELECT mp.*, m.title, m.meeting_date FROM meeting_proceedings mp JOIN meetings m ON mp.meeting_id = m.id WHERE mp.meeting_id = ?`,
            [meetingId]
        );
        res.json(proc[0] || null);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching proceeding', error: err.message });
    }
};

// STUDENT: Submit Feedback
exports.submitFeedback = async (req, res) => {
    try {
        const { meetingId, toUserId, rating, comments } = req.body;
        await db.execute(
            'INSERT INTO feedback (meeting_id, from_user_id, to_user_id, rating, comments) VALUES (?, ?, ?, ?, ?)',
            [meetingId, req.user.id, toUserId, rating, comments]
        );
        res.status(201).json({ message: 'Feedback submitted' });
    } catch (err) {
        res.status(500).json({ message: 'Error submitting feedback', error: err.message });
    }
};

// STUDENT: Get Goals
exports.getMyGoals = async (req, res) => {
    try {
        const [goals] = await db.execute('SELECT * FROM goals WHERE student_id = ? ORDER BY id DESC', [req.user.id]);
        res.json(goals);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching goals', error: err.message });
    }
};

// STUDENT: Get own issues
exports.getMyIssues = async (req, res) => {
    try {
        const [issues] = await db.execute('SELECT * FROM issues WHERE student_id = ? ORDER BY created_at DESC', [req.user.id]);
        res.json(issues);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching issues', error: err.message });
    }
};

// STUDENT: Update course progress
exports.updateCourseProgress = async (req, res) => {
    try {
        const { courseId, progressDays, status } = req.body;
        const [existing] = await db.execute('SELECT id FROM student_courses WHERE student_id = ? AND course_id = ?', [req.user.id, courseId]);
        if (existing.length > 0) {
            await db.execute('UPDATE student_courses SET progress_days = ?, status = ? WHERE student_id = ? AND course_id = ?',
                [progressDays, status, req.user.id, courseId]);
        } else {
            await db.execute('INSERT INTO student_courses (student_id, course_id, progress_days, status) VALUES (?, ?, ?, ?)',
                [req.user.id, courseId, progressDays, status]);
        }
        res.json({ message: 'Progress updated' });
    } catch (err) {
        res.status(500).json({ message: 'Error updating progress', error: err.message });
    }
};

// MENTOR: Get student marks
exports.getMenteeMarks = async (req, res) => {
    try {
        const { studentId } = req.params;
        const [marks] = await db.execute('SELECT * FROM marks WHERE student_id = ? ORDER BY subject_code', [studentId]);
        res.json(marks);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching marks', error: err.message });
    }
};

// MENTOR: Get student attendance
exports.getMenteeAttendance = async (req, res) => {
    try {
        const { studentId } = req.params;
        const [attendance] = await db.execute('SELECT * FROM attendance WHERE student_id = ?', [studentId]);
        res.json(attendance);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching attendance', error: err.message });
    }
};

// MENTOR: Get all meetings created by or involving mentor
exports.getMentorMeetings = async (req, res) => {
    try {
        const [meetings] = await db.execute(
            `SELECT m.*, u.name AS approved_by_name,
                COUNT(mp.student_id) AS participant_count
             FROM meetings m
             LEFT JOIN users u ON m.approved_by = u.id
             LEFT JOIN meeting_participants mp ON m.id = mp.meeting_id
             WHERE m.created_by = ?
             GROUP BY m.id
             ORDER BY m.meeting_date DESC`,
            [req.user.id]
        );
        res.json(meetings);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching meetings', error: err.message });
    }
};

// MENTOR: Get student achievements
exports.getMenteeAchievements = async (req, res) => {
    try {
        const { studentId } = req.params;
        const [achievements] = await db.execute('SELECT * FROM achievements WHERE student_id = ?', [studentId]);
        res.json(achievements);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching achievements', error: err.message });
    }
};

// MENTOR: Comment on goal
exports.commentOnGoal = async (req, res) => {
    try {
        const { goalId, comment } = req.body;
        await db.execute('UPDATE goals SET mentor_comment = ? WHERE id = ?', [comment, goalId]);
        res.json({ message: 'Comment added to goal' });
    } catch (err) {
        res.status(500).json({ message: 'Error commenting on goal', error: err.message });
    }
};

// ADMIN: Update attendance
exports.updateAttendance = async (req, res) => {
    try {
        const { studentId, subjectCode, totalClasses, attendedClasses } = req.body;
        if (attendedClasses > totalClasses) return res.status(400).json({ message: 'Attended cannot exceed total classes' });

        const [existing] = await db.execute('SELECT id FROM attendance WHERE student_id = ? AND subject_code = ?', [studentId, subjectCode]);
        if (existing.length > 0) {
            await db.execute('UPDATE attendance SET total_classes = ?, attended_classes = ? WHERE student_id = ? AND subject_code = ?',
                [totalClasses, attendedClasses, studentId, subjectCode]);
        } else {
            await db.execute('INSERT INTO attendance (student_id, subject_code, total_classes, attended_classes) VALUES (?, ?, ?, ?)',
                [studentId, subjectCode, totalClasses, attendedClasses]);
        }

        // Check if below 75% - notify
        const percentage = (attendedClasses / totalClasses) * 100;
        if (percentage < 75) {
            await db.execute('INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
                [studentId, 'Attendance Warning', `Your attendance in ${subjectCode} is ${percentage.toFixed(2)}%. Please improve.`, 'attendance']);
        }

        await db.execute('INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)',
            [req.user.id, 'Updated Attendance', `Student: ${studentId}, Subject: ${subjectCode}`]);

        res.json({ message: 'Attendance updated' });
    } catch (err) {
        res.status(500).json({ message: 'Error updating attendance', error: err.message });
    }
};

// ADMIN: Get all students (for attendance management)
exports.getAllStudents = async (req, res) => {
    try {
        const { department } = req.query;
        let query = 'SELECT u.id, u.name, u.department, s.usn, s.year_semester FROM users u JOIN students s ON u.id = s.user_id WHERE u.is_approved = 1';
        const params = [];
        if (department) { query += ' AND u.department = ?'; params.push(department); }
        const [students] = await db.execute(query, params);
        res.json(students);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching students', error: err.message });
    }
};
