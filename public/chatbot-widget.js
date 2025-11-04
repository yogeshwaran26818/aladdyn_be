/**
 * Aladdyn Chatbot Widget
 * Optimized for all devices with proper responsive behavior
 * @version 1.0.0
 */

(function() {
    'use strict';

    // Configuration
    const CONFIG = {
        SCRIPT_SELECTOR: 'script[src*="chatbot-widget.js"]',
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
        console.error('Chatbot script tag not found');
        return;
    }

    const scriptUrl = scriptTag.src;
    const url = new URL(scriptUrl);
    const shop = url.searchParams.get('shop');
    const apiBaseUrl = url.searchParams.get('api') || 'https://aladdynbe-production.up.railway.app';

    if (!shop || shop === '') {
        console.error('Shop parameter is required');
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

    // Create widget container with proper styles
    function createWidgetContainer() {
        const container = document.createElement('div');
        container.id = 'aladdyn-widget-container';
        container.setAttribute('role', 'dialog');
        container.setAttribute('aria-label', 'Chat widget');
        container.setAttribute('aria-hidden', 'true');
        
        Object.assign(container.style, {
            position: 'fixed',
            border: 'none',
            display: 'none',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05)',
            borderRadius: '16px',
            overflow: 'hidden',
            backgroundColor: '#ffffff',
            zIndex: CONFIG.Z_INDEX.WIDGET,
            transition: 'opacity 0.3s ease, transform 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
            opacity: '0',
            transform: 'scale(0.9) translateY(20px)',
            willChange: 'opacity, transform',
            pointerEvents: 'none'
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
            backgroundColor: 'rgba(0, 0, 0, 0)',
            cursor: 'pointer',
            display: 'none',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background-color 0.2s ease'
        });

        closeBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6L18 18" stroke="#a7a7a7ff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
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
        header.style.cssText = 'background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 16px; display: flex; justify-content: space-between; align-items: center;';
        header.innerHTML = '<div><h3 style="margin: 0; font-size: 18px; font-weight: 600;">Genie Assistant</h3><p style="margin: 4px 0 0 0; font-size: 12px; opacity: 0.9;">Ask me anything!</p></div><button id="aladdyn-close-btn" style="background: none; border: none; color: white; cursor: pointer; font-size: 24px; padding: 0; width: 30px; height: 30px;">&times;</button>';
        
        // Messages
        const messages = document.createElement('div');
        messages.id = 'aladdyn-messages';
        messages.style.cssText = 'flex: 1; overflow-y: auto; padding: 16px; background: #f8f9fa;';
        messages.innerHTML = '<div style="background: #e9ecef; padding: 12px; border-radius: 12px; margin-bottom: 12px;"><p style="margin: 0; color: #495057; font-size: 14px;">Hello! I am Genie, your AI shopping assistant. I can help you find products, answer questions about the store, and more. What would you like to know?</p></div>';
        
        // Input Area
        const inputArea = document.createElement('div');
        inputArea.style.cssText = 'padding: 16px; background: white; border-top: 1px solid #e9ecef;';
        inputArea.innerHTML = '<form id="aladdyn-chat-form" style="display: flex; gap: 8px;"><input type="text" id="aladdyn-chat-input" placeholder="Ask me anything..." style="flex: 1; padding: 12px; border: 2px solid #e9ecef; border-radius: 24px; font-size: 14px; outline: none; transition: border-color 0.2s;"/><button type="submit" style="width: 44px; height: 44px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border: none; border-radius: 50%; color: white; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: transform 0.2s;"><svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg></button></form>';
        
        chatInterface.appendChild(header);
        chatInterface.appendChild(messages);
        chatInterface.appendChild(inputArea);
        
        return chatInterface;
    }

    // Create chat button
    function createChatButton() {
        const button = document.createElement('button');
        button.id = 'aladdyn-chat-button';
        button.setAttribute('aria-label', 'Open chat widget');
        button.setAttribute('aria-expanded', 'false');
        button.setAttribute('type', 'button');

        Object.assign(button.style, {
            position: 'fixed',
            border: 'none',
            outline: 'none',
            margin: '0',
            padding: '12px',
            cursor: 'pointer',
            backgroundColor: '#667eea',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.24), 0 0 0 1px rgba(0, 0, 0, 0.04)',
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
            <svg width="30" height="30" fill="white" viewBox="0 0 24 24">
                <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
            </svg>
        `;

        button.innerHTML = chatIconSVG;
        button.dataset.state = 'closed';

        button.addEventListener('mouseenter', () => {
            button.style.transform = 'scale(1.1)';
            button.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(0, 0, 0, 0.04)';
        });

        button.addEventListener('mouseleave', () => {
            button.style.transform = 'scale(1)';
            button.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.24), 0 0 0 1px rgba(0, 0, 0, 0.04)';
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
                    height: `min(768px, ${height - 150}px)`,
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
            <svg width="30" height="30" fill="white" viewBox="0 0 24 24">
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
            button.setAttribute('aria-label', 'Open chat widget');
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
            button.setAttribute('aria-label', 'Close chat widget');
            
            // Setup chat functionality
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

        mobileCloseBtn.addEventListener('click', () => {
            closeWidget();
        });
        
        // Setup desktop close button
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
            input.onblur = () => input.style.borderColor = '#e9ecef';
            
            // Focus input when widget opens
            input.focus();
        }
    }

    // Add message to chat
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
            console.error('Chatbot error:', error);
            addMessage('Sorry, I am having trouble connecting. Please try again.', true);
        }
    }

    // Setup animations
    function setupAnimations(container, button) {
        setTimeout(() => {
            button.style.animation = 'slideInFromBottom 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards';
        }, 500);

        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideInFromBottom {
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
                    animation: slideInFromBottomMobile 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards;
                }

                @keyframes slideInFromBottomMobile {
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