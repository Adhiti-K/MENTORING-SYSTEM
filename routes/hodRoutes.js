const express = require('express');
const router = express.Router();
const {
    getDeptStats, getDeptAnalytics, getDeptStudents, searchStudentByUSN,
    getDeptMentors, getDeptProceedings, getLearners, getDeptAchievements
} = require('../controllers/hodController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);
router.use(authorize('hod'));

router.get('/stats', getDeptStats);
router.get('/analytics', getDeptAnalytics);
router.get('/students', getDeptStudents);
router.get('/search/:usn', searchStudentByUSN);
router.get('/mentors', getDeptMentors);
router.get('/proceedings', getDeptProceedings);
router.get('/learners', getLearners);
router.get('/achievements', getDeptAchievements);

module.exports = router;
