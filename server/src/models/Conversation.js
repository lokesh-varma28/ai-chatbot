const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['user', 'assistant'],
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

const conversationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      default: 'New Chat',
      trim: true,
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
    messages: [messageSchema],
  },
  {
    timestamps: true,
  }
);

// Compound index for fast queries of user conversations by pinned state and recency
conversationSchema.index({ userId: 1, isPinned: -1, updatedAt: -1 });

const Conversation = mongoose.model('Conversation', conversationSchema);

module.exports = Conversation;
