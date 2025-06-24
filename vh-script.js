// vH-Post Updates Manager Script
let vhData = [];           // Array of rows (arrays)
let vhHasHeader = false;   // Does file contain a header row?
const vhForm = document.getElementById('addForm');
const vhCardsContainer = document.getElementById('cardsContainer');
const vhDownloadBtn = document.getElementById('downloadBtn');
const vhFileInput = document.getElementById('fileInput');
const vhToggleThemeBtn = document.getElementById('toggleTheme');
const vhThemeIcon = document.getElementById('themeIcon');

// Helper to validate yyyy-mm-dd
function vhIsValidDate(val) {
  return /^\d{4}-\d{2}-\d{2}$/.test(val);
}

// File Upload
vhFileInput.onchange = function(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(event) {
    let arr;
    try {
      arr = JSON.parse(event.target.result);
      if (!Array.isArray(arr)) throw "Not array";
      // Check if first row is header
      vhHasHeader = (
        arr[0] &&
        (arr[0][0] || '').toLowerCase().includes('title')
      );
      vhData = arr;
      vhRenderCards();
      vhDownloadBtn.disabled = false;
    } catch (err) {
      alert("File format error! Please upload a valid .json file.");
      vhData = [];
      vhCardsContainer.innerHTML = "";
      vhDownloadBtn.disabled = true;
    }
  };
  reader.readAsText(file);
};

// Render cards
function vhRenderCards() {
  vhCardsContainer.innerHTML = '';
  let rows = vhData;
  let start = 0;
  if (vhHasHeader) start = 1;
  const today = new Date().toISOString().slice(0,10);

  for (let i = start; i < rows.length; ++i) {
    const row = rows[i];
    const card = document.createElement('div');
    card.className = 'vh-data-card';

    // Blink if today's date
    let dateClass = '';
    if (row[4] && row[4].slice(0,10) === today) dateClass = 'vh-blink-today';

    card.innerHTML = `
      <div class="vh-card-title">${row[0]||''}</div>
      <div class="vh-card-url"><a href="${row[1]||'#'}" target="_blank">${row[1]||''}</a></div>
      <div class="vh-card-update">${row[2]||''}</div>
      <div class="vh-card-source"><a href="${row[3]||'#'}" target="_blank">${row[3]||''}</a></div>
      <div class="vh-card-date ${dateClass}">${row[4]||''}</div>
      <div class="vh-card-actions">
        <button class="vh-action-btn edit" onclick="vhEditRow(${i})">Edit</button>
        <button class="vh-action-btn" onclick="vhDeleteRow(${i})">Delete</button>
      </div>
    `;
    vhCardsContainer.appendChild(card);
  }
}

// Edit row
window.vhEditRow = function(index) {
  const row = vhData[index];
  vhForm.title.value = row[0]||'';
  vhForm.url.value = row[1]||'';
  vhForm.updateText.value = row[2]||'';
  vhForm.sourceUrl.value = row[3]||'';
  vhForm.updateDate.value = vhIsValidDate(row[4]) ? row[4] : '';
  vhForm.rowIndex.value = index;
  vhForm.title.focus();
};

// Delete row
window.vhDeleteRow = function(index) {
  if (!confirm("Delete this entry?")) return;
  vhData.splice(index, 1);
  vhRenderCards();
};

// Add/update row
vhForm.onsubmit = function(e) {
  e.preventDefault();
  const row = [
    vhForm.title.value,
    vhForm.url.value,
    vhForm.updateText.value,
    vhForm.sourceUrl.value,
    vhForm.updateDate.value,
  ];
  let idx = vhForm.rowIndex.value !== '' ? +vhForm.rowIndex.value : null;
  if (idx !== null && !isNaN(idx)) {
    vhData[idx] = row;
  } else {
    vhData.push(row);
  }
  vhForm.reset();
  vhForm.rowIndex.value = '';
  vhRenderCards();
};

// Download updated file
vhDownloadBtn.onclick = function() {
  if (!vhData.length) return;
  const blob = new Blob([JSON.stringify(vhData, null, 2)], {type: "application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = "post_updates.json";
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
};

// THEME TOGGLE
function vhSetTheme(mode) {
  document.documentElement.setAttribute('data-theme', mode);
  vhThemeIcon.textContent = mode === 'dark' ? "🌞" : "🌙";
  localStorage.setItem('vh-theme', mode);
}
vhToggleThemeBtn.onclick = function() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  vhSetTheme(isDark ? 'light' : 'dark');
};
// Load theme from storage
(function () {
  let theme = localStorage.getItem('vh-theme');
  if (!theme) {
    theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  vhSetTheme(theme);
})();
