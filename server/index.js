import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import mongoose from 'mongoose'
import path from 'path'
import { fileURLToPath } from 'url'
import Shop from '../models/Shop.js'
import Customer from '../models/Customer.js'
import Script from '../models/Script.js'



const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000

// Middleware
app.use(cors())
app.use(express.json())

// MongoDB connection - optimized for serverless
// Cache the connection for serverless functions
let cached = global.mongoose

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null }
}

async function connectDB() {
  if (cached.conn) {
    return cached.conn
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    }

    cached.promise = mongoose.connect(process.env.MONGODB_URI, opts).then((mongoose) => {
      console.log('Connected to MongoDB')
      return mongoose
    })
  }

  try {
    cached.conn = await cached.promise
  } catch (e) {
    cached.promise = null
    throw e
  }

  return cached.conn
}

// Connect to MongoDB
connectDB().catch(err => console.error('MongoDB connection error:', err))

// Exchange authorization code for access token
const exchangeCodeForToken = async (code, shop) => {
  const response = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: process.env.VITE_SHOPIFY_API_KEY,
      client_secret: process.env.SHOPIFY_API_SECRET,
      code: code,
    }),
  })

  if (!response.ok) {
    throw new Error('Failed to exchange code for token')
  }

  return await response.json()
}



// Fetch shop info from Shopify
const fetchShopInfo = async (shop, accessToken) => {
  const response = await fetch(`https://${shop}/admin/api/2025-07/shop.json`, {
    headers: {
      'X-Shopify-Access-Token': accessToken,
    },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch shop info')
  }

  return await response.json()
}

// Fetch products from Shopify using GraphQL
const fetchProducts = async (shop, accessToken) => {
  const query = `
    query getProducts($first: Int!) {
      products(first: $first) {
        edges {
          node {
            id
            title
            vendor
            status
            featuredImage {
              url
            }
            variants(first: 10) {
              edges {
                node {
                  id
                  price
                  inventoryQuantity
                  inventoryPolicy
                }
              }
            }
            totalInventory
          }
        }
      }
    }
  `

  const response = await fetch(`https://${shop}/admin/api/2025-07/graphql.json`, {
    method: 'POST',
    headers: {
      'X-Shopify-Access-Token': accessToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      variables: { first: 50 }
    })
  })

  if (!response.ok) {
    throw new Error('Failed to fetch products')
  }

  const data = await response.json()

  // Transform GraphQL response to match REST format
  const products = data.data.products.edges.map(edge => ({
    id: edge.node.id,
    title: edge.node.title,
    vendor: edge.node.vendor,
    status: edge.node.status,
    totalInventory: edge.node.totalInventory,
    image: edge.node.featuredImage ? { src: edge.node.featuredImage.url } : null,
    variants: edge.node.variants.edges.map(variantEdge => ({
      id: variantEdge.node.id,
      price: variantEdge.node.price,
      inventoryQuantity: variantEdge.node.inventoryQuantity,
      inventoryPolicy: variantEdge.node.inventoryPolicy
    }))
  }))

  return { products }
}

// Fetch customers from Shopify
const fetchCustomers = async (shop, accessToken) => {
  const response = await fetch(`https://${shop}/admin/api/2025-07/customers.json?limit=50`, {
    headers: {
      'X-Shopify-Access-Token': accessToken,
    },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch customers')
  }

  return await response.json()
}

// Fetch all orders
const fetchAllOrders = async (shop, accessToken) => {
  const response = await fetch(`https://${shop}/admin/api/2025-07/orders.json?status=any&limit=50`, {
    headers: {
      'X-Shopify-Access-Token': accessToken,
    },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch orders')
  }

  return await response.json()
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() })
})

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({
    message: 'Server is working',
    env: {
      hasApiKey: !!process.env.VITE_SHOPIFY_API_KEY,
      hasApiSecret: !!process.env.SHOPIFY_API_SECRET,
      hasMongoUri: !!process.env.MONGODB_URI
    }
  })
})

