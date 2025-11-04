# Aladdyn Shopify App

A single-folder React.js application that connects to Shopify stores and displays product information.

## Features

- Shopify OAuth integration
- Store information display
- Product listing with images and pricing
- MongoDB integration for storing shop data

## Setup

1. Install dependencies:
```bash
npm install
```

2. Update environment variables in `.env`:
```
VITE_SHOPIFY_API_KEY=your_shopify_api_key
VITE_SHOPIFY_REDIRECT_URI=http://localhost:3000/shopify/callback
SHOPIFY_API_SECRET=your_shopify_api_secret
MONGODB_URI=mongodb+srv://yogeshwark2004_db_user:W1KFtpTbosnKjSmJ@cluster0.hoytsxw.mongodb.net/aladdyn?retryWrites=true&w=majority&appName=Cluster0
```

3. Start the backend server:
```bash
npm run server
```

4. Start the frontend development server:
```bash
npm run dev
```

## Usage

1. Visit `http://localhost:3000`
2. Click "Connect to Shopify"
3. Enter your store domain (e.g., "mystore" for mystore.myshopify.com)
4. Authorize the app in Shopify
5. View your store information and products

## User Flow

1. **Login Page**: User clicks "Connect to Shopify" and enters store domain
2. **Shopify OAuth**: User is redirected to Shopify for authorization
3. **Callback**: App receives authorization code and exchanges it for access token
4. **Dashboard**: User sees store info and product listings

## Database Schema

```javascript
{
  shopify_domain: String,        // e.g., "mystore.myshopify.com"
  shopify_access_token: String,  // OAuth access token from Shopify
  createdAt: Date,              // Auto-generated timestamp
  updatedAt: Date               // Auto-generated timestamp
}
```