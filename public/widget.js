(function() {
  // Get shop parameter from script URL
  const currentScript = document.currentScript || document.querySelector('script[src*="widget.js"]');
  const scriptSrc = currentScript ? currentScript.src : '';
  const urlParams = new URLSearchParams(scriptSrc.split('?')[1] || '');
  const shop = urlParams.get('shop') || 'unknown-shop';

  // Create chatbot widget
  const widget = document.createElement('div');
  widget.id = 'aladdyn-chatbot-widget';
  widget.style.cssText = `
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
  `;
  
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
    alert('Chatbot clicked! Shop: ' + shop);
  });
  
  // Append to body when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      document.body.appendChild(widget);
    });
  } else {
    document.body.appendChild(widget);
  }
  
  console.log('Aladdyn Chatbot Widget loaded for shop:', shop);
})();