const express = require('express');
const router = express.Router();
const UserController = require('../controllers/UserController');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

router.get('/me', UserController.getProfile);
router.put('/me', UserController.updateProfile);

module.exports = router;
