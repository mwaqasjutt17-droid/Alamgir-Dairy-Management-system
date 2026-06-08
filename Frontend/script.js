// ===================== AUTH STATE =====================
let currentUser = null;

function getToken() {
  return localStorage.getItem('dairy_token');
}
function setToken(token, user) {
  localStorage.setItem('dairy_token', token);
  localStorage.setItem('dairy_user', JSON.stringify(user));
  currentUser = user;
}
function clearToken() {
  localStorage.removeItem('dairy_token');
  localStorage.removeItem('dairy_user');
  currentUser = null;
}
function loadStoredUser() {
  const u = localStorage.getItem('dairy_user');
  if (u) { try { currentUser = JSON.parse(u); } catch(e) { currentUser = null; } }
}

// ===================== APP STATE =====================
let batches = [];
let fleetData = [];
let currentResult = null;
let toolPlrHistory = [];

// Detect API URL — works served from backend (port 5000), file://, or separate local server (e.g. port 3000/5500)
const isLocal = window.location.protocol === 'file:' || 
  window.location.origin === 'null' || 
  ((window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && window.location.port !== '5000');

const PROD_API_URL = 'https://alamgir-dairy-management-system-hx4.vercel.app/api';

const API_URL = isLocal ? 'http://localhost:5000/api' : PROD_API_URL;

// ===================== API FETCH UTILITY =====================
async function apiFetch(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };
  const res = await fetch(`${API_URL}${endpoint}`, { credentials: 'include', ...options, headers });
  if (res.status === 401) {
    handleAuthError();
    throw new Error('Unauthorized');
  }
  return res;
}

// ===================== AUTH ERROR HANDLER =====================
function handleAuthError() {
  clearToken();
  updateNavUser();
  showAuthModal();
}

// ===================== SHOW / HIDE AUTH MODAL =====================
function showAuthModal(tab = 'login') {
  document.getElementById('authModal').classList.add('active');
  const loginErr = document.getElementById('loginError');
  const regErr = document.getElementById('registerError');
  if (loginErr) loginErr.textContent = '';
  if (regErr) regErr.textContent = '';
  switchAuthTab(tab);
}
function hideAuthModal() {
  document.getElementById('authModal').classList.remove('active');
}
function switchAuthTab(tab) {
  document.getElementById('loginForm').style.display  = tab === 'login'    ? 'flex' : 'none';
  document.getElementById('registerForm').style.display = tab === 'register' ? 'flex' : 'none';
  document.querySelectorAll('.auth-tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelector(`.auth-tab-btn[data-tab="${tab}"]`).classList.add('active');
  const loginErr = document.getElementById('loginError');
  const regErr = document.getElementById('registerError');
  if (loginErr) loginErr.textContent = '';
  if (regErr) regErr.textContent = '';
}

// ===================== CUSTOM CONFIRM DIALOG =====================
function customConfirm({ title, message, subtext, confirmText = 'Confirm', cancelText = 'Cancel', type = 'danger' }) {
  return new Promise((resolve) => {
    const modal = document.getElementById('confirmModal');
    const titleEl = document.getElementById('confirmTitle');
    const messageEl = document.getElementById('confirmMessage');
    const subtextEl = document.getElementById('confirmSubtext');
    const iconEl = document.getElementById('confirmIcon');
    const cancelBtn = document.getElementById('confirmCancelBtn');
    const okBtn = document.getElementById('confirmOkBtn');

    titleEl.textContent = title;
    messageEl.textContent = message;
    subtextEl.textContent = subtext || '';

    // Style by type
    if (type === 'danger') {
      iconEl.textContent = '🗑️';
      iconEl.style.cssText = 'font-size: 44px; padding: 14px; background: rgba(255, 79, 86, 0.08); border-radius: 50%; border: 1px solid rgba(255, 79, 86, 0.2); color: var(--red);';
      okBtn.className = 'btn btn-danger';
      okBtn.style.flex = '1';
    } else if (type === 'warning') {
      iconEl.textContent = '⚠️';
      iconEl.style.cssText = 'font-size: 44px; padding: 14px; background: rgba(255, 181, 71, 0.08); border-radius: 50%; border: 1px solid rgba(255, 181, 71, 0.2); color: var(--amber);';
      okBtn.className = 'btn';
      okBtn.style.cssText = 'flex: 1; background: var(--amber-bg); border-color: rgba(255, 181, 71, 0.3); color: var(--amber);';
    } else {
      iconEl.textContent = '🥛';
      iconEl.style.cssText = 'font-size: 44px; padding: 14px; background: rgba(77, 159, 255, 0.08); border-radius: 50%; border: 1px solid rgba(77, 159, 255, 0.2); color: var(--blue);';
      okBtn.className = 'btn btn-primary';
      okBtn.style.flex = '1';
    }

    okBtn.textContent = confirmText;
    cancelBtn.textContent = cancelText;

    modal.classList.add('active');

    function handleConfirm() {
      cleanup();
      resolve(true);
    }
    function handleCancel() {
      cleanup();
      resolve(false);
    }
    function cleanup() {
      modal.classList.remove('active');
      okBtn.removeEventListener('click', handleConfirm);
      cancelBtn.removeEventListener('click', handleCancel);
    }

    okBtn.addEventListener('click', handleConfirm);
    cancelBtn.addEventListener('click', handleCancel);
  });
}

// ===================== LOGIN =====================
async function login() {
  const email    = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const errEl    = document.getElementById('loginError');
  const btn      = document.getElementById('loginBtn');
  if (!email || !password) { if (errEl) errEl.textContent = 'Please enter email and password.'; return; }

  btn.disabled = true;
  btn.textContent = 'Logging in…';
  try {
    const res  = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const json = await res.json();
    if (!res.ok) { if (errEl) errEl.textContent = json.message || 'Login failed.'; return; }
    setToken(json.data.token, json.data.user);
    hideAuthModal();
    updateNavUser();
    await initData();
  } catch(e) {
    if (errEl) errEl.textContent = 'Could not reach the server. Make sure the backend is running.';
  } finally {
    btn.disabled = false;
    btn.textContent = '🔑 Login';
  }
}

// ===================== REGISTER =====================
async function register() {
  const name     = document.getElementById('regName').value.trim();
  const email    = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value;
  const errEl    = document.getElementById('registerError');
  const btn      = document.getElementById('registerBtn');
  if (!name || !email || !password) { if (errEl) errEl.textContent = 'Please fill in all fields.'; return; }

  btn.disabled = true;
  btn.textContent = 'Creating account…';
  try {
    const res  = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });
    const json = await res.json();
    if (!res.ok) { if (errEl) errEl.textContent = json.message || 'Registration failed.'; return; }
    setToken(json.data.token, json.data.user);
    hideAuthModal();
    updateNavUser();
    await initData();
  } catch(e) {
    if (errEl) errEl.textContent = 'Could not reach the server. Make sure the backend is running.';
  } finally {
    btn.disabled = false;
    btn.textContent = '✅ Create Account';
  }
}

