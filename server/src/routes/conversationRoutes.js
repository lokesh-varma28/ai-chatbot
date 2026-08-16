const express = require('express');
const {
  getConversations,
  getConversationById,
  createConversation,
  updateConversation,
  deleteConversation,
} = require('../controllers/conversationController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// All conversation routes are protected by JWT authentication
router.use(protect);

router.route('/')
  .get(getConversations)
  .post(createConversation);

router.route('/:id')
  .get(getConversationById)
  .patch(updateConversation)
  .delete(deleteConversation);

module.exports = router;
