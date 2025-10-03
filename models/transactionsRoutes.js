// routes/transactionsRoutes.js
const express = require('express');
const router = express.Router();
const {
  getAllTransactions,
  approveTransaction,
  rejectTransaction
} = require('../controllers/transactionsController');

// GET  /api/transactions           → lista todas
router.get('/', getAllTransactions);

// PUT  /api/transactions/:id/approve → aprueba
router.put('/:id/approve', approveTransaction);

// PUT  /api/transactions/:id/reject  → rechaza
router.put('/:id/reject', rejectTransaction);

module.exports = router;
