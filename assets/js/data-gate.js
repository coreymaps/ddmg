// Password gate for /data page
// Password is verified server-side via Netlify Function.
// No GCS URLs exist in the client until authentication succeeds.

(function () {
  var form = document.getElementById('pw-form');
  var content = document.getElementById('data-content');
  var input = document.getElementById('pw-input');
  var error = document.getElementById('pw-error');
  var submitBtn = document.getElementById('pw-submit');
  var spinner = document.getElementById('loading-spinner');
  var downloadTable = document.getElementById('download-table');

  // Display name mapping for GCS folder names
  var DISPLAY_NAMES = {
    gaza: 'Gaza Strip — Israel-Palestine 2023\u2013',
    ukraine: 'Ukraine — Russia-Ukraine 2022\u2013',
    iran_2026: 'Iran — Israel-Iran 2026'
  };

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  function formatSize(bytes) {
    if (!bytes || bytes === 0) return '\u2014';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
  }

  function renderDownloads(datasets) {
    var keys = Object.keys(datasets).sort();
    if (keys.length === 0) {
      downloadTable.innerHTML = '<p>No datasets currently available.</p>';
      return;
    }

    var html = '<table style="width: 100%; border-collapse: collapse; margin: 1.5rem 0;">';
    html += '<thead><tr style="border-bottom: 2px solid #555;">';
    html += '<th style="padding: 0.75rem; text-align: left;">Dataset</th>';
    html += '<th style="padding: 0.75rem; text-align: left;">File</th>';
    html += '<th style="padding: 0.75rem; text-align: right;">Size</th>';
    html += '</tr></thead><tbody>';

    keys.forEach(function (id) {
      var files = datasets[id];
      var label = DISPLAY_NAMES[id] || id.replace(/_/g, ' ');

      files.forEach(function (file, i) {
        html += '<tr style="border-bottom: 1px solid #333;">';
        if (i === 0) {
          html += '<td style="padding: 0.75rem; vertical-align: top;" rowspan="' + files.length + '">' + escapeHtml(label) + '</td>';
        }
        html += '<td style="padding: 0.75rem;"><a href="' + escapeHtml(file.url) + '" rel="noopener">' + escapeHtml(file.name) + '</a></td>';
        html += '<td style="padding: 0.75rem; text-align: right; white-space: nowrap;">' + formatSize(file.size) + '</td>';
        html += '</tr>';
      });
    });

    html += '</tbody></table>';
    html += '<p style="color: #aaa; font-size: 0.85rem;">Download links expire after 1 hour. Refresh the page to generate new links.</p>';
    downloadTable.innerHTML = html;
  }

  function showContent(datasets) {
    form.style.display = 'none';
    spinner.style.display = 'none';
    content.style.display = 'block';
    renderDownloads(datasets);
  }

  // Restore from session cache if links are less than 50 minutes old
  var cached = sessionStorage.getItem('dataDownloads');
  var cachedTime = parseInt(sessionStorage.getItem('dataDownloadsTime'), 10);
  if (cached && cachedTime && (Date.now() - cachedTime < 50 * 60 * 1000)) {
    try {
      showContent(JSON.parse(cached));
    } catch (e) {
      sessionStorage.removeItem('dataDownloads');
      sessionStorage.removeItem('dataDownloadsTime');
    }
  }

  function submit() {
    var password = input.value;
    if (!password) return;

    error.textContent = '';
    submitBtn.disabled = true;
    submitBtn.textContent = 'Verifying\u2026';
    form.style.display = 'none';
    spinner.style.display = 'block';

    fetch('/.netlify/functions/get-downloads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: password }),
    })
      .then(function (res) {
        if (res.status === 401) {
          spinner.style.display = 'none';
          form.style.display = 'block';
          error.textContent = 'Incorrect password.';
          input.value = '';
          input.focus();
          return null;
        }
        if (!res.ok) {
          throw new Error('HTTP ' + res.status);
        }
        return res.json();
      })
      .then(function (data) {
        if (data && data.datasets) {
          sessionStorage.setItem('dataDownloads', JSON.stringify(data.datasets));
          sessionStorage.setItem('dataDownloadsTime', String(Date.now()));
          showContent(data.datasets);
        }
      })
      .catch(function () {
        spinner.style.display = 'none';
        form.style.display = 'block';
        error.textContent = 'Something went wrong. Please try again.';
      })
      .finally(function () {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit';
      });
  }

  submitBtn.addEventListener('click', submit);

  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      submit();
    }
  });
})();
