import { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import ChatWindow from './components/ChatWindow'
import './App.css'

const API_KEY = import.meta.env.VITE_GROQ_API_KEY

// Helper to save conversations safely to localStorage by stripping heavy image base64 data and blob URLs
function saveConversationsToLocalStorage(conversationsList) {
  try {
    const simplified = conversationsList.map(c => ({
      ...c,
      messages: c.messages.map(m => {
        if (!m.attachments) return m
        return {
          ...m,
          attachments: m.attachments.map(a => {
            // Strip base64 and temporary blob URLs before stringifying to save space and prevent QuotaExceededError
            const { base64, url, ...rest } = a
            return rest
          })
        }
      })
    }))
    localStorage.setItem('all-conversations', JSON.stringify(simplified))
  } catch (error) {
    console.error('Failed to save conversations to localStorage:', error)
  }
}

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [loading, setLoading] = useState(false)

  // ===== THEME STATE =====
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('app-theme')
    return saved ? saved : 'dark'
  })

  // ===== CONVERSATIONS LIST (Sari chats store hongi) =====
  const [conversations, setConversations] = useState(() => {
    const saved = localStorage.getItem('all-conversations')
    return saved ? JSON.parse(saved) : []
  })

  // ===== ACTIVE CHAT ID =====
  const [activeConversationId, setActiveConversationId] = useState(() => {
    const saved = localStorage.getItem('active-conversation-id')
    return saved ? JSON.parse(saved) : null
  })

  // ===== SELECTED MODEL STATE =====
  const [selectedModel, setSelectedModel] = useState('llama-3.3-70b-versatile')

  // Sync theme with HTML document class
  useEffect(() => {
    localStorage.setItem('app-theme', theme)
    if (theme === 'light') {
      document.documentElement.classList.add('light')
    } else {
      document.documentElement.classList.remove('light')
    }
  }, [theme])

  // Sync activeConversationId to localStorage
  useEffect(() => {
    if (activeConversationId) {
      localStorage.setItem('active-conversation-id', JSON.stringify(activeConversationId))
    } else {
      localStorage.removeItem('active-conversation-id')
    }
  }, [activeConversationId])

  // ===== KEYBOARD SHORTCUTS =====
  useEffect(() => {
    function handleKeyDown(e) {
      // Ctrl+K or Cmd+K = New Chat
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        handleNewChat()
      }
      
      // Ctrl+/ or Cmd+/ = Focus search box in sidebar
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault()
        const focusEvent = new CustomEvent('focus-search')
        window.dispatchEvent(focusEvent)
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const toggleTheme = () => setTheme(prev => (prev === 'dark' ? 'light' : 'dark'))

  // Derive active messages
  const activeConversation = conversations.find(c => c.id === activeConversationId)
  const activeMessages = activeConversation ? activeConversation.messages : []

  // Create a brand new clean chat session
  function handleNewChat() {
    setActiveConversationId(null)
  }

  // Select a chat from the history sidebar
  function handleSelectConversation(conversation) {
    setActiveConversationId(conversation.id)
  }

  // Delete a specific chat (Don't delete currently active conversation)
  function handleDeleteConversation(id) {
    if (activeConversationId === id) return
    const updated = conversations.filter(c => c.id !== id)
    setConversations(updated)
    saveConversationsToLocalStorage(updated)
  }

  // Rename a chat title
  function handleRenameConversation(id, newTitle) {
    const updated = conversations.map(c => {
      if (c.id === id) {
        return { ...c, title: newTitle }
      }
      return c
    })
    setConversations(updated)
    saveConversationsToLocalStorage(updated)
  }

  // Clear all conversations
  function handleClearAll() {
    setConversations([])
    setActiveConversationId(null)
    localStorage.removeItem('all-conversations')
    localStorage.removeItem('active-conversation-id')
  }

  // Simulated Word-by-Word Streaming Typing Effect
  function simulateTyping(convId, fullText) {
    const words = fullText.split(' ')
    let currentText = ''
    let i = 0

    // Check if we are still on the active conversation
    const interval = setInterval(() => {
      if (i < words.length) {
        currentText += (i === 0 ? '' : ' ') + words[i]
        setConversations(prev =>
          prev.map(c => {
            if (c.id === convId) {
              const nextMessages = [...c.messages]
              const last = nextMessages[nextMessages.length - 1]
              if (last && last.role === 'assistant') {
                last.text = currentText
              }
              return { ...c, messages: nextMessages }
            }
            return c
          })
        )
        i++
      } else {
        clearInterval(interval)
        // Mark conversation typing completed
        setConversations(prev => {
          const updated = prev.map(c => {
            if (c.id === convId) {
              const nextMessages = [...c.messages]
              const last = nextMessages[nextMessages.length - 1]
              if (last && last.role === 'assistant') {
                last.isTyping = false
              }
              return { ...c, messages: nextMessages }
            }
            return c
          })
          saveConversationsToLocalStorage(updated)
          return updated
        })
        setLoading(false)
      }
    }, 30) // 30ms delay per word for smooth flow
  }

  // Primary API handler for Groq calls (supports Vision + PDF text injection)
  async function fetchGroqResponse(convId, messageHistory) {
    try {
      // ===== Detect if any message in history has image attachments =====
      const hasImageAttachment = messageHistory.some(
        m => m.attachments && m.attachments.some(a => a.type.startsWith('image/'))
      )

      // ===== Build the messages payload =====
      const formattedMessages = messageHistory.map(m => {
        const hasAttachments = m.attachments && m.attachments.length > 0

        if (!hasAttachments) {
          // Standard text-only message
          return { role: m.role, content: m.text }
        }

        // Check for specific attachment types
        const imageAttachments = m.attachments.filter(a => a.type.startsWith('image/'))
        const pdfAttachments = m.attachments.filter(a => a.type === 'application/pdf')

        // ===== IMAGE: Use multimodal vision content array =====
        if (imageAttachments.length > 0) {
          const contentParts = []

          // Add text part if user wrote something
          if (m.text) {
            contentParts.push({ type: 'text', text: m.text })
          } else {
            contentParts.push({ type: 'text', text: 'Describe this image in detail.' })
          }

          // Add each image as a base64 image_url part
          imageAttachments.forEach(img => {
            if (img.base64) {
              contentParts.push({
                type: 'image_url',
                image_url: { url: img.base64 }
              })
            }
          })

          // Also inject PDF text if both types are attached
          if (pdfAttachments.length > 0) {
            const pdfContext = pdfAttachments
              .map(p => `\n\n📄 Content of "${p.name}":\n${p.extractedText || '[No text extracted]'}`)
              .join('\n')
            contentParts.push({ type: 'text', text: pdfContext })
          }

          return { role: m.role, content: contentParts }
        }

        // ===== PDF ONLY: Inject extracted text into user prompt =====
        if (pdfAttachments.length > 0) {
          const pdfContext = pdfAttachments
            .map(p => `\n\n📄 Content of "${p.name}":\n${p.extractedText || '[No text extracted]'}`)
            .join('\n')
          const userPrompt = m.text
            ? `${m.text}\n\nHere is the document content the user uploaded:${pdfContext}`
            : `The user uploaded a document. Read it carefully and provide a detailed summary and analysis.${pdfContext}`
          return { role: m.role, content: userPrompt }
        }

        // Fallback: text only
        return { role: m.role, content: m.text }
      })

      // ===== Choose the right model =====
      // Auto-switch to vision model if images detected, otherwise use user-selected model
      const modelToUse = hasImageAttachment ? 'meta-llama/llama-4-scout-17b-16e-instruct' : selectedModel

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${API_KEY}`
        },
        body: JSON.stringify({
          model: modelToUse,
          messages: [
            {
              role: 'system',
              content:
                'You are MyAI, a helpful, advanced, and highly articulate AI assistant designed to look and behave exactly like ChatGPT. Be structured, use Markdown headers, bolding, lists, and code blocks where appropriate. Always respond in the same language the user writes in (e.g. Urdu, Roman Urdu, or English). When a user uploads a PDF document, read and analyze its full content carefully. When a user uploads an image, describe it in rich detail.'
            },
            ...formattedMessages
          ]
        })
      })

      const data = await response.json()

      if (data.error) {
        appendAssistantMessage(convId, `Groq API Error: ${data.error.message}`, false)
        setLoading(false)
      } else {
        const aiText = data.choices[0].message.content
        // Append an empty assistant message and run typing effect
        appendAssistantMessage(convId, '', true)
        simulateTyping(convId, aiText)
      }
    } catch (error) {
      appendAssistantMessage(
        convId,
        'Fetch Error: Unable to connect to Groq. Please check your network connection or API Key.',
        false
      )
      setLoading(false)
    }
  }

  // Append assistant message helper (with timestamp)
  function appendAssistantMessage(convId, text, isTyping) {
    setConversations(prev =>
      prev.map(c => {
        if (c.id === convId) {
          return {
            ...c,
            messages: [...c.messages, { role: 'assistant', text, isTyping, timestamp: new Date().toISOString() }]
          }
        }
        return c
      })
    )
  }

  // Main input send message trigger (with optional attachments)
  async function handleSendMessage(text, attachments = []) {
    if (loading) return

    const userMessage = { role: 'user', text, timestamp: new Date().toISOString(), attachments }
    let currentConvId = activeConversationId

    setLoading(true)

    if (!currentConvId) {
      // Create a brand new conversation
      currentConvId = Date.now()
      const title = text ? (text.length > 25 ? text.slice(0, 25) + '...' : text) : 'File Attachment'
      const newConv = {
        id: currentConvId,
        title: title,
        messages: [userMessage]
      }
      const updated = [newConv, ...conversations]
      setConversations(updated)
      setActiveConversationId(currentConvId)
      saveConversationsToLocalStorage(updated)

      // Trigger Groq with first message
      await fetchGroqResponse(currentConvId, [userMessage])
    } else {
      // Append user message to existing conversation
      const updated = conversations.map(c => {
        if (c.id === currentConvId) {
          return {
            ...c,
            messages: [...c.messages, userMessage]
          }
        }
        return c
      })
      setConversations(updated)
      saveConversationsToLocalStorage(updated)

      const activeConv = updated.find(c => c.id === currentConvId)
      // Trigger Groq with full history
      await fetchGroqResponse(currentConvId, activeConv.messages)
    }
  }

  // Edit user message and resend
  async function handleEditMessage(messageIndex, newText) {
    if (loading || !activeConversationId) return

    const activeConv = conversations.find(c => c.id === activeConversationId)
    if (!activeConv || activeConv.messages.length <= messageIndex) return

    // Slice messages up to the edited message
    const nextMessages = activeConv.messages.slice(0, messageIndex + 1)
    
    // Update the text of the edited message
    nextMessages[messageIndex] = {
      ...nextMessages[messageIndex],
      text: newText
    }

    setConversations(prev => {
      const updated = prev.map(c => {
        if (c.id === activeConversationId) {
          return { ...c, messages: nextMessages }
        }
        return c
      })
      saveConversationsToLocalStorage(updated)
      return updated
    })

    setLoading(true)
    await fetchGroqResponse(activeConversationId, nextMessages)
  }

  // Regenerate Response
  async function handleRegenerate() {
    if (loading || !activeConversationId) return

    const activeConv = conversations.find(c => c.id === activeConversationId)
    if (!activeConv || activeConv.messages.length < 1) return

    const nextMessages = [...activeConv.messages]
    // Remove last assistant message if it exists
    if (nextMessages[nextMessages.length - 1].role === 'assistant') {
      nextMessages.pop()
    }

    setConversations(prev =>
      prev.map(c => {
        if (c.id === activeConversationId) {
          return { ...c, messages: nextMessages }
        }
        return c
      })
    )

    setLoading(true)
    await fetchGroqResponse(activeConversationId, nextMessages)
  }

  return (
    <div className="app-container">
      <Sidebar
        isOpen={sidebarOpen}
        toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        onNewChat={handleNewChat}
        conversations={conversations}
        onSelectConversation={handleSelectConversation}
        activeId={activeConversationId}
        onDeleteConversation={handleDeleteConversation}
        onRenameConversation={handleRenameConversation}
        onClearAll={handleClearAll}
        theme={theme}
        toggleTheme={toggleTheme}
      />
      <ChatWindow
        sidebarOpen={sidebarOpen}
        toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        activeConversationTitle={activeConversation?.title || 'MyAI'}
        activeMessages={activeMessages}
        onSendMessage={handleSendMessage}
        onRegenerate={handleRegenerate}
        onEditMessage={handleEditMessage}
        loading={loading}
        selectedModel={selectedModel}
        setSelectedModel={setSelectedModel}
      />
    </div>
  )
}

export default App