import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import mongoose from 'mongoose'
import path from 'path'
import { fileURLToPath } from 'url'
import Shop from '../models/Shop.js'
import Customer from '../models/Customer.js'



const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || (process.env.NODE_ENV === 'production'
  ? 'https://aladdynbe-production.up.railway.app'
  : `http://localhost:${PORT}`)

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



    // Auto-inject widget after successful installation
    try {
      console.log('Auto-injecting widget...')
      const baseUrl = process.env.NODE_ENV === 'production' 
        ? 'https://aladdynbe-production.up.railway.app'
        : `http://localhost:${PORT}`
      
      // Get the main theme
      const themesResponse = await fetch(`https://${shop}/admin/api/2025-07/themes.json`, {
        headers: {
          'X-Shopify-Access-Token': tokenData.access_token
        }
      })

      const themesData = await themesResponse.json()
      const mainTheme = themesData.themes.find(theme => theme.role === 'main')

      if (mainTheme) {
        // Get theme.liquid file
        const themeFileResponse = await fetch(`https://${shop}/admin/api/2025-07/themes/${mainTheme.id}/assets.json?asset[key]=layout/theme.liquid`, {
          headers: {
            'X-Shopify-Access-Token': tokenData.access_token
          }
        })

        const themeFileData = await themeFileResponse.json()
        let themeContent = themeFileData.asset.value

        // Check if widget is not already injected
        if (!themeContent.includes('aladdyn-widget')) {
          const widgetScript = `
<!-- Aladdyn Chatbot Widget -->
<script src="${baseUrl}/widget.js?shop=${shop}&api=${baseUrl}" defer></script>
<!-- End Aladdyn Chatbot Widget -->`

          // Inject before closing </body> tag
          themeContent = themeContent.replace('</body>', `${widgetScript}
</body>`)

          // Update theme file
          await fetch(`https://${shop}/admin/api/2025-07/themes/${mainTheme.id}/assets.json`, {
            method: 'PUT',
            headers: {
              'X-Shopify-Access-Token': tokenData.access_token,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              asset: {
                key: 'layout/theme.liquid',
                value: themeContent
              }
            })
          })

          // Update shop record
          await Shop.findOneAndUpdate(
            { shopify_domain: shop },
            { widget_injected: true, widget_injected_at: new Date() },
            { new: true }
          )

          console.log('Widget auto-injected successfully')
        }
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

// Serve widget.js file
app.get(['/chatbot-widget.js', '/public/chatbot-widget.js'], (req, res) => {
  res.setHeader('Content-Type', 'application/javascript')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300')

  const requestedShop = typeof req.query.shop === 'string' ? req.query.shop : ''

  const loaderScript = `(function(){
    var initialShop = ${JSON.stringify(requestedShop)};
    var baseUrl = ${JSON.stringify(PUBLIC_BASE_URL)};

    var shop = initialShop || (window.Shopify && window.Shopify.shop) || window.ALADDYN_SHOP || window.shopDomain || '';

    if(!shop){
      console.error('Aladdyn: Unable to determine shop domain');
      return;
    }

    var script = document.createElement('script');
    try {
      script.src = baseUrl + '/widget.js?shop=' + encodeURIComponent(shop) + '&api=' + encodeURIComponent(baseUrl);
    } catch(err) {
      console.error('Aladdyn: Failed to construct widget URL', err);
      return;
    }
    script.defer = true;
    script.async = true;
    script.onerror = function(){ console.error('Aladdyn: Failed to load widget.js'); };
    document.head.appendChild(script);
  })();`

  res.send(loaderScript)
})

app.get('/widget.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.sendFile(path.join(__dirname, '../public/widget.js'))
})