// ===================== LOGOUT =====================
async function logout() {
  try { await apiFetch('/auth/logout', { method: 'POST' }); } catch(e) { /* ignore */ }
  clearToken();
  batches   = [];
  fleetData = [];
  updateNavUser();
  renderRecent();
  renderFleet();
  showPage('lab', null);
  showAuthModal();
}

// ===================== UPDATE NAV USER DISPLAY =====================
function updateNavUser() {
  const el = document.getElementById('navUser');
  if (currentUser) {
    el.innerHTML = `
      <span class="nav-user-name">👤 ${currentUser.name}</span>
      <span class="badge badge-blue" style="font-size:9px;padding:2px 7px;margin-left:4px">${currentUser.role}</span>
      <button class="btn btn-ghost btn-sm" id="logoutBtn" onclick="logout()" style="margin-left:10px;padding:4px 10px;font-size:11px">Logout</button>
    `;
  } else {
    el.innerHTML = `<button class="btn btn-ghost btn-sm" onclick="showAuthModal('login')" style="font-size:11px">🔑 Login</button>`;
  }
}

// ===================== CLOCK =====================
function updateClock(){
  const d = new Date();
  document.getElementById('clock').textContent = d.toLocaleString('en-PK',{weekday:'short',hour:'2-digit',minute:'2-digit',second:'2-digit'});
}
setInterval(updateClock, 1000);
updateClock();

// ===================== NAV =====================
function showPage(id, evt) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  document.getElementById('page-' + id).classList.add('active');
  if (evt) evt.target.classList.add('active');
  else {
    const tab = document.querySelector(`.nav-tab[data-page="${id}"]`);
    if (tab) tab.classList.add('active');
  }
  if (id === 'history')   renderHistory();
  if (id === 'fleet')     renderFleet();
  if (id === 'analytics') renderAnalytics();
  if (id === 'tools')     initToolsPage();
}

