import { useSelector } from 'react-redux'

function App() {
  const complaint = useSelector((state) => state.complaint)

  return (
    <div style={{ padding: "20px" }}>
      <h1>AIVOA Complaint System</h1>
      <p>Status: {complaint.status}</p>
    </div>
  )
}

export default App