/* ============================================
   SUKOON PWA — App Logic (v3)
   Wisdom Youth Organisation, Thrissur District
   Features: Designation, Full Admin Panel,
             Delegate Directory, Age Groups,
             Optional Program Donation
   ============================================ */

'use strict';

// ─── CONFIG ───────────────────────────────────────────
const CONFIG = {
  SHEET_URL:      'https://script.google.com/macros/s/AKfycbx9MRxu9di0pifs1rNIBniMT3N22CmqDI_AobN8zxI0Jocy8bbwyo14AoPVJ-QJjw9XJQ/exec',
  ADMIN_PASSWORD: 'sukoon2025',
};

// ─── ZONE → UNIT MAPPING (Wisdom Students Thrissur District) ──
const ZONE_UNITS = {
  'Chavakkad':    ['Mannalamkunnu','Akalad','Thiruvathra','Edakazhiyoor'],
  'Pavaratty':    ['Orumanayoor','Padoor','Venkidang','Pavaratty'],
  'Kunnamkulam':  ['Chowallurpadi','Kechery','Paninthadam','Perumpilavu'],
  'Guruvayoor':   ['Vadakkekad','Punnayurkulam','Kochannur','Pillakkad'],
  'Thrissur City':['Poothole','Kallur','Vellanikkara','Ottupara','Attur','Cherpu'],
  'Kodungallur':  ['Eriyad','Karupadanna','Kodakara','Mathilakam'],
  'Kaipamangalam':['Vadanappally','Peringottukara','Koorikuzhi','Koprakalam','Valapad','Thriprayar'],
};

const DESIGNATION_COLORS = {
  'President':      'badge-purple',
  'Vice President': 'badge-blue',
  'Secretary':      'badge-green',
  'Joint Secretary':'badge-orange',
  'Treasurer':      'badge-pink',
  'Member':         'badge-grey',
};

// ─── STATE ─────────────────────────────────────────────
let childIndex = 0;
let deferredInstallPrompt = null;
let isAdminLoggedIn = false;
let allRegistrations = [];   // cached for directory
let activeTab = 'dashboard';

// ─── DOM HELPERS ───────────────────────────────────────
const $ = id => document.getElementById(id);
const $$ = sel => document.querySelectorAll(sel);

// ─── INIT ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  registerServiceWorker();
  initZoneUnit();
  initPhoneMirror();
  initDesignationLevel();
  initMaritalStatus();
  initChildAdd();
  initDonation();
  initFormSubmit();
  initAdminPanel();
  initInstallBanner();
  initOfflineDetection();
});

// ─── SERVICE WORKER ────────────────────────────────────
function registerServiceWorker() {
  if ('serviceWorker' in navigator)
    navigator.serviceWorker.register('./sw.js').catch(() => {});
}

// ─── ZONE → UNIT ──────────────────────────────────────
function initZoneUnit() {
  const zoneEl   = $('zone');
  const unitGrp  = $('unit-group');
  const unitEl   = $('unit');

  zoneEl.addEventListener('change', function () {
    clearError('err-zone', zoneEl);
    const zone = this.value;
    if (zone && ZONE_UNITS[zone]) {
      unitEl.innerHTML = '<option value="">— Select your Unit —</option>';
      ZONE_UNITS[zone].forEach(u => {
        const o = document.createElement('option');
        o.value = o.textContent = u;
        unitEl.appendChild(o);
      });
      unitGrp.style.display = '';
    } else {
      unitGrp.style.display = 'none';
      unitEl.innerHTML = '<option value="">— Select your Unit —</option>';
    }
    clearError('err-unit', unitEl);
  });

  unitEl.addEventListener('change', () => clearError('err-unit', unitEl));
}

