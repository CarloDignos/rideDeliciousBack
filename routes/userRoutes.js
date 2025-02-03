const express = require('express');
const router = express.Router();
const passport = require('passport');
const authController = require('../controllers/authController');
const {
  authenticateToken,
  authorize,
} = require('../middlewares/authMiddleware');
const upload = require('../middlewares/upload');

// Public routes (No authentication required)
router.post('/register', upload.single('picture'), authController.register);
router.post('/login', authController.login);
router.post('/request-password-reset', authController.requestPasswordReset);
router.post('/reset-password', authController.resetPassword);

// Routes that require authentication
router.post('/logout', authenticateToken, authController.logout);
router.put('/status', authenticateToken, authController.updateStatus);
// Add this route in userRoutes.js or a relevant route file
router.put('/update-picture', authenticateToken, authController.updateUserPicture);
router.put('/update-user', authenticateToken, authController.updateUserInformation);
router.post('/set-security-questions', authenticateToken, authController.setSecurityQuestions);
router.post('/recover-account-security-questions', authenticateToken, authController.recoverAccountUsingSecurityQuestions);
router.get('/profile/customer/:customerId', authenticateToken, authController.getProfileByCustomer);
router.get('/profile/rider/:riderId', authenticateToken, authController.getProfileRider);
router.get('/customers', authenticateToken, authController.getAllCustomers);
router.get('/riders', authenticateToken, authController.getAllRiders);
router.post('/add-address', authenticateToken, authController.addAddressToUser);
router.get("/validate-token", authenticateToken, authController.validateToken);
router.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get(
    '/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/login' }),
    (req, res) => {
        // On success, redirect to the home page or send token
        const token = jwt.sign({ id: req.user.id }, process.env.JWT_SECRET);
        res.redirect(`exp://whybipk-anonymous-8081.exp.direct/login?token=${token}`); // Pass token to mobile app
    }
);
router.delete(
  '/delete/:userId',
  authenticateToken,
  authorize('Admin'),
  authController.deleteUser,
);
router.delete(
  '/delete-permanent/:userId',
  authenticateToken,
  authorize('Admin'),
  authController.permanentlyDeleteUser,
);


module.exports = router;
