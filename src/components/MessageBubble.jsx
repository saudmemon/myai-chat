import { useState, useEffect, useRef } from 'react'
import MarkdownRenderer from './MarkdownRenderer'

export default function MessageBubble({ role, text, isTyping, onRegenerate, onEditMessage, index, isLast, timestamp, attachments }) {
  const [copied, setCopied] = useState(false)
  const [likeState, setLikeState] = useState(null) // null, 'up', 'down'
  const [speaking, setSpeaking] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState(text)
  const editInputRef = useRef(null)

  useEffect(() => {
    setEditText(text)
  }, [text])

  // Focus textarea when editing starts
  useEffect(() => {
    if (isEditing && editInputRef.current) {
      editInputRef.current.style.height = 'auto'
      editInputRef.current.style.height = `${editInputRef.current.scrollHeight}px`
      editInputRef.current.focus()
    }
  }, [isEditing])

  function handleSaveEdit() {
    if (editText.trim() !== '' && editText !== text) {
      if (onEditMessage) onEditMessage(index, editText)
    }
    setIsEditing(false)
  }

  function handleCancelEdit() {
    setEditText(text)
    setIsEditing(false)
  }

  // Helper to format timestamp to 12-hour format "2:30 PM"
  function formatTime(isoString) {
    if (!isoString) return ''
    try {
      const date = new Date(isoString)
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } catch (e) {
      return ''
    }
  }

  // Clear speech if component unmounts or text changes
  useEffect(() => {
    return () => {
      if (speaking) {
        window.speechSynthesis.cancel()
      }
    }
  }, [speaking])

  // Clipboard copy
  function handleCopy() {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Web Speech Text to Speech (TTS)
  function handleSpeak() {
    if (speaking) {
      window.speechSynthesis.cancel()
      setSpeaking(false)
      return
    }

    window.speechSynthesis.cancel() // Stop any current speech
    const utterance = new SpeechSynthesisUtterance(text)
    
    // Auto-detect a language if it looks like Urdu/Hindi in Roman script
    // Speech synthesis usually handles normal text in system languages.
    utterance.onend = () => setSpeaking(false)
    utterance.onerror = () => setSpeaking(false)
    
    setSpeaking(true)
    window.speechSynthesis.speak(utterance)
  }

  return (
    <div className={`message-row ${role}`}>
      
      {/* Avatar Container */}
      <div className={`bubble-avatar ${role}`}>
        {role === 'user' ? (
          // User Avatar: S
          <span>S</span>
        ) : (
          // Assistant Avatar: Sparkle SVG
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
            <path d="M12 2L14.85 9.15L22 12L14.85 14.85L12 22L9.15 14.85L2 12L9.15 9.15L12 2Z" />
          </svg>
        )}
      </div>

      {/* Message Content Bubble Wrapper */}
      <div className={`bubble-content-wrapper`}>
        
        {/* User Name or AI Name */}
        <div className="bubble-sender-name">
          {role === 'user' ? 'You' : 'MyAI'}
        </div>

        {/* Message Bubble Body */}
        <div className={`bubble ${role} ${isTyping ? 'typing-active' : ''}`} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {role === 'user' ? (
            isEditing ? (
              <div className="edit-message-container" style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                <textarea
                  ref={editInputRef}
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  style={{
                    width: '100%',
                    minHeight: '60px',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    padding: '8px',
                    fontSize: '15px',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                    outline: 'none'
                  }}
                />
                <div style={{ display: 'flex', gap: '8px', alignSelf: 'flex-end' }}>
                  <button 
                    onClick={handleCancelEdit}
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '13px', padding: '6px 12px', borderRadius: '4px' }}
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleSaveEdit}
                    style={{ background: '#2563eb', border: 'none', color: 'white', cursor: 'pointer', fontSize: '13px', padding: '6px 12px', borderRadius: '4px', fontWeight: '500' }}
                  >
                    Save & Submit
                  </button>
                </div>
              </div>
            ) : (
              /* User messages are pre-formatted text blocks */
              <p className="user-message-text" style={{ margin: 0 }}>{text}</p>
            )
          ) : (
            /* Assistant messages render markdown */
            <>
              <MarkdownRenderer content={text} />
              {isTyping && <span className="streaming-cursor">●</span>}
            </>
          )}

          {/* Uploaded Attachments inside Bubble */}
          {attachments && attachments.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '4px' }}>
              {attachments.map((file, idx) => {
                const isImage = file.type.startsWith('image/')
                return (
                  <div key={idx} style={{ display: 'inline-block' }}>
                    {isImage ? (
                      file.url ? (
                        <a href={file.url} target="_blank" rel="noopener noreferrer" title="View image">
                          <img 
                            src={file.url} 
                            alt={file.name} 
                            style={{ maxWidth: '180px', maxHeight: '180px', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'block', cursor: 'pointer', transition: 'transform 0.2s' }}
                            onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                            onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                          />
                        </a>
                      ) : (
                        /* Graceful placeholder when the local session URL is no longer available (after page reload) */
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid var(--border-color)',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          color: 'var(--text-muted)',
                          fontSize: '13px'
                        }}>
                          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" style={{ opacity: 0.7 }}>
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                            <circle cx="8.5" cy="8.5" r="1.5"></circle>
                            <polyline points="21 15 16 10 5 21"></polyline>
                          </svg>
                          <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                            <span style={{ fontWeight: '500', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '120px' }}>{file.name}</span>
                            <span style={{ fontSize: '10px', opacity: 0.6 }}>Image Uploaded</span>
                          </div>
                        </div>
                      )
                    ) : (
                      file.url ? (
                        <a 
                          href={file.url} 
                          download={file.name}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            background: 'rgba(255, 255, 255, 0.1)',
                            border: '1px solid var(--border-color)',
                            padding: '8px 12px',
                            borderRadius: '8px',
                            textDecoration: 'none',
                            color: 'inherit',
                            fontSize: '13px',
                            transition: 'background-color 0.2s'
                          }}
                          onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'}
                          onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                        >
                          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#ef4444" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                          </svg>
                          <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                            <span style={{ fontWeight: '500', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '120px' }}>{file.name}</span>
                            <span style={{ fontSize: '10px', opacity: 0.6 }}>PDF File</span>
                          </div>
                        </a>
                      ) : (
                        /* Graceful placeholder for PDF after reload when url is gone */
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid var(--border-color)',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          color: 'var(--text-muted)',
                          fontSize: '13px'
                        }}>
                          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#ef4444" strokeWidth="2" style={{ opacity: 0.7 }}>
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                          </svg>
                          <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                            <span style={{ fontWeight: '500', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '120px' }}>{file.name}</span>
                            <span style={{ fontSize: '10px', opacity: 0.6 }}>PDF Uploaded</span>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Message Timestamp */}
        {timestamp && (
          <div 
            className="message-timestamp" 
            style={{ 
              fontSize: '11px', 
              opacity: 0.5, 
              marginTop: '4px',
              color: 'var(--text-muted)',
              alignSelf: role === 'user' ? 'flex-end' : 'flex-start',
              userSelect: 'none'
            }}
          >
            {formatTime(timestamp)}
          </div>
        )}

        {/* Actions Row - Only visible for Assistant Messages (or User message edit icons) */}
        {!isTyping && text && !isEditing && (
          <div className="message-actions-row" style={role === 'user' ? { justifyContent: 'flex-end', marginTop: '4px' } : {}}>
            
            {role === 'assistant' && (
              <>
                {/* Copy Button */}
            <button 
              className={`msg-action-btn ${copied ? 'active text-green' : ''}`}
              onClick={handleCopy}
              title={copied ? "Copied" : "Copy response"}
            >
              {copied ? (
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
              )}
            </button>

            {/* Read Aloud TTS Button */}
            <button 
              className={`msg-action-btn ${speaking ? 'active text-green' : ''}`}
              onClick={handleSpeak}
              title={speaking ? "Stop reading" : "Read aloud"}
            >
              {speaking ? (
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="4" y="4" width="16" height="16" rx="2"></rect>
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                </svg>
              )}
            </button>

            {/* Thumbs Up Button */}
            <button 
              className={`msg-action-btn ${likeState === 'up' ? 'active' : ''}`}
              onClick={() => setLikeState(likeState === 'up' ? null : 'up')}
              title="Helpful response"
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
              </svg>
            </button>

            {/* Thumbs Down Button */}
            <button 
              className={`msg-action-btn ${likeState === 'down' ? 'active' : ''}`}
              onClick={() => setLikeState(likeState === 'down' ? null : 'down')}
              title="Not helpful response"
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3"></path>
              </svg>
            </button>

            {/* Regenerate Button - only if it is the last message in conversation */}
            {isLast && onRegenerate && (
              <button 
                className="msg-action-btn regenerate-btn"
                onClick={onRegenerate}
                title="Regenerate response"
              >
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M23 4v6h-6"></path>
                  <path d="M1 20v-6h6"></path>
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                </svg>
              </button>
            )}
              </>
            )}

            {role === 'user' && onEditMessage && (
              <button 
                className="msg-action-btn"
                onClick={() => setIsEditing(true)}
                title="Edit message"
              >
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 20h9"></path>
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                </svg>
              </button>
            )}

          </div>
        )}

      </div>
      
    </div>
  )
}