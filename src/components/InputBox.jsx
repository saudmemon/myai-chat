import { useState, useRef, useEffect } from 'react'

export default function InputBox({ onSend, loading, onFocus }) {
  const [input, setInput] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [isSpeechSupported, setIsSpeechSupported] = useState(false)
  const [attachedFiles, setAttachedFiles] = useState([]) // Holds array of { id, name, type, url }
  const textareaRef = useRef(null)
  const recognitionRef = useRef(null)
  const fileInputRef = useRef(null)

  // Detect speech recognition support in current browser
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    setIsSpeechSupported(!!SpeechRecognition)
  }, [])

  // Autogrow text area height dynamically
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`
    }
  }, [input])

  const isLimitExceeded = input.length > 2000

  // Handle message send
  function handleSend() {
    if (input.trim() === '' && attachedFiles.length === 0) return
    if (loading || isLimitExceeded) return
    
    // Pass both the text input and attached files to parent
    onSend(input.trim(), attachedFiles)
    setInput('')
    setAttachedFiles([]) // Reset attachments UI on send
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  // Handle keyboard shortcuts: Enter to send, Shift+Enter for newline
  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // File selection triggers (supports image and PDF)
  function triggerFilePicker() {
    fileInputRef.current?.click()
  }

  // ===== REAL: Convert image File to base64 Data URL =====
  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result) // "data:image/png;base64,..."
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  // ===== REAL: Extract all text from a PDF using PDF.js loaded from CDN =====
  async function extractTextFromPDF(file) {
    // Dynamically load PDF.js from CDN if not already loaded
    if (!window.pdfjsLib) {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script')
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
        script.onload = resolve
        script.onerror = reject
        document.head.appendChild(script)
      })
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
    }

    const arrayBuffer = await file.arrayBuffer()
    const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise
    let fullText = ''

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const textContent = await page.getTextContent()
      const pageText = textContent.items.map(item => item.str).join(' ')
      fullText += `\n--- Page ${i} ---\n${pageText}\n`
    }

    return fullText.trim()
  }

  // ===== Process selected files in the background =====
  async function handleFileChange(e) {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    // Process each file asynchronously
    const processedAttachments = await Promise.all(
      files.map(async (file) => {
        const id = Math.random().toString(36).substr(2, 9)
        const ext = file.name.split('.').pop().toLowerCase()
        
        // Detect file types based on mime type or file extension fallback
        const isImage = file.type.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)
        const isPDF = file.type === 'application/pdf' || ext === 'pdf'

        // Determine final content type
        let detectedType = file.type
        if (!detectedType) {
          if (isImage) {
            detectedType = `image/${ext === 'jpg' ? 'jpeg' : ext}`
          } else if (isPDF) {
            detectedType = 'application/pdf'
          } else {
            detectedType = 'application/octet-stream'
          }
        }

        const attachment = {
          id,
          name: file.name,
          type: detectedType,
          url: URL.createObjectURL(file) // For visual thumbnail preview
        }

        if (isImage) {
          // Convert image to base64 for Groq Vision API
          try {
            attachment.base64 = await fileToBase64(file)
          } catch (err) {
            console.error('Image base64 conversion failed:', err)
            attachment.base64 = ''
          }
        } else if (isPDF) {
          // Extract text content from PDF for LLM context injection
          try {
            attachment.extractedText = await extractTextFromPDF(file)
          } catch (err) {
            console.error('PDF extraction failed:', err)
            attachment.extractedText = '[Error: Could not extract text from this PDF]'
          }
        }

        return attachment
      })
    )

    // Filter out empty/null attachments if any crash happened
    const validAttachments = processedAttachments.filter(Boolean)

    setAttachedFiles(prev => [...prev, ...validAttachments])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handleRemoveFile(id) {
    setAttachedFiles(prev => {
      const target = prev.find(f => f.id === id)
      if (target && target.url.startsWith('blob:')) {
        URL.revokeObjectURL(target.url) // Clean up memory leak
      }
      return prev.filter(f => f.id !== id)
    })
  }

  // Speech to Text (Voice typing) using Web Speech API
  function handleVoiceInput() {
    if (isRecording) {
      recognitionRef.current?.stop()
      setIsRecording(false)
      return
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser.")
      return
    }

    try {
      const recognition = new SpeechRecognition()
      recognition.continuous = false
      recognition.interimResults = false
      
      // Attempting to catch multi-lingual flows, standard is English
      recognition.lang = 'en-US'
      
      recognition.onstart = () => {
        setIsRecording(true)
      }
      
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript
        setInput(prev => prev + (prev ? ' ' : '') + transcript)
        setIsRecording(false)
      }
      
      recognition.onerror = () => {
        setIsRecording(false)
      }
      
      recognition.onend = () => {
        setIsRecording(false)
      }

      recognitionRef.current = recognition
      recognition.start()
    } catch (err) {
      setIsRecording(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
      {/* File Previews Container (Images & PDFs) */}
      {attachedFiles.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', margin: '0 0 12px 12px' }}>
          {attachedFiles.map(file => {
            const isImage = file.type.startsWith('image/')
            return (
              <div key={file.id} style={{ position: 'relative', display: 'inline-block' }}>
                {isImage ? (
                  <img 
                    src={file.url} 
                    alt={file.name} 
                    style={{ width: '56px', height: '56px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--border-color)' }} 
                  />
                ) : (
                  <div style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-secondary)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '4px',
                    textAlign: 'center',
                    fontSize: '9px',
                    color: 'var(--text-primary)',
                    overflow: 'hidden'
                  }}>
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#ef4444" strokeWidth="2" style={{ marginBottom: '2px' }}>
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                      <line x1="16" y1="13" x2="8" y2="13"></line>
                      <line x1="16" y1="17" x2="8" y2="17"></line>
                      <polyline points="10 9 9 9 8 9"></polyline>
                    </svg>
                    <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', width: '100%' }}>PDF</span>
                  </div>
                )}
                <button
                  onClick={() => handleRemoveFile(file.id)}
                  style={{
                    position: 'absolute',
                    top: '-6px',
                    right: '-6px',
                    background: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '50%',
                    width: '16px',
                    height: '16px',
                    fontSize: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    zIndex: 10
                  }}
                >
                  ×
                </button>
              </div>
            )
          })}
        </div>
      )}

      <div className="input-area-container" style={{ position: 'relative' }}>
        {/* Hidden File Input supporting Images and PDFs */}
        <input
          type="file"
          ref={fileInputRef}
          accept="image/*,application/pdf"
          onChange={handleFileChange}
          multiple
          style={{ display: 'none' }}
        />

        {/* Paperclip icon button for Image/PDF Upload */}
        <button
          className="input-voice-btn"
          onClick={triggerFilePicker}
          disabled={loading}
          title="Image/PDF upload"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
          </svg>
        </button>

        {/* Autogrow Textarea input with character counter container */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, position: 'relative' }}>
          <textarea
            ref={textareaRef}
            rows={1}
            placeholder="Message MyAI..."
            className="input-textbox"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={onFocus}
            disabled={loading}
            style={{ paddingBottom: '20px' }}
          />
          
          {/* Character counter (Turns red when > 1800) */}
          <div
            className="char-counter"
            style={{
              position: 'absolute',
              bottom: '2px',
              right: '8px',
              fontSize: '11px',
              color: input.length > 1800 ? '#ff4d4d' : 'var(--text-muted)',
              opacity: 0.7,
              pointerEvents: 'none'
            }}
          >
            {input.length}/2000
          </div>
        </div>

        {/* Input action buttons group (Microphone & Send next to each other) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {/* Speech to text microphone button (hidden if browser doesn't support) */}
          {isSpeechSupported && (
            <button 
              className={`input-voice-btn ${isRecording ? 'recording-active' : ''}`}
              onClick={handleVoiceInput}
              disabled={loading}
              title={isRecording ? "Listening... click to stop" : "Voice input"}
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                <line x1="12" y1="19" x2="12" y2="23"></line>
                <line x1="8" y1="23" x2="16" y2="23"></line>
              </svg>
            </button>
          )}

          {/* Send Message Button (Circular Arrow style) */}
          <button 
            className={`input-send-btn ${(input.trim() || attachedFiles.length > 0) && !loading && !isLimitExceeded ? 'has-text' : ''}`}
            onClick={handleSend}
            disabled={(!input.trim() && attachedFiles.length === 0) || loading || isLimitExceeded}
            title="Send prompt"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="3">
              <line x1="12" y1="19" x2="12" y2="5"></line>
              <polyline points="5 12 12 5 19 12"></polyline>
            </svg>
          </button>
        </div>

      </div>
    </div>
  )
}