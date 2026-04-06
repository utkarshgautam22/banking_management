const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const auth = require('../middleware/auth');
const { login, register, me, changePassword, logout } = require('../controllers/authController');

router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
  body('role').isIn(['Customer', 'Employee', 'Admin']),
  validate
], login);

router.post('/register', [
  body('first_name').notEmpty().trim(),
  body('last_name').notEmpty().trim(),
  body('email').isEmail().normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])/)
    .withMessage('Password must include uppercase, lowercase, number, and special character.'),
  validate
], register);

router.get('/me', auth, me);

router.post('/logout', auth, logout);

router.post('/change-password', [
  auth,
  body('currentPassword').notEmpty(),
  body('newPassword')
    .isLength({ min: 8 })
    .matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])/)
    .withMessage('Password must include uppercase, lowercase, number, and special character.'),
  validate
], changePassword);

module.exports = router;
