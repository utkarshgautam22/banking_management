const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const rbac = require('../middleware/rbac');
const { getAccounts, getAccount, createAccount, updateAccountStatus } = require('../controllers/accountController');

router.get('/', auth, getAccounts);
router.get('/:id', auth, getAccount);
router.post('/', auth, rbac('Admin', 'Employee'), createAccount);
router.patch('/:id/status', auth, rbac('Admin'), updateAccountStatus);

module.exports = router;