// Routes
app.get('/api/auth', async (req, res) => {
  try {
    console.log('Auth request received:', req.query)
    const { code, shop, state } = req.query

    if (!code || !shop || !state) {
      console.log('Missing parameters:', { code: !!code, shop: !!shop, state: !!state })
      return res.status(400).json({ error: 'Missing required parameters' })
    }

    console.log('Exchanging code for token...')
    const tokenData = await exchangeCodeForToken(code, shop)
    console.log('Token received successfully')

    console.log('Saving to MongoDB...')
    const shopRecord = await Shop.findOneAndUpdate(
      { shopify_domain: shop },
      {
        shopify_domain: shop,
        shopify_access_token: tokenData.access_token
      },
      { upsert: true, new: true }
    )
    console.log('Shop saved successfully')



    // Auto-inject widget after successful installation using ScriptTag API
    try {
      console.log('Auto-injecting widget via ScriptTag API...')
      const baseUrl = process.env.NODE_ENV === 'production' 
        ? 'https://aladdynbe-production.up.railway.app'
        : `http://localhost:${PORT}`
      
      const scriptUrl = `${baseUrl}/chatbot-widget.js?shop=${shop}&api=${baseUrl}`
      
      // Create ScriptTag for automatic widget injection
      const scriptTagResponse = await fetch(`https://${shop}/admin/api/2025-07/script_tags.json`, {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': tokenData.access_token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          script_tag: {
            event: 'onload',
            src: scriptUrl,
            display_scope: 'online_store'
          }
        })
      })

      if (scriptTagResponse.ok) {
        const scriptTagData = await scriptTagResponse.json()
        
        // Store script in database
        await Script.findOneAndUpdate(
          { shopify_domain: shop },
          {
            shopify_domain: shop,
            script_content: `<script src="${scriptUrl}" defer></script>`,
            script_url: scriptUrl,
            script_tag_id: scriptTagData.script_tag.id,
            injection_method: 'script_tag',
            is_active: true,
            generated_at: new Date(),
            last_updated: new Date()
          },
          { upsert: true, new: true }
        )
        
        // Update shop record with script tag info
        await Shop.findOneAndUpdate(
          { shopify_domain: shop },
          { 
            widget_injected: true, 
            widget_injected_at: new Date(),
            script_tag_id: scriptTagData.script_tag.id
          },
          { new: true }
        )

        console.log('Widget ScriptTag created and stored in DB:', scriptTagData.script_tag.id)
      } else {
        console.error('ScriptTag creation failed:', await scriptTagResponse.text())
        
        // Fallback to theme injection
        console.log('Falling back to theme injection...')
        await injectWidgetIntoTheme(shop, tokenData.access_token, baseUrl)
        
        // Store theme injection script in database
        await Script.findOneAndUpdate(
          { shopify_domain: shop },
          {
            shopify_domain: shop,
            script_content: `<script src="${scriptUrl}" defer></script>`,
            script_url: scriptUrl,
            injection_method: 'theme_injection',
            is_active: true,
            generated_at: new Date(),
            last_updated: new Date()
          },
          { upsert: true, new: true }
        )
      }
    } catch (widgetError) {
      console.error('Widget auto-injection failed:', widgetError)
      // Don't fail the installation if widget injection fails
    }

    console.log('Redirecting to frontend...')
    res.redirect(`${process.env.APP_URL || 'http://localhost:3000'}/shopify/callback?shop=${shop}&success=true`)
  } catch (error) {
    console.error('Auth error:', error)
    const errorMessage = encodeURIComponent(error.message)
    res.redirect(`${process.env.APP_URL || 'http://localhost:3000'}/shopify/callback?error=${errorMessage}`)
  }
})

app.post('/api/shop-info', async (req, res) => {
  try {
    const { shop } = req.body

    if (!shop) {
      return res.status(400).json({ error: 'Shop domain required' })
    }

    // Get access token from database
    const shopRecord = await Shop.findOne({ shopify_domain: shop })
    if (!shopRecord) {
      return res.status(404).json({ error: 'Shop not found' })
    }

    // Fetch shop info, products, customers, and orders
    const [shopInfo, productsData, customersData, ordersData] = await Promise.all([
      fetchShopInfo(shop, shopRecord.shopify_access_token),
      fetchProducts(shop, shopRecord.shopify_access_token),
      fetchCustomers(shop, shopRecord.shopify_access_token),
      fetchAllOrders(shop, shopRecord.shopify_access_token)
    ])

    // Debug: Log first order to see structure
    if (ordersData.orders && ordersData.orders.length > 0) {
      console.log('First order structure:', JSON.stringify(ordersData.orders[0], null, 2))
    }

    res.json({
      shop: shopInfo.shop,
      products: productsData.products,
      customers: customersData.customers,
      orders: ordersData.orders
    })
  } catch (error) {
    console.error('Shop info error:', error)
    res.status(500).json({ error: error.message })
  }
})

























