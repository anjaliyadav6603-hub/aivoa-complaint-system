import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { setComplaintFields } from '../store/complaintSlice'

function CopilotChat() {
  const dispatch = useDispatch()
  const complaint = useSelector((state) => state.complaint)
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'Ready to process new complaints. Paste a complaint or upload a file.' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  // A complaint is considered "already started" if it has a product name set
  const hasExistingComplaint = Boolean(complaint.product_name)

  const handleSend = async () => {
    if (!input.trim() || loading) return

    const userMessage = input
    setMessages((prev) => [...prev, { role: 'user', text: userMessage }])
    setInput('')
    setLoading(true)

    try {
      let response

      if (hasExistingComplaint) {
        // EDIT mode — send current complaint + correction
        response = await fetch('http://127.0.0.1:8000/copilot/edit-complaint', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: userMessage, current_complaint: complaint }),
        })
      } else {
        // NEW complaint mode — fresh extraction
        response = await fetch('http://127.0.0.1:8000/copilot/log-complaint', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: userMessage }),
        })
      }

      if (!response.ok) throw new Error('Backend error')

      const data = await response.json()

      // Merge fields into the form — works for both modes since edit only returns changed fields
      dispatch(setComplaintFields({ ...data.fields, status: 'Ready to Commit' }))

      setMessages((prev) => [...prev, { role: 'assistant', text: data.reply }])
    } catch (err) {
      setMessages((prev) => [...prev, { role: 'assistant', text: 'Sorry, something went wrong connecting to the backend.' }])
    } finally {
      setLoading(false)
    }
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
        {loading && (
          <div style={{ alignSelf: 'flex-start', color: '#999', fontSize: '13px' }}>
            AI is thinking...
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message or paste a complaint..."
          disabled={loading}
          style={{ flex: 1, padding: '10px', border: '1px solid #ddd', borderRadius: '8px' }}
        />
        <button
          onClick={handleSend}
          disabled={loading}
          style={{ padding: '10px 16px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
        >
          Send
        </button>
      </div>
    </div>
  )
}

export default CopilotChat