import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  id: null,
  complaint_source: '',
  customer_name: '',
  product_name: '',
  product_strength: '',
  batch_lot_number: '',
  affected_quantity: '',
  manufacturing_date: '',
  expiry_date: '',
  originating_site_block: '',
  impacted_npm: '',
  complaint_category: '',
  complaint_description: '',
  severity: '',
  suggested_next_action: '',
  initial_risk_assessment: '',
  status: 'Pending Triage',
}

const complaintSlice = createSlice({
  name: 'complaint',
  initialState,
  reducers: {
    setComplaintFields: (state, action) => {
      return { ...state, ...action.payload }
    },
    resetComplaint: () => initialState,
  },
})

export const { setComplaintFields, resetComplaint } = complaintSlice.actions
export default complaintSlice.reducer