// Serve chatbot widget script
app.get('/chatbot-widget.js', (req, res) => {
  const { shop } = req.query
  
  const widgetScript = `
(function() {
  // Create chatbot widget
  const widget = document.createElement('div');
  widget.id = 'aladdyn-chatbot-widget';
  widget.style.cssText = \`
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 60px;
    height: 60px;
    background: #007cba;
    border-radius: 50%;
    cursor: pointer;
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 24px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    transition: all 0.3s ease;
  \`;
  
  widget.innerHTML = '💬';
  
  // Add hover effect
  widget.addEventListener('mouseenter', () => {
    widget.style.transform = 'scale(1.1)';
  });
  
  widget.addEventListener('mouseleave', () => {
    widget.style.transform = 'scale(1)';
  });
  
  // Add click handler
  widget.addEventListener('click', () => {
    alert('Chatbot clicked! Shop: ${shop}');
  });
  
  // Append to body when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      document.body.appendChild(widget);
    });
  } else {
    document.body.appendChild(widget);
  }
  
  console.log('Aladdyn Chatbot Widget loaded for shop:', '${shop}');
})();
  `
  
  res.setHeader('Content-Type', 'application/javascript')
  res.send(widgetScript)
})

// Customer Authentication - Initiate login
app.get('/api/customer-auth/login', async (req, res) => {
  try {
    const { shop, return_url } = req.query

    if (!shop) {
      return res.status(400).json({ error: 'Shop parameter required' })
    }

    // Get shop record
    const shopRecord = await Shop.findOne({ shopify_domain: shop })
    if (!shopRecord) {
      return res.status(404).json({ error: 'Shop not found' })
    }

    // Check if Customer Account API is configured
    if (shopRecord.customer_account_client_id && shopRecord.customer_account_client_secret) {
      // ✅ Customer Account API is configured - Use OAuth flow
      // This URL will work and exchange tokens properly
      console.log(`✅ Using Customer Account API OAuth flow for shop: ${shop}`)

      // Generate state for OAuth security
      const state = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)

      // Customer Account API OAuth URL
      const clientId = shopRecord.customer_account_client_id
      const redirectUri = encodeURIComponent(`${req.protocol}://${req.get('host')}/api/customer-auth/callback`)
      const scopes = 'openid email https://api.shopify.com/auth/customer.graphql'

      // This URL will work IF Customer Account API app is registered in Shopify
      const authUrl = `https://shopify.com/myshopify/customer_account/oauth/authorize?client_id=${clientId}&scope=${scopes}&redirect_uri=${redirectUri}&state=${state}&shop=${encodeURIComponent(shop)}`

      console.log(`   OAuth URL: ${authUrl}`)
      console.log(`   Redirect URI: ${req.protocol}://${req.get('host')}/api/customer-auth/callback`)

      res.redirect(authUrl)
    } else {
      // ❌ Customer Account API NOT configured - Use store login (limited functionality)
      // NOTE: Store login doesn't provide OAuth tokens, so we can't exchange for API access
      // This is a fallback that just redirects to store login page
      console.log(`⚠️ Customer Account API not configured. Redirecting to store login page.`)
      console.log(`   ⚠️ NOTE: Store login won't provide API tokens for token exchange.`)

      // Redirect to store's customer login page
      const returnUrl = return_url || encodeURIComponent(`${req.protocol}://${req.get('host')}/chat`)
      const storeLoginUrl = `https://${shop}/account/login?return_url=${returnUrl}`

      console.log(`   Store login URL: ${storeLoginUrl}`)

      res.redirect(storeLoginUrl)
    }
  } catch (error) {
    console.error('Customer auth login error:', error)
    res.status(500).json({ error: 'Failed to initiate login' })
  }
})

