// ── IRIS Report & Emergency System ────────────────────────────────────────────────
(function() {
  const modal = document.getElementById('report-modal');
  const closeBtn = document.getElementById('report-modal-close');
  const cancelBtn = document.getElementById('report-cancel');
  const form = document.getElementById('report-form');
  const descriptionInput = document.getElementById('report-description');
  const charCountSpan = document.getElementById('report-char-count');
  const statusDiv = document.getElementById('report-status');

  if (!modal) return;

  // Open modal function (called from iris-nav.js via dropdown menu)
  window.openReportModal = function() {
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

  // Character counter (1000 char limit)
  descriptionInput.addEventListener('input', () => {
    const len = descriptionInput.value.length;
    charCountSpan.textContent = Math.min(len, 1000);
    if (len > 1000) {
      descriptionInput.value = descriptionInput.value.slice(0, 1000);
    }
  });

  // Form submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const description = descriptionInput.value.trim();
    if (description.length < 10) {
      showStatus('Description must be at least 10 characters', 'error');
      return;
    }

    const reportType = document.getElementById('report-type').value;
    const severity = document.getElementById('report-severity').value;
    const location = document.getElementById('report-location').value.trim();
    const state = document.getElementById('report-state').value.trim();
    const phone = document.getElementById('report-phone').value.trim();
    const email = document.getElementById('report-email').value.trim();

    if (!reportType || !severity || !location || !state) {
      showStatus('Please fill in all required fields', 'error');
      return;
    }

    const data = {
      report_type: reportType,
      severity: severity,
      location: location,
      state: state,
      description: description,
      contact_phone: phone,
      contact_email: email,
    };

    try {
      const submitBtn = document.getElementById('report-submit');
      const originalText = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = 'Submitting...';

      const res = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (res.ok) {
        const msg = severity === 'critical' 
          ? '🚨 EMERGENCY REPORT SUBMITTED - Authorities have been alerted' 
          : '✓ Report submitted successfully. Thank you for your contribution to environmental safety.';
        showStatus(msg, 'success');
        form.reset();
        charCountSpan.textContent = '0';
        setTimeout(closeModal, 2000);
      } else {
        showStatus('✗ ' + (result.error || 'Failed to submit report'), 'error');
      }

      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    } catch (err) {
      showStatus('✗ Connection error. Please try again.', 'error');
      console.error('[Report]', err);
    }
  });

  function showStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.className = 'report-status ' + type;
    statusDiv.style.display = 'block';
    
    // Auto-hide success messages after 3 seconds
    if (type === 'success') {
      setTimeout(() => {
        statusDiv.style.display = 'none';
      }, 3000);
    }
  }
})();
