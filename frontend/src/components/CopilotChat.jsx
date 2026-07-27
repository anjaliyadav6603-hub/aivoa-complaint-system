import { useState, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { setComplaintFields } from '../store/complaintSlice'
import './CopilotChat.css'

const API_URL = import.meta.env.VITE_API_URL

function CopilotChat() {
  const dispatch = useDispatch()
  const complaint = useSelector((state) => state.complaint)
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'Ready to process new complaints. Paste a complaint or upload a file.' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef(null)

  const hasExistingComplaint = Boolean(complaint.product_name)

  const handleSend = async () => {
    if (!input.trim() || loading) return
    const userMessage = input
    setMessages((prev) => [...prev, { role: 'user', text: userMessage }])
    setInput('')
    setLoading(true)

    try {
      const response = await fetch(`${API_URL}/copilot/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          current_complaint: hasExistingComplaint ? complaint : null,
        }),
      })
      if (!response.ok) throw new Error('Backend error')
      const data = await response.json()
      dispatch(setComplaintFields({ ...data.fields, status: 'Ready to Commit' }))
      setMessages((prev) => [...prev, { role: 'assistant', text: data.reply }])
    } catch (err) {
      setMessages((prev) => [...prev, { role: 'assistant', text: 'Sorry, something went wrong connecting to the backend.' }])
    } finally {
      setLoading(false)
    }
  }

  const handleFileSelect = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setMessages((prev) => [...prev, { role: 'user', text: `📄 ${file.name}` }])
    setLoading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)
      const response = await fetch(`${API_URL}/copilot/upload-document`, {
        method: 'POST',
        body: formData,
      })
      if (!response.ok) throw new Error('Upload failed')
      const data = await response.json()
      dispatch(setComplaintFields({ ...data.fields, status: 'Ready to Commit' }))
      setMessages((prev) => [...prev, { role: 'assistant', text: data.reply }])
    } catch (err) {
      setMessages((prev) => [...prev, { role: 'assistant', text: 'Sorry, something went wrong processing that file.' }])
    } finally {
      setLoading(false)
      e.target.value = null
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSend()
  }

  return (
    <div className="copilot-chat">
      <h3 className="copilot-chat__title">AIVOA Copilot</h3>
      <p className="copilot-chat__subtitle">Drop complaint files or paste text below.</p>

      <div className="copilot-chat__messages">
        {messages.map((msg, i) => (
          <div key={i} className={`bubble ${msg.role === 'user' ? 'bubble--user' : 'bubble--assistant'}`}>
            {msg.text}
          </div>
        ))}
        {loading && <div className="thinking-indicator">AI is thinking...</div>}
      </div>

      <div className="copilot-chat__input-row">
        <input type="file" accept=".pdf" ref={fileInputRef} onChange={handleFileSelect} style={{ display: 'none' }} />
        <button className="attach-btn" onClick={() => fileInputRef.current.click()} disabled={loading} title="Upload PDF">
          📎
        </button>
        <input
          className="text-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message or paste a complaint..."
          disabled={loading}
        />
        <button className="send-btn" onClick={handleSend} disabled={loading}>
          Send
        </button>
      </div>
    </div>
  )
}

export default CopilotChat