const db = require('../config/db');
const multer = require('multer');
const path = require('path');

// Multer storage for certificates
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/certificates/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|pdf/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        if (extname) return cb(null, true);
        cb(new Error('Only images and PDFs allowed'));
    }
});

exports.uploadMiddleware = upload.single('certificate');

// DASHBOARD SUMMARY
exports.getDashboardData = async (req, res) => {
    try {
        const userId = req.user.id;
        const [attendance] = await db.execute('SELECT * FROM attendance WHERE student_id = ?', [userId]);
        const [marks] = await db.execute('SELECT * FROM marks WHERE student_id = ?', [userId]);
        const [meetings] = await db.execute(
            "SELECT m.* FROM meetings m JOIN meeting_participants mp ON m.id = mp.meeting_id WHERE mp.student_id = ? AND m.status = 'active'",
            [userId]
        );
        const [mentor] = await db.execute(
            'SELECT u.name, u.email FROM users u JOIN students s ON u.id = s.mentor_id WHERE s.user_id = ?',
            [userId]
        );

        res.json({ attendance, marks, upcomingMeetings: meetings, mentor: mentor[0] });
    } catch (err) {
        res.status(500).json({ message: 'Error fetching dashboard data', error: err.message });
    }
};

// ACHIEVEMENTS
exports.uploadAchievement = async (req, res) => {
    try {
        const { title, description, date } = req.body;
        const certificatePath = req.file ? req.file.path : null;

        await db.execute(
            'INSERT INTO achievements (student_id, title, description, certificate_path, achievement_date) VALUES (?, ?, ?, ?, ?)',
            [req.user.id, title, description, certificatePath, date]
        );
        res.status(201).json({ message: 'Achievement uploaded successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Error uploading achievement', error: err.message });
    }
};

// SKILLS & GOALS
exports.updateInterests = async (req, res) => {
    try {
        const { interests } = req.body;
        await db.execute('UPDATE students SET interests = ? WHERE user_id = ?', [interests, req.user.id]);
        res.json({ message: 'Interests updated' });
    } catch (err) {
        res.status(500).json({ message: 'Error updating interests', error: err.message });
    }
};

exports.setGoal = async (req, res) => {
    try {
        const { type, target, deadline } = req.body;
        await db.execute(
            'INSERT INTO goals (student_id, goal_type, target_value, deadline) VALUES (?, ?, ?, ?)',
            [req.user.id, type, target, deadline]
        );
        res.status(201).json({ message: 'Goal set successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Error setting goal', error: err.message });
    }
};

// COURSE RECOMMENDATIONS
exports.getRecommendations = async (req, res) => {
    try {
        // Skill-based
        const [student] = await db.execute('SELECT interests FROM students WHERE user_id = ?', [req.user.id]);
        const interests = student[0]?.interests ? student[0].interests.split(',') : [];
        
        let skillCourses = [];
        if (interests.length > 0) {
            const placeholders = interests.map(() => '?').join(',');
            [skillCourses] = await db.execute(
                `SELECT * FROM courses WHERE category IN (${placeholders})`,
                interests.map(i => i.trim())
            );
        }

        // Academic-based (if marks < 40% in a subject)
        const [lowMarks] = await db.execute(
            'SELECT subject_name FROM marks WHERE student_id = ? AND internal_marks < 20',
            [req.user.id]
        );
        
        let academicCourses = [];
        for (const mark of lowMarks) {
            const [courses] = await db.execute('SELECT * FROM courses WHERE category LIKE ?', [`%${mark.subject_name}%`]);
            academicCourses.push(...courses);
        }

        // Enrolled courses progress
        const [enrolled] = await db.execute(
            `SELECT sc.course_id, sc.progress_days, sc.status, c.title, c.duration, c.url, c.category, c.description
             FROM student_courses sc
             JOIN courses c ON sc.course_id = c.id
             WHERE sc.student_id = ?`,
            [req.user.id]
        );

        res.json({ skillBased: skillCourses, academicBased: academicCourses, enrolled });
    } catch (err) {
        res.status(500).json({ message: 'Error fetching recommendations', error: err.message });
    }
};

// ISSUES
exports.reportIssue = async (req, res) => {
    try {
        const { category, title, description } = req.body;
        await db.execute(
            'INSERT INTO issues (student_id, category, title, description) VALUES (?, ?, ?, ?)',
            [req.user.id, category, title, description]
        );
        res.status(201).json({ message: 'Issue reported' });
    } catch (err) {
        res.status(500).json({ message: 'Error reporting issue', error: err.message });
    }
};
