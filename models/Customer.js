import mongoose from 'mongoose'

const customerSchema = new mongoose.Schema({
  shopify_domain: {
    type: String,
    required: true
  },
  customer_email: {
    type: String,
    required: true
  },
  customer_access_token: {
    type: String,
    required: true
  },
  customer_id: {
    type: String
  },
  session_id: {
    type: String
  }
}, {
  timestamps: true
})

customerSchema.index({ shopify_domain: 1, customer_email: 1 }, { unique: true })

export default mongoose.model('Customer', customerSchema)