// Customer Authentication - OAuth Callback
// This endpoint receives the authorization code from Shopify after user logs in
app.get('/api/customer-auth/callback', async (req, res) => {
  try {
    const { code, state, shop } = req.query

    if (!code) {
      return res.status(400).json({ error: 'Missing authorization code' })
    }

    // Extract shop parameter from query
    // Shopify should include shop parameter in the callback URL
    const shopParam = shop

    if (!shopParam) {
      console.error('❌ Shop parameter missing in callback')
      return res.status(400).send(`
        <html>
          <body style="font-family: sans-serif; padding: 20px;">
            <h2>Error</h2>
            <p>Shop parameter is required but was not provided.</p>
            <p>The shop parameter should be included in the authorization URL.</p>
          </body>
        </html>
      `)
    }

    console.log(`📥 Received callback with authorization code`)
    console.log(`   Shop: ${shopParam}`)
    console.log(`   Authorization code received: ${code.substring(0, 20)}...`)

    // Get shop record
    const shopRecord = await Shop.findOne({ shopify_domain: shopParam })
    if (!shopRecord || !shopRecord.customer_account_client_id || !shopRecord.customer_account_client_secret) {
      return res.status(404).json({ error: 'Customer Account API not configured' })
    }

    // Exchange authorization code for access token
    // This is the token exchange between Shopify store and our backend
    console.log(`🔄 Exchanging authorization code for access token...`)
    console.log(`   Shop: ${shopParam}`)
    console.log(`   Client ID: ${shopRecord.customer_account_client_id}`)

    const tokenResponse = await fetch('https://shopify.com/myshopify/customer_account/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        client_id: shopRecord.customer_account_client_id,
        client_secret: shopRecord.customer_account_client_secret,
        code: code,
        redirect_uri: `${req.protocol}://${req.get('host')}/api/customer-auth/callback`
      })
    })

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text()
      console.error('❌ Token exchange error:', errorData)
      throw new Error('Failed to exchange authorization code')
    }

    const tokenData = await tokenResponse.json()
    console.log(`✅ Token exchange successful!`)
    console.log(`   Access token received: ${tokenData.access_token ? tokenData.access_token.substring(0, 20) + '...' : 'N/A'}`)

    // Get customer information using the access token
    const customerInfoResponse = await fetch(`https://customeraccount.shopify.com/customer/api/2024-07/graphql.json`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: `query {
          customer {
            id
            email
            firstName
            lastName
          }
        }`
      })
    })

    let customerEmail = 'unknown@example.com'
    let customerId = null

    if (customerInfoResponse.ok) {
      const customerData = await customerInfoResponse.json()
      customerEmail = customerData.data?.customer?.email || customerEmail
      customerId = customerData.data?.customer?.id || null
    }

    // Store customer token in database
    const customerRecord = await Customer.findOneAndUpdate(
      {
        shopify_domain: shopParam,
        customer_email: customerEmail
      },
      {
        shopify_domain: shopParam,
        customer_email: customerEmail,
        customer_access_token: tokenData.access_token,
        customer_id: customerId,
        session_id: tokenData.session_id || null
      },
      { upsert: true, new: true }
    )

    console.log(`✅ Customer token stored successfully for ${customerEmail} at shop ${shopParam}`)
    console.log(`📝 Token: ${tokenData.access_token.substring(0, 20)}...`)
    console.log(`🆔 Customer ID: ${customerId}`)

    // Show success page instead of redirecting (user will handle redirect manually)
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Login Successful</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          }
          .container {
            background: white;
            border-radius: 16px;
            padding: 40px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            text-align: center;
            max-width: 500px;
            width: 90%;
          }
          .success-icon {
            width: 80px;
            height: 80px;
            background: #10b981;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 20px;
          }
          .success-icon svg {
            width: 50px;
            height: 50px;
            color: white;
          }
          h1 {
            color: #1f2937;
            margin: 0 0 10px 0;
            font-size: 28px;
          }
          .email {
            color: #6b7280;
            font-size: 16px;
            margin: 10px 0 30px 0;
          }
          .message {
            background: #f0fdf4;
            border: 2px solid #10b981;
            border-radius: 8px;
            padding: 20px;
            color: #065f46;
            margin: 20px 0;
            font-size: 14px;
          }
          .details {
            background: #f9fafb;
            border-radius: 8px;
            padding: 15px;
            margin: 20px 0;
            text-align: left;
            font-size: 12px;
            color: #6b7280;
          }
          .details strong {
            color: #1f2937;
          }
          .back-button {
            background: #7c3aed;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            margin-top: 20px;
            transition: background 0.2s;
          }
          .back-button:hover {
            background: #6d28d9;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="success-icon">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
          </div>
          <h1>Successfully Logged In!</h1>
          <p class="email">${customerEmail}</p>
          <div class="message">
            ✅ Your account has been successfully authenticated.<br>
            📝 Your access token has been securely stored.
            </div>
          <div class="details">
            <strong>Token Exchange Details:</strong><br>
            Shop: ${shopParam}<br>
            Customer ID: ${customerId || 'N/A'}<br>
            Status: Token stored in database
          </div>
          <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
            You can now close this window and return to the chat.
          </p>
          <button class="back-button" onclick="window.close()">Close Window</button>
        </div>
      </body>
      </html>
    `)
  } catch (error) {
    console.error('Customer auth callback error:', error)
    res.status(500).send(`<html><body><h2>Login Failed</h2><p>${error.message}</p><p><a href="/chat">Return to Chat</a></p></body></html>`)
  }
})

// Create Storefront Access Token
app.post('/api/create-storefront-token', async (req, res) => {
  try {
    const { shop } = req.body

    if (!shop) {
      return res.status(400).json({ success: false, error: 'Shop domain required' })
    }

    // Get admin access token
    const shopRecord = await Shop.findOne({ shopify_domain: shop })
    if (!shopRecord) {
      return res.status(404).json({ success: false, error: 'Shop not found' })
    }

    // Create Storefront Access Token using Admin API
    const response = await fetch(`https://${shop}/admin/api/2025-07/graphql.json`, {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': shopRecord.shopify_access_token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: `
          mutation StorefrontAccessTokenCreate($input: StorefrontAccessTokenInput!) {
            storefrontAccessTokenCreate(input: $input) {
              userErrors {
                field
                message
              }
              shop {
                id
              }
              storefrontAccessToken {
                accessScopes {
                  handle
                }
                accessToken
                title
              }
            }
          }
        `,
        variables: {
          input: {
            title: 'Chatbot Storefront Access Token'
          }
        }
      })
    })

    const result = await response.json()

    if (result.data?.storefrontAccessTokenCreate?.storefrontAccessToken) {
      const storefrontToken = result.data.storefrontAccessTokenCreate.storefrontAccessToken.accessToken

      // Store the storefront token
      await Shop.findOneAndUpdate(
        { shopify_domain: shop },
        {
          storefront_access_token: storefrontToken
        },
        { upsert: false, new: true }
      )

      res.json({
        success: true,
        storefrontToken,
        message: 'Storefront access token created and stored'
      })
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to create storefront token',
        details: result.data?.storefrontAccessTokenCreate?.userErrors
      })
    }
  } catch (error) {
    console.error('Create storefront token error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Store customer auth credentials
app.post('/api/store-customer-auth', async (req, res) => {
  try {
    const { shop, customer_account_client_id, customer_account_client_secret } = req.body

    if (!shop || !customer_account_client_id || !customer_account_client_secret) {
      return res.status(400).json({ success: false, error: 'All fields required' })
    }

    await Shop.findOneAndUpdate(
      { shopify_domain: shop },
      { customer_account_client_id, customer_account_client_secret },
      { upsert: false, new: true }
    )

    res.json({ success: true, message: 'Customer auth credentials stored' })
  } catch (error) {
    console.error('Store customer auth error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Fallback theme injection function
async function injectWidgetIntoTheme(shop, accessToken, baseUrl) {
  try {
    // Get the main theme
    const themesResponse = await fetch(`https://${shop}/admin/api/2025-07/themes.json`, {
      headers: {
        'X-Shopify-Access-Token': accessToken
      }
    })

    const themesData = await themesResponse.json()
    const mainTheme = themesData.themes.find(theme => theme.role === 'main')

    if (mainTheme) {
      // Get theme.liquid file
      const themeFileResponse = await fetch(`https://${shop}/admin/api/2025-07/themes/${mainTheme.id}/assets.json?asset[key]=layout/theme.liquid`, {
        headers: {
          'X-Shopify-Access-Token': accessToken
        }
      })

      const themeFileData = await themeFileResponse.json()
      let themeContent = themeFileData.asset.value

      // Check if widget is not already injected
      if (!themeContent.includes('aladdyn-widget')) {
        const widgetScript = `
<!-- Aladdyn Chatbot Widget -->
<script>
  window.Shopify = window.Shopify || {};
  {% if customer %}
    window.Shopify.customer = {
      id: {{ customer.id | json }},
      email: {{ customer.email | json }},
      first_name: {{ customer.first_name | json }},
      last_name: {{ customer.last_name | json }}
    };
  {% endif %}
  {% if cart %}
    window.Shopify.cart = {
      token: {{ cart.token | json }},
      item_count: {{ cart.item_count | json }}
    };
  {% endif %}
</script>
<script src="${baseUrl}/widget.js?shop=${shop}&api=${baseUrl}" defer></script>
<!-- End Aladdyn Chatbot Widget -->`

        // Inject before closing </body> tag
        themeContent = themeContent.replace('</body>', `${widgetScript}
</body>`)

        // Update theme file
        await fetch(`https://${shop}/admin/api/2025-07/themes/${mainTheme.id}/assets.json`, {
          method: 'PUT',
          headers: {
            'X-Shopify-Access-Token': accessToken,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            asset: {
              key: 'layout/theme.liquid',
              value: themeContent
            }
          })
        })

        console.log('Widget injected into theme successfully')
      }
    }
  } catch (error) {
    console.error('Theme injection error:', error)
    throw error
  }
}

