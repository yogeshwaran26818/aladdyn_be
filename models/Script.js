import mongoose from 'mongoose'

const scriptSchema = new mongoose.Schema({
  shopify_domain: {
    type: String,
    required: true
  },
  script_content: {
    type: String,
    required: true
  },
  script_url: {
    type: String,
    required: true
  },
  script_tag_id: {
    type: String
  },
  injection_method: {
    type: String,
    enum: ['script_tag', 'theme_injection'],
    default: 'script_tag'
  },
  is_active: {
    type: Boolean,
    default: true
  },
  generated_at: {
    type: Date,
    default: Date.now
  },
  last_updated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
})

export default mongoose.model('Script', scriptSchema)