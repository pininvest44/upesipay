const form = document.getElementById('stkForm');
const submitBtn = document.getElementById('submitBtn');
const statusIndicator = document.getElementById('statusIndicator');
const logsBody = document.getElementById('logsBody');

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const phoneNumbersRaw = document.getElementById('phoneNumbers').value;
  const amount = document.getElementById('amount').value;
  const reference = document.getElementById('reference').value;

  const phoneNumbers = phoneNumbersRaw
    .split(/[\n,]+/)
    .map((num) => num.trim())
    .filter((num) => num.length > 0);

  if (phoneNumbers.length === 0) {
    alert('Please enter at least one phone number.');
    return;
  }

  submitBtn.disabled = true;
  statusIndicator.classList.remove('hidden');
  logsBody.innerHTML = '';

  try {
    const res = await fetch('/api/bulk-stk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone_numbers: phoneNumbers, amount, reference })
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Request processing error');
    }

    data.results.forEach((item, index) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${index + 1}</td>
        <td>${item.phone}</td>
        <td>${item.reference}</td>
        <td class="status-${item.status}">${item.status}</td>
        <td>${item.status === 'SUCCESS' ? item.checkout_request_id : item.error}</td>
      `;
      logsBody.appendChild(row);
    });
  } catch (error) {
    alert('Failed to execute bulk requests: ' + error.message);
  } finally {
    submitBtn.disabled = false;
    statusIndicator.classList.add('hidden');
  }
});
