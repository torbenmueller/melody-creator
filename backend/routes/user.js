const express = require('express');
const router = express.Router();
const checkAuth = require('../middleware/check-auth');
const UserController = require('../controllers/user');

router.post('/signup', UserController.createUser);
router.post('/login', UserController.loginUser);
router.post('/verify-email', UserController.verifyEmail);
router.post('/forgot-password', UserController.resetPassword);
router.post('/new-password', UserController.postNewPassword);
router.get('/get-user', checkAuth, UserController.getUser);
router.delete('/delete-user', checkAuth, UserController.deleteUser);
// router.put('/update-user', checkAuth, UserController.updateUser);
router.put('/update-email', checkAuth, UserController.updateEmail);
router.put('/update-password', checkAuth, UserController.updatePassword);

module.exports = router;
