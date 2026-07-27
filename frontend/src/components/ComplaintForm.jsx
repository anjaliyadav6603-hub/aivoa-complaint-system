import { useSelector, useDispatch } from 'react-redux'
import { setComplaintFields } from '../store/complaintSlice'
import { useEffect, useState } from 'react'
import './ComplaintForm.css'

const API_URL = import.meta.env.VITE_API_URL

function ComplaintForm() {
  const complaint = useSelector((state) => state.complaint)
  const dispatch = useDispatch()
  const [saving, setSaving] = useState(false)
  const [completeness, setCompleteness] = useState(null)

  useEffect(() => {
    if (!complaint.product_name) return
    let isCurrent = true

    const checkCompleteness = async () => {
      try {
        const response = await fetch(`${API_URL}/copilot/check-completeness`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ complaint }),
        })
        const data = await response.json()
        if (isCurrent) setCompleteness(data)
      } catch (err) {
        // silent fail
      }
    }

    checkCompleteness()
    return () => { isCurrent = false }
  }, [complaint])

  const handleCommit = async () => {
    setSaving(true)
    try {
      const { id, created_at, ...rest } = complaint
      const payload = { ...rest, status: 'Committed' }

      if (!id) {
        const dupResponse = await fetch(`${API_URL}/copilot/check-duplicate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ new_complaint: payload }),
        })
        const dupResult = await dupResponse.json()

        if (dupResult.is_duplicate) {
          const proceed = confirm(
            `⚠️ Possible duplicate detected!\n\n${dupResult.reason}\n\nThis looks similar to complaint #${dupResult.duplicate_of_id}. Do you want to save it anyway?`
          )
          if (!proceed) {
            setSaving(false)
            return
          }
        }
      }

      let response
      if (id) {
        response = await fetch(`${API_URL}/complaints/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      } else {
        response = await fetch(`${API_URL}/complaints`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      }

      if (!response.ok) throw new Error('Save failed')
      const saved = await response.json()
      dispatch(setComplaintFields(saved))
    } catch (err) {
      alert('Failed to save complaint. Check that the backend is running.')
    } finally {
      setSaving(false)
    }
  }

  const isCommitted = complaint.status === 'Committed'

  return (
    <div className="complaint-form">
      <div className="complaint-form__header">
        <div>
          <h2 className="complaint-form__title">Log Customer Complaint</h2>
          <p className="complaint-form__subtitle">API & FDF Quality Assurance Module</p>
        </div>
        <span className={`complaint-form__status ${isCommitted ? 'complaint-form__status--committed' : ''}`}>
          {complaint.status}
        </span>
      </div>

      <div className="section">
        <h4 className="section__eyebrow">1. Origin & Customer Details</h4>
        <div className="field-row">
          <Field label="Complaint Source" value={complaint.complaint_source} />
          <Field label="Customer Name" value={complaint.customer_name} />
        </div>
      </div>

      <div className="section">
        <h4 className="section__eyebrow">2. Product & Batch Identification</h4>
        <div className="field-row">
          <Field label="Product Name" value={complaint.product_name} />
          <Field label="Product Strength/Grade" value={complaint.product_strength} />
        </div>
        <div className="field-row">
          <Field label="Batch/Lot Number" value={complaint.batch_lot_number} />
          <Field label="Affected Quantity" value={complaint.affected_quantity} />
        </div>
        <div className="field-row">
          <Field label="Manufacturing Date" value={complaint.manufacturing_date} />
          <Field label="Expiry Date" value={complaint.expiry_date} />
        </div>
      </div>

      <div className="section">
        <h4 className="section__eyebrow">3. Facility & Material Impact</h4>
        <div className="field-row">
          <Field label="Originating Site Block" value={complaint.originating_site_block} />
          <Field label="Impacted Non-Product Materials (NPM)" value={complaint.impacted_npm} />
        </div>
      </div>

      <div className="section">
        <h4 className="section__eyebrow">4. Defect Analysis</h4>
        <Field label="Complaint Category" value={complaint.complaint_category} />
        <Field label="Complaint Description" value={complaint.complaint_description} multiline />
      </div>

      <div className="section section--ai">
        <h4 className="section__eyebrow">AI Copilot Risk Assessment</h4>
        <div className="field-row">
          <Field label="Severity (Suggested)" value={complaint.severity} />
          <Field label="Suggested Next Action" value={complaint.suggested_next_action} />
        </div>
        <Field label="Initial Risk Assessment" value={complaint.initial_risk_assessment} multiline />
      </div>

      {completeness && (
        <div className={`completeness-box ${completeness.is_complete ? 'completeness-box--ok' : 'completeness-box--warn'}`}>
          {completeness.is_complete ? (
            <span>✓ Complaint record is complete.</span>
          ) : (
            <div>
              <strong>⚠ Missing fields:</strong> {completeness.missing_fields.join(', ')}
              {completeness.notes && <div className="completeness-box__note">{completeness.notes}</div>}
            </div>
          )}
        </div>
      )}

      <button className="commit-btn" onClick={handleCommit} disabled={saving || !complaint.product_name}>
        {saving ? 'Saving...' : 'Commit to QMS Ledger'}
      </button>
    </div>
  )
}

function Field({ label, value, multiline }) {
  return (
    <div className="field">
      <label className="field__label">{label}</label>
      {multiline ? (
        <textarea className="field__textarea" readOnly value={value || ''} placeholder="Awaiting AI extraction..." rows={3} />
      ) : (
        <input className="field__input" readOnly value={value || ''} placeholder="Awaiting AI extraction..." />
      )}
    </div>
  )
}

export default ComplaintForm