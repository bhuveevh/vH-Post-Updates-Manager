// vH-Post Updates Manager Script (strip style) with Action column/field, icons, url as icon only, filter popup, blink+sort, filtered top on green
let vhData = [];
let vhHasHeader = false;
let vhOriginalFilename = '';
let vhFilterActive = false;
let vhFilterResult = []; // Indices of filtered posts (in data array)
const vhForm = document.getElementById('addForm');
const vhStripContainer = document.getElementById('vh-strip-container');
const vhDownloadBtn = document.getElementById('downloadBtn');
const vhFileInput = document.getElementById('fileInput');
const vhToggleThemeBtn = document.getElementById('toggleTheme');
const vhThemeIcon = document.getElementById('themeIcon');
const vhFilterBtn = document.getElementById('filterBtn');
const vhFilterPopup = document.getElementById('vh-filter-popup');
const vhFilterOverlay = document.getElementById('vh-filter-overlay');
const vhFilterForm = document.getElementById('vh-filter-form');
const vhFilterCancel = document.getElementById('vh-filter-cancel');

function vhIsValidDate(val) {
  return /^\d{4}-\d{2}-\d{2}$/.test(val);
}

// ---------- BLINK & SORT FEATURE HELPERS -----------
function vhGetToday() {
  const d = new Date();
  return d.toISOString().slice(0,10);
}
function vhGetDaysDiff(date1, date2) {
  // date1, date2 in yyyy-mm-dd
  const d1 = new Date(date1), d2 = new Date(date2);
  return Math.floor((d1 - d2) / (1000*60*60*24));
}
function vhIsBlinkDate(val) {
  // val is yyyy-mm-dd, return true if today <= val <= today+2
  if (!vhIsValidDate(val)) return false;
  const today = vhGetToday();
  const diff = vhGetDaysDiff(val, today);
  return diff >= 0 && diff <= 2;
}
function vhIsOutdatedBlinkDate(val) {
  // val is yyyy-mm-dd, return true if diff > 2 and was blinking in the past
  if (!vhIsValidDate(val)) return false;
  const today = vhGetToday();
  const diff = vhGetDaysDiff(val, today);
  return diff > 2;
}
function vhSortRowsBlinkFirst(rows) {
  // Move all rows with blinking date to the start, keeping their order
  const blinkRows = [], otherRows = [];
  for (const row of rows) {
    if (vhIsBlinkDate(row[4])) blinkRows.push(row);
    else otherRows.push(row);
  }
  // Optionally, sort blinkRows by date ascending (soonest first)
  blinkRows.sort((a, b) => (a[4] || '').localeCompare(b[4] || ''));
  return [...blinkRows, ...otherRows];
}
// ---------- END BLINK & SORT FEATURE HELPERS ----------

vhFileInput.onchange = function(e) {
  const file = e.target.files[0];
  vhOriginalFilename = file ? file.name : '';
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(event) {
    let arr;
    try {
      arr = JSON.parse(event.target.result);
      if (!Array.isArray(arr)) throw 0;
      if (!arr.length || !Array.isArray(arr[0])) throw 1;
      vhHasHeader = (
        (arr[0][0] || '').toString().toLowerCase().includes('title')
        && arr[0].length === 5
      );
      vhData = arr;
      vhFilterActive = false;
      vhRenderStrip();
      vhDownloadBtn.disabled = false;
    } catch (err) {
      alert("File format error! Please upload a valid .json file: array of arrays, each with 5 fields.");
      vhData = [];
      vhStripContainer.innerHTML = "";
      vhDownloadBtn.disabled = true;
    }
  };
  reader.readAsText(file);
};

// FILTER POPUP LOGIC
vhFilterBtn.onclick = function() {
  vhFilterPopup.style.display = "block";
  vhFilterOverlay.style.display = "block";
  document.body.style.overflow = "hidden";
  vhFilterForm.reset();
};
vhFilterCancel.onclick = function() {
  vhFilterPopup.style.display = "none";
  vhFilterOverlay.style.display = "none";
  document.body.style.overflow = "";
};
vhFilterOverlay.onclick = vhFilterCancel;

