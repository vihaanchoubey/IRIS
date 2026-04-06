// ── Voice-to-Report Environmental Concern Handler ─────────────────────────────────────
// Uses Web Speech API to capture voice, convert to text, and use Grok AI to understand intent
// Then auto-fills the environmental concern report form

class VoiceConcernHandler {
  constructor() {
    this.recognition = null;
    this.isListening = false;
    this.transcript = '';
    this.grokApiKey = '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'; // Use same as chatbot
    this.grokEndpoint = 'https://api.groq.com/openai/v1/chat/completions';
    this.grokModel = 'llama-3.1-8b-instant';
    this.init();
  }

  init() {
    // Initialize Web Speech API
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('Web Speech API not supported in this browser');
      this.disableVoiceButton();
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = false;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-US';

    this.attachEventListeners();
    this.attachButtonListener();
  }

  attachButtonListener() {
    const btn = document.getElementById('voice-concern-btn');
    if (btn) {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        this.handleVoiceClick();
      });
    } else {
      console.warn('Voice concern button not found in DOM');
    }
  }

  disableVoiceButton() {
    const btn = document.getElementById('voice-concern-btn');
    if (btn) {
      btn.disabled = true;
      btn.title = 'Web Speech API not supported in your browser';
      btn.style.opacity = '0.5';
      btn.style.cursor = 'not-allowed';
    }
  }

  attachEventListeners() {
    if (!this.recognition) return;

    this.recognition.onstart = () => {
      this.isListening = true;
      this.updateButtonUI();
      console.log('Voice recognition started');
    };

    this.recognition.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          this.transcript += transcript + ' ';
        } else {
          interim += transcript;
        }
      }

      const displayText = this.transcript + interim;
      const btn = document.getElementById('voice-concern-btn');
      if (btn) {
        btn.textContent = '🎤 Listening... ' + (displayText.substring(0, 30) || '...');
      }
    };

    this.recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      this.showNotification('error', `Error: ${event.error}`);
      this.stopListening();
    };

    this.recognition.onend = () => {
      this.isListening = false;
      this.updateButtonUI();
      console.log('Voice recognition ended. Transcript:', this.transcript);

      if (this.transcript.trim().length > 0) {
        this.processVoiceInput(this.transcript);
      } else {
        this.showNotification('info', 'No speech detected. Please try again.');
      }
    };
  }

  handleVoiceClick() {
    if (this.isListening) {
      this.stopListening();
    } else {
      this.startListening();
    }
  }

  startListening() {
    if (!this.recognition) {
      this.showNotification('error', 'Web Speech API not available');
      return;
    }

    this.transcript = '';
    this.recognition.start();
  }

  stopListening() {
    if (this.recognition) {
      this.recognition.stop();
    }
  }

  updateButtonUI() {
    const btn = document.getElementById('voice-concern-btn');
    if (!btn) return;

    if (this.isListening) {
      btn.textContent = '🎤 Listening...';
      btn.style.background = '#cf222e';
      btn.style.color = 'white';
    } else {
      btn.textContent = '🎤 Speak Your Concern';
      btn.style.background = '';
      btn.style.color = '';
    }
  }

  async processVoiceInput(voiceText) {
    this.showNotification('info', 'Processing your concern with AI...');

    try {
      const parsedData = await this.analyzeWithGrok(voiceText);
      this.fillAndOpenForm(parsedData);
    } catch (error) {
      console.error('Error processing voice input:', error);
      this.showNotification('error', 'Failed to process voice. Please try again.');
    }
  }

  async analyzeWithGrok(voiceText) {
    const systemPrompt = `You are an environmental concern analyzer. Parse the user's voice input and extract the following information in JSON format:
{
  "type": "concern|pollution|incident|emergency",
  "severity": "low|medium|high|critical",
  "location": "specific location mentioned",
  "state": "Indian state name or null",
  "description": "clear description of the concern"
}

Rules:
1. If the concern sounds like an emergency, set type to "emergency" and severity to "critical"
2. If it's critical pollution, use type "pollution" with severity "high" or "critical"
3. If it's general concern, use type "concern"
4. If an incident is described, use type "incident"
5. For severity: low = minor issue, medium = noticeable, high = serious, critical = emergency
6. Extract location from the context
7. Try to identify the state (if India-specific place mentioned)
8. Create a concise, clear description from the voice input
9. Return ONLY valid JSON, no other text

Voice input to analyze: "${voiceText}"`;

    const response = await fetch(this.grokEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.grokApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.grokModel,
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: voiceText,
          },
        ],
        temperature: 0.3,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      throw new Error(`Grok API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    // Extract JSON from response (in case there's extra text)
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in Grok response');
    }

    const parsedData = JSON.parse(jsonMatch[0]);
    console.log('Parsed data from Grok:', parsedData);
    return parsedData;
  }

  fillAndOpenForm(data) {
    // Map parsed data to form fields
    const fieldMapping = {
      'report-type': data.type || 'concern',
      'report-severity': data.severity || 'medium',
      'report-location': data.location || '',
      'report-state': data.state || '',
      'report-description': data.description || '',
    };

    // Fill form fields
    for (const [fieldId, value] of Object.entries(fieldMapping)) {
      const field = document.getElementById(fieldId);
      if (field && value) {
        field.value = value;
        // Trigger change event to update any listeners
        field.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }

    // Open the report modal
    this.openReportModal();

    // Show success notification
    this.showNotification(
      'success',
      'Your concern has been analyzed and form pre-filled. Please review and submit.'
    );
  }

  openReportModal() {
    // Use the existing report modal opener function if available
    if (window.openReportModal) {
      window.openReportModal();
    } else {
      // Fallback: find and open the report modal directly
      const modal = document.getElementById('report-modal');
      if (modal) {
        modal.style.display = 'flex';
        modal.classList.add('open');
        document.body.style.overflow = 'hidden';
      }
    }

    // Focus on description field for user to review
    const descField = document.getElementById('report-description');
    if (descField) {
      setTimeout(() => descField.focus(), 100);
    }
  }

  showNotification(type, message) {
    // Remove existing notification if any
    const existing = document.getElementById('voice-notification');
    if (existing) {
      existing.remove();
    }

    // Create notification element
    const notification = document.createElement('div');
    notification.id = 'voice-notification';
    notification.className = `voice-notification voice-notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 16px 20px;
      border-radius: 8px;
      font-size: 14px;
      z-index: 10000;
      animation: slideIn 0.3s ease-out;
      max-width: 400px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    `;

    // Set color based on type
    const colors = {
      success: { bg: '#1a7f37', color: 'white' },
      error: { bg: '#cf222e', color: 'white' },
      info: { bg: '#0969da', color: 'white' },
      warning: { bg: '#bc601a', color: 'white' },
    };

    const colorSet = colors[type] || colors.info;
    notification.style.backgroundColor = colorSet.bg;
    notification.style.color = colorSet.color;

    document.body.appendChild(notification);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease-in';
      setTimeout(() => notification.remove(), 300);
    }, 5000);
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new VoiceConcernHandler();
  });
} else {
  new VoiceConcernHandler();
}

// Add animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(400px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(400px);
      opacity: 0;
    }
  }

  .voice-concern-btn {
    position: relative;
    transition: all 0.3s ease;
  }

  .voice-concern-btn:hover {
    transform: scale(1.05);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  }

  .voice-concern-btn:active {
    transform: scale(0.98);
  }

  .voice-notification {
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .voice-notification::before {
    content: '';
    display: inline-block;
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: currentColor;
  }
`;
document.head.appendChild(style);