// ─── PHONE MIRROR ─────────────────────────────────────
function initPhoneMirror() {
  const tog  = $('same_as_mobile');
  const mob  = $('mobile');
  const mc   = $('mobile_code');
  const wa   = $('whatsapp');
  const wc   = $('whatsapp_code');

  function sync() {
    if (tog.checked) {
      wa.value = mob.value; wc.value = mc.value;
      wa.disabled = wc.disabled = true;
      wa.style.background = '#f0f4f8';
    } else {
      wa.disabled = wc.disabled = false;
      wa.style.background = '';
    }
  }
  tog.addEventListener('change', sync);
  mob.addEventListener('input', sync);
  mc.addEventListener('change', sync);
}

// ─── DESIGNATION LEVEL TABS ───────────────────────────
function initDesignationLevel() {
  $$('.dlevel-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.dlevel-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      $('desig_level').value = btn.dataset.level;
      clearError('err-desig-level', null);
    });
  });

  $('designation').addEventListener('change', function () {
    clearError('err-designation', this);
  });
}

// ─── MARITAL STATUS ───────────────────────────────────
function initMaritalStatus() {
  $$('input[name="marital_status"]').forEach(r => {
    r.addEventListener('change', function () {
      updateFamilySection(this.value === 'Married');
      clearError('err-marital', null);
    });
  });
}

function updateFamilySection(isMarried) {
  $('pill-married').classList.toggle('selected', isMarried);
  $('pill-single').classList.toggle('selected', !isMarried);

  ['family-note','spouse-section','children-section','reason-section'].forEach(id => {
    $(id).classList.toggle('hidden', !isMarried);
  });

  if (!isMarried) {
    $('spouse_name').value = '';
    $('spouse_mobile').value = '';
    $('spouse_not_attending').checked = false;
    $('children-container').innerHTML = '';
    childIndex = 0;
    $('reason_not_coming').value = '';
  }
}

// ─── CHILDREN ─────────────────────────────────────────
function initChildAdd() {
  $('add-child-btn').addEventListener('click', addChild);
}

function addChild() {
  const idx = childIndex++;
  const row = document.createElement('div');
  row.className = 'child-row';
  row.innerHTML = `
    <button type="button" class="btn-remove-child" onclick="removeChild(this)">✕</button>
    <div class="field-row-2">
      <div class="field-group">
        <label class="child-label">Child's Name</label>
        <input type="text" name="child_name[]" class="field-input" placeholder="Full name" />
      </div>
      <div class="field-group">
        <label class="child-label">Age</label>
        <input type="number" name="child_age[]" class="field-input" placeholder="Age" min="0" max="18" />
      </div>
      <div class="field-group">
        <label class="child-label">Gender</label>
        <select name="child_sex[]" class="field-select">
          <option value="">Select</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
        </select>
      </div>
    </div>
    <label class="not-attending-label" for="child_na_${idx}">
      <input type="checkbox" id="child_na_${idx}" name="child_not_attending[]" value="${idx}" />
      <div class="na-inner">
        <span class="na-x">❌</span>
        <span class="na-text">പങ്കെടുക്കില്ല — Child not attending</span>
      </div>
    </label>
  `;
  $('children-container').appendChild(row);
}

function removeChild(btn) { btn.closest('.child-row').remove(); }

// ─── DONATION OPTION ──────────────────────────────────
function initDonation() {
  const toggle = $('want_to_donate');
  const group = $('donation-amount-group');
  const amountInput = $('donation_amount');

  toggle.addEventListener('change', function() {
    if (this.checked) {
      group.classList.remove('hidden');
      amountInput.focus();
    } else {
      group.classList.add('hidden');
      amountInput.value = '';
      clearError('err-donation', amountInput);
    }
  });

  amountInput.addEventListener('input', () => clearError('err-donation', amountInput));
}

// ─── VALIDATION ──────────────────────────────────────
function clearError(id, el) {
  if (id && $(id)) $(id).textContent = '';
  if (el)  el.classList.remove('has-error');
}

function setError(id, msg, el) {
  if (id && $(id)) $(id).textContent = msg;
  if (el)  el.classList.add('has-error');
}

