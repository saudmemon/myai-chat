import { useState } from 'react'
import ReactMarkdown from 'react-markdown'

// High-fidelity custom code block renderer
function CustomCodeBlock({ className, children, ...props }) {
  const [copied, setCopied] = useState(false)
  const match = /language-(\w+)/.exec(className || '')
  const language = match ? match[1] : 'code'
  const codeString = String(children).replace(/\n$/, '')

  function handleCopy() {
    navigator.clipboard.writeText(codeString)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="code-block-container" style={{ backgroundColor: '#1e1e1e', margin: '16px 0', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
      {/* Code Block Header */}
      <div className="code-block-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#2f2f2f', color: '#c9d1d9', padding: '8px 16px', fontSize: '11.5px', fontFamily: 'monospace', textTransform: 'lowercase', borderBottom: '1px solid #1f1f1f', userSelect: 'none' }}>
        <span className="code-lang" style={{ fontWeight: 600 }}>{language}</span>
        <button className="code-copy-btn" onClick={handleCopy} style={{ background: 'none', border: 'none', color: '#a3a3a3', cursor: 'pointer', fontSize: '11.5px', fontFamily: 'var(--font-sans)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          {copied ? (
            <>
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              <span>Copied!</span>
            </>
          ) : (
            <>
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
              <span>Copy code</span>
            </>
          )}
        </button>
      </div>
      
      {/* Monospace Code Wrapper */}
      <div className="code-block-wrapper" style={{ padding: '16px', overflowX: 'auto' }}>
        <pre style={{ margin: 0 }}>
          <code className={className} style={{ fontFamily: 'monospace', color: '#ffffff', fontSize: '13.5px', whiteSpace: 'pre', display: 'block', padding: 0, background: 'none' }} {...props}>
            {codeString}
          </code>
        </pre>
      </div>
    </div>
  )
}

// MarkdownRenderer component powered by react-markdown library
export default function MarkdownRenderer({ content }) {
  if (!content) return null

  return (
    <div className="markdown-body">
      <ReactMarkdown
        components={{
          code({ node, inline, className, children, ...props }) {
            // Robust check supporting both react-markdown v8 and v9 (where inline prop is deprecated)
            const isInline = inline ?? (!className && !String(children).includes('\n'))
            return !isInline ? (
              <CustomCodeBlock className={className} {...props}>
                {children}
              </CustomCodeBlock>
            ) : (
              <code className="inline-code" {...props}>
                {children}
              </code>
            )
          }
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
