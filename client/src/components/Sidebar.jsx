import { useState, useRef, useEffect } from 'react';

/**
 * Responsive Sidebar component with instant search, inline title rename,
 * pin/unpin conversation sections, and user account management.
 */
export default function Sidebar({
  conversations,
  activeId,
  onSelectConversation,
  onNewChat,
  onDeleteConversation,
  onRenameConversation,
  onTogglePinConversation,
  isOpen,
  onToggleSidebar,
  user,
  onOpenAuthModal,
  onLogout,
  theme = 'dark',
  onToggleTheme,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');

  const editInputRef = useRef(null);

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  const handleStartRename = (chatKey, currentTitle, e) => {
    e.stopPropagation();
    setEditingId(chatKey);
    setEditingTitle(currentTitle || 'Untitled Chat');
  };

  const handleCancelRename = () => {
    setEditingId(null);
    setEditingTitle('');
  };

  const handleSaveRename = (chatKey) => {
    const trimmed = editingTitle.trim();
    if (trimmed && trimmed.length > 0) {
      onRenameConversation(chatKey, trimmed.substring(0, 80));
    }
    setEditingId(null);
    setEditingTitle('');
  };

  const handleKeyDownRename = (e, chatKey) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveRename(chatKey);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancelRename();
    }
  };

  // Filter conversations by search term (matching title or message content)
  const term = searchQuery.trim().toLowerCase();
  const filteredConversations = conversations.filter((chat) => {
    if (!term) return true;

    const titleMatch = (chat.title || '').toLowerCase().includes(term);
    if (titleMatch) return true;

    const messageMatch = Array.isArray(chat.messages) &&
      chat.messages.some((msg) => (msg.content || '').toLowerCase().includes(term));

    return messageMatch;
  });

  const pinnedConversations = filteredConversations.filter((c) => c.isPinned);
  const recentConversations = filteredConversations.filter((c) => !c.isPinned);

  const renderTitleWithHighlight = (titleText, queryTerm) => {
    if (!queryTerm || !titleText) return titleText || 'Untitled Chat';
    const idx = titleText.toLowerCase().indexOf(queryTerm);
    if (idx === -1) return titleText;
    const before = titleText.substring(0, idx);
    const match = titleText.substring(idx, idx + queryTerm.length);
    const after = titleText.substring(idx + queryTerm.length);
    return (
      <>
        {before}
        <mark className="search-highlight">{match}</mark>
        {after}
      </>
    );
  };

  const renderChatItem = (chat) => {
    const chatKey = chat._id || chat.id;
    const isActive = chatKey === activeId;
    const isEditing = chatKey === editingId;

    return (
      <div
        key={chatKey}
        className={`sidebar-item ${isActive ? 'active' : ''} ${chat.isPinned ? 'is-pinned' : ''}`}
        onClick={() => {
          if (!isEditing) {
            onSelectConversation(chatKey);
            if (isOpen) onToggleSidebar();
          }
        }}
      >
        <svg className="chat-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>

        {isEditing ? (
          <div className="inline-rename-container" onClick={(e) => e.stopPropagation()}>
            <input
              ref={editInputRef}
              type="text"
              className="inline-rename-input"
              value={editingTitle}
              maxLength={80}
              onChange={(e) => setEditingTitle(e.target.value)}
              onKeyDown={(e) => handleKeyDownRename(e, chatKey)}
              aria-label="Rename conversation title"
            />
            <button
              type="button"
              className="rename-action-btn save-btn"
              onClick={() => handleSaveRename(chatKey)}
              title="Save title (Enter)"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </button>
            <button
              type="button"
              className="rename-action-btn cancel-btn"
              onClick={handleCancelRename}
              title="Cancel (Escape)"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        ) : (
          <>
            <span className="chat-title" title={chat.title}>
              {renderTitleWithHighlight(chat.title || 'Untitled Chat', term)}
            </span>

            <div className="chat-actions">
              {/* Pin / Unpin Button */}
              <button
                type="button"
                className={`pin-chat-btn ${chat.isPinned ? 'pinned' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onTogglePinConversation(chatKey, !chat.isPinned);
                }}
                title={chat.isPinned ? 'Unpin conversation' : 'Pin conversation'}
                aria-label={chat.isPinned ? 'Unpin conversation' : 'Pin conversation'}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill={chat.isPinned ? '#f59e0b' : 'none'} stroke={chat.isPinned ? '#f59e0b' : 'currentColor'} strokeWidth="2">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              </button>

              {/* Rename Button */}
              <button
                type="button"
                className="rename-chat-btn"
                onClick={(e) => handleStartRename(chatKey, chat.title, e)}
                title="Rename conversation"
                aria-label="Rename conversation"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>

              {/* Delete Button */}
              <button
                type="button"
                className="delete-chat-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteConversation(chatKey);
                }}
                title="Delete conversation"
                aria-label="Delete conversation"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="sidebar-overlay"
          onClick={onToggleSidebar}
          aria-hidden="true"
        />
      )}

      <aside className={`sidebar ${isOpen ? 'sidebar-open' : ''}`}>
        {/* Brand Header */}
        <div className="sidebar-brand">
          <div className="brand-logo">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </div>
          <div className="brand-info">
            <span className="brand-title">AI Assistant</span>
            <span className="brand-subtitle">Powered by Gemini</span>
          </div>
        </div>

        <div className="sidebar-header">
          <button
            type="button"
            className="new-chat-btn"
            onClick={() => {
              onNewChat();
              if (isOpen) onToggleSidebar();
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>New Chat</span>
          </button>

          <button
            type="button"
            className="sidebar-close-btn"
            onClick={onToggleSidebar}
            aria-label="Close sidebar"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Instant Search Input Box */}
        <div className="sidebar-search-box">
          <svg className="search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search conversations by title or message content"
          />
          {searchQuery && (
            <button
              type="button"
              className="clear-search-btn"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search query"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>

        <div className="sidebar-list">
          {conversations.length === 0 ? (
            <div className="sidebar-empty">No saved chats</div>
          ) : filteredConversations.length === 0 ? (
            <div className="sidebar-empty">No conversations found</div>
          ) : (
            <>
              {/* Pinned Section */}
              {pinnedConversations.length > 0 && (
                <div className="sidebar-section">
                  <div className="sidebar-section-header">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b" strokeWidth="2">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                    <span>Pinned</span>
                  </div>
                  {pinnedConversations.map(renderChatItem)}
                </div>
              )}

              {/* Recent Conversations Section */}
              {recentConversations.length > 0 && (
                <div className="sidebar-section">
                  {pinnedConversations.length > 0 && (
                    <div className="sidebar-section-header">
                      <span>Recent</span>
                    </div>
                  )}
                  {recentConversations.map(renderChatItem)}
                </div>
              )}
            </>
          )}
        </div>

        {/* User Account & Theme Section */}
        <div className="sidebar-footer">
          <button
            type="button"
            className="theme-toggle-btn"
            onClick={onToggleTheme}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? (
              <>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" />
                  <line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
                <span>Light Mode</span>
              </>
            ) : (
              <>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
                <span>Dark Mode</span>
              </>
            )}
          </button>

          <div className="sidebar-user-section">
            {user ? (
              <div className="user-profile-card">
                <div className="user-avatar-badge">
                  {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="user-info-text">
                  <span className="user-name-text" title={user.name}>{user.name}</span>
                  <span className="user-email-text" title={user.email}>{user.email}</span>
                </div>
                <button
                  type="button"
                  className="user-logout-btn"
                  onClick={onLogout}
                  title="Log Out"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="sidebar-login-btn"
                onClick={onOpenAuthModal}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                  <polyline points="10 17 15 12 10 7" />
                  <line x1="15" y1="12" x2="3" y2="12" />
                </svg>
                <span>Log in / Register</span>
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
