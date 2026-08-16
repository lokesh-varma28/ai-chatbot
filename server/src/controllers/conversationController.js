const Conversation = require('../models/Conversation');
const ApiError = require('../utils/apiError');

/**
 * Get all conversations for current authenticated user.
 * Endpoint: GET /api/v1/conversations
 */
const getConversations = async (req, res, next) => {
  try {
    const conversations = await Conversation.find({ userId: req.user._id })
      .sort({ isPinned: -1, updatedAt: -1 });

    res.status(200).json({
      success: true,
      count: conversations.length,
      conversations,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single conversation by ID.
 * Endpoint: GET /api/v1/conversations/:id
 */
const getConversationById = async (req, res, next) => {
  try {
    const conversation = await Conversation.findById(req.params.id);

    if (!conversation) {
      throw ApiError.notFound('Conversation not found');
    }

    if (conversation.userId.toString() !== req.user._id.toString()) {
      throw ApiError.forbidden('You are not authorized to view this conversation');
    }

    res.status(200).json({
      success: true,
      conversation,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new conversation.
 * Endpoint: POST /api/v1/conversations
 */
const createConversation = async (req, res, next) => {
  try {
    const { title, messages, isPinned } = req.body || {};

    const conversation = await Conversation.create({
      userId: req.user._id,
      title: title || 'New Chat',
      isPinned: Boolean(isPinned),
      messages: Array.isArray(messages) ? messages : [],
    });

    res.status(201).json({
      success: true,
      conversation,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update conversation title, messages, or pinned status.
 * Endpoint: PATCH /api/v1/conversations/:id
 */
const updateConversation = async (req, res, next) => {
  try {
    const { title, messages, isPinned } = req.body || {};

    const conversation = await Conversation.findById(req.params.id);

    if (!conversation) {
      throw ApiError.notFound('Conversation not found');
    }

    if (conversation.userId.toString() !== req.user._id.toString()) {
      throw ApiError.forbidden('You are not authorized to modify this conversation');
    }

    if (title !== undefined) {
      if (typeof title !== 'string' || title.trim().length === 0) {
        throw ApiError.badRequest('Title must be a non-empty string');
      }
      conversation.title = title.trim().substring(0, 80);
    }

    if (isPinned !== undefined) {
      conversation.isPinned = Boolean(isPinned);
    }

    if (Array.isArray(messages)) {
      conversation.messages = messages;
    }

    await conversation.save();

    res.status(200).json({
      success: true,
      conversation,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a conversation.
 * Endpoint: DELETE /api/v1/conversations/:id
 */
const deleteConversation = async (req, res, next) => {
  try {
    const conversation = await Conversation.findById(req.params.id);

    if (!conversation) {
      throw ApiError.notFound('Conversation not found');
    }

    if (conversation.userId.toString() !== req.user._id.toString()) {
      throw ApiError.forbidden('You are not authorized to delete this conversation');
    }

    await conversation.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Conversation deleted successfully',
      id: req.params.id,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getConversations,
  getConversationById,
  createConversation,
  updateConversation,
  deleteConversation,
};
