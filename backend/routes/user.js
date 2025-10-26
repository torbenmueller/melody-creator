const express = require('express');
const router = express.Router();
const checkAuth = require('../middleware/check-auth');
const UserController = require('../controllers/user');
const rateLimit = require('express-rate-limit');

router.post('/signup', UserController.createUser);
router.post('/login', UserController.loginUser);
router.post('/verify-email', UserController.verifyEmail);
// Rate limiter for public email availability checks to prevent abuse/enumeration
const checkEmailLimiter = rateLimit({
	windowMs: 60 * 1000, // 1 minute window
	max: 10, // limit each IP to 10 requests per windowMs
	standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
	legacyHeaders: false, // Disable the `X-RateLimit-*` headers
	message: { message: 'Too many requests from this IP, please try again later.' }
});

router.get('/check-email', checkEmailLimiter, UserController.checkEmail);
router.post('/forgot-password', UserController.resetPassword);
router.post('/new-password', UserController.postNewPassword);
router.get('/get-user', checkAuth, UserController.getUser);
router.delete('/delete-user', checkAuth, UserController.deleteUser);
// router.put('/update-user', checkAuth, UserController.updateUser);
router.put('/update-email', checkAuth, UserController.updateEmail);
router.put('/update-password', checkAuth, UserController.updatePassword);

module.exports = router;
