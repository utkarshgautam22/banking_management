const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const auth = require('../middleware/auth');
const rbac = require('../middleware/rbac');
const { getLoans, getLoan, applyLoan, approveLoan, rejectLoan, payLoan } = require('../controllers/loanController');

router.get('/', auth, getLoans);
router.get('/:id', auth, getLoan);

router.post('/apply', auth, rbac('Customer'), [
  body('loan_type').isIn(['Personal','Home','Auto','Education','Business']),
  body('loan_amount').isFloat({ min: 1000 }),
  body('tenure_months').isInt({ min: 1 }),
  validate
], applyLoan);

router.patch('/:id/approve', auth, rbac('Employee', 'Admin'), approveLoan);
router.patch('/:id/reject', auth, rbac('Employee', 'Admin'), rejectLoan);
router.post('/:id/pay', auth, rbac('Customer'), [
  body('payment_amount').isFloat({ min: 1 }),
  body('account_id').isInt(),
  validate
], payLoan);

module.exports = router;