// FILTER FORM SUBMIT
vhFilterForm.onsubmit = function(e) {
  e.preventDefault();
  // collect filter values
  const titleVal = vhFilterForm.filterTitle.value.trim().toLowerCase();
  const dateVal = vhFilterForm.filterDate.value.trim();
  const outDatedChecked = vhFilterForm.filterOutdated.checked;
  let start = vhHasHeader ? 1 : 0;
  vhFilterResult = [];
  for (let i=start; i<vhData.length; ++i) {
    const row = vhData[i];
    let match = true;
    if (titleVal && !(row[0] || '').toLowerCase().includes(titleVal)) match = false;
    if (dateVal && (row[4] !== dateVal)) match = false;
    if (outDatedChecked && !vhIsOutdatedBlinkDate(row[4])) match = false;
    if (match) vhFilterResult.push(i);
  }
  vhFilterActive = !!vhFilterResult.length;
  vhFilterPopup.style.display = "none";
  vhFilterOverlay.style.display = "none";
  document.body.style.overflow = "";
  vhRenderStrip();
};

// STRIP RENDER
function vhRenderStrip() {
  vhStripContainer.innerHTML = '';
  let rows = vhData;
  let start = 0;
  const headings = [
    "Post Title",
    "Post Edit Url",
    "What Update",
    "Update Source Url",
    "Update Date",
    "Action"
  ];
  const headingDiv = document.createElement("div");
  headingDiv.className = "vh-strip-headings";
  headings.forEach(h => {
    const hd = document.createElement("div");
    hd.className = "vh-strip-col";
    hd.textContent = h;
    headingDiv.appendChild(hd);
  });
  vhStripContainer.appendChild(headingDiv);

  if (vhHasHeader) start = 1;
  const dataRows = rows.slice(start);

  // FILTER LOGIC: If filter active, show filtered at top in green, then rest (sorted blink first)
  let restRows = dataRows;
  let filteredRows = [];
  let filteredIndices = [];
  if (vhFilterActive && vhFilterResult.length) {
    filteredIndices = vhFilterResult.map(idx => idx - start);
    filteredRows = filteredIndices.map(idx => dataRows[idx]);
    restRows = dataRows.filter((_, idx) => !filteredIndices.includes(idx));
  }
  // sort restRows with blinking date at top
  restRows = vhSortRowsBlinkFirst(restRows);

  let rowBlocks = [];
  // Filtered highlighted rows (if any)
  filteredRows.forEach((row, i) => {
    const stripRow = vhRenderStripRow(row, vhHasHeader ? vhFilterResult[i] : vhFilterResult[i]);
    stripRow.classList.add("vh-strip-highlight");
    rowBlocks.push(stripRow);
  });
  // Rest (auto-blink and sorted)
  restRows.forEach((row) => {
    // Find index in original data for edit/delete
    let origIdx = vhData.findIndex((r, idx) => (!vhHasHeader || idx>0) && r.join('||') === row.join('||'));
    if (origIdx === -1) origIdx = vhHasHeader ? dataRows.indexOf(row)+1 : dataRows.indexOf(row);
    rowBlocks.push(vhRenderStripRow(row, origIdx));
  });

  rowBlocks.forEach(rb => vhStripContainer.appendChild(rb));
  vhAttachUrlIconHandlers();
}

