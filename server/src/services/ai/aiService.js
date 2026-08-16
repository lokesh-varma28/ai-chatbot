const { GoogleGenAI } = require('@google/genai');
const env = require('../../config/env');
const ApiError = require('../../utils/apiError');

/**
 * Service encapsulating AI model interactions using official @google/genai SDK.
 */
const generateResponse = async (prompt) => {
  if (!env.GEMINI_API_KEY) {
    throw ApiError.internal('Gemini API key is not configured on the server');
  }

  const maxRetries = 2;
  const initialDelayMs = 1000;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
      });

      if (!response || !response.text) {
        throw ApiError.internal('Gemini API returned an empty response');
      }

      return response.text;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      const rawMsg = error.message || '';
      const is503OrBusy =
        error.status === 503 ||
        error.statusCode === 503 ||
        rawMsg.includes('503') ||
        rawMsg.includes('UNAVAILABLE') ||
        rawMsg.includes('high demand') ||
        rawMsg.includes('overloaded');

      const is429Quota =
        error.status === 429 ||
        error.statusCode === 429 ||
        rawMsg.includes('429') ||
        rawMsg.includes('RESOURCE_EXHAUSTED') ||
        rawMsg.includes('Quota exceeded');

      if (is503OrBusy && attempt < maxRetries) {
        const delay = initialDelayMs * Math.pow(2, attempt);
        console.warn(`[AI Service]: Gemini temporarily unavailable — retry ${attempt + 1}/${maxRetries} in ${delay}ms...`);
        await new Promise((res) => setTimeout(res, delay));
        continue;
      }

      if (is429Quota) {
        console.warn(`[AI Service Error]: Gemini rate limit reached (429).`);
        throw new ApiError(429, 'The AI service rate limit has been reached. Please wait a moment and try again.');
      }

      if (is503OrBusy) {
        console.warn(`[AI Service Error]: Gemini model experiencing high demand (503) after ${maxRetries} retries.`);
        throw new ApiError(503, 'The AI model is temporarily busy. Please try again in a moment.');
      }

      console.error(`[AI Service Error]: ${rawMsg}`);
      throw ApiError.internal('The AI service encountered an error while processing your request. Please try again.');
    }
  }
};

module.exports = {
  generateResponse,
};
