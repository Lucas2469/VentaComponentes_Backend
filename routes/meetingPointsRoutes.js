const express = require('express');
const router = express.Router();
const meetingPointController = require('../controllers/meetingPointController');

// GET all meeting points
router.get('/', meetingPointController.getAllMeetingPoints);

// GET meeting point by ID
router.get('/:id', meetingPointController.getMeetingPointById);

// POST create new meeting point
router.post('/', meetingPointController.createMeetingPoint);

// PUT update meeting point by ID
router.put('/:id', meetingPointController.updateMeetingPoint);

// DELETE (soft delete) meeting point by ID
router.delete('/:id', meetingPointController.deleteMeetingPoint);

module.exports = router;