const meetingPointModel = require('../models/meetingPointModel');

// GET all meeting points
const getAllMeetingPoints = async (req, res) => {
  try {
    const meetingPoints = await meetingPointModel.getAllMeetingPoints();
    res.json(meetingPoints);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET meeting point by ID
const getMeetingPointById = async (req, res) => {
  try {
    const meetingPoint = await meetingPointModel.getMeetingPointById(req.params.id);
    res.json(meetingPoint);
  } catch (err) {
    if (err.message === 'Meeting point not found') {
      res.status(404).json({ error: err.message });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
};

// POST create new meeting point
const createMeetingPoint = async (req, res) => {
  try {
    const newMeetingPoint = await meetingPointModel.createMeetingPoint(req.body);
    res.status(201).json({ 
      message: 'Meeting point created',
      meetingPoint: newMeetingPoint
    });
  } catch (err) {
    if (err.message === 'Faltan campos obligatorios') {
      res.status(400).json({ error: err.message });
    } else {
      console.error('Error en createMeetingPoint:', err);
      res.status(500).json({ error: err.message });
    }
  }
};

// PUT update meeting point by ID
const updateMeetingPoint = async (req, res) => {
  try {
    const result = await meetingPointModel.updateMeetingPoint(req.params.id, req.body);
    res.json(result);
  } catch (err) {
    if (err.message === 'Faltan campos obligatorios') {
      res.status(400).json({ error: err.message });
    } else if (err.message === 'Meeting point not found') {
      res.status(404).json({ error: err.message });
    } else {
      console.error('Error en updateMeetingPoint:', err);
      res.status(500).json({ error: err.message });
    }
  }
};

// DELETE (real delete) meeting point by ID
const deleteMeetingPoint = async (req, res) => {
  try {
    const result = await meetingPointModel.deleteMeetingPoint(req.params.id);
    res.json(result);
  } catch (err) {
    if (err.message === 'Meeting point not found') {
      res.status(404).json({ error: err.message });
    } else {
      console.error('Error en deleteMeetingPoint:', err);
      res.status(500).json({ error: err.message });
    }
  }
};

module.exports = {
  getAllMeetingPoints,
  getMeetingPointById,
  createMeetingPoint,
  updateMeetingPoint,
  deleteMeetingPoint
};