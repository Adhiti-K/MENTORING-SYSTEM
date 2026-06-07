const express = require('express');
const router = express.Router();
const {
    getPendingApprovals, approveUser, getMentors, getUnallocatedStudents,
    allocateMentor, getAllMeetings, getPendingMeetings, scheduleMeeting,
    approveMeeting, rejectMeeting, getPendingMarks, approveMarks, rejectMarks,
    exportReport, getActivityLogs
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);
router.use(authorize('admin'));

// Approvals
router.get('/pending-approvals', getPendingApprovals);
router.put('/approve-user/:userId', approveUser);

// Allocation
router.get('/mentors', getMentors);
router.get('/unallocated-students', getUnallocatedStudents);
router.post('/allocate-mentor', allocateMentor);

// Meetings
router.get('/all-meetings', getAllMeetings);
router.get('/pending-meetings', getPendingMeetings);
router.post('/schedule-meeting', scheduleMeeting);
router.put('/approve-meeting/:meetingId', approveMeeting);
router.put('/reject-meeting/:meetingId', rejectMeeting);

// Marks
router.get('/pending-marks', getPendingMarks);
router.post('/approve-marks', approveMarks);
router.post('/reject-marks', rejectMarks);

// Reports & Logs
router.get('/export-report', exportReport);
router.get('/activity-logs', getActivityLogs);

module.exports = router;