function clearAllErrors() {
  $$('.field-error').forEach(e => e.textContent = '');
  $$('.has-error').forEach(e => e.classList.remove('has-error'));
}

function validateForm() {
  clearAllErrors();
  let ok = true;

  const nameEl = $('name');
  if (!nameEl.value.trim()) { setError('err-name','Please enter your full name', nameEl); ok = false; }

  const mobEl = $('mobile');
  const mob = mobEl.value.trim();
  if (!mob) { setError('err-mobile','Please enter your mobile number', mobEl); ok = false; }
  else if (!/^\d{8,15}$/.test(mob)) { setError('err-mobile','Enter a valid mobile number (8–15 digits)', mobEl); ok = false; }

  const waEl = $('whatsapp');
  if (!waEl.value.trim()) { setError('err-whatsapp','Please enter your WhatsApp number', waEl); ok = false; }

  const zoneEl = $('zone');
  if (!zoneEl.value) { setError('err-zone','Please select your zone', zoneEl); ok = false; }

  if ($('unit-group').style.display !== 'none' && zoneEl.value) {
    const unitEl = $('unit');
    if (!unitEl.value) { setError('err-unit','Please select your unit', unitEl); ok = false; }
  }

  if (!$('desig_level').value) {
    setError('err-desig-level','Please select a designation level'); ok = false;
  }

  const desigEl = $('designation');
  if (!desigEl.value) { setError('err-designation','Please select your designation', desigEl); ok = false; }

  if (!document.querySelector('input[name="marital_status"]:checked')) {
    setError('err-marital','Please select your marital status'); ok = false;
  }

  // Donation validation
  const wantDonate = $('want_to_donate')?.checked;
  const donateAmtEl = $('donation_amount');
  if (wantDonate) {
    const amt = parseFloat(donateAmtEl.value);
    if (isNaN(amt) || amt <= 0) {
      setError('err-donation', 'Please enter a valid donation amount (₹)', donateAmtEl);
      ok = false;
    }
  }

  if (!ok) {
    const first = document.querySelector('.has-error, .field-error:not(:empty)');
    first?.closest('.field-group, .radio-pill-group, .desig-level-tabs')
          ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  return ok;
}

// ─── FORM SUBMIT ──────────────────────────────────────
function initFormSubmit() {
  $('sukoon-form').addEventListener('submit', async e => {
    e.preventDefault();
    if (!validateForm()) return;

    const data = collectFormData();
    const btn = $('submit-btn'), txt = $('submit-text'), spin = $('submit-spinner');
    btn.disabled = true; txt.classList.add('hidden'); spin.classList.remove('hidden');

    try {
      if (!navigator.onLine) {
        await savePending(data);
        showSuccess();
        showToast('📶','Saved locally — will sync when online','success');
        return;
      }
      await submitToSheets(data);
      showSuccess();
      showToast('🎉','Registration submitted successfully!','success');
    } catch {
      await savePending(data);
      showSuccess();
      showToast('⚠️','Saved locally — will sync later','success');
    } finally {
      btn.disabled = false; txt.classList.remove('hidden'); spin.classList.add('hidden');
    }
  });
}

function collectFormData() {
  const marital   = document.querySelector('input[name="marital_status"]:checked')?.value || '';
  const childNames = [...$$('input[name="child_name[]"]')].map(e => e.value);
  const childAges  = [...$$('input[name="child_age[]"]')].map(e => e.value);
  const childSexes = [...$$('select[name="child_sex[]"]')].map(e => e.value);
  const childNA    = [...$$('input[name="child_not_attending[]"]:checked')].map(e => e.value);
  const children   = childNames.map((n, i) => ({
    name: n||'', age: childAges[i]||'', sex: childSexes[i]||'',
    not_attending: childNA.includes(String(i))
  }));

  const wantDonate = $('want_to_donate')?.checked ? 'Yes' : 'No';
  const donateAmt  = wantDonate === 'Yes' ? (parseFloat($('donation_amount')?.value) || 0) : 0;

  return {
    timestamp:            new Date().toISOString(),
    name:                 $('name').value.trim(),
    mobile_code:          $('mobile_code').value,
    mobile:               $('mobile').value.trim(),
    whatsapp_code:        $('whatsapp_code').value,
    whatsapp:             $('whatsapp').value.trim(),
    zone:                 $('zone').value,
    unit:                 $('unit')?.value || '',
    designation_level:    $('desig_level').value,
    designation:          $('designation').value,
    marital_status:       marital,
    spouse_name:          $('spouse_name')?.value.trim() || '',
    spouse_mobile:        $('spouse_mobile')?.value.trim() || '',
    spouse_not_attending: $('spouse_not_attending')?.checked ? 'Yes' : 'No',
    children:             JSON.stringify(children),
    reason_not_coming:    $('reason_not_coming')?.value.trim() || '',
    want_to_donate:       wantDonate,
    donation_amount:      donateAmt,
  };
}

async function submitToSheets(data) {
  if (CONFIG.SHEET_URL === 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE') {
    await new Promise(r => setTimeout(r, 1200)); return;
  }
  const fd = new FormData();
  Object.entries(data).forEach(([k,v]) => fd.append(k,v));
  await fetch(CONFIG.SHEET_URL, { method:'POST', body:fd, mode:'no-cors' });
}

// ─── OFFLINE / INDEXEDDB ──────────────────────────────
function openDB() {
  return new Promise((res,rej) => {
    const r = indexedDB.open('SukoonDB', 1);
    r.onupgradeneeded = e => e.target.result.createObjectStore('pending',{keyPath:'id',autoIncrement:true});
    r.onsuccess = e => res(e.target.result);
    r.onerror   = e => rej(e.target.error);
  });
}
async function savePending(data) {
  const db = await openDB();
  db.transaction('pending','readwrite').objectStore('pending').add({url:CONFIG.SHEET_URL,data,savedAt:Date.now()});
}
async function syncPending() {
  if (!navigator.onLine || CONFIG.SHEET_URL.includes('YOUR_GOOGLE')) return;
  try {
    const db = await openDB();
    const all = await new Promise((res,rej) => {
      const r = db.transaction('pending').objectStore('pending').getAll();
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    });
    for (const item of all) {
      try {
        await submitToSheets(item.data);
        db.transaction('pending','readwrite').objectStore('pending').delete(item.id);
      } catch {}
    }
  } catch {}
}

// ─── SUCCESS / RESET ─────────────────────────────────
function showSuccess() {
  $('sukoon-form').classList.add('hidden');
  $('success-state').classList.remove('hidden');
  window.scrollTo({top:0,behavior:'smooth'});
}

function resetForm() {
  $('sukoon-form').reset();
  ['sukoon-form'].forEach(id => $(id).classList.remove('hidden'));
  $('success-state').classList.add('hidden');
  $('unit-group').style.display = 'none';
  ['family-note','spouse-section','children-section','reason-section'].forEach(id => $(id).classList.add('hidden'));
  $('children-container').innerHTML = '';
  childIndex = 0;
  $$('.radio-pill').forEach(p => p.classList.remove('selected'));
  $$('.dlevel-btn').forEach(b => b.classList.remove('active'));
  $('desig_level').value = '';
  
  // Donation reset
  if ($('want_to_donate')) $('want_to_donate').checked = false;
  if ($('donation-amount-group')) $('donation-amount-group').classList.add('hidden');
  if ($('donation_amount')) $('donation_amount').value = '';

  clearAllErrors();
  $('whatsapp').disabled = $('whatsapp_code').disabled = false;
  $('whatsapp').style.background = '';
  window.scrollTo({top:0,behavior:'smooth'});
}

// ══════════════════════════════════════════════════════
//  ADMIN PANEL
// ══════════════════════════════════════════════════════
function initAdminPanel() {
  $('admin-fab-btn').addEventListener('click', () => {
    $('admin-modal').classList.remove('hidden');
    if (isAdminLoggedIn) showDashboard();
    else $('admin-password').focus();
  });

  $('modal-close-btn').addEventListener('click', closeModal);
  $('admin-modal').addEventListener('click', e => { if (e.target === $('admin-modal')) closeModal(); });

  $('admin-login-btn').addEventListener('click', doLogin);
  $('admin-password').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });

  $('refresh-stats-btn').addEventListener('click', () => { fetchStats(); fetchDirectory(); });
  $('export-csv-btn').addEventListener('click', exportCSV);
  $('admin-logout-btn').addEventListener('click', doLogout);

  // Tab switching
  $$('.atab').forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });

  // Directory filters
  $('dir-search').addEventListener('input', filterDirectory);
  $('dir-filter-zone').addEventListener('change', filterDirectory);
  $('dir-filter-desig').addEventListener('change', filterDirectory);
}

