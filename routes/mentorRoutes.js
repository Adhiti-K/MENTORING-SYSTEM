const express = require('express');
const router = express.Router();
const { 
    getMyMentees, scheduleMeeting, addProceedings, verifyInternalMarks, 
    uploadExternalMarks, getAtRiskStudents, getIssues, respondToIssue,
    getPendingMenteeMarks
} = require('../controllers/mentorController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);
router.use(authorize('mentor'));

router.get('/my-mentees', getMyMentees);
router.post('/schedule-meeting', scheduleMeeting);
router.post('/add-proceedings', addProceedings);
router.put('/verify-marks/:markId', verifyInternalMarks);
router.post('/upload-external-marks', uploadExternalMarks);
router.get('/pending-mentee-marks', getPendingMenteeMarks);
router.get('/at-risk-students', getAtRiskStudents);
router.get('/issues', getIssues);
router.put('/respond-issue', respondToIssue);

module.exports = router;
