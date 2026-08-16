const aiService = require('../services/ai/aiService');
const Conversation = require('../models/Conversation');
const ApiError = require('../utils/apiError');
const { extractTextFromFile } = require('../utils/fileExtractor');

/**
 * Handles incoming chat messages and invokes the AI service.
 * Supports normal sending, response regeneration, prompt editing, and file attachments (.pdf, .txt).
 * Endpoint: POST /api/v1/chat
 */
const handleChat = async (req, res, next) => {
  try {
    const { message, conversationId, mode = 'normal', messageIndex, messageId } = req.body || {};

    let userPrompt = typeof message === 'string' ? message.trim() : '';

    if (mode !== 'regenerate' && !req.file && (!userPrompt || userPrompt.length === 0)) {
      throw ApiError.badRequest('Message or file attachment is required');
    }

    if (userPrompt.length > 10000) {
      throw ApiError.badRequest('Message is too long. Maximum allowed length is 10,000 characters.');
    }

    let fullPrompt = userPrompt;
    let storedUserContent = userPrompt;

    if (req.file) {
      const { filename, extractedText } = await extractTextFromFile(req.file);
      const promptText = userPrompt || 'Summarize this file and explain key insights.';
      fullPrompt = `[Uploaded File Attachment: ${filename}]\n\n${extractedText}\n\nUser Prompt: ${promptText}`;
      storedUserContent = userPrompt
        ? `📎 **${filename}**\n\n${userPrompt}`
        : `📎 **${filename}**`;
    }

    // Handle authenticated user with conversation persistence
    if (req.user) {
      let conversation;

      if (conversationId) {
        try {
          conversation = await Conversation.findById(conversationId);
        } catch (err) {
          // Invalid ObjectId string
        }

        if (conversation && conversation.userId.toString() !== req.user._id.toString()) {
          throw ApiError.forbidden('Unauthorized access to this conversation');
        }
      }

      // Mode 1: REGENERATE response
      if (mode === 'regenerate') {
        if (!conversation) {
          throw ApiError.notFound('Conversation not found for regeneration');
        }

        let idx = -1;
        if (messageId && conversation.messages) {
          idx = conversation.messages.findIndex((m) => m._id && m._id.toString() === messageId.toString());
        }
        if (idx === -1 && typeof messageIndex === 'number') {
          idx = messageIndex;
        }
        if (idx === -1) {
          idx = conversation.messages.length - 1;
        }

        if (idx < 0 || idx >= conversation.messages.length) {
          throw ApiError.badRequest('Invalid message target for regeneration');
        }

        // Find preceding user prompt if fullPrompt not explicitly provided
        if (!fullPrompt) {
          if (conversation.messages[idx].role === 'assistant' && idx > 0 && conversation.messages[idx - 1]?.role === 'user') {
            fullPrompt = conversation.messages[idx - 1].content;
          } else if (conversation.messages[idx].role === 'user') {
            fullPrompt = conversation.messages[idx].content;
            if (idx + 1 < conversation.messages.length && conversation.messages[idx + 1].role === 'assistant') {
              idx = idx + 1;
            }
          }
        }

        if (!fullPrompt) {
          throw ApiError.badRequest('Could not find associated user message for regeneration');
        }

        // Call Gemini AI service
        const reply = await aiService.generateResponse(fullPrompt);

        // Replace assistant response at target index
        if (idx >= 0 && idx < conversation.messages.length && conversation.messages[idx].role === 'assistant') {
          conversation.messages[idx].content = reply;
          conversation.messages[idx].timestamp = new Date();
        } else {
          conversation.messages.push({ role: 'assistant', content: reply });
        }

        await conversation.save();

        return res.status(200).json({
          success: true,
          reply,
          conversationId: conversation._id,
          conversation,
        });
      }

      // Mode 2: EDIT user message & resend
      if (mode === 'edit') {
        if (!conversation) {
          throw ApiError.notFound('Conversation not found for editing');
        }

        let idx = -1;
        if (messageId && conversation.messages) {
          idx = conversation.messages.findIndex((m) => m._id && m._id.toString() === messageId.toString());
        }
        if (idx === -1 && typeof messageIndex === 'number') {
          idx = messageIndex;
        }
        if (idx === -1) {
          idx = conversation.messages.length - 2;
        }

        if (idx < 0 || idx >= conversation.messages.length) {
          throw ApiError.badRequest('Invalid message index for editing');
        }

        // Call Gemini AI service first (if it fails, DB is unchanged)
        const reply = await aiService.generateResponse(fullPrompt);

        // Truncate messages array at edit index
        conversation.messages = conversation.messages.slice(0, idx);

        // Add updated user message
        conversation.messages.push({ role: 'user', content: storedUserContent });

        // Add new assistant message
        conversation.messages.push({ role: 'assistant', content: reply });

        await conversation.save();

        return res.status(200).json({
          success: true,
          reply,
          conversationId: conversation._id,
          conversation,
        });
      }

      // Mode 3: NORMAL chat message
      const reply = await aiService.generateResponse(fullPrompt);

      const userMsg = { role: 'user', content: storedUserContent };
      const aiMsg = { role: 'assistant', content: reply };

      if (!conversation) {
        const titleText = req.file ? `📎 ${req.file.originalname}` : userPrompt;
        const title = titleText.length > 36 ? titleText.substring(0, 36) + '...' : titleText;
        conversation = await Conversation.create({
          userId: req.user._id,
          title,
          messages: [userMsg, aiMsg],
        });
      } else {
        conversation.messages.push(userMsg);
        conversation.messages.push(aiMsg);
        await conversation.save();
      }

      return res.status(200).json({
        success: true,
        reply,
        conversationId: conversation._id,
        conversation,
      });
    }

    // Anonymous response (backward compatible)
    const reply = await aiService.generateResponse(fullPrompt);
    return res.status(200).json({
      success: true,
      reply,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  handleChat,
};
