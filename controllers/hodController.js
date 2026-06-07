const db = require('../config/db');

// DEPARTMENT OVERVIEW STATS
exports.getDeptStats = async (req, res) => {
    try {
        const dept = req.user.department;

        const [[{ totalStudents }]] = await db.execute(
            "SELECT COUNT(*) AS totalStudents FROM users u JOIN students s ON u.id = s.user_id WHERE u.department = ? AND u.role = 'student'",
            [dept]
        );
        const [[{ totalMentors }]] = await db.execute(
            "SELECT COUNT(*) AS totalMentors FROM users WHERE department = ? AND role = 'mentor' AND is_approved = 1",
            [dept]
        );
        const [[{ avgAttendance }]] = await db.execute(
            'SELECT ROUND(AVG(a.attended_classes * 100.0 / a.total_classes), 2) AS avgAttendance FROM attendance a JOIN users u ON a.student_id = u.id WHERE u.department = ? AND a.total_classes > 0',
            [dept]
        );
        const [[{ avgInternal }]] = await db.execute(
            'SELECT ROUND(AVG(m.internal_marks), 2) AS avgInternal FROM marks m JOIN users u ON m.student_id = u.id WHERE u.department = ?',
            [dept]
        );

        res.json({ totalStudents, totalMentors, avgAttendance: avgAttendance || 0, avgInternal: avgInternal || 0 });
    } catch (err) {
        res.status(500).json({ message: 'Error fetching dept stats', error: err.message });
    }
};

// DEPARTMENT ANALYTICS (Charts data)
exports.getDeptAnalytics = async (req, res) => {
    try {
        const dept = req.user.department;

        // Attendance by semester
        const [attendanceBySem] = await db.execute(
            `SELECT s.year_semester, ROUND(AVG(a.attended_classes * 100.0 / a.total_classes), 2) AS avg_attendance
             FROM attendance a JOIN students s ON a.student_id = s.user_id JOIN users u ON u.id = s.user_id
             WHERE u.department = ? AND a.total_classes > 0 GROUP BY s.year_semester`,
            [dept]
        );

        // Marks by semester
        const [marksBySem] = await db.execute(
            `SELECT s.year_semester, ROUND(AVG(m.internal_marks), 2) AS avg_internal, ROUND(AVG(m.external_marks), 2) AS avg_external
             FROM marks m JOIN students s ON m.student_id = s.user_id JOIN users u ON u.id = s.user_id
             WHERE u.department = ? GROUP BY s.year_semester`,
            [dept]
        );

        // Learner classification
        const [learners] = await db.execute(
            `SELECT 
                SUM(CASE WHEN m.internal_marks < 21 THEN 1 ELSE 0 END) AS slowLearners,
                SUM(CASE WHEN m.internal_marks >= 21 THEN 1 ELSE 0 END) AS fastLearners
             FROM marks m JOIN users u ON m.student_id = u.id WHERE u.department = ?`,
            [dept]
        );

        // Mentor effectiveness (avg mentee attendance per mentor)
        const [mentorEffectiveness] = await db.execute(
            `SELECT u2.name AS mentor_name, ROUND(AVG(a.attended_classes * 100.0 / a.total_classes), 2) AS avg_attendance
             FROM students s JOIN users u ON s.user_id = u.id JOIN users u2 ON s.mentor_id = u2.id
             JOIN attendance a ON a.student_id = s.user_id
             WHERE u.department = ? AND a.total_classes > 0
             GROUP BY s.mentor_id`,
            [dept]
        );

        res.json({ attendanceBySem, marksBySem, learners: learners[0], mentorEffectiveness });
    } catch (err) {
        res.status(500).json({ message: 'Error fetching analytics', error: err.message });
    }
};

// STUDENT LIST (Department)
exports.getDeptStudents = async (req, res) => {
    try {
        const dept = req.user.department;
        const [students] = await db.execute(
            `SELECT u.id, u.name, s.usn, s.year_semester,
                ROUND(AVG(a.attended_classes * 100.0 / a.total_classes), 2) AS attendance,
                ROUND(AVG(m.internal_marks), 2) AS avg_internal
             FROM users u JOIN students s ON u.id = s.user_id
             LEFT JOIN attendance a ON a.student_id = u.id
             LEFT JOIN marks m ON m.student_id = u.id
             WHERE u.department = ? AND u.role = 'student'
             GROUP BY u.id`,
            [dept]
        );
        res.json(students);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching students', error: err.message });
    }
};

