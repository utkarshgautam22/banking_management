const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const rbac = require('../middleware/rbac');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const {
  getCustomers, getCustomer, updateKyc, deactivateUser,
  getEmployees, createEmployee, getSystemStats, getReports,
  updateProfile, getBranches
} = require('../controllers/adminController');

// Branches
router.get('/branches', auth, getBranches);

// Stats & Reports (Admin/Employee)
router.get('/stats', auth, rbac('Admin', 'Employee'), getSystemStats);
router.get('/reports', auth, rbac('Admin'), getReports);

// Customer management
router.get('/customers', auth, rbac('Admin', 'Employee'), getCustomers);
router.get('/customers/:id', auth, rbac('Admin', 'Employee'), getCustomer);
router.patch('/customers/:id/kyc', auth, rbac('Admin', 'Employee'), [
  body('kyc_status').isIn(['Pending', 'Verified', 'Rejected']),
  validate
], updateKyc);
router.patch('/:type/:id/deactivate', auth, rbac('Admin'), [
  body().custom((_, { req }) => ['customer', 'employee'].includes(req.params.type)),
  validate
], deactivateUser);

// Employee management
router.get('/employees', auth, rbac('Admin'), getEmployees);
router.post('/employees', auth, rbac('Admin'), [
  body('name').notEmpty(),
  body('email').isEmail(),
  body('password').isLength({ min: 6 }),
  validate
], createEmployee);

// Profile self-update
router.patch('/profile', auth, updateProfile);

module.exports = router;
