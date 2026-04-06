// ── Environmental AI Chatbot ─────────────────────────────────────
// Brain-powered conversational interface for IRIS platform
// Uses backend proxy for Groq API to avoid CORS issues

const CHATBOT_CONFIG = {
  API_ENDPOINT: '/api/chatbot',  // Backend endpoint (no CORS issues)
  ENABLED: true,  // Always enabled - backend handles API key
};

class EnvironmentalChatbot {
  constructor() {
    this.isOpen = false;
    this.messages = [];
    this.isLoading = false;
    this.init();
  }

  init() {
    if (!CHATBOT_CONFIG.ENABLED) {
      console.log('Chatbot: Disabled.');
      return;
    }

    this.setupUI();
    this.attachEventListeners();
  }

  setupUI() {
    const chatbotHTML = `
      <div class="chatbot-widget">
        <button class="chatbot-fab" id="chatbot-fab" title="Ask Environmental Questions">
          🧠
        </button>

        <div class="chatbot-panel" id="chatbot-panel">
          <div class="chatbot-header">
            <div class="chatbot-header-content">
              <div class="chatbot-icon">🧠</div>
              <div>
                <div class="chatbot-title">Environmental AI</div>
                <div class="chatbot-subtitle">Ask about AQI, water, emissions & more</div>
              </div>
            </div>
            <button class="chatbot-close" id="chatbot-close">✕</button>
          </div>

          <div class="chatbot-messages" id="chatbot-messages"></div>

          <div class="chatbot-input-area">
            <textarea 
              class="chatbot-input" 
              id="chatbot-input" 
              placeholder="Ask about environmental data..." 
              rows="1"
            ></textarea>
            <button class="chatbot-send" id="chatbot-send">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', chatbotHTML);
  }

  attachEventListeners() {
    const fab = document.getElementById('chatbot-fab');
    const closeBtn = document.getElementById('chatbot-close');
    const sendBtn = document.getElementById('chatbot-send');
    const input = document.getElementById('chatbot-input');

    fab.addEventListener('click', () => this.togglePanel());
    closeBtn.addEventListener('click', () => this.closePanel());
    sendBtn.addEventListener('click', () => this.sendMessage());
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });

    // Auto-resize textarea
    input.addEventListener('input', () => {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 100) + 'px';
    });
  }

  togglePanel() {
    const panel = document.getElementById('chatbot-panel');
    this.isOpen = !this.isOpen;
    panel.classList.toggle('open', this.isOpen);

    if (this.isOpen && this.messages.length === 0) {
      this.addMessage('bot', 'Hello! I\'m your environmental AI assistant. Ask me about air quality, water conditions, emissions, compliance, or any environmental data.');
    }
  }

  closePanel() {
    const panel = document.getElementById('chatbot-panel');
    this.isOpen = false;
    panel.classList.remove('open');
  }

  addMessage(sender, content) {
    this.messages.push({ sender, content });
    const messagesDiv = document.getElementById('chatbot-messages');
    
    const msgEl = document.createElement('div');
    msgEl.className = `chatbot-message chatbot-${sender}`;
    msgEl.innerHTML = `<div class="chatbot-bubble">${this.escapeHtml(content)}</div>`;
    
    messagesDiv.appendChild(msgEl);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }

  async sendMessage() {
    const input = document.getElementById('chatbot-input');
    const message = input.value.trim();

    if (!message || this.isLoading) return;

    this.addMessage('user', message);
    input.value = '';
    input.style.height = 'auto';
    this.isLoading = true;

    try {
      const response = await this.queryGroqAPI(message);
      this.addMessage('bot', response);
    } catch (error) {
      console.error('Chatbot error:', error);
      this.addMessage('bot', 'Sorry, I encountered an error. Please try again.');
    } finally {
      this.isLoading = false;
    }
  }

  async queryGroqAPI(userMessage) {
    if (!CHATBOT_CONFIG.API_ENDPOINT) {
      throw new Error('Chatbot API endpoint not configured');
    }

    const payload = {
      message: userMessage
    };

    const response = await fetch(CHATBOT_CONFIG.API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Chatbot request failed');
    }

    return data.response || 'No response received';
  }

  escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }
}

// Initialize chatbot when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.environmentalChatbot = new EnvironmentalChatbot();
  });
} else {
  window.environmentalChatbot = new EnvironmentalChatbot();
}