function closeModal() { $('admin-modal').classList.add('hidden'); }

function doLogin() {
  if ($('admin-password').value === CONFIG.ADMIN_PASSWORD) {
    isAdminLoggedIn = true;
    showDashboard();
  } else {
    setError('err-admin-pass','Incorrect password. Try again.', $('admin-password'));
    $('admin-password').value = '';
    $('admin-password').focus();
    $('admin-password').style.animation = 'none';
    $('admin-password').offsetHeight;
    $('admin-password').style.animation = 'shake 0.4s ease';
  }
}

function doLogout() {
  isAdminLoggedIn = false;
  $('admin-dashboard').classList.add('hidden');
  $('admin-login-panel').classList.remove('hidden');
  $('admin-password').value = '';
}

function showDashboard() {
  $('admin-login-panel').classList.add('hidden');
  $('admin-dashboard').classList.remove('hidden');
  switchTab('dashboard');
  fetchStats();
  fetchDirectory();
}

function switchTab(tab) {
  activeTab = tab;
  $$('.atab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  $$('.tab-panel').forEach(p => p.classList.add('hidden'));
  $(`tab-${tab}`).classList.remove('hidden');
}

// ─── FETCH STATS ────────────────────────────────────
async function fetchStats() {
  ['stat-total','stat-family','stat-single','stat-attendees','stat-spouses','stat-children',
   'stat-donation','age-below5','age-5to10','age-11to18'].forEach(id => { if ($(id)) $(id).textContent = '…'; });
  $('zone-stats-list').innerHTML = '';
  $('unit-stats-list').innerHTML = '';
  $('desig-stats-list').innerHTML = '';

  if (CONFIG.SHEET_URL.includes('YOUR_GOOGLE')) {
    await new Promise(r => setTimeout(r, 600));
    renderStats(buildDemoStats());
    return;
  }
  try {
    const res  = await fetch(`${CONFIG.SHEET_URL}?action=stats`);
    const json = await res.json();
    renderStats(json);
  } catch { showToast('❌','Failed to load stats','error'); }
}

function buildDemoStats() {
  return {
    total: 64, married: 44, single: 20, totalAttendees: 158,
    spouseCount: 38, childrenCount: 52,
    ageBelow5: 14, age5to10: 24, age11to18: 14,
    totalDonation: 28500,
    zones: { 'Thrissur City':14,'Chavakkad':11,'Kunnamkulam':10,'Guruvayoor':9,'Kodungallur':8,'Pavaratty':7,'Kaipamangalam':5 },
    units: { 'Poothole':7,'Mannalamkunnu':6,'Kallur':5,'Chowallurpadi':5,'Orumanayoor':4,'Eriyad':4,'Vadanappally':4 },
    designations: { 'Member':28,'Secretary':12,'President':8,'Vice President':7,'Treasurer':5,'Joint Secretary':4 },
  };
}

function renderStats(d) {
  animCount('stat-total',     d.total       || 0);
  animCount('stat-family',    d.married     || 0);
  animCount('stat-single',    d.single      || 0);
  animCount('stat-attendees', d.totalAttendees || 0);
  animCount('stat-spouses',   d.spouseCount || 0);
  animCount('stat-children',  d.childrenCount || 0);
  animCount('age-below5',     d.ageBelow5   || 0);
  animCount('age-5to10',      d.age5to10    || 0);
  animCount('age-11to18',     d.age11to18   || 0);

  // Donation formatted as currency
  if ($('stat-donation')) {
    animCountFormatted('stat-donation', d.totalDonation || 0, '₹');
  }

  renderBarList('zone-stats-list',  d.zones       || {}, 'Zone');
  renderBarList('unit-stats-list',  d.units       || {}, 'Unit');
  renderBarList('desig-stats-list', d.designations|| {}, '');

  $('last-updated').textContent = 'Last updated: ' + new Date().toLocaleTimeString('en-IN');
}

function renderBarList(containerId, obj, suffix) {
  const el  = $(containerId);
  el.innerHTML = '';
  if (!Object.keys(obj).length) { el.innerHTML = '<div style="padding:8px;color:#64748b;font-size:13px;">No data yet</div>'; return; }
  const max = Math.max(...Object.values(obj), 1);
  Object.entries(obj).sort(([,a],[,b]) => b-a).forEach(([name, count]) => {
    const pct = Math.round((count/max)*100);
    const row = document.createElement('div');
    row.className = 'zone-row';
    row.innerHTML = `
      <div class="zone-row-top">
        <span class="zone-name">${name}${suffix ? ' '+suffix : ''}</span>
        <span class="zone-count">${count}</span>
      </div>
      <div class="zone-bar-bg"><div class="zone-bar-fill" style="width:0%" data-pct="${pct}"></div></div>
    `;
    el.appendChild(row);
  });
  setTimeout(() => el.querySelectorAll('.zone-bar-fill').forEach(b => b.style.width = b.dataset.pct+'%'), 80);
}

function animCount(id, target) {
  const el = $(id); if (!el) return;
  let c = 0; const s = Math.ceil(target/25);
  const t = setInterval(() => { c = Math.min(c+s, target); el.textContent = c; if (c >= target) clearInterval(t); }, 35);
}

function animCountFormatted(id, target, prefix = '₹') {
  const el = $(id); if (!el) return;
  let c = 0; const s = Math.ceil(target/25);
  const t = setInterval(() => {
    c = Math.min(c+s, target);
    el.textContent = `${prefix}${c.toLocaleString('en-IN')}`;
    if (c >= target) clearInterval(t);
  }, 35);
}

// ─── DELEGATE DIRECTORY ──────────────────────────────
async function fetchDirectory() {
  $('dir-tbody').innerHTML = '<tr><td colspan="14" class="dir-empty">Loading...</td></tr>';

  if (CONFIG.SHEET_URL.includes('YOUR_GOOGLE')) {
    await new Promise(r => setTimeout(r, 500));
    allRegistrations = buildDemoRegistrations();
    renderDirectory(allRegistrations);
    return;
  }
  try {
    const res  = await fetch(`${CONFIG.SHEET_URL}?action=all`);
    const json = await res.json();
    allRegistrations = json.rows || [];
    renderDirectory(allRegistrations);
  } catch { $('dir-tbody').innerHTML = '<tr><td colspan="14" class="dir-empty">Failed to load data.</td></tr>'; }
}

function buildDemoRegistrations() {
  const zones = Object.keys(ZONE_UNITS);
  const desigs = ['President','Vice President','Secretary','Joint Secretary','Treasurer','Member'];
  const levels = ['District','Zone','Unit'];
  const names  = ['Abdul Latheef','Mohammed Rafi','Faisal K','Shafeeq T','Suhail K','Anees M','Najeeb A','Yahya B','Salim P','Kareem N','Mubarak T','Riyad H'];
  return Array.from({length:18}, (_, i) => {
    const zone = zones[i % zones.length];
    const units = ZONE_UNITS[zone];
    const unit  = units[i % units.length];
    const married = i % 3 !== 0;
    const children = married && i % 2 === 0 ? [
      { name:`Child ${i}A`, age: (i%5)+1, sex:'Male', not_attending: false },
      { name:`Child ${i}B`, age: (i%10)+5, sex:'Female', not_attending: false },
    ] : [];
    const donationAmt = i % 2 === 0 ? (i + 1) * 250 : 0;

    return {
      sr: i+1,
      timestamp: new Date(Date.now() - i * 86400000).toISOString(),
      name: names[i % names.length],
      mobile: `98${String(i+1).padStart(8,'0')}`,
      whatsapp: `98${String(i+1).padStart(8,'0')}`,
      zone, unit,
      designation_level: levels[i % 3],
      designation: desigs[i % desigs.length],
      marital_status: married ? 'Married' : 'Single',
      spouse_name: married ? `Spouse of ${names[i % names.length]}` : '',
      spouse_mobile: married ? `90${String(i+1).padStart(8,'0')}` : '',
      spouse_not_attending: i % 5 === 0 ? 'Yes' : 'No',
      children: JSON.stringify(children),
      reason_not_coming: '',
      want_to_donate: donationAmt > 0 ? 'Yes' : 'No',
      donation_amount: donationAmt,
    };
  });
}

function renderDirectory(rows) {
  const tbody = $('dir-tbody');
  tbody.innerHTML = '';
  $('dir-count').textContent = `Showing ${rows.length} registration${rows.length !== 1 ? 's' : ''}`;

  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="14" class="dir-empty">No registrations found.</td></tr>';
    return;
  }

  rows.forEach((r, i) => {
    let children = [];
    try { children = JSON.parse(r.children || '[]'); } catch {}

    const childPills = children.map(c => {
      const age = parseInt(c.age);
      const ag = isNaN(age) ? '' : age < 5 ? ' 🍼' : age <= 10 ? ' 📚' : ' 🎓';
      return `<span class="child-pill">${c.name||'–'} (${c.age||'?'}y${ag}) ${c.sex||''} ${c.not_attending ? '❌':''}</span>`;
    }).join('');

    const dColor = DESIGNATION_COLORS[r.designation] || 'badge-grey';
    const lColor = r.designation_level === 'District' ? 'badge-purple' : r.designation_level === 'Zone' ? 'badge-blue' : 'badge-green';

    const donAmt = parseFloat(r.donation_amount || 0);
    const donBadge = donAmt > 0 ? `<span class="badge badge-gold">₹${donAmt.toLocaleString('en-IN')}</span>` : '—';

    const ts = r.timestamp ? new Date(r.timestamp).toLocaleString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}) : '—';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="dir-row-num">${i+1}</td>
      <td><strong>${esc(r.name)}</strong></td>
      <td>${esc(r.mobile_code||'')} ${esc(r.mobile)}</td>
      <td>${esc(r.whatsapp_code||'')} ${esc(r.whatsapp||r.mobile)}</td>
      <td><span class="badge badge-blue">${esc(r.zone)}</span></td>
      <td>${esc(r.unit)}</td>
      <td><span class="badge ${lColor}">${esc(r.designation_level||'—')}</span></td>
      <td><span class="badge ${dColor}">${esc(r.designation||'—')}</span></td>
      <td><span class="badge ${r.marital_status==='Married'?'badge-green':'badge-grey'}">${esc(r.marital_status||'—')}</span></td>
      <td>${r.spouse_name ? `${esc(r.spouse_name)}${r.spouse_not_attending==='Yes'?' ❌':''}` : '—'}</td>
      <td>${esc(r.spouse_mobile||'—')}</td>
      <td style="min-width:160px;">${childPills || '—'}</td>
      <td>${donBadge}</td>
      <td style="white-space:nowrap;">${ts}</td>
    `;
    tbody.appendChild(tr);
  });
}

function filterDirectory() {
  const q    = $('dir-search').value.toLowerCase().trim();
  const zone = $('dir-filter-zone').value;
  const desig= $('dir-filter-desig').value;

  const filtered = allRegistrations.filter(r => {
    const matchQ    = !q || `${r.name} ${r.mobile} ${r.zone} ${r.unit} ${r.designation}`.toLowerCase().includes(q);
    const matchZone = !zone  || r.zone === zone;
    const matchDesig= !desig || r.designation === desig;
    return matchQ && matchZone && matchDesig;
  });

  renderDirectory(filtered);
}

function esc(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ─── EXPORT CSV ───────────────────────────────────────
function exportCSV() {
  const headers = ['#','Name','Mobile','WhatsApp','Zone','Unit','Desig. Level','Designation',
                   'Marital Status','Spouse Name','Spouse Mobile','Spouse Not Attending',
                   'Children Details','Reason Not Coming','Willing To Donate','Donation Amount (₹)','Registered At'];
  const rows = allRegistrations.map((r, i) => {
    let children = [];
    try { children = JSON.parse(r.children || '[]'); } catch {}
    const childStr = children.map(c => `${c.name}(${c.age}y,${c.sex}${c.not_attending?',NA':''})`).join('; ');
    return [
      i+1, r.name, (r.mobile_code||'+91')+r.mobile, (r.whatsapp_code||'+91')+(r.whatsapp||r.mobile),
      r.zone, r.unit, r.designation_level, r.designation, r.marital_status,
      r.spouse_name||'', r.spouse_mobile||'', r.spouse_not_attending||'No',
      childStr, r.reason_not_coming||'',
      r.want_to_donate||'No', r.donation_amount||0, r.timestamp||''
    ].map(v => `"${String(v).replace(/"/g,'""')}"`).join(',');
  });

  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `sukoon_delegates_${new Date().toISOString().slice(0,10)}.csv`;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
  showToast('✅','CSV exported!','success');
}

