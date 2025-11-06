/**
 * Aladdyn Floating Chatbot Widget
 * Auto-injected for Shopify stores
 * @version 1.0.0
 */

(function() {
    'use strict';

    // Configuration
    const CONFIG = {
        SCRIPT_SELECTOR: 'script[src*="widget.js"]',
        BUTTON_SIZE: 64,
        MOBILE_BREAKPOINT: 768,
        TABLET_BREAKPOINT: 1024,
        Z_INDEX: {
            BUTTON: 2147483645,
            WIDGET: 2147483644
        }
    };

    // Get shop and API URL from script tag
    const scriptTag = document.querySelector(CONFIG.SCRIPT_SELECTOR) || document.currentScript;
    if (!scriptTag) {
        console.error('Aladdyn chatbot script tag not found');
        return;
    }

    const scriptUrl = scriptTag.src;
    const url = new URL(scriptUrl);
    const shop = url.searchParams.get('shop');
    const apiBaseUrl = url.searchParams.get('api') || 'https://aladdynbe-production.up.railway.app';

    if (!shop || shop === '') {
        console.error('Shop parameter is required for Aladdyn chatbot');
        return;
    }

    function initializeChatbot() {
        // Create widget container
        const widgetContainer = createWidgetContainer();
        document.body.appendChild(widgetContainer);

        // Create mobile close button
        const mobileCloseBtn = createMobileCloseButton();
        widgetContainer.appendChild(mobileCloseBtn);

        // Create chat interface
        const chatInterface = createChatInterface();
        widgetContainer.appendChild(chatInterface);

        // Create chat button
        const chatButton = createChatButton();
        document.body.appendChild(chatButton);

        // Setup responsive behavior
        setupResponsiveBehavior(widgetContainer, chatButton, mobileCloseBtn);

        // Setup button interactions
        setupButtonInteractions(widgetContainer, chatButton, mobileCloseBtn);

        // Setup animations
        setupAnimations(widgetContainer, chatButton);

        // Setup keyboard accessibility
        setupAccessibility(widgetContainer, chatButton);
    }

    // Create widget container
    function createWidgetContainer() {
        const container = document.createElement('div');
        container.id = 'aladdyn-widget-container';
        container.setAttribute('role', 'dialog');
        container.setAttribute('aria-label', 'Aladdyn Chat Assistant');
        container.setAttribute('aria-hidden', 'true');
        
        Object.assign(container.style, {
            position: 'fixed',
            border: 'none',
            display: 'none',
            flexDirection: 'column',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05)',
            borderRadius: '16px',
            overflow: 'hidden',
            backgroundColor: '#ffffff',
            zIndex: CONFIG.Z_INDEX.WIDGET,
            transition: 'opacity 0.3s ease, transform 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
            opacity: '0',
            transform: 'scale(0.9) translateY(20px)',
            willChange: 'opacity, transform',
            pointerEvents: 'none',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
        });

        return container;
    }

    // Create mobile close button
    function createMobileCloseButton() {
        const closeBtn = document.createElement('button');
        closeBtn.id = 'aladdyn-mobile-close';
        closeBtn.setAttribute('aria-label', 'Close chat');
        closeBtn.setAttribute('type', 'button');
        
        Object.assign(closeBtn.style, {
            position: 'absolute',
            top: '18px',
            right: '12px',
            zIndex: '10',
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            border: 'none',
            backgroundColor: 'rgba(0, 0, 0, 0.1)',
            cursor: 'pointer',
            display: 'none',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background-color 0.2s ease'
        });

        closeBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6L18 18" stroke="#64748b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        `;

        closeBtn.addEventListener('mouseenter', () => {
            closeBtn.style.backgroundColor = 'rgba(0, 0, 0, 0.2)';
        });

        closeBtn.addEventListener('mouseleave', () => {
            closeBtn.style.backgroundColor = 'rgba(0, 0, 0, 0.1)';
        });

        return closeBtn;
    }

    // Create chat interface
    function createChatInterface() {
        const chatInterface = document.createElement('div');
        chatInterface.id = 'aladdyn-chat-interface';
        chatInterface.style.cssText = 'width: 100%; height: 100%; display: flex; flex-direction: column;';
        
        // Header
        const header = document.createElement('div');
        header.style.cssText = 'background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; display: flex; justify-content: space-between; align-items: center;';
        
        const headerContent = document.createElement('div');
        headerContent.innerHTML = `
            <h3 style="margin: 0; font-size: 18px; font-weight: 600;">Genie Assistant</h3>
            <p style="margin: 4px 0 0 0; font-size: 12px; opacity: 0.9;">Online • Typically responds instantly</p>
        `;
        
        const closeBtn = document.createElement('button');
        closeBtn.id = 'aladdyn-close-btn';
        closeBtn.setAttribute('aria-label', 'Close chat');
        closeBtn.style.cssText = 'background: none; border: none; color: white; cursor: pointer; font-size: 24px; padding: 0; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center;';
        closeBtn.innerHTML = '&times;';
        
        header.appendChild(headerContent);
        header.appendChild(closeBtn);
        
        // Messages
        const messages = document.createElement('div');
        messages.id = 'aladdyn-messages';
        messages.style.cssText = 'flex: 1; overflow-y: auto; padding: 20px; background: linear-gradient(to bottom, #f8fafc, #e2e8f0);';
        
        const welcomeMessage = document.createElement('div');
        welcomeMessage.style.cssText = 'display: flex; align-items: flex-start; gap: 12px; margin-bottom: 16px;';
        welcomeMessage.innerHTML = `
            <div style="width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg, #6366f1, #a855f7, #ec4899); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                <svg width="16" height="16" fill="white" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
            </div>
            <div style="background: white; padding: 12px 16px; border-radius: 16px; max-width: 80%; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <p style="margin: 0; color: #334155; font-size: 15px; line-height: 1.5;">Hello! I'm Genie, your AI shopping assistant. I can help you find products, answer questions about the store, and more. How can I help you today?</p>
            </div>
        `;
        messages.appendChild(welcomeMessage);
        
        // Input Area
        const inputArea = document.createElement('div');
        inputArea.style.cssText = 'padding: 20px; background: white; border-top: 1px solid #e2e8f0;';
        
        const form = document.createElement('form');
        form.id = 'aladdyn-chat-form';
        form.style.cssText = 'display: flex; gap: 12px; align-items: flex-end;';
        
        const input = document.createElement('input');
        input.type = 'text';
        input.id = 'aladdyn-chat-input';
        input.placeholder = 'Ask me anything...';
        input.style.cssText = 'flex: 1; padding: 12px 16px; border: 2px solid #e2e8f0; border-radius: 24px; font-size: 15px; outline: none; transition: border-color 0.2s; background: rgba(248, 250, 252, 0.5);';
        
        const submitBtn = document.createElement('button');
        submitBtn.type = 'submit';
        submitBtn.setAttribute('aria-label', 'Send message');
        submitBtn.style.cssText = 'width: 44px; height: 44px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border: none; border-radius: 50%; color: white; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: transform 0.2s; flex-shrink: 0;';
        submitBtn.innerHTML = `
            <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
            </svg>
        `;
        
        form.appendChild(input);
        form.appendChild(submitBtn);
        inputArea.appendChild(form);
        
        chatInterface.appendChild(header);
        chatInterface.appendChild(messages);
        chatInterface.appendChild(inputArea);
        
        // Setup form submission
        form.addEventListener('submit', handleMessageSubmit);
        
        return chatInterface;
    }

    // Create chat button
    function createChatButton() {
        const button = document.createElement('button');
        button.id = 'aladdyn-chat-button';
        button.setAttribute('aria-label', 'Open chat');
        button.setAttribute('type', 'button');
        
        Object.assign(button.style, {
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            width: CONFIG.BUTTON_SIZE + 'px',
            height: CONFIG.BUTTON_SIZE + 'px',
            borderRadius: '50%',
            border: 'none',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            cursor: 'pointer',
            boxShadow: '0 8px 32px rgba(102, 126, 234, 0.4)',
            zIndex: CONFIG.Z_INDEX.BUTTON,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'transform 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55), box-shadow 0.3s ease',
            willChange: 'transform'
        });

        button.innerHTML = `
            <svg width="28" height="28" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4l4 4 4-4h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
            </svg>
        `;

        return button;
    }

    // Setup responsive behavior
    function setupResponsiveBehavior(widgetContainer, chatButton, mobileCloseBtn) {
        function updateLayout() {
            const isMobile = window.innerWidth <= CONFIG.MOBILE_BREAKPOINT;
            const isTablet = window.innerWidth <= CONFIG.TABLET_BREAKPOINT;
            
            if (isMobile) {
                Object.assign(widgetContainer.style, {
                    top: '0',
                    left: '0',
                    right: '0',
                    bottom: '0',
                    width: '100%',
                    height: '100%',
                    borderRadius: '0'
                });
                mobileCloseBtn.style.display = 'flex';
                document.getElementById('aladdyn-close-btn').style.display = 'none';
            } else if (isTablet) {
                Object.assign(widgetContainer.style, {
                    bottom: '100px',
                    right: '24px',
                    width: '360px',
                    height: '500px',
                    borderRadius: '16px'
                });
                mobileCloseBtn.style.display = 'none';
                document.getElementById('aladdyn-close-btn').style.display = 'flex';
            } else {
                Object.assign(widgetContainer.style, {
                    bottom: '100px',
                    right: '24px',
                    width: '400px',
                    height: '600px',
                    borderRadius: '16px'
                });
                mobileCloseBtn.style.display = 'none';
                document.getElementById('aladdyn-close-btn').style.display = 'flex';
            }
        }

        updateLayout();
        window.addEventListener('resize', updateLayout);
    }

    // Setup button interactions
    function setupButtonInteractions(widgetContainer, chatButton, mobileCloseBtn) {
        function openWidget() {
            widgetContainer.style.display = 'flex';
            widgetContainer.setAttribute('aria-hidden', 'false');
            chatButton.style.display = 'none';
            
            requestAnimationFrame(() => {
                widgetContainer.style.opacity = '1';
                widgetContainer.style.transform = 'scale(1) translateY(0)';
                widgetContainer.style.pointerEvents = 'auto';
            });
            
            // Focus input
            setTimeout(() => {
                const input = document.getElementById('aladdyn-chat-input');
                if (input) input.focus();
            }, 300);
        }

        function closeWidget() {
            widgetContainer.style.opacity = '0';
            widgetContainer.style.transform = 'scale(0.9) translateY(20px)';
            widgetContainer.style.pointerEvents = 'none';
            widgetContainer.setAttribute('aria-hidden', 'true');
            
            setTimeout(() => {
                widgetContainer.style.display = 'none';
                chatButton.style.display = 'flex';
            }, 300);
        }

        chatButton.addEventListener('click', openWidget);
        document.getElementById('aladdyn-close-btn').addEventListener('click', closeWidget);
        mobileCloseBtn.addEventListener('click', closeWidget);
    }

    // Setup animations
    function setupAnimations(widgetContainer, chatButton) {
        chatButton.addEventListener('mouseenter', () => {
            chatButton.style.transform = 'scale(1.1)';
            chatButton.style.boxShadow = '0 12px 40px rgba(102, 126, 234, 0.6)';
        });

        chatButton.addEventListener('mouseleave', () => {
            chatButton.style.transform = 'scale(1)';
            chatButton.style.boxShadow = '0 8px 32px rgba(102, 126, 234, 0.4)';
        });
    }

    // Setup accessibility
    function setupAccessibility(widgetContainer, chatButton) {
        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && widgetContainer.style.display === 'flex') {
                document.getElementById('aladdyn-close-btn').click();
            }
        });

        // Focus management
        const input = document.getElementById('aladdyn-chat-input');
        if (input) {
            input.addEventListener('focus', () => {
                input.style.borderColor = '#667eea';
            });
            
            input.addEventListener('blur', () => {
                input.style.borderColor = '#e2e8f0';
            });
        }
    }

    // Handle message submission
    function handleMessageSubmit(e) {
        e.preventDefault();
        const input = document.getElementById('aladdyn-chat-input');
        const message = input.value.trim();
        
        if (!message) return;
        
        // Add user message
        addMessage(message, 'user');
        input.value = '';
        
        // Show typing indicator
        showTypingIndicator();
        
        // Send to API
        sendMessageToAPI(message);
    }

    // Add message to chat
    function addMessage(text, sender) {
        const messages = document.getElementById('aladdyn-messages');
        const messageDiv = document.createElement('div');
        
        if (sender === 'user') {
            messageDiv.style.cssText = 'display: flex; justify-content: flex-end; margin-bottom: 16px;';
            messageDiv.innerHTML = `
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 16px; border-radius: 16px; max-width: 80%; word-wrap: break-word;">
                    <p style="margin: 0; font-size: 15px; line-height: 1.5;">${escapeHtml(text)}</p>
                </div>
            `;
        } else {
            messageDiv.style.cssText = 'display: flex; align-items: flex-start; gap: 12px; margin-bottom: 16px;';
            messageDiv.innerHTML = `
                <div style="width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg, #6366f1, #a855f7, #ec4899); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                    <svg width="16" height="16" fill="white" viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                </div>
                <div style="background: white; padding: 12px 16px; border-radius: 16px; max-width: 80%; box-shadow: 0 1px 3px rgba(0,0,0,0.1); word-wrap: break-word;">
                    <p style="margin: 0; color: #334155; font-size: 15px; line-height: 1.5;">${escapeHtml(text)}</p>
                </div>
            `;
        }
        
        messages.appendChild(messageDiv);
        messages.scrollTop = messages.scrollHeight;
    }

    // Show typing indicator
    function showTypingIndicator() {
        const messages = document.getElementById('aladdyn-messages');
        const typingDiv = document.createElement('div');
        typingDiv.id = 'aladdyn-typing';
        typingDiv.style.cssText = 'display: flex; align-items: flex-start; gap: 12px; margin-bottom: 16px;';
        typingDiv.innerHTML = `
            <div style="width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg, #6366f1, #a855f7, #ec4899); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                <svg width="16" height="16" fill="white" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
            </div>
            <div style="background: white; padding: 12px 16px; border-radius: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <div style="display: flex; gap: 4px; align-items: center;">
                    <div style="width: 8px; height: 8px; border-radius: 50%; background: #94a3b8; animation: pulse 1.5s ease-in-out infinite;"></div>
                    <div style="width: 8px; height: 8px; border-radius: 50%; background: #94a3b8; animation: pulse 1.5s ease-in-out infinite 0.2s;"></div>
                    <div style="width: 8px; height: 8px; border-radius: 50%; background: #94a3b8; animation: pulse 1.5s ease-in-out infinite 0.4s;"></div>
                </div>
            </div>
        `;
        
        messages.appendChild(typingDiv);
        messages.scrollTop = messages.scrollHeight;
    }

    // Remove typing indicator
    function removeTypingIndicator() {
        const typing = document.getElementById('aladdyn-typing');
        if (typing) typing.remove();
    }

    // Send message to API
    function sendMessageToAPI(message) {
        fetch(`${apiBaseUrl}/api/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: message,
                shop: shop
            })
        })
        .then(response => response.json())
        .then(data => {
            removeTypingIndicator();
            addMessage(data.response || 'Sorry, I couldn\'t process your request.', 'bot');
        })
        .catch(error => {
            console.error('Chat API error:', error);
            removeTypingIndicator();
            addMessage('Sorry, I\'m having trouble connecting. Please try again later.', 'bot');
        });
    }

    // Utility function to escape HTML
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Add CSS animations
    function addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            @keyframes pulse {
                0%, 70%, 100% {
                    transform: scale(1);
                    opacity: 0.5;
                }
                35% {
                    transform: scale(1.2);
                    opacity: 1;
                }
            }
        `;
        document.head.appendChild(style);
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            addStyles();
            initializeChatbot();
        });
    } else {
        addStyles();
        initializeChatbot();
    }

})();.appendChild(form);
        
        chatInterface.appendChild(header);
        chatInterface.appendChild(messages);
        chatInterface.appendChild(inputArea);
        
        return chatInterface;
    }

    // Create chat button
    function createChatButton() {
        const button = document.createElement('button');
        button.id = 'aladdyn-chat-button';
        button.setAttribute('aria-label', 'Open Aladdyn chat assistant');
        button.setAttribute('aria-expanded', 'false');
        button.setAttribute('type', 'button');

        Object.assign(button.style, {
            position: 'fixed',
            border: 'none',
            outline: 'none',
            margin: '0',
            padding: '16px',
            cursor: 'pointer',
            backgroundColor: '#667eea',
            boxShadow: '0 4px 16px rgba(102, 126, 234, 0.4), 0 0 0 1px rgba(0, 0, 0, 0.04)',
            zIndex: CONFIG.Z_INDEX.BUTTON,
            transition: 'transform 0.2s cubic-bezier(0.68, -0.55, 0.265, 1.55), box-shadow 0.2s ease',
            transform: 'scale(1)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: `${CONFIG.BUTTON_SIZE}px`,
            height: `${CONFIG.BUTTON_SIZE}px`,
            WebkitTapHighlightColor: 'transparent'
        });

        const chatIconSVG = `
            <svg width="28" height="28" fill="white" viewBox="0 0 24 24">
                <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
            </svg>
        `;

        button.innerHTML = chatIconSVG;
        button.dataset.state = 'closed';

        button.addEventListener('mouseenter', () => {
            button.style.transform = 'scale(1.1)';
            button.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.5), 0 0 0 1px rgba(0, 0, 0, 0.04)';
        });

        button.addEventListener('mouseleave', () => {
            button.style.transform = 'scale(1)';
            button.style.boxShadow = '0 4px 16px rgba(102, 126, 234, 0.4), 0 0 0 1px rgba(0, 0, 0, 0.04)';
        });

        return button;
    }

    // Setup responsive behavior
    function setupResponsiveBehavior(container, button, mobileCloseBtn) {
        function applyResponsiveStyles() {
            const width = window.innerWidth;
            const height = window.innerHeight;
            const isMobile = width <= CONFIG.MOBILE_BREAKPOINT;
            const isTablet = width > CONFIG.MOBILE_BREAKPOINT && width <= CONFIG.TABLET_BREAKPOINT;
            const isOpen = button.dataset.state === 'open';

            if (isMobile) {
                Object.assign(container.style, {
                    position: 'fixed',
                    bottom: '0',
                    right: '0',
                    left: '0',
                    top: '0',
                    width: '100%',
                    height: '100%',
                    maxHeight: '100vh',
                    maxWidth: '100vw',
                    borderRadius: '0',
                    margin: '0'
                });

                if (isOpen) {
                    mobileCloseBtn.style.display = 'flex';
                    button.style.display = 'none';
                } else {
                    mobileCloseBtn.style.display = 'none';
                    button.style.display = 'flex';
                }

                Object.assign(button.style, {
                    position: 'fixed',
                    bottom: '20px',
                    right: '20px',
                    width: '56px',
                    height: '56px'
                });
            } else if (isTablet) {
                Object.assign(container.style, {
                    position: 'fixed',
                    bottom: '100px',
                    right: '24px',
                    left: 'auto',
                    top: 'auto',
                    width: '420px',
                    height: `min(700px, ${height - 150}px)`,
                    maxHeight: `${height - 150}px`,
                    maxWidth: 'calc(100vw - 48px)',
                    borderRadius: '16px',
                    margin: '0'
                });

                mobileCloseBtn.style.display = 'none';
                button.style.display = 'flex';

                Object.assign(button.style, {
                    position: 'fixed',
                    bottom: '24px',
                    right: '24px',
                    width: '60px',
                    height: '60px'
                });
            } else {
                Object.assign(container.style, {
                    position: 'fixed',
                    bottom: '100px',
                    right: '24px',
                    left: 'auto',
                    top: 'auto',
                    width: '448px',
                    height: `min(600px, ${height - 150}px)`,
                    maxHeight: `${height - 150}px`,
                    maxWidth: 'calc(100vw - 48px)',
                    borderRadius: '16px',
                    margin: '0'
                });

                mobileCloseBtn.style.display = 'none';
                button.style.display = 'flex';

                Object.assign(button.style, {
                    position: 'fixed',
                    bottom: '24px',
                    right: '24px',
                    width: `${CONFIG.BUTTON_SIZE}px`,
                    height: `${CONFIG.BUTTON_SIZE}px`
                });
            }
        }

        applyResponsiveStyles();

        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(applyResponsiveStyles, 150);
        });

        window.addEventListener('orientationchange', () => {
            setTimeout(applyResponsiveStyles, 200);
        });
    }

    // Setup button interactions
    function setupButtonInteractions(container, button, mobileCloseBtn) {
        const closeIconSVG = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" width="28" height="28">
                <path d="M18 6L6 18M6 6L18 18" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        `;

        const chatIconSVG = `
            <svg width="28" height="28" fill="white" viewBox="0 0 24 24">
                <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
            </svg>
        `;

        function closeWidget() {
            const isMobile = window.innerWidth <= CONFIG.MOBILE_BREAKPOINT;
            
            container.style.opacity = '0';
            if (isMobile) {
                container.style.transform = 'translateY(100%)';
                mobileCloseBtn.style.display = 'none';
                button.style.display = 'flex';
            } else {
                container.style.transform = 'scale(0.9) translateY(20px)';
            }
            container.setAttribute('aria-hidden', 'true');
            
            setTimeout(() => {
                container.style.display = 'none';
                container.style.pointerEvents = 'none';
            }, 300);

            button.innerHTML = chatIconSVG;
            button.dataset.state = 'closed';
            button.setAttribute('aria-expanded', 'false');
            button.setAttribute('aria-label', 'Open Aladdyn chat assistant');
        }

        function openWidget() {
            const isMobile = window.innerWidth <= CONFIG.MOBILE_BREAKPOINT;
            
            container.style.display = 'flex';
            container.style.pointerEvents = 'auto';
            container.setAttribute('aria-hidden', 'false');
            
            container.offsetHeight;
            
            container.style.opacity = '1';
            if (isMobile) {
                container.style.transform = 'translateY(0)';
                mobileCloseBtn.style.display = 'flex';
                button.style.display = 'none';
            } else {
                container.style.transform = 'scale(1) translateY(0)';
            }

            button.innerHTML = closeIconSVG;
            button.dataset.state = 'open';
            button.setAttribute('aria-expanded', 'true');
            button.setAttribute('aria-label', 'Close Aladdyn chat assistant');
            
            setupChatFunctionality();
        }

        button.addEventListener('click', () => {
            const isOpen = button.dataset.state === 'open';
            if (isOpen) {
                closeWidget();
            } else {
                openWidget();
            }
        });

        mobileCloseBtn.addEventListener('click', closeWidget);
        
        setTimeout(() => {
            const closeBtn = document.getElementById('aladdyn-close-btn');
            if (closeBtn) {
                closeBtn.addEventListener('click', closeWidget);
            }
        }, 100);
    }

    // Setup chat functionality
    function setupChatFunctionality() {
        const form = document.getElementById('aladdyn-chat-form');
        const input = document.getElementById('aladdyn-chat-input');
        
        if (form && input) {
            form.onsubmit = (e) => {
                e.preventDefault();
                const msg = input.value.trim();
                if (msg) {
                    sendMessage(msg);
                    input.value = '';
                }
            };
            
            input.onfocus = () => input.style.borderColor = '#667eea';
            input.onblur = () => input.style.borderColor = '#e2e8f0';
            
            input.focus();
        }
    }

    // Add message to chat
    function addMessage(text, isBot) {
        const messages = document.getElementById('aladdyn-messages');
        if (!messages) return;
        
        const messageContainer = document.createElement('div');
        messageContainer.style.cssText = 'display: flex; align-items: flex-start; gap: 12px; margin-bottom: 16px;' + (isBot ? '' : ' flex-direction: row-reverse;');
        
        if (isBot) {
            const avatar = document.createElement('div');
            avatar.style.cssText = 'width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg, #6366f1, #a855f7, #ec4899); display: flex; align-items: center; justify-content: center; flex-shrink: 0;';
            avatar.innerHTML = `
                <svg width="16" height="16" fill="white" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
            `;
            messageContainer.appendChild(avatar);
        } else {
            const avatar = document.createElement('div');
            avatar.style.cssText = 'width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg, #475569, #334155, #1e293b); display: flex; align-items: center; justify-content: center; flex-shrink: 0;';
            avatar.innerHTML = `
                <svg width="16" height="16" fill="white" viewBox="0 0 24 24">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                </svg>
            `;
            messageContainer.appendChild(avatar);
        }
        
        const bubble = document.createElement('div');
        bubble.style.cssText = 'max-width: 80%; padding: 12px 16px; border-radius: 16px; font-size: 15px; line-height: 1.5; ' + 
            (isBot ? 'background: white; color: #334155; box-shadow: 0 1px 3px rgba(0,0,0,0.1);' : 'background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;');
        bubble.textContent = text;
        
        messageContainer.appendChild(bubble);
        messages.appendChild(messageContainer);
        messages.scrollTop = messages.scrollHeight;
    }

    // Send message to backend
    async function sendMessage(message) {
        try {
            addMessage(message, false);
            
            const response = await fetch(apiBaseUrl + '/api/chatbot/storefront', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: message, shop: shop })
            });
            
            const data = await response.json();
            addMessage(data.success && data.response ? data.response : 'Sorry, I encountered an error. Please try again.', true);
        } catch (error) {
            console.error('Aladdyn chatbot error:', error);
            addMessage('Sorry, I am having trouble connecting. Please try again.', true);
        }
    }

    // Setup animations
    function setupAnimations(container, button) {
        setTimeout(() => {
            button.style.animation = 'aladdynSlideIn 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards';
        }, 1000);

        const style = document.createElement('style');
        style.textContent = `
            @keyframes aladdynSlideIn {
                from {
                    opacity: 0;
                    transform: translateY(100px) scale(0.5);
                }
                to {
                    opacity: 1;
                    transform: translateY(0) scale(1);
                }
            }

            #aladdyn-chat-button:active {
                transform: scale(0.95) !important;
            }

            @media (max-width: ${CONFIG.MOBILE_BREAKPOINT}px) {
                #aladdyn-widget-container {
                    animation: aladdynSlideInMobile 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards;
                }

                @keyframes aladdynSlideInMobile {
                    from {
                        transform: translateY(100%);
                    }
                    to {
                        transform: translateY(0);
                    }
                }
            }
        `;
        document.head.appendChild(style);
    }

    // Setup keyboard accessibility
    function setupAccessibility(container, button) {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && button.dataset.state === 'open') {
                button.click();
            }
        });

        container.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                const focusableElements = container.querySelectorAll(
                    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
                );
                const firstElement = focusableElements[0];
                const lastElement = focusableElements[focusableElements.length - 1];

                if (e.shiftKey && document.activeElement === firstElement) {
                    e.preventDefault();
                    lastElement.focus();
                } else if (!e.shiftKey && document.activeElement === lastElement) {
                    e.preventDefault();
                    firstElement.focus();
                }
            }
        });
    }

    // Initialize chatbot
    initializeChatbot();

})();