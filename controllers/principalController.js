const db = require('../config/db');

// INSTITUTION-WIDE STATS
exports.getCollegeStats = async (req, res) => {
    try {
        const [[{ totalStudents }]] = await db.execute("SELECT COUNT(*) AS totalStudents FROM users WHERE role = 'student' AND is_approved = 1");
        const [[{ totalMentors }]] = await db.execute("SELECT COUNT(*) AS totalMentors FROM users WHERE role = 'mentor' AND is_approved = 1");
        const [[{ totalMeetings }]] = await db.execute("SELECT COUNT(*) AS totalMeetings FROM meetings WHERE status = 'completed'");
        const [[{ avgAttendance }]] = await db.execute(
            'SELECT ROUND(AVG(a.attended_classes * 100.0 / a.total_classes), 2) AS avgAttendance FROM attendance a WHERE a.total_classes > 0'
        );

        res.json({ totalStudents, totalMentors, totalMeetings, avgAttendance: avgAttendance || 0 });
    } catch (err) {
        res.status(500).json({ message: 'Error fetching college stats', error: err.message });
    }
};

// ALL DEPARTMENTS COMPARISON
exports.getDepartmentComparison = async (req, res) => {
    try {
        const [depts] = await db.execute(
            `SELECT u.department,
                COUNT(DISTINCT CASE WHEN u.role = 'student' THEN u.id END) AS student_count,
                ROUND(AVG(CASE WHEN a.total_classes > 0 THEN a.attended_classes * 100.0 / a.total_classes END), 2) AS avg_attendance,
                ROUND(AVG(m.internal_marks), 2) AS avg_marks
             FROM users u
             LEFT JOIN attendance a ON a.student_id = u.id
             LEFT JOIN marks m ON m.student_id = u.id
             WHERE u.department IS NOT NULL
             GROUP BY u.department`
        );
        res.json(depts);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching department comparison', error: err.message });
    }
};

// INSTITUTION ATTENDANCE TREND
exports.getAttendanceTrend = async (req, res) => {
    try {
        const [trend] = await db.execute(
            `SELECT u.department, s.year_semester,
                ROUND(AVG(a.attended_classes * 100.0 / a.total_classes), 2) AS avg_attendance
             FROM attendance a
             JOIN users u ON a.student_id = u.id
             JOIN students s ON s.user_id = u.id
             WHERE a.total_classes > 0
             GROUP BY u.department, s.year_semester
             ORDER BY u.department, s.year_semester`
        );
        res.json(trend);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching trend', error: err.message });
    }
};

// MENTOR EFFECTIVENESS ACROSS COLLEGE
exports.getMentorEffectiveness = async (req, res) => {
    try {
        const [mentors] = await db.execute(
            `SELECT u2.name AS mentor_name, u2.department, COUNT(s.user_id) AS mentee_count,
                ROUND(AVG(a.attended_classes * 100.0 / a.total_classes), 2) AS avg_attendance
             FROM users u2
             LEFT JOIN students s ON s.mentor_id = u2.id
             LEFT JOIN attendance a ON a.student_id = s.user_id AND a.total_classes > 0
             WHERE u2.role = 'mentor'
             GROUP BY u2.id
             ORDER BY avg_attendance DESC`
        );
        res.json(mentors);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching mentor effectiveness', error: err.message });
    }
};

// INSTITUTION ACHIEVEMENTS
exports.getAllAchievements = async (req, res) => {
    try {
        const [achievements] = await db.execute(
            `SELECT a.*, u.name AS student_name, u.department, st.usn
             FROM achievements a JOIN users u ON a.student_id = u.id JOIN students st ON u.id = st.user_id
             ORDER BY a.achievement_date DESC`
        );
        res.json(achievements);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching achievements', error: err.message });
    }
};
