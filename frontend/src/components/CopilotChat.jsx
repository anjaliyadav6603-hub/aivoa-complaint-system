import { useState } from 'react'

function CopilotChat() {
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'Ready to process new complaints. Paste a complaint or upload a file.' }
  ])
  const [input, setInput] = useState('')

  const handleSend = () => {
    if (!input.trim()) return

    // Add the user's message to the chat
    setMessages((prev) => [...prev, { role: 'user', text: input }])
    setInput('')

    // TEMPORARY fake response — we'll replace this with a real backend call in Step 8
    setTimeout(() => {
      setMessages((prev) => [...prev, { role: 'assistant', text: '(This is a placeholder reply — backend not connected yet.)' }])
    }, 500)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSend()
    }
  }

  return (
    <div style={{ width: '380px', borderLeft: '1px solid #eee', padding: '24px', display: 'flex', flexDirection: 'column', height: '100vh', boxSizing: 'border-box' }}>
      <h3 style={{ margin: 0 }}>AIVOA Copilot</h3>
      <p style={{ color: '#666', fontSize: '13px' }}>Drop complaint files or paste text below.</p>

      <div style={{ flex: 1, marginTop: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
              background: msg.role === 'user' ? '#6366f1' : '#f3f4f6',
              color: msg.role === 'user' ? '#fff' : '#111',
              padding: '10px 14px',
              borderRadius: '12px',
              maxWidth: '85%',
              fontSize: '14px',
            }}
          >
            {msg.text}
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message or paste a complaint..."
          style={{ flex: 1, padding: '10px', border: '1px solid #ddd', borderRadius: '8px' }}
        />
        <button
          onClick={handleSend}
          style={{ padding: '10px 16px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
        >
          Send
        </button>
      </div>
    </div>
  )
}

export default CopilotChat