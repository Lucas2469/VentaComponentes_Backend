const router = require('express').Router();
const { crear } = require('../controllers/NotificationsController');

// POST /notifications
router.post('/', crear);

module.exports = router;
