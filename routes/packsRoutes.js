// routes/packRoutes.js
const express = require('express');
const router = express.Router();
const packs = require('../controllers/packsController');
const uploadQr = require('../middleware/uploadQrCodes');

router.get('/', packs.getAllPacks);
router.get('/:id', packs.getPackById);
router.post('/', uploadQr.single('qr'), packs.createPack);
router.put('/:id', uploadQr.single('qr'), packs.updatePack);
router.delete('/:id', packs.deletePack);

module.exports = router;
