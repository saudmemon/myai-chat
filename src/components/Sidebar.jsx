import { useState, useEffect, useRef } from 'react'

export default function Sidebar({
  isOpen,
  toggleSidebar,
  onNewChat,
  conversations,
  onSelectConversation,
  activeId,
  onDeleteConversation,
  onRenameConversation,
  onClearAll,
  theme,
  toggleTheme
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editTitle, setEditTitle] = useState('')
  const editInputRef = useRef(null)
  const searchInputRef = useRef(null)

  // Listen to focus-search shortcut event
  useEffect(() => {
    function handleFocusSearch() {
      if (searchInputRef.current) {
        searchInputRef.current.focus()
      }
    }
    window.addEventListener('focus-search', handleFocusSearch)
    return () => window.removeEventListener('focus-search', handleFocusSearch)
  }, [])

  // Filter conversations
  const filteredConversations = conversations.filter(conv =>
    conv.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Date grouping helper
  const getGroupedConversations = () => {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
    const yesterdayStart = todayStart - 24 * 60 * 60 * 1000
    const sevenDaysAgoStart = todayStart - 7 * 24 * 60 * 60 * 1000

    const groups = {
      today: [],
      yesterday: [],
      last7Days: [],
      older: []
    }

    filteredConversations.forEach(conv => {
      const timestamp = conv.id // ID is timestamp
      if (timestamp >= todayStart) {
        groups.today.push(conv)
      } else if (timestamp >= yesterdayStart) {
        groups.yesterday.push(conv)
      } else if (timestamp >= sevenDaysAgoStart) {
        groups.last7Days.push(conv)
      } else {
        groups.older.push(conv)
      }
    })

    return groups
  }

  const grouped = getGroupedConversations()

  // Handle renaming
  function startEditing(conv, e) {
    e.stopPropagation()
    setEditingId(conv.id)
    setEditTitle(conv.title)
  }

  function saveRename(convId, e) {
    if (e) e.stopPropagation()
    if (editTitle.trim()) {
      onRenameConversation(convId, editTitle.trim())
    }
    setEditingId(null)
  }

  function handleEditKeyDown(convId, e) {
    if (e.key === 'Enter') saveRename(convId)
    if (e.key === 'Escape') setEditingId(null)
  }

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus()
      editInputRef.current.select()
    }
  }, [editingId])

  return (
    <div className={`sidebar ${isOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
      
      {/* Sidebar Header */}
      <div className="sidebar-header">
        {isOpen && (
          <div className="sidebar-logo" onClick={onNewChat}>
            <span className="logo-sparkle">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                <path d="M12 2L14.85 9.15L22 12L14.85 14.85L12 22L9.15 14.85L2 12L9.15 9.15L12 2Z" />
              </svg>
            </span>
            <span className="logo-text">MyAI</span>
          </div>
        )}
        <button 
          className="toggle-sidebar-btn" 
          onClick={toggleSidebar} 
          title={isOpen ? "Collapse sidebar" : "Expand sidebar"}
        >
          {isOpen ? (
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="9" y1="3" x2="9" y2="21"></line>
              <path d="M16 15l-3-3 3-3"></path>
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="9" y1="3" x2="9" y2="21"></line>
              <path d="M13 9l3 3-3 3"></path>
            </svg>
          )}
        </button>
      </div>

      {/* New Chat Button */}
      <div className="new-chat-container">
        <button className="new-chat-btn" onClick={onNewChat} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            {isOpen && <span>New chat</span>}
          </div>
          {isOpen && (
            <kbd style={{
              fontSize: '10px',
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-color)',
              padding: '2px 4px',
              borderRadius: '4px',
              color: 'var(--text-muted)',
              fontFamily: 'monospace'
            }}>
              Ctrl+K
            </kbd>
          )}
        </button>
      </div>

      {/* Search Bar */}
      {isOpen && (
        <div className="sidebar-search">
          <svg className="search-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search chats..."
            className="sidebar-search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="clear-search-btn" onClick={() => setSearchQuery('')}>×</button>
          )}
        </div>
      )}

      {/* Chat History Grouped */}
      {isOpen && (
        <div className="chat-history-scroll flex-1">
          {conversations.length === 0 ? (
            <div className="empty-history-text">No chat history</div>
          ) : filteredConversations.length === 0 ? (
            <div className="empty-history-text">No results found</div>
          ) : (
            <>
              {/* Today */}
              {grouped.today.length > 0 && (
                <div className="history-group">
                  <div className="history-group-title">Today</div>
                  {grouped.today.map(conv => renderHistoryItem(conv))}
                </div>
              )}

              {/* Yesterday */}
              {grouped.yesterday.length > 0 && (
                <div className="history-group">
                  <div className="history-group-title">Yesterday</div>
                  {grouped.yesterday.map(conv => renderHistoryItem(conv))}
                </div>
              )}

              {/* Last 7 Days */}
              {grouped.last7Days.length > 0 && (
                <div className="history-group">
                  <div className="history-group-title">Previous 7 Days</div>
                  {grouped.last7Days.map(conv => renderHistoryItem(conv))}
                </div>
              )}

              {/* Older */}
              {grouped.older.length > 0 && (
                <div className="history-group">
                  <div className="history-group-title">Older Chats</div>
                  {grouped.older.map(conv => renderHistoryItem(conv))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Sidebar Footer Settings */}
      {isOpen && (
        <div className="sidebar-footer">
          {/* Theme Toggle option */}
          <button className="footer-action-btn" onClick={toggleTheme}>
            {theme === 'dark' ? (
              <>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="5"></circle>
                  <line x1="12" y1="1" x2="12" y2="3"></line>
                  <line x1="12" y1="21" x2="12" y2="23"></line>
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                  <line x1="1" y1="12" x2="3" y2="12"></line>
                  <line x1="21" y1="12" x2="23" y2="12"></line>
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                </svg>
                <span>Light Mode</span>
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                </svg>
                <span>Dark Mode</span>
              </>
            )}
          </button>

          {/* Clear conversations */}
          {conversations.length > 0 && (
            <button className="footer-action-btn danger" onClick={onClearAll}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                <line x1="10" y1="11" x2="10" y2="17"></line>
                <line x1="14" y1="11" x2="14" y2="17"></line>
              </svg>
              <span>Clear history</span>
            </button>
          )}

          {/* User profile capsule */}
          <div className="user-profile-capsule">
            <div className="user-avatar">S</div>
            <div className="user-name">Saud Khan</div>
          </div>
        </div>
      )}
    </div>
  )

  // Single History Item Render Function
  function renderHistoryItem(conv) {
    const isActive = activeId === conv.id
    const isEditing = editingId === conv.id

    if (isEditing) {
      return (
        <div key={conv.id} className="history-item-container editing">
          <input
            ref={editInputRef}
            type="text"
            className="history-rename-input"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onKeyDown={(e) => handleEditKeyDown(conv.id, e)}
            onBlur={() => saveRename(conv.id)}
            onClick={(e) => e.stopPropagation()}
          />
          <button 
            className="save-rename-btn" 
            onClick={(e) => saveRename(conv.id, e)}
            title="Save Title"
          >
            ✓
          </button>
        </div>
      )
    }

    return (
      <div
        key={conv.id}
        className={`history-item-container ${isActive ? 'active' : ''}`}
        onClick={() => onSelectConversation(conv)}
      >
        <span className="history-chat-icon">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
        </span>
        <span className="history-chat-title" title={conv.title}>
          {conv.title}
        </span>
        
        {/* Item actions visible on hover */}
        <div className="history-item-actions">
          <button 
            className="item-action-btn rename"
            onClick={(e) => startEditing(conv, e)}
            title="Rename Chat"
          >
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
          </button>
          {!isActive && (
            <button 
              className="item-action-btn delete"
              onClick={(e) => {
                e.stopPropagation()
                onDeleteConversation(conv.id)
              }}
              title="Delete Chat"
            >
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          )}
        </div>
      </div>
    )
  }
}