// ─── INSTALL BANNER ───────────────────────────────────
function initInstallBanner() {
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault(); deferredInstallPrompt = e;
    setTimeout(() => $('install-banner').classList.remove('hidden'), 5000);
  });
  $('install-btn').addEventListener('click', async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    const r = await deferredInstallPrompt.userChoice;
    if (r.outcome === 'accepted') showToast('✅','App installed!','success');
    deferredInstallPrompt = null;
    $('install-banner').classList.add('hidden');
  });
  $('dismiss-btn').addEventListener('click', () => $('install-banner').classList.add('hidden'));
  window.addEventListener('appinstalled', () => {
    $('install-banner').classList.add('hidden'); showToast('✅','Sukoon installed!','success');
  });
}

// ─── OFFLINE ──────────────────────────────────────────
function initOfflineDetection() {
  function update() {
    $('offline-notice').classList.toggle('hidden', navigator.onLine);
    if (navigator.onLine) syncPending();
  }
  window.addEventListener('online', update);
  window.addEventListener('offline', update);
  update();
}

// ─── TOAST ────────────────────────────────────────────
function showToast(icon, msg, type = '') {
  const t = $('toast');
  $('toast-icon').textContent = icon;
  $('toast-msg').textContent = msg;
  t.className = 'toast' + (type ? ` toast-${type}` : '');
  clearTimeout(t._t);
  t._t = setTimeout(() => t.classList.add('hidden'), 3500);
}

// ─── SHAKE CSS ────────────────────────────────────────
const shakeCSS = document.createElement('style');
shakeCSS.textContent = `
  @keyframes shake {
    0%,100%{ transform:translateX(0); }
    20%    { transform:translateX(-8px); }
    40%    { transform:translateX(8px); }
    60%    { transform:translateX(-5px); }
    80%    { transform:translateX(5px); }
  }
`;
document.head.appendChild(shakeCSS);

// ─── GLOBALS ──────────────────────────────────────────
window.resetForm   = resetForm;
window.removeChild = removeChild;