// Customer session check and cart management
app.post('/api/customer-session', async (req, res) => {
  try {
    const { shop, customerAccessToken, cartId } = req.body

    if (!shop) {
      return res.status(400).json({ error: 'Shop domain required' })
    }

    // Get shop record
    const shopRecord = await Shop.findOne({ shopify_domain: shop })
    if (!shopRecord) {
      return res.status(404).json({ error: 'Shop not found' })
    }

    let sessionData = {
      isLoggedIn: false,
      customer: null,
      cartId: cartId || null,
      sessionType: 'anonymous'
    }

    // Check if customer is logged in
    if (customerAccessToken) {
      try {
        // Verify customer token with Shopify Customer Account API
        const customerResponse = await fetch(`https://shopify.com/customeraccount/api/2024-07/graphql.json`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${customerAccessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            query: `
              query {
                customer {
                  email
                }
              }
            `
          })
        })

        if (customerResponse.ok) {
          const customerData = await customerResponse.json()
          if (customerData.data?.customer?.email) {
            sessionData.isLoggedIn = true
            sessionData.customer = { email: customerData.data.customer.email }
            sessionData.sessionType = 'authenticated'
            
            // Store customer session in database
            await Customer.findOneAndUpdate(
              {
                shopify_domain: shop,
                customer_email: customerData.data.customer.email
              },
              {
                shopify_domain: shop,
                customer_email: customerData.data.customer.email,
                customer_access_token: customerAccessToken,
                last_active: new Date()
              },
              { upsert: true, new: true }
            )
          }
        }
      } catch (error) {
        console.error('Customer token verification failed:', error)
        // Continue with anonymous session
      }
    }



    res.json({
      success: true,
      session: sessionData
    })

  } catch (error) {
    console.error('Customer session error:', error)
    res.status(500).json({ error: 'Failed to process customer session' })
  }
})

// Get cart contents using Storefront API
app.post('/api/cart-contents', async (req, res) => {
  try {
    const { shop, cartId, customerAccessToken } = req.body

    if (!shop || !cartId) {
      return res.status(400).json({ error: 'Shop and cartId are required' })
    }

    // Get shop record
    const shopRecord = await Shop.findOne({ shopify_domain: shop })
    if (!shopRecord || !shopRecord.storefront_access_token) {
      return res.status(404).json({ error: 'Shop or storefront token not found' })
    }

    // Query Storefront API for cart contents
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
            subtotalAmount {
              amount
              currencyCode
            }
          }
          lines(first: 50) {
            edges {
              node {
                id
                quantity
                estimatedCost {
                  totalAmount {
                    amount
                    currencyCode
                  }
                }
                merchandise {
                  ... on ProductVariant {
                    id
                    title
                    price {
                      amount
                      currencyCode
                    }
                    product {
                      id
                      title
                      handle
                      featuredImage {
                        url
                        altText
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    `

    const headers = {
      'X-Shopify-Storefront-Access-Token': shopRecord.storefront_access_token,
      'Content-Type': 'application/json'
    }

    // Add customer access token if available
    if (customerAccessToken) {
      headers['Authorization'] = `Bearer ${customerAccessToken}`
    }

    const response = await fetch(`https://${shop}/api/2024-07/graphql.json`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        query: cartQuery,
        variables: { cartId }
      })
    })

    const data = await response.json()

    if (data.errors) {
      return res.status(400).json({ error: 'Cart not found or invalid', details: data.errors })
    }

    res.json({
      success: true,
      cart: data.data.cart
    })

  } catch (error) {
    console.error('Cart contents error:', error)
    res.status(500).json({ error: 'Failed to fetch cart contents' })
  }
})

// Chat API endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { message, shop } = req.body

    if (!message || !shop) {
      return res.status(400).json({ error: 'Message and shop are required' })
    }

    // Simple AI response (replace with actual AI integration)
    const responses = [
      "I'd be happy to help you with that! What specific product are you looking for?",
      "Let me help you find the perfect item. Can you tell me more about what you need?",
      "Great question! I can help you with product recommendations, store policies, and more.",
      "I'm here to assist you with your shopping. What would you like to know?",
      "Thanks for reaching out! How can I make your shopping experience better today?"
    ]

    const randomResponse = responses[Math.floor(Math.random() * responses.length)]

    // Add a small delay to simulate processing
    setTimeout(() => {
      res.json({ response: randomResponse })
    }, 1000)

  } catch (error) {
    console.error('Chat API error:', error)
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

