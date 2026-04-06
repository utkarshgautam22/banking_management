const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const rbac = require('../middleware/rbac');
const { getFraudAlerts, resolveAlert, dismissAlert, getFraudStats } = require('../controllers/fraudController');

router.get('/', auth, getFraudAlerts);
router.get('/stats', auth, rbac('Employee', 'Admin'), getFraudStats);
router.patch('/:id/resolve', auth, rbac('Employee', 'Admin'), resolveAlert);
router.patch('/:id/dismiss', auth, rbac('Employee', 'Admin'), dismissAlert);

module.exports = router;