// Render one row (with blinking date if needed)
function vhRenderStripRow(row, origIndex) {
  const safeRow = [0,1,2,3,4].map(j => (row[j]!==undefined?row[j]:''));
  const stripRow = document.createElement('div');
  stripRow.className = 'vh-strip-row';

  // Post Title
  const col0 = document.createElement('div');
  col0.className = "vh-strip-col";
  col0.innerHTML = `<div class="vh-strip-value">${vhEscape(safeRow[0])}</div>`;

  // Post Edit Url (as web icon)
  const col1 = document.createElement('div');
  col1.className = "vh-strip-col";
  col1.innerHTML = vhUrlIcon(safeRow[1], 'Open Post Edit Url');

  // What Update
  const col2 = document.createElement('div');
  col2.className = "vh-strip-col";
  col2.innerHTML = `<div class="vh-strip-value">${vhEscape(safeRow[2])}</div>`;

  // Update Source Url (as web icon)
  const col3 = document.createElement('div');
  col3.className = "vh-strip-col";
  col3.innerHTML = vhUrlIcon(safeRow[3], 'Open Update Source Url');

  // Update Date (with blink)
  const col4 = document.createElement('div');
  col4.className = "vh-strip-col";
  let dateClass = vhIsBlinkDate(safeRow[4]) ? "vh-blink-today" : "";
  col4.innerHTML = `<div class="vh-strip-date ${dateClass}">${vhEscape(safeRow[4])}</div>`;

  // Actions (icons row)
  const col5 = document.createElement('div');
  col5.className = "vh-strip-col vh-strip-actions";
  col5.innerHTML =
    `<button class="vh-action-btn edit" onclick="vhEditRow(${origIndex})" title="Edit">
      <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15.232 5.232l-10 10V17h1.768l10-10a2 2 0 0 0-2.828-2.828z"/><path d="M12.5 7.5l2 2"/></svg>
    </button>
    <button class="vh-action-btn delete" onclick="vhDeleteRow(${origIndex})" title="Delete">
      <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="14" height="11" rx="2"/><path d="M8 10v4M12 10v4"/><path d="M5 6V4a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2"/></svg>
    </button>`;

  stripRow.appendChild(col0);
  stripRow.appendChild(col1);
  stripRow.appendChild(col2);
  stripRow.appendChild(col3);
  stripRow.appendChild(col4);
  stripRow.appendChild(col5);

  return stripRow;
}

function vhEscape(str) {
  return (''+str).replace(/[<>"'&]/g, s => ({
    '<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','&':'&amp;'
  }[s]));
}

function vhUrlIcon(url, title) {
  if (!url) return `<div class="vh-strip-value"></div>`;
  return `
    <a class="vh-strip-url-icon" href="${vhEscape(url)}" target="_blank" rel="noopener" title="${title}" data-url="${vhEscape(url)}">
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="10" cy="10" r="8"/>
        <path d="M7 10a3 3 0 1 1 6 0 3 3 0 1 1-6 0"/>
        <path d="M10 2v2M10 16v2M2 10h2M16 10h2"/>
      </svg>
    </a>
  `;
}

function vhAttachUrlIconHandlers() {
  document.querySelectorAll('.vh-strip-url-icon').forEach(icon => {
    // Copy to clipboard on right-click
    icon.addEventListener('contextmenu', function(e) {
      e.preventDefault();
      const url = icon.getAttribute('data-url');
      if (navigator.clipboard) {
        navigator.clipboard.writeText(url);
      } else {
        const tmp = document.createElement('textarea');
        tmp.value = url;
        document.body.appendChild(tmp);
        tmp.select();
        document.execCommand('copy');
        document.body.removeChild(tmp);
      }
      icon.setAttribute('title', 'Copied!');
      setTimeout(() => icon.setAttribute('title', 'Open Link'), 1000);
    });
    // Accessibility: Copy to clipboard on long press (mobile)
    let pressTimer;
    icon.addEventListener('mousedown', function(e){
      if(e.button !== 0) return;
      pressTimer = setTimeout(() => {
        const url = icon.getAttribute('data-url');
        if (navigator.clipboard) {
          navigator.clipboard.writeText(url);
        }
        icon.setAttribute('title', 'Copied!');
        setTimeout(() => icon.setAttribute('title', 'Open Link'), 1000);
      }, 700);
    });
    icon.addEventListener('mouseup', function(){
      clearTimeout(pressTimer);
    });
    icon.addEventListener('mouseleave', function(){
      clearTimeout(pressTimer);
    });
  });
}

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

window.vhDeleteRow = function(index) {
  if (!confirm("Delete this entry?")) return;
  vhData.splice(index, 1);
  vhRenderStrip();
};

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
  vhRenderStrip();
  if (vhData && vhData.length) vhDownloadBtn.disabled = false;
};

vhDownloadBtn.onclick = function() {
  if (!vhData.length) return;
  const out = Array.isArray(vhData) ? vhData.filter(r => Array.isArray(r) && r.length === 5) : [];
  if (!out.length) {
    alert("No valid data to save.");
    return;
  }
  let fname = vhOriginalFilename && vhOriginalFilename.endsWith('.json')
    ? vhOriginalFilename
    : 'post_updates.json';
  const blob = new Blob([JSON.stringify(out, null, 2)], {type: "application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fname;
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
(function () {
  let theme = localStorage.getItem('vh-theme');
  if (!theme) {
    theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  vhSetTheme(theme);
})();