// ===================== PRICING METHOD TOGGLE =====================
function switchMethod(val, btn){
  document.getElementById('pricingMethod').value = val;
  document.querySelectorAll('.method-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('tsConfig').style.display = val === 'ts' ? 'block' : 'none';
  document.getElementById('twoaxisConfig').style.display = val === 'twoaxis' ? 'block' : 'none';
}

document.getElementById('pricingMethod').addEventListener('change', function(){
  document.getElementById('tsConfig').style.display = this.value === 'ts' ? 'block' : 'none';
  document.getElementById('twoaxisConfig').style.display = this.value === 'twoaxis' ? 'block' : 'none';
});

// ===================== PROCESS ENTRY =====================
function processEntry(){
  const container = document.getElementById('containerId').value.trim();
  const supplier  = document.getElementById('supplierName').value.trim() || '—';
  const qty       = parseFloat(document.getElementById('quantity').value);
  const fat       = parseFloat(document.getElementById('fat').value);
  const lr        = parseFloat(document.getElementById('lr').value);
  const protein   = document.getElementById('protein').value ? parseFloat(document.getElementById('protein').value) : null;
  const lactose   = document.getElementById('lactose').value ? parseFloat(document.getElementById('lactose').value) : null;
  const temp      = document.getElementById('temp').value    ? parseFloat(document.getElementById('temp').value)    : null;
  const dateVal   = document.getElementById('intakeDate').value || new Date().toISOString().split('T')[0];

  if (!container || isNaN(qty) || isNaN(fat) || isNaN(lr)){
    alert('Please fill in Container ID, Quantity, Fat%, and LR.');
    return;
  }

  const method     = document.getElementById('pricingMethod').value;
  const baseRate   = parseFloat(document.getElementById('baseRate').value)  || 180;
  const tsDivisor  = parseFloat(document.getElementById('tsDivisor').value) || 13;
  const fatRate    = parseFloat(document.getElementById('fatRate').value)    || 25;
  const snfRate    = parseFloat(document.getElementById('snfRate').value)    || 15;
  const minFat     = parseFloat(document.getElementById('minFat').value)     || 3.0;
  const minSnf     = parseFloat(document.getElementById('minSnf').value)     || 8.0;
  const lrThreshold = parseFloat(document.getElementById('lrThreshold').value) || 26;

  const snf       = (0.25 * lr) + (0.22 * fat) + 0.72;
  const ts        = fat + snf;
  const totalTs   = (ts * qty) / 13;
  const waterFlag = lr < lrThreshold;
  const pass      = !waterFlag && fat >= minFat && snf >= minSnf;

  let ppl;
  if (method === 'ts') { ppl = (ts / tsDivisor) * baseRate; }
  else { ppl = (fat * fatRate) + (snf * snfRate); }
  const total = ppl * qty;

  currentResult = { id: container, supplier, date: dateVal, qty, fat, lr, snf, ts, totalTs, ppl, total, pass, waterFlag, protein, lactose, temp, method };

  const panel = document.getElementById('resultPanel');
  panel.style.display = 'block';
  panel.classList.remove('fade-in'); void panel.offsetWidth; panel.classList.add('fade-in');

  document.getElementById('printDate').textContent  = 'Date: ' + dateVal + ' | Time: ' + new Date().toLocaleTimeString();
  document.getElementById('resultTitle').textContent = 'BATCH: ' + container + ' — ' + supplier;
  document.getElementById('resultMeta').textContent  = qty + ' L | ' + dateVal + ' | Method: ' + (method === 'ts' ? 'TS-Based' : 'Two-Axis');

  document.getElementById('outSnf').textContent   = snf.toFixed(2) + '%';
  document.getElementById('outTs').textContent    = ts.toFixed(2) + '%';
  document.getElementById('outTotalTs').textContent = totalTs.toFixed(2);
  document.getElementById('outPpl').textContent   = 'Rs.' + ppl.toFixed(2);
  document.getElementById('outTotal').textContent = 'Rs.' + total.toLocaleString('en-PK', {minimumFractionDigits:2, maximumFractionDigits:2});

  const badge = document.getElementById('statusBadge');
  if (pass) { badge.textContent = '✓ PASSED'; badge.className = 'badge badge-green'; }
  else       { badge.textContent = '✗ REJECTED'; badge.className = 'badge badge-red'; }

  const fatPct = Math.min((fat / 6) * 100, 100);
  const snfPct = Math.min((snf / 12) * 100, 100);
  const lrPct  = Math.min((lr / 36) * 100, 100);
  const tsPct  = Math.min((ts / 18) * 100, 100);
  document.getElementById('barFat').style.width = fatPct + '%';
  document.getElementById('barFatVal').textContent = fat.toFixed(1) + '%';
  document.getElementById('barSnf').style.width = snfPct + '%';
  document.getElementById('barSnfVal').textContent = snf.toFixed(2) + '%';
  document.getElementById('barLr').style.width = lrPct + '%';
  document.getElementById('barLrVal').textContent = lr.toFixed(1);
  document.getElementById('barTs').style.width = tsPct + '%';
  document.getElementById('barTsVal').textContent = ts.toFixed(2) + '%';

  document.getElementById('alertAdulteration').style.display = waterFlag ? 'flex' : 'none';
  document.getElementById('alertTemp').style.display = (temp !== null && temp > 8) ? 'flex' : 'none';

  let rows = '';
  const add = (l, v, c='') => { rows += `<tr><td style="color:var(--text2);padding:6px 10px;font-size:12px">${l}</td><td style="padding:6px 10px;font-family:'Space Mono',monospace;font-size:12px;color:${c||'var(--text)'}">${v}</td></tr>`; };
  add('Fat %', fat.toFixed(2) + '%', 'var(--amber)');
  add('Lactometer (LR)', lr.toFixed(1));
  add('SNF = (0.25×LR)+(0.22×Fat%)+0.72', snf.toFixed(4) + '%', 'var(--blue)');
  add('Total Solids (TS = Fat + SNF)', ts.toFixed(4) + '%', 'var(--purple)');
  if (protein) add('Protein %', protein.toFixed(2) + '%');
  if (lactose) add('Lactose %', lactose.toFixed(2) + '%');
  if (temp !== null) add('Temperature', temp.toFixed(1) + '°C', temp > 8 ? 'var(--red)' : 'var(--green)');
  add('Quantity', qty.toLocaleString() + ' L');
  add('Total TS (TS% × Qty / 13)', totalTs.toFixed(2), 'var(--purple)');
  add('Pricing Method', method === 'ts' ? 'TS-Based' : 'Two-Axis');
  if (method === 'ts') {
    add('Formula', '(' + ts.toFixed(2) + ' ÷ ' + tsDivisor + ') × ' + baseRate);
    add('Price/Liter', 'Rs. ' + ppl.toFixed(4));
  } else {
    add('Formula', '(' + fat.toFixed(2) + '×' + fatRate + ')+(' + snf.toFixed(2) + '×' + snfRate + ')');
    add('Price/Liter', 'Rs. ' + ppl.toFixed(4));
  }
  add('Total Payable', 'Rs. ' + total.toFixed(2), 'var(--green)');
  document.getElementById('breakdownTable').innerHTML = rows;

  panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  renderRecent();
}

// ===================== SAVE BATCH =====================
async function saveBatch(){
  if (!currentResult) { alert('Process a batch first.'); return; }
  if (!getToken())    { showAuthModal(); return; }

  if (batches.find(b => b.id === currentResult.id)){
    const confirmOverwrite = await customConfirm({
      title: 'Overwrite Batch',
      message: `Batch ${currentResult.id} is already saved.`,
      subtext: 'Do you want to overwrite the existing record?',
      confirmText: '🔄 Overwrite',
      cancelText: 'Cancel',
      type: 'warning'
    });
    if (!confirmOverwrite) return;
    try { await apiFetch(`/batches/${currentResult.id}`, { method: 'DELETE' }); } catch(e) { console.error(e); }
    batches = batches.filter(b => b.id !== currentResult.id);
  }

  try {
    const res = await apiFetch('/batches', { method: 'POST', body: JSON.stringify(currentResult) });
    if (!res.ok) { const j = await res.json(); throw new Error(j.message || 'Failed to save'); }
    const responseJson = await res.json();
    batches.unshift(responseJson.data);
    showToast('✅ Batch saved to history!', 'green');
    renderRecent();
  } catch(e) {
    if (e.message !== 'Unauthorized') {
      console.error(e);
      alert('Failed to save batch: ' + e.message);
    }
  }
}

// ===================== RENDER RECENT =====================
function renderRecent(){
  const tb = document.getElementById('recentTable');
  const batchCountEl = document.getElementById('batchCount');
  if (batchCountEl) {
    batchCountEl.textContent = batches.length;
  }
  if (!tb) return;
  if (batches.length === 0){
    tb.innerHTML = '<tr><td colspan="6" style="color:var(--text3);text-align:center;padding:24px">No batches yet</td></tr>';
    return;
  }
  tb.innerHTML = batches.slice(0, 5).map(b => `
    <tr>
      <td class="mono" style="color:var(--blue)">${b.id}</td>
      <td>${Number(b.fat).toFixed(1)}%</td>
      <td>${Number(b.snf).toFixed(2)}%</td>
      <td>${Number(b.qty).toLocaleString()}</td>
      <td class="mono">Rs.${Number(b.ppl).toFixed(2)}</td>
      <td><span class="badge ${b.pass ? 'badge-green' : 'badge-red'}">${b.pass ? 'Pass' : 'Fail'}</span></td>
    </tr>`).join('');
}

// ===================== RESET FORM =====================
function resetForm(){
  ['containerId','quantity','fat','lr','protein','lactose','temp'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.getElementById('resultPanel').style.display = 'none';
  currentResult = null;
}

// ===================== HISTORY PAGE =====================
function renderHistory(){
  const q = (document.getElementById('searchBatch').value || '').toLowerCase();
  let data = batches.filter(b => b.id.toLowerCase().includes(q) || (b.supplier || '').toLowerCase().includes(q));
  const tb = document.getElementById('historyTable');
  if (data.length === 0){
    tb.innerHTML = '<tr><td colspan="13" style="color:var(--text3);text-align:center;padding:36px">No records found</td></tr>';
  } else {
    tb.innerHTML = data.map((b, i) => {
      const itemTotalTs = b.totalTs !== undefined ? b.totalTs : ((Number(b.ts) * Number(b.qty)) / 13);
      return `
        <tr>
          <td class="mono" style="color:var(--blue)">${b.id}</td>
          <td style="color:var(--text2)">${b.supplier || '—'}</td>
          <td style="color:var(--text3)">${b.date || '—'}</td>
          <td>${Number(b.qty).toLocaleString()}</td>
          <td style="color:var(--amber)">${Number(b.fat).toFixed(1)}%</td>
          <td><span style="color:${b.waterFlag ? 'var(--red)' : 'var(--text)'}">${Number(b.lr).toFixed(1)}</span></td>
          <td style="color:var(--blue)">${Number(b.snf).toFixed(2)}%</td>
          <td style="color:var(--purple)">${Number(b.ts).toFixed(2)}%</td>
          <td style="color:var(--purple)">${Number(itemTotalTs).toFixed(2)}</td>
          <td class="mono">Rs.${Number(b.ppl).toFixed(2)}</td>
          <td class="mono" style="color:var(--green)">Rs.${Number(b.total).toLocaleString('en-PK',{minimumFractionDigits:0,maximumFractionDigits:0})}</td>
          <td><span class="badge ${b.pass ? 'badge-green' : 'badge-red'}">${b.pass ? 'Pass' : 'Fail'}</span></td>
          <td><button class="btn btn-ghost btn-sm" onclick="deleteBatch(${i})">✕</button></td>
        </tr>`;
    }).join('');
  }
  const totalQ   = data.reduce((a, b) => a + Number(b.qty), 0);
  const totalT   = data.reduce((a, b) => a + Number(b.total), 0);
  const totalTsSum = data.reduce((a, b) => a + Number(b.totalTs !== undefined ? b.totalTs : ((Number(b.ts) * Number(b.qty)) / 13)), 0);
  const avgF     = data.length ? data.reduce((a, b) => a + Number(b.fat), 0) / data.length : 0;
  const passed   = data.filter(b => b.pass).length;
  document.getElementById('sumQty').textContent   = totalQ.toLocaleString() + ' L';
  document.getElementById('sumTotalTs').textContent = totalTsSum.toFixed(2);
  document.getElementById('sumTotal').textContent = 'Rs ' + totalT.toLocaleString('en-PK', {maximumFractionDigits:0});
  document.getElementById('avgFat').textContent   = data.length ? avgF.toFixed(2) + '%' : '—';
  document.getElementById('passRate').textContent = data.length ? Math.round(passed / data.length * 100) + '%' : '—';
}

async function deleteBatch(i){
  const confirmDelete = await customConfirm({
    title: 'Delete Batch',
    message: 'Are you sure you want to delete this batch record?',
    subtext: `ID: ${batches[i].id}`,
    confirmText: '🗑️ Delete',
    cancelText: 'Cancel',
    type: 'danger'
  });
  if (confirmDelete) {
    const batchId = batches[i].id;
    try {
      await apiFetch(`/batches/${batchId}`, { method: 'DELETE' });
      batches.splice(i, 1);
      renderHistory();
      renderRecent();
      showToast('Batch deleted.', 'amber');
    } catch(e) {
      if (e.message !== 'Unauthorized') { console.error(e); alert('Failed to delete batch.'); }
    }
  }
}

async function clearHistory(){
  const confirmClear = await customConfirm({
    title: 'Clear Batch History',
    message: 'Are you sure you want to delete ALL batch history?',
    subtext: 'This action cannot be undone!',
    confirmText: '🗑️ Yes, Delete All',
    cancelText: 'Cancel',
    type: 'danger'
  });
  if (confirmClear) {
    try {
      await apiFetch('/batches', { method: 'DELETE' });
      batches = [];
      renderHistory();
      renderRecent();
      showToast('All batches cleared.', 'amber');
    } catch(e) {
      if (e.message !== 'Unauthorized') { console.error(e); alert('Failed to clear history.'); }
    }
  }
}

function exportCSV(){
  if (!batches.length) { alert('No data to export.'); return; }
  const hd   = 'ID,Supplier,Date,Qty(L),Fat%,LR,SNF%,TS%,Total TS,Rs/L,Total(Rs),Status\n';
  const rows = batches.map(b => {
    const itemTotalTs = b.totalTs !== undefined ? b.totalTs : ((Number(b.ts) * Number(b.qty)) / 13);
    return [
      b.id, b.supplier, b.date, b.qty,
      Number(b.fat).toFixed(2), Number(b.lr).toFixed(1), Number(b.snf).toFixed(2),
      Number(b.ts).toFixed(2),  Number(itemTotalTs).toFixed(2), Number(b.ppl).toFixed(2), Number(b.total).toFixed(2),
      b.pass ? 'Pass' : 'Fail'
    ].join(',');
  }).join('\n');
  const blob = new Blob([hd + rows], {type:'text/csv'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'dairy_batches.csv';
  a.click();
}

// ===================== FLEET PAGE =====================
async function addFleet(){
  const v = document.getElementById('vehicleNo').value.trim();
  const d = document.getElementById('driverName').value.trim();
  const r = document.getElementById('route').value.trim();
  const f = parseFloat(document.getElementById('fuel').value) || 0;
  const c = parseFloat(document.getElementById('cargo').value) || 0;
  const s = document.getElementById('dispatchStatus').value;
  if (!v || !d || !r) { alert('Please fill Vehicle, Driver, and Route.'); return; }
  if (!getToken())    { showAuthModal(); return; }

  const payload = { id: Date.now(), vehicle: v, driver: d, route: r, cargo: c, fuel: f, status: s };
  try {
    const res = await apiFetch('/fleet', { method: 'POST', body: JSON.stringify(payload) });
    if (!res.ok) { const j = await res.json(); throw new Error(j.message || 'Failed to save'); }
    const responseJson = await res.json();
    fleetData.unshift(responseJson.data);
    ['vehicleNo','driverName','route','fuel','cargo'].forEach(id => { document.getElementById(id).value = ''; });
    renderFleet();
    showToast('✅ Fleet dispatch logged!', 'green');
  } catch(e) {
    if (e.message !== 'Unauthorized') { console.error(e); alert('Failed to add fleet record: ' + e.message); }
  }
}

function renderFleet(){
  const statusColor = {['In Transit']:'badge-amber', ['Completed']:'badge-green', ['Delayed']:'badge-red', ['Cancelled']:'badge-blue'};
  const tb = document.getElementById('fleetTable');
  if (!fleetData.length){
    tb.innerHTML = '<tr><td colspan="7" style="color:var(--text3);text-align:center;padding:36px">No fleet logs yet</td></tr>';
  } else {
    tb.innerHTML = fleetData.map((f, i) => `
      <tr>
        <td><span class="fleet-vehicle">🚛 ${f.vehicle}</span></td>
        <td style="color:var(--text)">${f.driver}</td>
        <td style="color:var(--text2);font-size:12px">${f.route}</td>
        <td class="mono">${Number(f.cargo).toLocaleString()} L</td>
        <td class="mono">${f.fuel} L</td>
        <td><span class="badge ${statusColor[f.status] || 'badge-blue'}">${f.status}</span></td>
        <td><button class="btn btn-ghost btn-sm" onclick="deleteFleet(${i})">✕</button></td>
      </tr>`).join('');
  }
  document.getElementById('fleetTotal').textContent   = fleetData.length;
  document.getElementById('fleetTransit').textContent = fleetData.filter(f => f.status === 'In Transit').length;
  document.getElementById('fleetDone').textContent    = fleetData.filter(f => f.status === 'Completed').length;
  document.getElementById('fleetFuel').textContent    = fleetData.reduce((a, b) => a + Number(b.fuel), 0).toFixed(1) + ' L';
}

async function deleteFleet(i){
  const confirmDelete = await customConfirm({
    title: 'Delete Fleet Record',
    message: 'Are you sure you want to delete this fleet dispatch record?',
    subtext: `Vehicle: ${fleetData[i].vehicle} | Driver: ${fleetData[i].driver}`,
    confirmText: '🗑️ Delete',
    cancelText: 'Cancel',
    type: 'danger'
  });
  if (!confirmDelete) return;
  const logId = fleetData[i].id;
  try {
    await apiFetch(`/fleet/${logId}`, { method: 'DELETE' });
    fleetData.splice(i, 1);
    renderFleet();
    showToast('Fleet record deleted.', 'amber');
  } catch(e) {
    if (e.message !== 'Unauthorized') { console.error(e); alert('Failed to delete fleet record.'); }
  }
}

async function clearFleet(){
  const confirmClear = await customConfirm({
    title: 'Clear Fleet Logs',
    message: 'Are you sure you want to delete ALL fleet logs?',
    subtext: 'This action cannot be undone!',
    confirmText: '🗑️ Yes, Delete All',
    cancelText: 'Cancel',
    type: 'danger'
  });
  if (confirmClear) {
    try {
      await apiFetch('/fleet', { method: 'DELETE' });
      fleetData = [];
      renderFleet();
      showToast('All fleet logs cleared.', 'amber');
    } catch(e) {
      if (e.message !== 'Unauthorized') { console.error(e); alert('Failed to clear fleet logs.'); }
    }
  }
}

function exportFleetCSV(){
  if (!fleetData.length) { alert('No fleet data.'); return; }
  const hd   = 'Vehicle,Driver,Route,Cargo(L),Fuel(L),Status\n';
  const rows = fleetData.map(f => [f.vehicle, f.driver, f.route, f.cargo, f.fuel, f.status].join(',')).join('\n');
  const blob = new Blob([hd + rows], {type:'text/csv'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'fleet_log.csv';
  a.click();
}

// ===================== ANALYTICS =====================
let chartFatInst = null, chartQualityInst = null, chartPplInst = null;

function renderAnalytics(){
  const b = batches;
  document.getElementById('an-batches').textContent = b.length;
  document.getElementById('an-vol').textContent     = b.reduce((a, x) => a + Number(x.qty), 0).toLocaleString() + ' L';
  document.getElementById('an-paid').textContent    = 'Rs ' + b.reduce((a, x) => a + Number(x.total), 0).toLocaleString('en-PK', {maximumFractionDigits:0});
  document.getElementById('an-rej').textContent     = b.filter(x => !x.pass).length;

  const fatBuckets = [0, 0, 0, 0, 0];
  b.forEach(x => {
    const f = Number(x.fat);
    if (f < 2.5)      fatBuckets[0]++;
    else if (f < 3.0) fatBuckets[1]++;
    else if (f < 3.5) fatBuckets[2]++;
    else if (f < 4.0) fatBuckets[3]++;
    else              fatBuckets[4]++;
  });

  if (chartFatInst) chartFatInst.destroy();
  chartFatInst = new Chart(document.getElementById('chartFat'), {
    type: 'bar',
    data: {
      labels: ['< 2.5%', '2.5–3%', '3–3.5%', '3.5–4%', '4%+'],
      datasets: [{
        label: 'Batches',
        data: fatBuckets,
        backgroundColor: ['rgba(255,79,86,0.7)','rgba(255,181,71,0.7)','rgba(77,159,255,0.7)','rgba(34,217,131,0.7)','rgba(176,108,255,0.7)'],
        borderColor: ['var(--red)','var(--amber)','var(--blue)','var(--green)','var(--purple)'],
        borderWidth: 1, borderRadius: 6
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, ticks: { color: '#4d6585' }, grid: { color: '#1e2d45' } },
        x: { ticks: { color: '#4d6585' }, grid: { display: false } }
      }
    }
  });

  const passed = b.filter(x => x.pass).length;
  const failed = b.length - passed;
  if (chartQualityInst) chartQualityInst.destroy();
  chartQualityInst = new Chart(document.getElementById('chartQuality'), {
    type: 'doughnut',
    data: {
      labels: ['Passed', 'Failed'],
      datasets: [{
        data: [passed || 1, failed],
        backgroundColor: ['rgba(34,217,131,0.75)', 'rgba(255,79,86,0.75)'],
        borderColor: ['var(--green)', 'var(--red)'],
        borderWidth: 1
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      cutout: '65%',
      plugins: { legend: { labels: { color: '#8ea7c8', padding: 18, font: { family: 'Sora', size: 12 } } } }
    }
  });

  const recent = b.slice(0, 15).reverse();
  if (chartPplInst) chartPplInst.destroy();
  chartPplInst = new Chart(document.getElementById('chartPpl'), {
    type: 'line',
    data: {
      labels: recent.map(x => x.id),
      datasets: [{
        label: 'Rs/L',
        data: recent.map(x => parseFloat(Number(x.ppl).toFixed(2))),
        borderColor: '#4d9fff',
        backgroundColor: 'rgba(77,159,255,0.06)',
        fill: true, tension: 0.4,
        pointRadius: 5, pointBackgroundColor: '#4d9fff',
        pointBorderColor: '#080c12', pointBorderWidth: 2, pointHoverRadius: 7
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { ticks: { color: '#4d6585', callback: v => 'Rs ' + v }, grid: { color: '#1e2d45' } },
        x: { ticks: { color: '#4d6585', maxRotation: 45 }, grid: { display: false } }
      }
    }
  });
}

// ===================== ADMIN =====================
async function saveAdmin(){
  const dairyName      = document.getElementById('adminName').value.trim();
  const defaultSupplier = document.getElementById('adminSupplier').value.trim();
  const currencySymbol  = document.getElementById('adminCurrency').value.trim();
  if (!getToken()) { showAuthModal(); return; }
  try {
    const res  = await apiFetch('/settings', { method: 'PUT', body: JSON.stringify({ dairyName, defaultSupplier, currencySymbol }) });
    const json = await res.json();
    if (res.ok) showToast('✅ Settings saved successfully!', 'green');
    else alert('Error: ' + json.message);
  } catch(e) {
    if (e.message !== 'Unauthorized') { console.error(e); alert('Failed to save settings.'); }
  }
}

// ===================== TOAST NOTIFICATIONS =====================
function showToast(message, type = 'green') {
  const colors = { green: 'var(--green)', amber: 'var(--amber)', red: 'var(--red)', blue: 'var(--blue)' };
  const toast = document.createElement('div');
  toast.textContent = message;
  toast.style.cssText = `
    position:fixed;bottom:28px;right:28px;z-index:9999;
    background:#0d1520;border:1px solid ${colors[type]||colors.green};
    color:${colors[type]||colors.green};border-radius:8px;
    padding:12px 20px;font-size:13px;font-family:'Sora',sans-serif;
    box-shadow:0 4px 24px rgba(0,0,0,0.5);
    animation:toastIn .25s ease;
    max-width:320px;
  `;
  document.body.appendChild(toast);
  setTimeout(() => { toast.style.opacity='0'; toast.style.transition='opacity .3s'; setTimeout(() => toast.remove(), 300); }, 2800);
}

// ===================== TOOLS & CALCULATORS =====================

function calcKgToLiterRealtime() {
  const kg = parseFloat(document.getElementById('convKg').value);
  const density = parseFloat(document.getElementById('convDensity').value);
  const resVal = document.getElementById('convResult');
  const formulaVal = document.getElementById('convFormula');
  const validationVal = document.getElementById('convValidation');

  validationVal.textContent = '';

  if (isNaN(kg) || isNaN(density)) {
    resVal.textContent = '—';
    formulaVal.textContent = '— ÷ —';
    return;
  }

  if (kg <= 0) {
    validationVal.textContent = 'Milk weight (KG) must be greater than 0.';
    resVal.textContent = '—';
    formulaVal.textContent = '— ÷ —';
    return;
  }

  if (density <= 0) {
    validationVal.textContent = 'Density must be greater than 0.';
    resVal.textContent = '—';
    formulaVal.textContent = '— ÷ —';
    return;
  }

  const liter = kg / density;
  resVal.textContent = liter.toFixed(2);
  formulaVal.textContent = `${kg.toFixed(2)} ÷ ${density.toFixed(3)}`;
}

async function calcKgToLiterApi() {
  const kg = parseFloat(document.getElementById('convKg').value);
  const density = parseFloat(document.getElementById('convDensity').value);
  const apiBtn = document.getElementById('convApiBtn');
  const apiResult = document.getElementById('convApiResult');

  if (isNaN(kg) || isNaN(density) || kg <= 0 || density <= 0) {
    alert('Please enter valid positive values for Weight and Density.');
    return;
  }

  apiBtn.disabled = true;
  apiBtn.textContent = 'Verifying…';
  apiResult.style.display = 'none';

  try {
    const res = await apiFetch('/calculations/kg-to-liter', {
      method: 'POST',
      body: JSON.stringify({ kg, density })
    });
    const json = await res.json();
    if (!res.ok) {
      alert('API Error: ' + (json.message || 'Verification failed.'));
      return;
    }
    apiResult.style.display = 'block';
    apiResult.innerHTML = `
      <div style="color:var(--teal);margin-bottom:6px">✓ Backend API Response (200 OK)</div>
      <div>Input KG: <span style="color:var(--text)">${json.kg}</span></div>
      <div>Input Density: <span style="color:var(--text)">${json.density}</span></div>
      <div>Calculated Liters: <span style="color:var(--teal);font-weight:700">${json.liter}</span></div>
    `;
    showToast('✅ Verification successful!', 'green');
  } catch (e) {
    if (e.message !== 'Unauthorized') {
      console.error(e);
      alert('Could not verify via backend API. Ensure connection is active.');
    }
  } finally {
    apiBtn.disabled = false;
    apiBtn.textContent = '🔗 Verify via Backend API';
  }
}

function calcToolPerLiterRate() {
  const ts = parseFloat(document.getElementById('toolTs').value);
  const baseRate = parseFloat(document.getElementById('toolBaseRate').value);
  const resVal = document.getElementById('toolPlrResult');
  const formulaVal = document.getElementById('toolPlrFormula');

  if (isNaN(ts) || isNaN(baseRate) || ts <= 0 || baseRate <= 0) {
    resVal.textContent = '—';
    formulaVal.textContent = '— × — ÷ 13';
    return;
  }

  const rate = (ts * baseRate) / 13;
  resVal.textContent = rate.toFixed(2);
  formulaVal.textContent = `${ts.toFixed(2)} × ${baseRate.toFixed(0)} ÷ 13`;
}

async function calcToolPerLiterRateApi() {
  const ts = parseFloat(document.getElementById('toolTs').value);
  const baseRate = parseFloat(document.getElementById('toolBaseRate').value);
  const apiBtn = document.getElementById('toolPlrApiBtn');
  const apiResult = document.getElementById('toolPlrApiResult');

  if (isNaN(ts) || isNaN(baseRate) || ts <= 0 || baseRate <= 0) {
    alert('Please enter valid positive values for TS and Base Rate.');
    return;
  }

  apiBtn.disabled = true;
  apiBtn.textContent = 'Verifying…';
  apiResult.style.display = 'none';

  try {
    const res = await apiFetch('/calculations/per-liter-rate', {
      method: 'POST',
      body: JSON.stringify({ ts, baseRate })
    });
    const json = await res.json();
    if (!res.ok) {
      alert('API Error: ' + (json.message || 'Verification failed.'));
      return;
    }
    apiResult.style.display = 'block';
    apiResult.innerHTML = `
      <div style="color:var(--amber);margin-bottom:6px">✓ Backend API Response (200 OK)</div>
      <div>Input TS %: <span style="color:var(--text)">${json.ts}%</span></div>
      <div>Base Rate: <span style="color:var(--text)">Rs. ${json.baseRate}</span></div>
      <div>Calculated Rate: <span style="color:var(--amber);font-weight:700">Rs. ${json.perLiterRate}</span></div>
    `;
    showToast('✅ Verification successful!', 'green');
    // Auto save calculation to history
    saveToolPlrHistory(json.ts, json.baseRate, json.perLiterRate, true);
  } catch (e) {
    if (e.message !== 'Unauthorized') {
      console.error(e);
      alert('Could not verify via backend API. Ensure connection is active.');
    }
  } finally {
    apiBtn.disabled = false;
    apiBtn.textContent = '🔗 Verify via Backend API';
  }
}

function loadToolPlrHistory() {
  const data = localStorage.getItem('tool_plr_history');
  if (data) {
    try { toolPlrHistory = JSON.parse(data); } catch(e) { toolPlrHistory = []; }
  } else {
    toolPlrHistory = [];
  }
}

function saveToolPlrHistoryToStorage() {
  localStorage.setItem('tool_plr_history', JSON.stringify(toolPlrHistory));
}

function renderToolPlrHistory() {
  const tb = document.getElementById('toolPlrHistoryTable');
  if (!tb) return;
  if (toolPlrHistory.length === 0) {
    tb.innerHTML = '<tr><td colspan="5" style="color:var(--text3);text-align:center;padding:12px;font-size:11px">No history yet</td></tr>';
    return;
  }
  tb.innerHTML = toolPlrHistory.map((item, index) => `
    <tr>
      <td class="mono" style="color:var(--purple)">${Number(item.ts).toFixed(2)}%</td>
      <td class="mono">Rs. ${Number(item.baseRate).toFixed(0)}</td>
      <td class="mono" style="color:var(--amber)">Rs. ${Number(item.rate).toFixed(2)}</td>
      <td style="color:var(--text3);font-size:10px">${item.time}</td>
      <td>
        <button class="btn btn-ghost btn-sm" onclick="deleteToolPlrHistory(${index})" style="padding:2px 6px;color:var(--red);border:none;background:none;cursor:pointer">✕</button>
      </td>
    </tr>
  `).join('');
}

function saveToolPlrHistory(tsInput, baseRateInput, rateInput, silent = false) {
  let ts = tsInput;
  let baseRate = baseRateInput;
  let rate = rateInput;

  if (ts === undefined || baseRate === undefined || rate === undefined) {
    ts = parseFloat(document.getElementById('toolTs').value);
    baseRate = parseFloat(document.getElementById('toolBaseRate').value);
    if (isNaN(ts) || isNaN(baseRate) || ts <= 0 || baseRate <= 0) {
      alert('Please enter valid positive TS and Base Rate values to save.');
      return;
    }
    rate = (ts * baseRate) / 13;
  }

  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  // Prevent duplicate consecutive entries to keep clean logs
  if (toolPlrHistory.length > 0) {
    const last = toolPlrHistory[0];
    if (last.ts === ts && last.baseRate === baseRate && Math.abs(last.rate - rate) < 0.01) {
      // Already logged as the most recent calculation, skip duplicate
      return;
    }
  }

  toolPlrHistory.unshift({ ts, baseRate, rate, time });
  if (toolPlrHistory.length > 10) {
    toolPlrHistory = toolPlrHistory.slice(0, 10);
  }
  saveToolPlrHistoryToStorage();
  renderToolPlrHistory();
  if (!silent) {
    showToast('✅ Calculation saved!', 'amber');
  }
}

function deleteToolPlrHistory(index) {
  toolPlrHistory.splice(index, 1);
  saveToolPlrHistoryToStorage();
  renderToolPlrHistory();
  showToast('Entry deleted.', 'amber');
}

function clearToolPlrHistory() {
  toolPlrHistory = [];
  saveToolPlrHistoryToStorage();
  renderToolPlrHistory();
  showToast('History cleared.', 'amber');
}

function initToolsPage() {
  calcKgToLiterRealtime();
  calcToolPerLiterRate();
  loadToolPlrHistory();
  renderToolPlrHistory();
  document.getElementById('convApiResult').style.display = 'none';
  document.getElementById('toolPlrApiResult').style.display = 'none';
  document.getElementById('convApiResult').innerHTML = '';
  document.getElementById('toolPlrApiResult').innerHTML = '';
}

// ===================== INIT =====================
async function initData() {
  if (!getToken()) { showAuthModal(); return; }
  try {
    const [batchesRes, fleetRes, settingsRes] = await Promise.all([
      apiFetch('/batches'),
      apiFetch('/fleet'),
      apiFetch('/settings')
    ]);

    if (batchesRes.ok)  batches   = (await batchesRes.json()).data  || [];
    if (fleetRes.ok)    fleetData = (await fleetRes.json()).data     || [];
    if (settingsRes.ok) {
      const s = (await settingsRes.json()).data;
      if (s) {
        document.getElementById('adminName').value     = s.dairyName      || 'Alamgir Dairy Management System';
        document.getElementById('adminSupplier').value = s.defaultSupplier || '';
        document.getElementById('adminCurrency').value = s.currencySymbol  || 'Rs.';
      }
    }
  } catch(e) {
    if (e.message !== 'Unauthorized') console.error('Error fetching data from backend', e);
  }
  renderRecent();
  renderFleet();
}

// ===================== BOOTSTRAP =====================
loadStoredUser();
updateNavUser();

// Add toast animation keyframes
const styleEl = document.createElement('style');
styleEl.textContent = `@keyframes toastIn { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }`;
document.head.appendChild(styleEl);

if (getToken()) {
  initData();
} else {
  showAuthModal();
}