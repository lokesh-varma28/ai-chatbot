const pdfParseModule = require('pdf-parse');
const path = require('path');
const ApiError = require('./apiError');

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB limit
const MAX_EXTRACTED_CHARS = 25000;

/**
 * Safely parses text from PDF buffer supporting both PDFParse class and function exports.
 */
const parsePdfBuffer = async (buffer) => {
  if (typeof pdfParseModule === 'function') {
    const res = await pdfParseModule(buffer);
    return res.text || '';
  }
  if (pdfParseModule && pdfParseModule.PDFParse) {
    const parser = new pdfParseModule.PDFParse({ data: buffer });
    try {
      const res = await parser.getText();
      return res.text || '';
    } finally {
      if (typeof parser.destroy === 'function') {
        await parser.destroy();
      }
    }
  }
  throw new Error('PDF parser module could not be initialized');
};

/**
 * Validates and extracts plain text from uploaded PDF or TXT file buffer.
 * @param {object} file - Express Multer file object
 * @returns {Promise<{ filename: string, extractedText: string }>}
 */
const extractTextFromFile = async (file) => {
  if (!file) {
    throw ApiError.badRequest('No file provided');
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw ApiError.badRequest('File size exceeds maximum allowed limit of 10 MB');
  }

  const ext = path.extname(file.originalname || '').toLowerCase();
  const allowedExtensions = ['.pdf', '.txt'];

  if (!allowedExtensions.includes(ext)) {
    throw ApiError.badRequest(`Unsupported file format "${ext}". Only .pdf and .txt files are supported.`);
  }

  let text = '';

  try {
    if (ext === '.txt') {
      text = file.buffer.toString('utf-8').trim();
    } else if (ext === '.pdf') {
      text = (await parsePdfBuffer(file.buffer)).trim();
    }
  } catch (err) {
    console.error(`[File Extraction Error]: ${err.message}`);
    throw ApiError.badRequest(`Failed to read or parse file "${file.originalname}". The file may be corrupted.`);
  }

  if (!text || text.length === 0) {
    throw ApiError.badRequest(
      ext === '.pdf'
        ? `Could not extract readable text from PDF "${file.originalname}". It may be scanned or image-based.`
        : `The uploaded text file "${file.originalname}" is empty.`
    );
  }

  // Truncate text if it exceeds maximum character limit
  if (text.length > MAX_EXTRACTED_CHARS) {
    text = text.substring(0, MAX_EXTRACTED_CHARS) + '\n\n[Note: Document content truncated due to length limit]';
  }

  return {
    filename: file.originalname,
    extractedText: text,
  };
};

module.exports = {
  extractTextFromFile,
  MAX_FILE_SIZE_BYTES,
};
