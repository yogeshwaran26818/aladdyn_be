import mongoose from 'mongoose'

const shopSchema = new mongoose.Schema({
  shopify_domain: {
    type: String,
    required: true,
    unique: true
  },
  shopify_access_token: {
    type: String,
    required: true
  },
  storefront_access_token: {
    type: String
  },
  customer_account_client_id: {
    type: String
  },
  customer_account_client_secret: {
    type: String
  }
}, {
  timestamps: true
})

export default mongoose.model('Shop', shopSchema)