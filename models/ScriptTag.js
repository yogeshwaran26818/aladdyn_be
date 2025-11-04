import mongoose from 'mongoose'

const scriptTagSchema = new mongoose.Schema({
  shopify_domain: {
    type: String,
    required: true,
    index: true
  },
  script_tag_id: {
    type: String,
    required: true
  },
  script_url: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'error'],
    default: 'active'
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
})

export default mongoose.model('ScriptTag', scriptTagSchema)