// SEARCH STUDENT BY USN
exports.searchStudentByUSN = async (req, res) => {
    try {
        const { usn } = req.params;
        const dept = req.user.department;

        const [student] = await db.execute(
            'SELECT u.id, u.name, u.email, u.department, s.usn, s.year_semester FROM users u JOIN students s ON u.id = s.user_id WHERE s.usn = ? AND u.department = ?',
            [usn, dept]
        );
        if (student.length === 0) return res.status(404).json({ message: 'Student not found in your department' });

        const userId = student[0].id;
        const [attendance] = await db.execute('SELECT * FROM attendance WHERE student_id = ?', [userId]);
        const [marks] = await db.execute('SELECT * FROM marks WHERE student_id = ?', [userId]);
        const [achievements] = await db.execute('SELECT * FROM achievements WHERE student_id = ?', [userId]);
        const [goals] = await db.execute('SELECT * FROM goals WHERE student_id = ?', [userId]);
        const [meetings] = await db.execute(
            'SELECT m.* FROM meetings m JOIN meeting_participants mp ON m.id = mp.meeting_id WHERE mp.student_id = ? ORDER BY m.meeting_date DESC',
            [userId]
        );

        res.json({ profile: student[0], attendance, marks, achievements, goals, meetings });
    } catch (err) {
        res.status(500).json({ message: 'Error searching student', error: err.message });
    }
};

// MENTORS LIST (Department)
exports.getDeptMentors = async (req, res) => {
    try {
        const dept = req.user.department;
        const [mentors] = await db.execute(
            `SELECT u.id, u.name, u.email,
                COUNT(s.user_id) AS mentee_count,
                ROUND(AVG(a.attended_classes * 100.0 / a.total_classes), 2) AS avg_mentee_attendance
             FROM users u LEFT JOIN students s ON u.id = s.mentor_id
             LEFT JOIN attendance a ON a.student_id = s.user_id AND a.total_classes > 0
             WHERE u.department = ? AND u.role = 'mentor'
             GROUP BY u.id`,
            [dept]
        );
        res.json(mentors);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching mentors', error: err.message });
    }
};

// MEETING PROCEEDINGS (Department)
exports.getDeptProceedings = async (req, res) => {
    try {
        const dept = req.user.department;
        const [proceedings] = await db.execute(
            `SELECT mp.*, m.title, m.meeting_date, u.name AS created_by_name
             FROM meeting_proceedings mp
             JOIN meetings m ON mp.meeting_id = m.id
             JOIN users u ON m.created_by = u.id
             WHERE u.department = ?
             ORDER BY m.meeting_date DESC`,
            [dept]
        );
        res.json(proceedings);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching proceedings', error: err.message });
    }
};

// SLOW & FAST LEARNERS
exports.getLearners = async (req, res) => {
    try {
        const dept = req.user.department;
        const [slow] = await db.execute(
            `SELECT u.name, s.usn, s.year_semester, ROUND(AVG(m.internal_marks),2) AS avg_marks
             FROM marks m JOIN users u ON m.student_id = u.id JOIN students s ON u.id = s.user_id
             WHERE u.department = ? GROUP BY u.id HAVING avg_marks < 21`,
            [dept]
        );
        const [fast] = await db.execute(
            `SELECT u.name, s.usn, s.year_semester, ROUND(AVG(m.internal_marks),2) AS avg_marks
             FROM marks m JOIN users u ON m.student_id = u.id JOIN students s ON u.id = s.user_id
             WHERE u.department = ? GROUP BY u.id HAVING avg_marks >= 35`,
            [dept]
        );
        res.json({ slowLearners: slow, fastLearners: fast });
    } catch (err) {
        res.status(500).json({ message: 'Error fetching learners', error: err.message });
    }
};

// ACHIEVEMENTS (Department)
exports.getDeptAchievements = async (req, res) => {
    try {
        const dept = req.user.department;
        const [achievements] = await db.execute(
            `SELECT a.*, u.name AS student_name, s.usn
             FROM achievements a JOIN users u ON a.student_id = u.id JOIN students s ON u.id = s.user_id
             WHERE u.department = ? ORDER BY a.achievement_date DESC`,
            [dept]
        );
        res.json(achievements);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching achievements', error: err.message });
    }
};
