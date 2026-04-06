// ── IRIS Feedback System ──────────────────────────────────────────────────────
(function() {
  const modal = document.getElementById('feedback-modal');
  const closeBtn = document.getElementById('feedback-modal-close');
  const cancelBtn = document.getElementById('feedback-cancel');
  const form = document.getElementById('feedback-form');
  const messageInput = document.getElementById('feedback-message');
  const charCountSpan = document.getElementById('feedback-char-count');
  const statusDiv = document.getElementById('feedback-status');

  if (!modal) return;

  // Open modal function (called from iris-nav.js via dropdown menu)
  window.openFeedbackModal = function() {
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  };

  // Close modal
  function closeModal() {
    modal.style.display = 'none';
    document.body.style.overflow = '';
    form.reset();
    statusDiv.style.display = 'none';
  }

  closeBtn.addEventListener('click', closeModal);
  cancelBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  // Character counter
  messageInput.addEventListener('input', () => {
    const len = messageInput.value.length;
    charCountSpan.textContent = Math.min(len, 500);
    if (len > 500) {
      messageInput.value = messageInput.value.slice(0, 500);
    }
  });

  // Form submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const message = messageInput.value.trim();
    if (message.length < 10) {
      showStatus('Message must be at least 10 characters', 'error');
      return;
    }

    const data = {
      type: document.getElementById('feedback-type').value,
      message: message,
      contact: document.getElementById('feedback-email').value.trim(),
      state: document.getElementById('feedback-state').value.trim(),
    };

    try {
      const submitBtn = document.getElementById('feedback-submit');
      const originalText = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending...';

      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (res.ok) {
        showStatus('✓ ' + result.message, 'success');
        form.reset();
        charCountSpan.textContent = '0';
        setTimeout(closeModal, 2000);
      } else {
        showStatus('✗ ' + (result.error || 'Failed to submit feedback'), 'error');
      }

      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    } catch (err) {
      showStatus('✗ Connection error. Please try again.', 'error');
      console.error('[Feedback]', err);
    }
  });

  function showStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.className = 'feedback-status ' + type;
    statusDiv.style.display = 'block';
  }
})();
