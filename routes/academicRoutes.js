const express = require('express');
const router = express.Router();
const {
    submitInternalMarks, getMyMarks, getMyMeetings, getMeetingProceeding,
    submitFeedback, getMyGoals, getMyIssues, updateCourseProgress,
    getMenteeMarks, getMenteeAttendance, getMentorMeetings, getMenteeAchievements,
    commentOnGoal, updateAttendance, getAllStudents
} = require('../controllers/marksController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

// Student routes
router.post('/student/submit-marks', authorize('student'), submitInternalMarks);
router.get('/student/marks', authorize('student'), getMyMarks);
router.get('/student/meetings', authorize('student'), getMyMeetings);
router.get('/student/meeting-proceeding/:meetingId', authorize('student'), getMeetingProceeding);
router.post('/student/feedback', authorize('student'), submitFeedback);
router.get('/student/goals', authorize('student'), getMyGoals);
router.get('/student/issues', authorize('student'), getMyIssues);
router.post('/student/course-progress', authorize('student'), updateCourseProgress);

// Mentor routes
router.get('/mentor/student-marks/:studentId', authorize('mentor'), getMenteeMarks);
router.get('/mentor/student-attendance/:studentId', authorize('mentor'), getMenteeAttendance);
router.get('/mentor/meetings', authorize('mentor'), getMentorMeetings);
router.get('/mentor/student-achievements/:studentId', authorize('mentor'), getMenteeAchievements);
router.post('/mentor/comment-goal', authorize('mentor'), commentOnGoal);

// Admin routes
router.post('/admin/update-attendance', authorize('admin'), updateAttendance);
router.get('/admin/all-students', authorize('admin'), getAllStudents);

module.exports = router;