// Inject widget script into shop theme
app.post('/api/inject-widget', async (req, res) => {
  try {
    const { shop } = req.body

    if (!shop) {
      return res.status(400).json({ success: false, error: 'Shop domain required' })
    }

    const shopRecord = await Shop.findOne({ shopify_domain: shop })
    if (!shopRecord) {
      return res.status(404).json({ success: false, error: 'Shop not found' })
    }

    // Get the main theme
    const themesResponse = await fetch(`https://${shop}/admin/api/2025-07/themes.json`, {
      headers: {
        'X-Shopify-Access-Token': shopRecord.shopify_access_token
      }
    })

    const themesData = await themesResponse.json()
    const mainTheme = themesData.themes.find(theme => theme.role === 'main')

    if (!mainTheme) {
      return res.status(404).json({ success: false, error: 'Main theme not found' })
    }

    // Get theme.liquid file
    const themeFileResponse = await fetch(`https://${shop}/admin/api/2025-07/themes/${mainTheme.id}/assets.json?asset[key]=layout/theme.liquid`, {
      headers: {
        'X-Shopify-Access-Token': shopRecord.shopify_access_token
      }
    })

    const themeFileData = await themeFileResponse.json()
    let themeContent = themeFileData.asset.value

    // Check if widget is already injected
    if (themeContent.includes('aladdyn-widget')) {
      return res.json({ success: true, message: 'Widget already injected' })
    }

    // Create widget script tag
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://aladdynbe-production.up.railway.app'
      : `http://localhost:${PORT}`
    
    const widgetScript = `
<!-- Aladdyn Chatbot Widget -->
<script src="${baseUrl}/widget.js?shop=${shop}&api=${baseUrl}" defer></script>
<!-- End Aladdyn Chatbot Widget -->`

    // Inject before closing </body> tag
    themeContent = themeContent.replace('</body>', `${widgetScript}
</body>`)

    // Update theme file
    const updateResponse = await fetch(`https://${shop}/admin/api/2025-07/themes/${mainTheme.id}/assets.json`, {
      method: 'PUT',
      headers: {
        'X-Shopify-Access-Token': shopRecord.shopify_access_token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        asset: {
          key: 'layout/theme.liquid',
          value: themeContent
        }
      })
    })

    if (!updateResponse.ok) {
      throw new Error('Failed to update theme file')
    }

    // Update shop record
    await Shop.findOneAndUpdate(
      { shopify_domain: shop },
      { widget_injected: true, widget_injected_at: new Date() },
      { new: true }
    )

    res.json({ success: true, message: 'Widget injected successfully' })
  } catch (error) {
    console.error('Widget injection error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Remove widget script from shop theme
app.post('/api/remove-widget', async (req, res) => {
  try {
    const { shop } = req.body

    if (!shop) {
      return res.status(400).json({ success: false, error: 'Shop domain required' })
    }

    const shopRecord = await Shop.findOne({ shopify_domain: shop })
    if (!shopRecord) {
      return res.status(404).json({ success: false, error: 'Shop not found' })
    }

    // Get the main theme
    const themesResponse = await fetch(`https://${shop}/admin/api/2025-07/themes.json`, {
      headers: {
        'X-Shopify-Access-Token': shopRecord.shopify_access_token
      }
    })

    const themesData = await themesResponse.json()
    const mainTheme = themesData.themes.find(theme => theme.role === 'main')

    if (!mainTheme) {
      return res.status(404).json({ success: false, error: 'Main theme not found' })
    }

    // Get theme.liquid file
    const themeFileResponse = await fetch(`https://${shop}/admin/api/2025-07/themes/${mainTheme.id}/assets.json?asset[key]=layout/theme.liquid`, {
      headers: {
        'X-Shopify-Access-Token': shopRecord.shopify_access_token
      }
    })

    const themeFileData = await themeFileResponse.json()
    let themeContent = themeFileData.asset.value

    // Remove widget script
    const widgetRegex = /<!-- Aladdyn Chatbot Widget -->.*?<!-- End Aladdyn Chatbot Widget -->/gs
    themeContent = themeContent.replace(widgetRegex, '')

    // Update theme file
    const updateResponse = await fetch(`https://${shop}/admin/api/2025-07/themes/${mainTheme.id}/assets.json`, {
      method: 'PUT',
      headers: {
        'X-Shopify-Access-Token': shopRecord.shopify_access_token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        asset: {
          key: 'layout/theme.liquid',
          value: themeContent
        }
      })
    })

    if (!updateResponse.ok) {
      throw new Error('Failed to update theme file')
    }

    // Update shop record
    await Shop.findOneAndUpdate(
      { shopify_domain: shop },
      { widget_injected: false, widget_removed_at: new Date() },
      { new: true }
    )

    res.json({ success: true, message: 'Widget removed successfully' })
  } catch (error) {
    console.error('Widget removal error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Get stored script for shop
app.get('/api/script/:shop', async (req, res) => {
  try {
    const { shop } = req.params
    
    const script = await Script.findOne({ 
      shopify_domain: shop,
      is_active: true 
    })
    
    if (!script) {
      return res.status(404).json({ error: 'No active script found for this shop' })
    }
    
    res.json({
      success: true,
      script: {
        content: script.script_content,
        url: script.script_url,
        method: script.injection_method,
        generated_at: script.generated_at,
        script_tag_id: script.script_tag_id
      }
    })
  } catch (error) {
    console.error('Get script error:', error)
    res.status(500).json({ error: 'Failed to retrieve script' })
  }
})

// Serve widget.js file
app.get('/widget.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.sendFile(path.join(__dirname, '../public/widget.js'))
})

// Enhanced Chat API with MCP Integration
app.post('/api/chat/storefront', async (req, res) => {
  try {
    const { message, shop, customer, cart, session } = req.body

    if (!message || !shop) {
      return res.status(400).json({ error: 'Message and shop are required' })
    }

    // Get shop record
    const shopRecord = await Shop.findOne({ shopify_domain: shop })
    if (!shopRecord) {
      return res.status(404).json({ error: 'Shop not found' })
    }

    // Store chat session
    const chatSession = {
      shop: shop,
      message: message,
      customer: customer,
      cart: cart,
      session: session,
      timestamp: new Date()
    }

    console.log('Chat session:', JSON.stringify(chatSession, null, 2))

    // Process message with AI and MCP tools
    const aiResponse = await processMessageWithAI(message, shop, customer, cart, shopRecord)

    res.json({
      success: true,
      response: aiResponse.message,
      cartId: aiResponse.cartId || cart?.cartId,
      actions: aiResponse.actions || []
    })

  } catch (error) {
    console.error('Storefront chat error:', error)
    res.status(500).json({ error: 'Failed to process message' })
  }
})

// AI Processing with MCP Tools
async function processMessageWithAI(message, shop, customer, cart, shopRecord) {
  try {
    // Prepare context for AI
    const context = {
      shop: shop,
      customer: customer,
      cart: cart,
      message: message
    }

    // Determine intent and call appropriate MCP tools
    const intent = analyzeIntent(message)
    let mcpData = {}
    
    switch (intent) {
      case 'product_search':
        mcpData = await searchShopCatalog(message, shopRecord)
        break
      case 'cart_inquiry':
        mcpData = await getCartContents(cart?.cartId, shopRecord)
        break
      case 'policy_question':
        mcpData = await searchPoliciesAndFAQs(message, shopRecord)
        break
      default:
        mcpData = { type: 'general' }
    }

    // Generate AI response using OpenAI
    const aiResponse = await generateAIResponse(message, context, mcpData)
    
    return aiResponse

  } catch (error) {
    console.error('AI processing error:', error)
    return {
      message: "I'm here to help! Could you please rephrase your question?",
      cartId: cart?.cartId
    }
  }
}

// Intent Analysis
function analyzeIntent(message) {
  const lowerMessage = message.toLowerCase()
  
  if (lowerMessage.includes('product') || lowerMessage.includes('find') || lowerMessage.includes('search') || lowerMessage.includes('looking for')) {
    return 'product_search'
  }
  if (lowerMessage.includes('cart') || lowerMessage.includes('checkout') || lowerMessage.includes('buy')) {
    return 'cart_inquiry'
  }
  if (lowerMessage.includes('policy') || lowerMessage.includes('return') || lowerMessage.includes('shipping') || lowerMessage.includes('refund')) {
    return 'policy_question'
  }
  
  return 'general'
}

// MCP Tool: Search Shop Catalog
async function searchShopCatalog(query, shopRecord) {
  try {
    const response = await fetch(`https://${shopRecord.shopify_domain}/admin/api/2025-07/products.json?limit=10`, {
      headers: {
        'X-Shopify-Access-Token': shopRecord.shopify_access_token
      }
    })
    
    const data = await response.json()
    return {
      type: 'product_search',
      products: data.products?.slice(0, 5) || [],
      query: query
    }
  } catch (error) {
    console.error('Product search error:', error)
    return { type: 'product_search', products: [], error: error.message }
  }
}

// MCP Tool: Get Cart Contents
async function getCartContents(cartId, shopRecord) {
  if (!cartId || !shopRecord.storefront_access_token) {
    return { type: 'cart', items: [], total: '0.00' }
  }

  try {
    const cartQuery = `
      query getCart($cartId: ID!) {
        cart(id: $cartId) {
          id
          totalQuantity
          estimatedCost {
            totalAmount {
              amount
              currencyCode
            }
          }
          lines(first: 10) {
            edges {
              node {
                quantity
                merchandise {
                  ... on ProductVariant {
                    product {
                      title
                    }
                  }
                }
              }
            }
          }
        }
      }
    `

    const response = await fetch(`https://${shopRecord.shopify_domain}/api/2024-07/graphql.json`, {
      method: 'POST',
      headers: {
        'X-Shopify-Storefront-Access-Token': shopRecord.storefront_access_token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: cartQuery,
        variables: { cartId }
      })
    })

    const data = await response.json()
    return {
      type: 'cart',
      cart: data.data?.cart || null
    }
  } catch (error) {
    console.error('Cart fetch error:', error)
    return { type: 'cart', cart: null, error: error.message }
  }
}

// MCP Tool: Search Policies and FAQs
async function searchPoliciesAndFAQs(query, shopRecord) {
  try {
    const response = await fetch(`https://${shopRecord.shopify_domain}/admin/api/2025-07/policies.json`, {
      headers: {
        'X-Shopify-Access-Token': shopRecord.shopify_access_token
      }
    })
    
    const data = await response.json()
    return {
      type: 'policies',
      policies: data.policies || [],
      query: query
    }
  } catch (error) {
    console.error('Policies search error:', error)
    return { type: 'policies', policies: [], error: error.message }
  }
}

// Generate AI Response using OpenAI
async function generateAIResponse(message, context, mcpData) {
  try {
    const systemPrompt = `You are Genie, an AI shopping assistant for ${context.shop}. 
    
Customer context:
    - Logged in: ${context.customer?.isLoggedIn ? 'Yes' : 'No'}
    - Customer ID: ${context.customer?.customerId || 'Guest'}
    - Cart ID: ${context.cart?.cartId || 'None'}
    
    Available data: ${JSON.stringify(mcpData, null, 2)}
    
    Respond helpfully and naturally. If you have product data, recommend specific items. If you have cart data, reference their current items. Keep responses concise and actionable.`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.VITE_OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        max_tokens: 200,
        temperature: 0.7
      })
    })

    const aiData = await response.json()
    
    return {
      message: aiData.choices?.[0]?.message?.content || "I'm here to help! How can I assist you today?",
      cartId: context.cart?.cartId
    }

  } catch (error) {
    console.error('OpenAI API error:', error)
    return {
      message: "I'm here to help! How can I assist you with your shopping today?",
      cartId: context.cart?.cartId
    }
  }
}

// Legacy chat endpoint (keep for backward compatibility)
app.post('/api/chat', async (req, res) => {
  try {
    const { message, shop } = req.body
    
    // Redirect to new endpoint
    const response = await fetch(`${req.protocol}://${req.get('host')}/api/chat/storefront`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        shop,
        customer: { isLoggedIn: false },
        cart: { cartId: null },
        session: { timestamp: new Date().toISOString() }
      })
    })
    
    const data = await response.json()
    res.json({ response: data.response })
    
  } catch (error) {
    console.error('Legacy chat error:', error)
    res.status(500).json({ error: 'Failed to process message' })
  }
})









// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err)
  res.status(500).json({ error: 'Internal server error' })
})





// Serve static files from local dist folder
app.use(express.static(path.join(__dirname, '../dist')))



// Serve React app for all non-API routes
app.use((req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '../dist/index.html'))
  } else {
    res.status(404).json({ error: 'API endpoint not found' })
  }
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})

