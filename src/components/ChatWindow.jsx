import { useEffect, useRef, useState } from 'react'
import InputBox from './InputBox'
import MessageBubble from './MessageBubble'

export default function ChatWindow({
  sidebarOpen,
  toggleSidebar,
  activeConversationTitle,
  activeMessages,
  onSendMessage,
  onRegenerate,
  onEditMessage,
  loading,
  selectedModel,
  setSelectedModel
}) {
  const messagesEndRef = useRef(null)
  const scrollContainerRef = useRef(null)
  const [showScrollDownBtn, setShowScrollDownBtn] = useState(false)

  // Format and export chat conversation as TXT
  function handleExportChat() {
    if (!activeMessages || activeMessages.length === 0) return

    const exportText = activeMessages
      .map(msg => {
        const role = msg.role === 'user' ? 'User' : 'AI'
        return `${role}: ${msg.text}`
      })
      .join('\n') + '\n\n'

    const blob = new Blob([exportText], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `chat-export-${activeConversationTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.txt`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // Auto scroll to bottom
  const scrollToBottom = (behavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior })
  }

  // Auto scroll on new messages
  useEffect(() => {
    scrollToBottom('smooth')
  }, [activeMessages])

  // Track scrolling to show/hide scroll-down floating button
  function handleScroll(e) {
    const { scrollTop, scrollHeight, clientHeight } = e.target
    // If scrolled up by more than 300px, show button
    const isScrolledUp = scrollHeight - scrollTop - clientHeight > 300
    setShowScrollDownBtn(isScrolledUp)
  }

  // suggestions list
  const suggestions = [
    {
      title: "Help me write",
      subtitle: "a polite email asking for project extensions",
      prompt: "Draft a polite email to my team manager requesting a 3-day extension on my current project deadline. Explain that we need extra time for QA testing."
    },
    {
      title: "Brainstorm ideas",
      subtitle: "for a futuristic game concept",
      prompt: "Brainstorm 5 unique and engaging game mechanics for a futuristic sci-fi open world RPG where time travel is the core element."
    },
    {
      title: "Explain a concept",
      subtitle: "like I am five years old",
      prompt: "Explain how quantum computing works in simple words using a coin flipping analogy so a 10-year-old child can understand."
    },
    {
      title: "Write & debug code",
      subtitle: "in JavaScript with clean docs",
      prompt: "Write a JavaScript function that uses recursion to deep-clone a nested object, and explain it step-by-step with clean markdown comments."
    }
  ]

  return (
    <div className="chat-window">
      
      {/* Chat Window Header */}
      <div className="chat-header">
        {!sidebarOpen && (
          <button 
            className="header-toggle-sidebar-btn" 
            onClick={toggleSidebar}
            title="Expand sidebar"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="9" y1="3" x2="9" y2="21"></line>
              <path d="M13 9l3 3-3 3"></path>
            </svg>
          </button>
        )}
        <div className="model-selector" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            style={{
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              padding: '6px 10px',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              outline: 'none',
              transition: 'background-color 0.2s'
            }}
          >
            <option value="llama-3.3-70b-versatile">Llama 3.3 70b</option>
            <option value="llama-3.1-8b-instant">Llama 3.1 8b</option>
            <option value="mixtral-8x7b-32768">Mixtral 8x7b</option>
            <option value="gemma2-9b-it">Gemma2 9b</option>
          </select>
          <span className="model-badge" style={{ pointerEvents: 'none' }}>Groq</span>
        </div>

        {/* Export Button */}
        {activeMessages.length > 0 && (
          <button
            className="export-btn"
            onClick={handleExportChat}
            title="Export Chat as TXT"
            style={{
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'background-color 0.2s',
              marginLeft: 'auto'
            }}
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            <span>Export</span>
          </button>
        )}
      </div>

      {/* Message Area */}
      <div 
        className="messages-area" 
        ref={scrollContainerRef}
        onScroll={handleScroll}
      >
        <div className="chat-content-container">
          {activeMessages.length === 0 ? (
            /* ChatGPT Landing Page Empty State */
            <div className="empty-chat-landing">
              <div className="landing-logo">
                <svg viewBox="0 0 24 24" width="48" height="48" fill="currentColor">
                  <path d="M12 2L14.85 9.15L22 12L14.85 14.85L12 22L9.15 14.85L2 12L9.15 9.15L12 2Z" />
                </svg>
              </div>
              <h2 className="landing-title">How can I help you today?</h2>
              
              <div className="suggestions-grid">
                {suggestions.map((item, index) => (
                  <div 
                    key={index} 
                    className="suggestion-card"
                    onClick={() => onSendMessage(item.prompt)}
                  >
                    <div className="suggestion-title">{item.title}</div>
                    <div className="suggestion-subtitle">{item.subtitle}</div>
                    <span className="suggestion-arrow">↑</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Chat Messages List */
            <div className="messages-list">
              {activeMessages.map((msg, index) => {
                const isLast = index === activeMessages.length - 1
                return (
                  <MessageBubble
                    key={index}
                    role={msg.role}
                    text={msg.text}
                    isTyping={msg.isTyping}
                    timestamp={msg.timestamp}
                    attachments={msg.attachments}
                    onRegenerate={onRegenerate}
                    onEditMessage={onEditMessage}
                    index={index}
                    isLast={isLast}
                  />
                )
              })}

              {/* Loader when thinking but assistant bubble hasn't mounted */}
              {loading && activeMessages[activeMessages.length - 1]?.role === 'user' && (
                <div className="message-row assistant thinking">
                  <div className="bubble-avatar assistant">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                      <path d="M12 2L14.85 9.15L22 12L14.85 14.85L12 22L9.15 14.85L2 12L9.15 9.15L12 2Z" />
                    </svg>
                  </div>
                  <div className="bubble assistant thinking-bubble">
                    <div className="typing-dots">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Floating Scroll Down Button */}
      {showScrollDownBtn && (
        <button 
          className="scroll-down-btn" 
          onClick={() => scrollToBottom('smooth')}
          title="Scroll to bottom"
        >
          ↓
        </button>
      )}

      {/* Input container wrapper to keep it centered */}
      <div className="input-box-wrapper">
        <InputBox onSend={onSendMessage} loading={loading} />
        <div className="input-footer-text">
          MyAI can make mistakes. Verify important info.
        </div>
      </div>

    </div>
  )
}