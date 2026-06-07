const express = require('express');
const router = express.Router();
const {
    getNotifications, markAllRead, getMessages, sendMessage,
    getStudentFullProfile, getDepartmentAnalytics
} = require('../controllers/commonController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/notifications', getNotifications);
router.put('/notifications/mark-read', markAllRead);
router.get('/messages/:otherUserId', getMessages);
router.post('/messages', sendMessage);
router.get('/student-profile/:usn', getStudentFullProfile);
router.get('/analytics', getDepartmentAnalytics);

module.exports = router;
