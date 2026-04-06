const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const auth = require('../middleware/auth');
const { getTransactions, deposit, withdraw, transfer, getStats } = require('../controllers/transactionController');

router.get('/', auth, getTransactions);
router.get('/stats', auth, getStats);

router.post('/deposit', auth, [
  body('account_id').isInt(),
  body('amount').isFloat({ min: 1 }),
  validate
], deposit);

router.post('/withdraw', auth, [
  body('account_id').isInt(),
  body('amount').isFloat({ min: 1 }),
  validate
], withdraw);

router.post('/transfer', auth, [
  body('from_account_id').isInt(),
  body('to_account_number').notEmpty(),
  body('amount').isFloat({ min: 1 }),
  validate
], transfer);

module.exports = router;
