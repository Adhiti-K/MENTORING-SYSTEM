const express = require('express');
const router = express.Router();
const { 
    getDashboardData, uploadAchievement, uploadMiddleware, 
    updateInterests, setGoal, getRecommendations, reportIssue 
} = require('../controllers/studentController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);
router.use(authorize('student'));

router.get('/dashboard', getDashboardData);
router.post('/upload-achievement', uploadMiddleware, uploadAchievement);
router.put('/update-interests', updateInterests);
router.post('/set-goal', setGoal);
router.get('/recommendations', getRecommendations);
router.post('/report-issue', reportIssue);

module.exports = router;
