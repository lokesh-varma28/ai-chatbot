import { useState, useRef, useEffect } from 'react';
import MarkdownRenderer from './MarkdownRenderer';

/**
 * MessageItem component rendering single chat bubble (user or AI)
 * with copy, regenerate, and inline message editing capabilities.
 */
export default function MessageItem({
  msg,
  index,
  isLatestAssistant,
  loading,
  onRegenerate,
  onSaveEdit,
  speakingMessageId,
  onToggleSpeak,
}) {
  const isUser = msg.role === 'user';
  const messageKey = msg._id || msg.id || index;
  const isSpeaking = speakingMessageId === messageKey;
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(msg.content);

  const editTextareaRef = useRef(null);

  useEffect(() => {
    setEditText(msg.content);
  }, [msg.content]);

  useEffect(() => {
    if (isEditing && editTextareaRef.current) {
      editTextareaRef.current.focus();
      editTextareaRef.current.style.height = 'auto';
      editTextareaRef.current.style.height = `${editTextareaRef.current.scrollHeight}px`;
    }
  }, [isEditing]);

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(msg.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy response:', err);
    }
  };

  const handleStartEdit = () => {
    if (loading) return;
    setIsEditing(true);
    setEditText(msg.content);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditText(msg.content);
  };

  const handleSubmitEdit = () => {
    const trimmed = editText.trim();
    if (!trimmed || loading) return;
    setIsEditing(false);
    onSaveEdit(index, trimmed, msg._id || msg.id);
  };

  const handleKeyDownEdit = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmitEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancelEdit();
    }
  };

  const handleTextareaChange = (e) => {
    setEditText(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  return (
    <div className={`message-row ${isUser ? 'user-row' : 'ai-row'}`}>
      <div className={`avatar ${isUser ? 'user-avatar' : 'ai-avatar'}`}>
        {isUser ? 'You' : 'AI'}
      </div>

      <div className="message">
        <div className="message-header-row">
          <span className="message-label">{isUser ? 'You' : 'AI Assistant'}</span>

          <div className="message-actions">
            {/* User Edit Action */}
            {isUser && !isEditing && (
              <button
                type="button"
                className="msg-action-btn edit-msg-btn"
                onClick={handleStartEdit}
                disabled={loading}
                title="Edit message"
                aria-label="Edit message"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                <span>Edit</span>
              </button>
            )}

            {/* Assistant Actions */}
            {!isUser && (
              <>
                {/* Copy Action */}
                <button
                  type="button"
                  className="msg-action-btn copy-response-btn"
                  onClick={handleCopyMessage}
                  title="Copy response"
                  aria-label="Copy response"
                >
                  {copied ? (
                    <>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                      <span>Copy</span>
                    </>
                  )}
                </button>

                {/* Text To Speech Listen/Stop Action */}
                <button
                  type="button"
                  className={`msg-action-btn speak-msg-btn ${isSpeaking ? 'speaking' : ''}`}
                  onClick={() => onToggleSpeak(messageKey, msg.content)}
                  title={isSpeaking ? 'Stop speech' : 'Listen to response (Text to speech)'}
                  aria-label={isSpeaking ? 'Stop speech' : 'Listen to response'}
                >
                  {isSpeaking ? (
                    <>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="6" y="6" width="12" height="12" rx="1" />
                      </svg>
                      <span>Stop</span>
                    </>
                  ) : (
                    <>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                        <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                        <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                      </svg>
                      <span>Listen</span>
                    </>
                  )}
                </button>

                {/* Regenerate Action */}
                <button
                  type="button"
                  className="msg-action-btn regenerate-msg-btn"
                  onClick={() => onRegenerate(index, msg._id || msg.id)}
                  disabled={loading}
                  title="Regenerate response"
                  aria-label="Regenerate response"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                  </svg>
                  <span>Regenerate</span>
                </button>
              </>
            )}
          </div>
        </div>

        <div className="message-content">
          {isUser ? (
            isEditing ? (
              <div className="edit-message-wrapper">
                <textarea
                  ref={editTextareaRef}
                  className="edit-message-textarea"
                  value={editText}
                  onChange={handleTextareaChange}
                  onKeyDown={handleKeyDownEdit}
                  disabled={loading}
                  rows={2}
                />
                <div className="edit-message-buttons">
                  <button
                    type="button"
                    className="edit-cancel-btn"
                    onClick={handleCancelEdit}
                    disabled={loading}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="edit-submit-btn"
                    onClick={handleSubmitEdit}
                    disabled={loading || !editText.trim()}
                  >
                    Save & Send
                  </button>
                </div>
              </div>
            ) : (
              <div className="user-text">{msg.content}</div>
            )
          ) : (
            <MarkdownRenderer content={msg.content} />
          )}
        </div>
      </div>
    </div>
  );
}
