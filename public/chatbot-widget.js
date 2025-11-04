(function() {
  'use strict';
  
  // Get configuration from script tag
  const script = document.currentScript || document.querySelector('script[src*="chatbot-widget.js"]');
  const params = new URLSearchParams(script.src.split('?')[1] || '');
  
  const CONFIG = {
    shop: params.get('shop') || 'demo-shop.myshopify.com',
    apiBaseUrl: params.get('api') || 'https://aladdynbe-production.up.railway.app',
    widgetId: 'aladdyn-chatbot-widget'
  };

  function createWidgetHTML() {
    if (document.getElementById(CONFIG.widgetId)) return;

    const widget = document.createElement('div');
    widget.id = CONFIG.widgetId;
    widget.style.cssText = 'position: fixed; bottom: 20px; right: 20px; z-index: 9999; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;';
    
    const button = document.createElement('div');
    button.id = 'aladdyn-chat-button';
    button.style.cssText = 'width: 60px; height: 60px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 50%; cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.15); display: flex; align-items: center; justify-content: center; transition: transform 0.2s;';
    button.innerHTML = '<svg width="30" height="30" fill="white" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>';
    
    const chatWindow = document.createElement('div');
    chatWindow.id = 'aladdyn-chat-window';
    chatWindow.style.cssText = 'position: absolute; bottom: 80px; right: 0; width: 380px; height: 500px; background: white; border-radius: 16px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); display: none; flex-direction: column; overflow: hidden;';
    
    const header = document.createElement('div');
    header.style.cssText = 'background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 16px; display: flex; justify-content: space-between; align-items: center;';
    header.innerHTML = '<div><h3 style="margin: 0; font-size: 18px; font-weight: 600;">Genie Assistant</h3><p style="margin: 4px 0 0 0; font-size: 12px; opacity: 0.9;">Ask me anything!</p></div><button id="aladdyn-close-btn" style="background: none; border: none; color: white; cursor: pointer; font-size: 24px; padding: 0; width: 30px; height: 30px;">&times;</button>';
    
    const messages = document.createElement('div');
    messages.id = 'aladdyn-messages';
    messages.style.cssText = 'flex: 1; overflow-y: auto; padding: 16px; background: #f8f9fa;';
    messages.innerHTML = '<div style="background: #e9ecef; padding: 12px; border-radius: 12px; margin-bottom: 12px;"><p style="margin: 0; color: #495057; font-size: 14px;">Hello! I am Genie, your AI shopping assistant. I can help you find products, answer questions about the store, and more. What would you like to know?</p></div>';
    
    const inputArea = document.createElement('div');
    inputArea.style.cssText = 'padding: 16px; background: white; border-top: 1px solid #e9ecef;';
    inputArea.innerHTML = '<form id="aladdyn-chat-form" style="display: flex; gap: 8px;"><input type="text" id="aladdyn-chat-input" placeholder="Ask me anything..." style="flex: 1; padding: 12px; border: 2px solid #e9ecef; border-radius: 24px; font-size: 14px; outline: none; transition: border-color 0.2s;"/><button type="submit" style="width: 44px; height: 44px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border: none; border-radius: 50%; color: white; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: transform 0.2s;"><svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg></button></form>';
    
    chatWindow.appendChild(header);
    chatWindow.appendChild(messages);
    chatWindow.appendChild(inputArea);
    
    widget.appendChild(button);
    widget.appendChild(chatWindow);
    
    document.body.appendChild(widget);
  }

  function addMessage(text, isBot) {
    const messages = document.getElementById('aladdyn-messages');
    if (!messages) return;
    
    const div = document.createElement('div');
    div.style.cssText = 'margin-bottom: 12px; display: flex; justify-content: ' + (isBot ? 'flex-start' : 'flex-end') + ';';
    
    const bubble = document.createElement('div');
    bubble.style.cssText = 'max-width: 80%; padding: 12px 16px; border-radius: 16px; font-size: 14px; line-height: 1.5; ' + (isBot ? 'background: #e9ecef; color: #495057;' : 'background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;');
    bubble.textContent = text;
    
    div.appendChild(bubble);
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
  }

  async function sendMessage(message) {
    try {
      addMessage(message, false);
      
      const response = await fetch(CONFIG.apiBaseUrl + '/api/chatbot/storefront', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: message, shop: CONFIG.shop })
      });
      
      const data = await response.json();
      addMessage(data.success && data.response ? data.response : 'Sorry, I encountered an error. Please try again.', true);
    } catch (error) {
      console.error('Chatbot error:', error);
      addMessage('Sorry, I am having trouble connecting. Please try again.', true);
    }
  }

  function initWidget() {
    createWidgetHTML();
    
    const button = document.getElementById('aladdyn-chat-button');
    const window = document.getElementById('aladdyn-chat-window');
    const closeBtn = document.getElementById('aladdyn-close-btn');
    const form = document.getElementById('aladdyn-chat-form');
    const input = document.getElementById('aladdyn-chat-input');

    if (button && window && closeBtn && form && input) {
      button.onclick = () => {
        const isVisible = window.style.display !== 'none';
        window.style.display = isVisible ? 'none' : 'flex';
        button.style.transform = isVisible ? 'scale(1)' : 'scale(0.9)';
        if (!isVisible) input.focus();
      };

      closeBtn.onclick = () => {
        window.style.display = 'none';
        button.style.transform = 'scale(1)';
      };

      form.onsubmit = (e) => {
        e.preventDefault();
        const msg = input.value.trim();
        if (msg) {
          sendMessage(msg);
          input.value = '';
        }
      };

      button.onmouseenter = () => button.style.transform = 'scale(1.1)';
      button.onmouseleave = () => {
        if (window.style.display === 'none') button.style.transform = 'scale(1)';
      };

      input.onfocus = () => input.style.borderColor = '#667eea';
      input.onblur = () => input.style.borderColor = '#e9ecef';
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWidget);
  } else {
    initWidget();
  }
})();