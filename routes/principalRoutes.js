const express = require('express');
const router = express.Router();
const {
    getCollegeStats, getDepartmentComparison, getAttendanceTrend,
    getMentorEffectiveness, getAllAchievements
} = require('../controllers/principalController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);
router.use(authorize('principal'));

router.get('/stats', getCollegeStats);
router.get('/departments', getDepartmentComparison);
router.get('/attendance-trend', getAttendanceTrend);
router.get('/mentor-effectiveness', getMentorEffectiveness);
router.get('/achievements', getAllAchievements);

module.exports = router;
