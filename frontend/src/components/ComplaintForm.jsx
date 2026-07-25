import { useSelector, useDispatch } from 'react-redux'
import { setComplaintFields } from '../store/complaintSlice'
import { useState } from 'react'

function ComplaintForm() {
  const complaint = useSelector((state) => state.complaint)
  const dispatch = useDispatch()
  const [saving, setSaving] = useState(false)

const handleCommit = async () => {
    setSaving(true)
    try {
      const { id, created_at, ...rest } = complaint
      const payload = { ...rest, status: 'Committed' }

      // Run duplicate check first (only for brand new complaints, not edits to already-saved ones)
      if (!id) {
        const dupResponse = await fetch('http://127.0.0.1:8000/copilot/check-duplicate', {
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
        response = await fetch(`http://127.0.0.1:8000/complaints/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      } else {
        response = await fetch('http://127.0.0.1:8000/complaints', {
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

  return (
    <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0 }}>Log Customer Complaint</h2>
          <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>API & FDF Quality Assurance Module</p>
        </div>
        <span style={{ background: '#fef3c7', color: '#92400e', padding: '4px 12px', borderRadius: '12px', fontSize: '12px' }}>
          {complaint.status}
        </span>
      </div>

      <h4 style={{ marginTop: '24px', color: '#999', fontSize: '12px', letterSpacing: '1px' }}>1. ORIGIN & CUSTOMER DETAILS</h4>
      <div style={{ display: 'flex', gap: '16px' }}>
        <FormField label="Complaint Source" value={complaint.complaint_source} />
        <FormField label="Customer Name" value={complaint.customer_name} />
      </div>

      <h4 style={{ marginTop: '24px', color: '#999', fontSize: '12px', letterSpacing: '1px' }}>2. PRODUCT & BATCH IDENTIFICATION</h4>
      <div style={{ display: 'flex', gap: '16px' }}>
        <FormField label="Product Name" value={complaint.product_name} />
        <FormField label="Product Strength/Grade" value={complaint.product_strength} />
      </div>
      <div style={{ display: 'flex', gap: '16px' }}>
        <FormField label="Batch/Lot Number" value={complaint.batch_lot_number} />
        <FormField label="Affected Quantity" value={complaint.affected_quantity} />
      </div>
      <div style={{ display: 'flex', gap: '16px' }}>
        <FormField label="Manufacturing Date" value={complaint.manufacturing_date} />
        <FormField label="Expiry Date" value={complaint.expiry_date} />
      </div>

      <h4 style={{ marginTop: '24px', color: '#999', fontSize: '12px', letterSpacing: '1px' }}>3. FACILITY & MATERIAL IMPACT</h4>
      <div style={{ display: 'flex', gap: '16px' }}>
        <FormField label="Originating Site Block" value={complaint.originating_site_block} />
        <FormField label="Impacted Non-Product Materials (NPM)" value={complaint.impacted_npm} />
      </div>

      <h4 style={{ marginTop: '24px', color: '#999', fontSize: '12px', letterSpacing: '1px' }}>4. DEFECT ANALYSIS</h4>
      <FormField label="Complaint Category" value={complaint.complaint_category} />
      <FormField label="Complaint Description" value={complaint.complaint_description} multiline />

      <h4 style={{ marginTop: '24px', color: '#6366f1', fontSize: '12px', letterSpacing: '1px' }}>AI COPILOT RISK ASSESSMENT</h4>
      <div style={{ display: 'flex', gap: '16px' }}>
        <FormField label="Severity (Suggested)" value={complaint.severity} />
        <FormField label="Suggested Next Action" value={complaint.suggested_next_action} />
      </div>
      <FormField label="Initial Risk Assessment" value={complaint.initial_risk_assessment} multiline />

      <button
        onClick={handleCommit}
        disabled={saving || !complaint.product_name}
        style={{
          marginTop: '24px',
          marginBottom: '24px',
          padding: '12px 24px',
          background: complaint.product_name ? '#16a34a' : '#ccc',
          color: '#fff',
          border: 'none',
          borderRadius: '8px',
          cursor: complaint.product_name ? 'pointer' : 'not-allowed',
          fontSize: '14px',
          fontWeight: 600,
        }}
      >
        {saving ? 'Saving...' : 'Commit to QMS Ledger'}
      </button>
    </div>
  )
}

function FormField({ label, value, multiline }) {
  return (
    <div style={{ flex: 1, marginTop: '12px' }}>
      <label style={{ display: 'block', fontSize: '13px', marginBottom: '4px', fontWeight: 500 }}>{label}</label>
      {multiline ? (
        <textarea
          readOnly
          value={value || ''}
          placeholder="Awaiting AI extraction..."
          rows={3}
          style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px', fontFamily: 'inherit', resize: 'vertical' }}
        />
      ) : (
        <input
          readOnly
          value={value || ''}
          placeholder="Awaiting AI extraction..."
          style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px', fontFamily: 'inherit' }}
        />
      )}
    </div>
  )
}

export default ComplaintForm