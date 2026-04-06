const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { getNotifications, markRead, markAllRead } = require('../controllers/notificationController');

router.get('/', auth, getNotifications);
router.patch('/mark-all-read', auth, markAllRead);
router.patch('/:id/read', auth, markRead);

module.exports = router;
