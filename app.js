/**
 * Job Application Tracker — Application Logic
 * CRUD, filtering, searching, sorting, localStorage persistence, JSON export/import
 */

// ---- Data Layer ----
const STORAGE_KEY = 'job_tracker_applications';
const CV_VERSIONS_KEY = 'job_tracker_cv_versions';

function loadCvVersions() {
  try {
    const data = localStorage.getItem(CV_VERSIONS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveCvVersions(versions) {
  localStorage.setItem(CV_VERSIONS_KEY, JSON.stringify(versions));
}

function getLatestCvVersion() {
  const versions = loadCvVersions();
  return versions.length > 0 ? versions[0] : null;
}

const STATUS_OPTIONS = [
  'Applied',
  'Screening',
  'Interview',
  'Offer',
  'Accepted',
  'Rejected',
  'Withdrawn'
];

const PLATFORM_OPTIONS = [
  'LinkedIn',
  'TopCV',
  'ITviec',
  'VietnamWorks',
  'Glassdoor',
  'Indeed',
  'Company Website',
  'Referral',
  'Facebook',
  'Other'
];

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

function loadApplications() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveApplications(apps) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(apps));
}

// ---- State ----
let applications = loadApplications();
let currentFilter = 'all';
let currentSearch = '';
let currentSort = { field: 'dateApplied', direction: 'desc' };
let editingId = null;

// ============================================
//  Auth Layer — Login / Create Account
//  NOTE: This is a client-side gate for personal privacy on a shared
//  device. It is NOT server-grade security: anyone with the device and
//  browser devtools can bypass it. The password is never stored in plain
//  text — only a SHA-256 hash + random salt is kept in localStorage.
// ============================================
const AUTH_KEY = 'job_tracker_auth';        // {username, salt, hash}
const SESSION_KEY = 'job_tracker_session';  // sessionStorage flag

function getAuth() {
  try {
    const data = localStorage.getItem(AUTH_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

function setAuth(record) {
  localStorage.setItem(AUTH_KEY, JSON.stringify(record));
}

function randomSalt() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

async function hashPassword(password, salt) {
  const data = new TextEncoder().encode(salt + ':' + password);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

function isLoggedIn() {
  return sessionStorage.getItem(SESSION_KEY) === '1';
}

function showAuthError(msg) {
  const el = document.getElementById('auth-error');
  el.textContent = msg;
  el.classList.add('show');
}

function clearAuthError() {
  document.getElementById('auth-error').classList.remove('show');
}

function startApp() {
  document.getElementById('auth-overlay').style.display = 'none';
  document.getElementById('app-container').style.display = '';
  if (startApp._initialized) return;
  startApp._initialized = true;
  renderStats();
  renderTable();
  setupEventListeners();
}

function logout() {
  sessionStorage.removeItem(SESSION_KEY);
  location.reload();
}

function initAuth() {
  // Already authenticated this session → skip straight to the app.
  if (isLoggedIn()) {
    startApp();
    return;
  }

  const account = getAuth();
  const createMode = !account; // no account yet → first-run setup

  const form = document.getElementById('auth-form');
  const subtitle = document.getElementById('auth-subtitle');
  const submitBtn = document.getElementById('auth-submit');
  const confirmField = document.getElementById('auth-confirm-field');
  const hint = document.getElementById('auth-hint');
  const usernameInput = document.getElementById('auth-username');
  const passwordInput = document.getElementById('auth-password');
  const confirmInput = document.getElementById('auth-confirm');

  if (createMode) {
    subtitle.textContent = 'Tạo tài khoản để bảo vệ dữ liệu của bạn';
    submitBtn.textContent = 'Tạo tài khoản';
    confirmField.style.display = '';
    hint.textContent = 'Đây là lần đầu sử dụng. Hãy tạo tài khoản — dữ liệu lưu cục bộ trên trình duyệt này.';
  } else {
    subtitle.textContent = 'Đăng nhập để tiếp tục';
    submitBtn.textContent = 'Đăng nhập';
    confirmField.style.display = 'none';
    hint.textContent = 'Quên mật khẩu? Mật khẩu không thể khôi phục — xem hướng dẫn reset trong README.';
    usernameInput.focus();
  }

  // Show/hide password toggle
  document.getElementById('auth-toggle-pw').addEventListener('click', () => {
    const isPw = passwordInput.type === 'password';
    passwordInput.type = isPw ? 'text' : 'password';
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAuthError();

    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    if (!username || !password) {
      showAuthError('Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.');
      return;
    }

    if (createMode) {
      if (password.length < 6) {
        showAuthError('Mật khẩu phải có ít nhất 6 ký tự.');
        return;
      }
      if (password !== confirmInput.value) {
        showAuthError('Mật khẩu xác nhận không khớp.');
        return;
      }
      const salt = randomSalt();
      const hash = await hashPassword(password, salt);
      setAuth({ username, salt, hash });
      sessionStorage.setItem(SESSION_KEY, '1');
      showToast('Tạo tài khoản thành công! 🎉', 'success');
      startApp();
      return;
    }

    // Login mode — verify against stored hash
    const hash = await hashPassword(password, account.salt);
    if (username === account.username && hash === account.hash) {
      sessionStorage.setItem(SESSION_KEY, '1');
      startApp();
    } else {
      showAuthError('Tên đăng nhập hoặc mật khẩu không đúng.');
      passwordInput.value = '';
      passwordInput.focus();
    }
  });
}

// ---- DOM Ready ----
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btn-logout').addEventListener('click', logout);
  initAuth();
});

// ---- Event Listeners ----
function setupEventListeners() {
  // Add button
  document.getElementById('btn-add').addEventListener('click', () => openModal());

  // Search
  document.getElementById('search-input').addEventListener('input', (e) => {
    currentSearch = e.target.value.toLowerCase();
    renderTable();
  });

  // Filter
  document.getElementById('filter-status').addEventListener('change', (e) => {
    currentFilter = e.target.value;
    renderTable();
  });

  // Filter platform
  document.getElementById('filter-platform').addEventListener('change', (e) => {
    currentFilter = e.target.value === 'all' ? currentFilter : e.target.value;
    // We'll use a separate state for platform filter
    document.getElementById('filter-platform').dataset.value = e.target.value;
    renderTable();
  });

  // Export
  document.getElementById('btn-export').addEventListener('click', exportData);

  // Import
  document.getElementById('btn-import').addEventListener('click', () => {
    document.getElementById('import-file').click();
  });
  document.getElementById('import-file').addEventListener('change', importData);

  // Modal close
  document.getElementById('modal-overlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeModal();
  });
  document.getElementById('btn-modal-cancel').addEventListener('click', closeModal);

  // Modal form submit
  document.getElementById('app-form').addEventListener('submit', handleFormSubmit);

  // Cover letter file upload
  document.getElementById('btn-upload-cl').addEventListener('click', () => {
    document.getElementById('cl-file-input').click();
  });
  document.getElementById('cl-file-input').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    try {
      let text;
      if (ext === 'pdf') {
        text = await extractPdfText(file);
      } else if (['txt', 'md'].includes(ext)) {
        text = await file.text();
      } else {
        showToast('Unsupported file type. Use PDF, TXT, or MD.', 'error');
        return;
      }
      document.getElementById('f-cover-letter').value = text;
      document.getElementById('cl-filename').textContent = `✅ ${file.name}`;
      showToast(`Cover letter loaded: ${file.name}`, 'success');
    } catch (err) {
      showToast('Error reading cover letter file.', 'error');
    }
    e.target.value = '';
  });

  // Detail modal close
  document.getElementById('detail-overlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeDetailModal();
  });
  document.getElementById('btn-detail-close').addEventListener('click', closeDetailModal);

  // Confirm modal
  document.getElementById('btn-confirm-cancel').addEventListener('click', closeConfirmModal);

  // Keyboard
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModal();
      closeDetailModal();
      closeConfirmModal();
    }
  });

  // Sortable headers
  document.querySelectorAll('th.sortable').forEach(th => {
    th.addEventListener('click', () => {
      const field = th.dataset.sort;
      if (currentSort.field === field) {
        currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
      } else {
        currentSort.field = field;
        currentSort.direction = 'asc';
      }
      updateSortIndicators();
      renderTable();
    });
  });
}

// ---- Stats ----
function renderStats() {
  const total = applications.length;
  const counts = {};
  STATUS_OPTIONS.forEach(s => counts[s.toLowerCase()] = 0);

  applications.forEach(app => {
    const key = app.status.toLowerCase();
    if (counts[key] !== undefined) counts[key]++;
  });

  document.getElementById('stat-total').textContent = total;
  document.getElementById('stat-applied').textContent = counts['applied'] || 0;
  document.getElementById('stat-screening').textContent = counts['screening'] || 0;
  document.getElementById('stat-interview').textContent = counts['interview'] || 0;
  document.getElementById('stat-offer').textContent = (counts['offer'] || 0) + (counts['accepted'] || 0);
  document.getElementById('stat-rejected').textContent = (counts['rejected'] || 0) + (counts['withdrawn'] || 0);
}

// ---- Table Rendering ----
function getFilteredApplications() {
  let filtered = [...applications];

  // Status filter
  const statusFilter = document.getElementById('filter-status').value;
  if (statusFilter !== 'all') {
    filtered = filtered.filter(app => app.status.toLowerCase() === statusFilter.toLowerCase());
  }

  // Platform filter
  const platformEl = document.getElementById('filter-platform');
  const platformFilter = platformEl ? platformEl.value : 'all';
  if (platformFilter !== 'all') {
    filtered = filtered.filter(app => app.platform === platformFilter);
  }

  // Search
  if (currentSearch) {
    filtered = filtered.filter(app =>
      (app.company || '').toLowerCase().includes(currentSearch) ||
      (app.position || '').toLowerCase().includes(currentSearch) ||
      (app.requirements || '').toLowerCase().includes(currentSearch) ||
      (app.notes || '').toLowerCase().includes(currentSearch) ||
      (app.platform || '').toLowerCase().includes(currentSearch)
    );
  }

  // Sort
  filtered.sort((a, b) => {
    let valA = a[currentSort.field] || '';
    let valB = b[currentSort.field] || '';

    if (currentSort.field === 'dateApplied' || currentSort.field === 'interviewDate') {
      valA = valA ? new Date(valA).getTime() : 0;
      valB = valB ? new Date(valB).getTime() : 0;
    } else {
      valA = valA.toString().toLowerCase();
      valB = valB.toString().toLowerCase();
    }

    if (valA < valB) return currentSort.direction === 'asc' ? -1 : 1;
    if (valA > valB) return currentSort.direction === 'asc' ? 1 : -1;
    return 0;
  });

  return filtered;
}

function renderTable() {
  const tbody = document.getElementById('table-body');
  const filtered = getFilteredApplications();

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7">
          <div class="empty-state">
            <div class="empty-icon">📋</div>
            <h3>${applications.length === 0 ? 'No applications yet' : 'No results found'}</h3>
            <p>${applications.length === 0
              ? 'Click "Add Application" to start tracking your job applications.'
              : 'Try adjusting your search or filters.'}</p>
            ${applications.length === 0
              ? '<button class="btn btn-primary" onclick="openModal()">✚ Add First Application</button>'
              : ''}
          </div>
        </td>
      </tr>`;
    renderStats();
    return;
  }

  tbody.innerHTML = filtered.map(app => `
    <tr data-id="${app.id}">
      <td>
        <div class="company-cell">
          <span class="company-name">${escapeHtml(app.company)}</span>
          <span class="position-name">${escapeHtml(app.position)}</span>
        </div>
      </td>
      <td><span class="platform-tag">${escapeHtml(app.platform)}</span></td>
      <td>${formatDate(app.dateApplied)}</td>
      <td><span class="status-badge ${app.status.toLowerCase()}">${app.status}</span></td>
      <td class="truncate" title="${escapeHtml(app.requirements)}">${escapeHtml(app.requirements) || '—'}</td>
      <td>${app.salary ? escapeHtml(app.salary) : '—'}</td>
      <td>
        <div class="actions-cell">
          <button class="btn-icon" title="View details" onclick="viewDetail('${app.id}')">👁️</button>
          <button class="btn-icon" title="Edit" onclick="openModal('${app.id}')">✏️</button>
          <button class="btn-icon" title="Delete" onclick="confirmDelete('${app.id}')">🗑️</button>
        </div>
      </td>
    </tr>
  `).join('');

  renderStats();
}

function updateSortIndicators() {
  document.querySelectorAll('th.sortable').forEach(th => {
    th.classList.remove('sorted-asc', 'sorted-desc');
    const icon = th.querySelector('.sort-icon');
    if (icon) icon.textContent = '↕';

    if (th.dataset.sort === currentSort.field) {
      th.classList.add(currentSort.direction === 'asc' ? 'sorted-asc' : 'sorted-desc');
      if (icon) icon.textContent = currentSort.direction === 'asc' ? '↑' : '↓';
    }
  });
}

// ---- Modal (Add/Edit) ----
function openModal(id = null) {
  editingId = id;
  const modal = document.getElementById('modal-overlay');
  const title = document.getElementById('modal-title');
  const form = document.getElementById('app-form');

  form.reset();

  if (id) {
    const app = applications.find(a => a.id === id);
    if (!app) return;
    title.textContent = 'Edit Application';
    document.getElementById('f-company').value = app.company;
    document.getElementById('f-position').value = app.position;
    document.getElementById('f-jd-link').value = app.jdLink || '';
    document.getElementById('f-platform').value = app.platform;
    document.getElementById('f-date-applied').value = app.dateApplied;
    document.getElementById('f-status').value = app.status;
    document.getElementById('f-requirements').value = app.requirements || '';
    document.getElementById('f-salary').value = app.salary || '';
    document.getElementById('f-notes').value = app.notes || '';
    document.getElementById('f-cover-letter').value = app.coverLetter || '';
    document.getElementById('f-interview-date').value = app.interviewDate || '';
    document.getElementById('f-result').value = app.result || '';
  } else {
    title.textContent = 'Add New Application';
    document.getElementById('f-date-applied').value = new Date().toISOString().split('T')[0];
    document.getElementById('f-status').value = 'Applied';
  }

  modal.classList.add('active');
  setTimeout(() => document.getElementById('f-company').focus(), 300);
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('active');
  editingId = null;
}

function handleFormSubmit(e) {
  e.preventDefault();

  const appData = {
    company: document.getElementById('f-company').value.trim(),
    position: document.getElementById('f-position').value.trim(),
    jdLink: document.getElementById('f-jd-link').value.trim(),
    platform: document.getElementById('f-platform').value,
    dateApplied: document.getElementById('f-date-applied').value,
    status: document.getElementById('f-status').value,
    requirements: document.getElementById('f-requirements').value.trim(),
    salary: document.getElementById('f-salary').value.trim(),
    notes: document.getElementById('f-notes').value.trim(),
    coverLetter: document.getElementById('f-cover-letter').value.trim(),
    interviewDate: document.getElementById('f-interview-date').value,
    result: document.getElementById('f-result').value.trim(),
    updatedAt: new Date().toISOString()
  };

  if (editingId) {
    const idx = applications.findIndex(a => a.id === editingId);
    if (idx !== -1) {
      applications[idx] = { ...applications[idx], ...appData };
    }
    showToast('Application updated successfully!', 'success');
  } else {
    appData.id = generateId();
    appData.createdAt = new Date().toISOString();
    applications.unshift(appData);
    showToast('Application added successfully!', 'success');
  }

  saveApplications(applications);
  closeModal();
  renderTable();
}

// ---- Detail Modal ----
function viewDetail(id) {
  const app = applications.find(a => a.id === id);
  if (!app) return;

  const overlay = document.getElementById('detail-overlay');
  const body = document.getElementById('detail-body');

  body.innerHTML = `
    <div class="detail-grid">
      <div class="detail-item">
        <span class="detail-label">Company</span>
        <span class="detail-value">${escapeHtml(app.company)}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">Position</span>
        <span class="detail-value">${escapeHtml(app.position)}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">Platform</span>
        <span class="detail-value"><span class="platform-tag">${escapeHtml(app.platform)}</span></span>
      </div>
      <div class="detail-item">
        <span class="detail-label">Status</span>
        <span class="detail-value"><span class="status-badge ${app.status.toLowerCase()}">${app.status}</span></span>
      </div>
      <div class="detail-item">
        <span class="detail-label">Date Applied</span>
        <span class="detail-value">${formatDate(app.dateApplied)}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">Interview Date</span>
        <span class="detail-value">${app.interviewDate ? formatDate(app.interviewDate) : '—'}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">Salary</span>
        <span class="detail-value">${app.salary ? escapeHtml(app.salary) : '—'}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">JD Link</span>
        <span class="detail-value">${app.jdLink ? `<a href="${escapeHtml(app.jdLink)}" target="_blank" rel="noopener">${escapeHtml(app.jdLink)}</a>` : '—'}</span>
      </div>
      <div class="detail-item full-width">
        <span class="detail-label">Key Requirements</span>
        <span class="detail-value">${escapeHtml(app.requirements) || '—'}</span>
      </div>
      <div class="detail-item full-width">
        <span class="detail-label">Cover Letter</span>
        <div class="detail-value">${app.coverLetter ? `<details class="cl-details"><summary>📄 View Cover Letter (${app.coverLetter.length} chars)</summary><pre class="cl-content">${escapeHtml(app.coverLetter)}</pre></details>` : '—'}</div>
      </div>
      <div class="detail-item full-width">
        <span class="detail-label">Notes</span>
        <span class="detail-value">${escapeHtml(app.notes) || '—'}</span>
      </div>
      <div class="detail-item full-width">
        <span class="detail-label">Result</span>
        <span class="detail-value">${escapeHtml(app.result) || '—'}</span>
      </div>
    </div>
  `;

  overlay.classList.add('active');
}

function closeDetailModal() {
  document.getElementById('detail-overlay').classList.remove('active');
}

// ---- Delete ----
let deleteTargetId = null;

function confirmDelete(id) {
  deleteTargetId = id;
  const app = applications.find(a => a.id === id);
  document.getElementById('confirm-company-name').textContent = app ? app.company : '';
  document.getElementById('confirm-overlay').classList.add('active');
}

function closeConfirmModal() {
  document.getElementById('confirm-overlay').classList.remove('active');
  deleteTargetId = null;
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btn-confirm-delete').addEventListener('click', () => {
    if (deleteTargetId) {
      applications = applications.filter(a => a.id !== deleteTargetId);
      saveApplications(applications);
      renderTable();
      showToast('Application deleted.', 'info');
    }
    closeConfirmModal();
  });
});

// ---- Export / Import ----
function exportData() {
  if (applications.length === 0) {
    showToast('No data to export.', 'error');
    return;
  }
  const blob = new Blob([JSON.stringify(applications, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `job_applications_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast(`Exported ${applications.length} applications.`, 'success');
}

function importData(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const imported = JSON.parse(event.target.result);
      if (!Array.isArray(imported)) throw new Error('Invalid format');

      // Merge: skip duplicates by id
      let added = 0;
      imported.forEach(item => {
        if (!applications.find(a => a.id === item.id)) {
          applications.push(item);
          added++;
        }
      });

      saveApplications(applications);
      renderTable();
      showToast(`Imported ${added} new application(s).`, 'success');
    } catch {
      showToast('Invalid file format. Expected JSON array.', 'error');
    }
    // Reset input
    e.target.value = '';
  };
  reader.readAsText(file);
}

// ---- Toast ----
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3200);
}

// ---- Utilities ----
function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// ============================================================
// TAB NAVIGATION
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.tab;
      // Update buttons
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      // Update panels
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      document.getElementById(`panel-${target}`).classList.add('active');
    });
  });

  // ---- Matcher Event Listeners ----
  setupMatcherEvents();
});

// ============================================================
// CV vs JD MATCHER ENGINE
// ============================================================

// ---- Keyword Database (categorized) ----
const KEYWORD_DB = {
  'Technical Skills': [
    'brd', 'srs', 'prd', 'frd', 'fsd',
    'user stories', 'user story', 'use cases', 'use case',
    'acceptance criteria',
    'business requirements', 'functional requirements', 'non-functional requirements',
    'requirements gathering', 'requirements elicitation', 'requirements analysis',
    'requirements engineering', 'requirements management',
    'business rules', 'business rule',
    'data mapping', 'data migration', 'data analysis', 'data modeling',
    'gap analysis', 'fit-gap analysis', 'fit gap',
    'process mapping', 'process modeling', 'process improvement',
    'workflow', 'workflows',
    'wireframe', 'wireframes', 'wireframing',
    'mockup', 'mockups', 'prototype', 'prototyping',
    'user flow', 'user flows',
    'erd', 'entity relationship diagram',
    'uml', 'sequence diagram', 'activity diagram', 'class diagram',
    'bpmn', 'bpmn 2.0',
    'as-is', 'to-be', 'as-is/to-be', 'as is', 'to be',
    'api', 'rest api', 'restful', 'api integration',
    'sql', 'database', 'query', 'queries',
    'system integration', 'integration',
    'uat', 'user acceptance testing', 'testing',
    'test cases', 'test scripts', 'test scenarios',
    'qa', 'quality assurance',
    'erp', 'crm', 'saas', 'b2b', 'b2c',
    'ai', 'artificial intelligence', 'machine learning', 'ml',
  ],
  'Tools & Technologies': [
    'jira', 'confluence', 'figma', 'draw.io', 'drawio',
    'visio', 'microsoft visio', 'miro', 'lucidchart',
    'trello', 'asana', 'monday.com', 'notion', 'clickup',
    'excel', 'microsoft excel', 'google sheets',
    'power bi', 'tableau', 'looker',
    'postman', 'swagger',
    'slack', 'microsoft teams', 'teams',
    'git', 'github', 'gitlab', 'bitbucket',
    'devops', 'azure devops', 'azure',
    'sharepoint', 'google workspace',
    'balsamiq', 'sketch', 'adobe xd', 'invision',
    'zapier', 'power automate',
    'salesforce', 'hubspot', 'sap',
    'mysql', 'postgresql', 'mongodb', 'redis',
    'python', 'javascript', 'html', 'css',
  ],
  'Methodologies': [
    'agile', 'scrum', 'kanban', 'lean', 'safe', 'scaled agile',
    'waterfall', 'hybrid',
    'sdlc', 'software development life cycle',
    'sprint', 'sprint planning', 'sprint review', 'sprint retrospective',
    'backlog', 'backlog grooming', 'backlog refinement', 'backlog management',
    'product backlog', 'sprint backlog',
    'daily standup', 'stand-up', 'standup',
    'iteration', 'iterative', 'incremental',
    'ci/cd', 'continuous integration', 'continuous delivery',
    'devops',
    'design thinking',
  ],
  'Soft Skills': [
    'stakeholder management', 'stakeholder engagement',
    'communication', 'communication skills',
    'cross-functional', 'cross functional', 'collaboration',
    'problem solving', 'problem-solving', 'analytical',
    'critical thinking',
    'leadership', 'team lead', 'team leadership',
    'presentation', 'facilitation',
    'negotiation', 'conflict resolution',
    'time management', 'prioritization',
    'mentoring', 'coaching',
    'adaptability', 'flexibility',
    'attention to detail', 'detail-oriented',
    'self-motivated', 'self-starter', 'proactive',
    'client-facing', 'customer-facing',
  ],
  'Domain Knowledge': [
    'e-commerce', 'ecommerce', 'retail', 'fmcg',
    'fintech', 'banking', 'finance', 'insurance',
    'healthcare', 'healthtech',
    'logistics', 'supply chain',
    'telecom', 'telecommunications',
    'edtech', 'education',
    'real estate', 'proptech',
    'hospitality', 'travel',
    'manufacturing', 'iot',
    'media', 'advertising', 'marketing',
    'trade marketing',
    'distribution', 'field sales',
    'subscription', 'billing', 'payment',
    'hosting', 'cloud', 'infrastructure',
    'compliance', 'gdpr', 'security',
  ],
  'Experience & Role': [
    'business analyst', 'ba',
    'product owner', 'po',
    'project manager', 'pm',
    'product manager',
    'scrum master',
    'systems analyst', 'system analyst',
    'data analyst',
    'ux researcher',
    'solution architect',
  ]
};

// Stop words to exclude from dynamic extraction
const STOP_WORDS = new Set([
  'a','an','the','and','or','but','in','on','at','to','for','of','with','by','from',
  'is','are','was','were','be','been','being','have','has','had','do','does','did',
  'will','would','could','should','shall','may','might','can','must',
  'i','you','he','she','it','we','they','me','him','her','us','them',
  'my','your','his','its','our','their','mine','yours','hers','ours','theirs',
  'this','that','these','those','what','which','who','whom','whose',
  'if','then','else','when','where','why','how','all','each','every',
  'both','few','more','most','other','some','such','no','not','only',
  'own','same','so','than','too','very','just','about','above','after',
  'again','also','any','because','before','between','during','here',
  'into','over','through','under','until','up','etc','e.g','i.e',
  'able','across','along','already','among','become','well','within',
  'experience','work','working','role','job','position','company','team',
  'including','include','includes','using','used','use','related',
  'strong','good','excellent','minimum','preferred','required','requirements',
  'years','year','months','month','knowledge','understanding','familiarity',
  'ability','skills','skill','proficiency','proficient','least','like',
  'new','high','level','based','ensure','manage','provide','support',
  'develop','create','make','take','need','get','know','think','want',
  'see','look','find','give','tell','say','come','go','made','right',
  'big','small','long','different','important','early','key','join',
]);

function setupMatcherEvents() {
  const cvText = document.getElementById('cv-text');
  const jdText = document.getElementById('jd-text');
  const cvFileInput = document.getElementById('cv-file-input');
  const uploadZone = document.getElementById('cv-upload-zone');

  if (!cvText || !jdText) return;

  // ---- API Key & Provider Management ----
  const apiKeyInput = document.getElementById('gemini-api-key');
  const apiKeyStatus = document.getElementById('api-key-status');
  const providerSelect = document.getElementById('ai-provider');
  const helpLink = document.getElementById('api-key-help-link');

  const PROVIDER_LINKS = {
    groq: 'https://console.groq.com/keys',
    gemini: 'https://aistudio.google.com/apikey'
  };

  function updateProviderUI() {
    const p = providerSelect.value;
    helpLink.href = PROVIDER_LINKS[p];
    apiKeyInput.placeholder = p === 'groq'
      ? 'Paste your Groq API key (gsk_...)...'
      : 'Paste your Gemini API key (AIzaSy...)...';
  }

  // Restore saved state
  const savedProvider = getProvider();
  providerSelect.value = savedProvider;
  updateProviderUI();

  const savedKey = getApiKey();
  if (savedKey) {
    apiKeyInput.value = savedKey;
    apiKeyStatus.textContent = '✅ API key saved';
    apiKeyStatus.style.color = 'var(--accent-emerald)';
  }

  providerSelect.addEventListener('change', () => {
    saveProvider(providerSelect.value);
    updateProviderUI();
    apiKeyInput.value = '';
    apiKeyStatus.textContent = '';
    // Clear old key when switching provider
    saveApiKey('');
  });

  document.getElementById('btn-save-key').addEventListener('click', () => {
    const key = apiKeyInput.value.trim();
    if (!key) {
      showToast('Please enter an API key.', 'error');
      return;
    }
    saveApiKey(key);
    saveProvider(providerSelect.value);
    apiKeyStatus.textContent = '✅ API key saved';
    apiKeyStatus.style.color = 'var(--accent-emerald)';
    showToast('API key saved!', 'success');
  });

  document.getElementById('btn-toggle-key').addEventListener('click', () => {
    apiKeyInput.type = apiKeyInput.type === 'password' ? 'text' : 'password';
  });

  // Character counts
  cvText.addEventListener('input', () => {
    document.getElementById('cv-char-count').textContent = `${cvText.value.length} characters`;
  });
  jdText.addEventListener('input', () => {
    document.getElementById('jd-char-count').textContent = `${jdText.value.length} characters`;
  });

  // File upload for CV version form
  cvFileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    try {
      let text;
      if (ext === 'pdf') {
        text = await extractPdfText(file);
      } else if (['txt', 'md'].includes(ext)) {
        text = await file.text();
      } else {
        showToast('Unsupported file type. Use PDF, TXT, or MD.', 'error');
        return;
      }
      document.getElementById('cv-version-text').value = text;
      if (!document.getElementById('cv-version-label').value) {
        document.getElementById('cv-version-label').value = file.name.replace(/\.[^.]+$/, '');
      }
      showToast(`Loaded: ${file.name}`, 'success');
    } catch (err) {
      showToast('Error reading file.', 'error');
    }
    e.target.value = '';
  });

  // Drag & drop
  uploadZone.addEventListener('click', (e) => {
    if (e.target.tagName !== 'LABEL') cvFileInput.click();
  });
  uploadZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadZone.classList.add('drag-over');
  });
  uploadZone.addEventListener('dragleave', () => {
    uploadZone.classList.remove('drag-over');
  });
  uploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadZone.classList.remove('drag-over');
    if (e.dataTransfer.files.length) {
      const file = e.dataTransfer.files[0];
      const fakeEvent = { target: { files: [file], value: '' } };
      cvFileInput.dispatchEvent(new Event('change'));
      // Manually handle
      handleCVFile(file);
    }
  });

  // CV Version Manager buttons
  document.getElementById('btn-add-cv-version').addEventListener('click', () => {
    document.getElementById('cv-version-form').style.display = 'block';
    document.getElementById('btn-add-cv-version').style.display = 'none';
  });
  document.getElementById('btn-cancel-cv-version').addEventListener('click', () => {
    document.getElementById('cv-version-form').style.display = 'none';
    document.getElementById('btn-add-cv-version').style.display = '';
    document.getElementById('cv-version-label').value = '';
    document.getElementById('cv-version-text').value = '';
  });
  document.getElementById('btn-save-cv-version').addEventListener('click', () => {
    const label = document.getElementById('cv-version-label').value.trim();
    const text = document.getElementById('cv-version-text').value.trim();
    if (!text) {
      showToast('Please upload or paste CV content.', 'error');
      return;
    }
    const versions = loadCvVersions();
    versions.unshift({
      id: generateId(),
      label: label || `Version ${versions.length + 1}`,
      content: text,
      charCount: text.length,
      createdAt: new Date().toISOString()
    });
    saveCvVersions(versions);
    renderCvVersions();
    // Auto-fill matcher
    cvText.value = text;
    document.getElementById('cv-char-count').textContent = `${text.length} characters`;
    document.getElementById('cv-active-label').textContent = `(${label || 'Latest'})`;
    // Reset form
    document.getElementById('cv-version-form').style.display = 'none';
    document.getElementById('btn-add-cv-version').style.display = '';
    document.getElementById('cv-version-label').value = '';
    document.getElementById('cv-version-text').value = '';
    showToast('CV version saved!', 'success');
  });

  // Analyze button
  document.getElementById('btn-analyze').addEventListener('click', runAnalysis);

  // Clear button
  document.getElementById('btn-clear-matcher').addEventListener('click', () => {
    cvText.value = '';
    jdText.value = '';
    document.getElementById('cv-char-count').textContent = '0 characters';
    document.getElementById('jd-char-count').textContent = '0 characters';
    document.getElementById('cv-active-label').textContent = '';
    document.getElementById('matcher-results').style.display = 'none';
  });

  // Load latest CV version on init
  renderCvVersions();
  const latest = getLatestCvVersion();
  if (latest) {
    cvText.value = latest.content;
    document.getElementById('cv-char-count').textContent = `${latest.content.length} characters`;
    document.getElementById('cv-active-label').textContent = `(${latest.label})`;
  }
}

// ---- CV Version Rendering ----
function renderCvVersions() {
  const list = document.getElementById('cv-version-list');
  const versions = loadCvVersions();
  if (versions.length === 0) {
    list.innerHTML = '<div class="empty-state-small">No CV versions saved yet. Add your first CV version above.</div>';
    return;
  }
  list.innerHTML = versions.map((v, i) => `
    <div class="cv-version-item ${i === 0 ? 'active' : ''}" data-id="${v.id}">
      <div class="cv-version-info">
        <span class="cv-version-name">${i === 0 ? '⭐ ' : ''}${escapeHtml(v.label)}</span>
        <span class="cv-version-meta">${v.charCount.toLocaleString()} chars · ${formatDate(v.createdAt.split('T')[0])}</span>
      </div>
      <div class="cv-version-btns">
        <button class="btn-icon" title="Use this version" onclick="useCvVersion('${v.id}')">📋</button>
        <button class="btn-icon" title="Delete" onclick="deleteCvVersion('${v.id}')">🗑️</button>
      </div>
    </div>
  `).join('');
}

function useCvVersion(id) {
  const versions = loadCvVersions();
  const v = versions.find(x => x.id === id);
  if (!v) return;
  document.getElementById('cv-text').value = v.content;
  document.getElementById('cv-char-count').textContent = `${v.content.length} characters`;
  document.getElementById('cv-active-label').textContent = `(${v.label})`;
  showToast(`Using CV: ${v.label}`, 'success');
}

function deleteCvVersion(id) {
  let versions = loadCvVersions();
  versions = versions.filter(x => x.id !== id);
  saveCvVersions(versions);
  renderCvVersions();
  showToast('CV version deleted.', 'info');
}

// ---- File Handling ----
async function handleCVFile(file) {
  if (!file) return;

  const cvText = document.getElementById('cv-text');
  const ext = file.name.split('.').pop().toLowerCase();

  try {
    if (ext === 'pdf') {
      const text = await extractPdfText(file);
      cvText.value = text;
    } else if (['txt', 'md'].includes(ext)) {
      const text = await file.text();
      cvText.value = text;
    } else {
      showToast('Unsupported file type. Please use PDF, TXT, or MD.', 'error');
      return;
    }
    document.getElementById('cv-char-count').textContent = `${cvText.value.length} characters`;
    showToast(`Loaded: ${file.name}`, 'success');
  } catch (err) {
    console.error(err);
    showToast('Error reading file. Try pasting your CV text instead.', 'error');
  }
}

async function extractPdfText(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();

    // Group items by Y-coordinate (line) for correct reading order
    const lineMap = {};
    const LINE_THRESHOLD = 3; // items within 3px Y are same line

    for (const item of content.items) {
      if (!item.str || !item.str.trim()) continue;
      const y = Math.round(item.transform[5]); // Y position
      const x = item.transform[4]; // X position

      // Find existing line within threshold
      let lineKey = null;
      for (const key of Object.keys(lineMap)) {
        if (Math.abs(Number(key) - y) <= LINE_THRESHOLD) {
          lineKey = key;
          break;
        }
      }
      if (!lineKey) lineKey = String(y);

      if (!lineMap[lineKey]) lineMap[lineKey] = [];
      lineMap[lineKey].push({ x, text: item.str });
    }

    // Sort lines top-to-bottom (higher Y = top in PDF)
    const sortedLines = Object.entries(lineMap)
      .sort(([a], [b]) => Number(b) - Number(a));

    // Sort items within each line left-to-right, join
    for (const [, items] of sortedLines) {
      items.sort((a, b) => a.x - b.x);
      const lineText = items.map(it => it.text).join(' ').trim();
      if (lineText) fullText += lineText + '\n';
    }

    fullText += '\n'; // Page break
  }

  return fullText.trim();
}

// ---- AI Provider Configuration ----
const API_KEY_STORAGE = 'job_tracker_api_key';
const PROVIDER_STORAGE = 'job_tracker_ai_provider';

function getApiKey() {
  return localStorage.getItem(API_KEY_STORAGE) || '';
}

function saveApiKey(key) {
  localStorage.setItem(API_KEY_STORAGE, key.trim());
}

function getProvider() {
  return localStorage.getItem(PROVIDER_STORAGE) || 'groq';
}

function saveProvider(provider) {
  localStorage.setItem(PROVIDER_STORAGE, provider);
}

// ---- Analysis Engine (Multi-Provider AI) ----
async function runAnalysis() {
  const cvContent = document.getElementById('cv-text').value.trim();
  const jdContent = document.getElementById('jd-text').value.trim();
  const apiKey = getApiKey();
  const provider = getProvider();

  if (!apiKey) {
    showToast('Please enter your API key first.', 'error');
    document.getElementById('gemini-api-key').focus();
    return;
  }
  if (!cvContent) {
    showToast('Please upload or paste your CV first.', 'error');
    return;
  }
  if (!jdContent) {
    showToast('Please paste the Job Description.', 'error');
    return;
  }

  // Show loading state
  const btn = document.getElementById('btn-analyze');
  const originalText = btn.textContent;
  btn.textContent = `⏳ Analyzing with ${provider === 'groq' ? 'Groq' : 'Gemini'}...`;
  btn.disabled = true;

  try {
    const results = provider === 'groq'
      ? await analyzeWithGroq(cvContent, jdContent, apiKey)
      : await analyzeWithGemini(cvContent, jdContent, apiKey);
    displayAIResults(results);
  } catch (err) {
    console.error(err);
    showToast('Analysis failed: ' + err.message, 'error');
  } finally {
    btn.textContent = originalText;
    btn.disabled = false;
  }
}

function buildMatchPrompt(cvText, jdText) {
  return `You are an expert HR analyst and Business Analyst career coach. Analyze how well this CV matches the Job Description.

IMPORTANT: Understand BOTH Vietnamese and English. Match semantically, not just keywords.
For example: "Thu thập yêu cầu" = "Requirements gathering", "Kiểm thử nghiệm thu" = "UAT".

CV:
---
${cvText}
---

JOB DESCRIPTION:
---
${jdText}
---

Analyze and return a JSON object with this EXACT structure (no markdown, no code blocks, just pure JSON):
{
  "overallScore": <number 0-100>,
  "summary": "<2-3 sentence summary in Vietnamese>",
  "verdict": "<one of: Excellent Match|Good Match|Fair Match|Needs Improvement|Low Match>",
  "categories": [
    {
      "name": "<category name in Vietnamese>",
      "score": <number 0-100>,
      "matched": ["<matched skill 1>", "<matched 2>"],
      "missing": ["<missing skill 1>", "<missing 2>"]
    }
  ],
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "gaps": ["<gap 1>", "<gap 2>"],
  "suggestions": ["<actionable suggestion 1>", "<suggestion 2>"],
  "interviewTips": ["<tip 1>", "<tip 2>"]
}

Categories should include:
- Kỹ năng phân tích nghiệp vụ (Requirements, Documentation, Process Modeling)
- Công cụ & Công nghệ (Tools mentioned in JD)
- Phương pháp làm việc (Agile, Scrum, etc.)
- Kỹ năng mềm (Stakeholder management, Communication)
- Kiến thức domain (Industry/domain knowledge)
- Kinh nghiệm & Vai trò (Years, role level match)

Be fair, honest, and specific. Score based on semantic meaning, not exact keyword match.
IMPORTANT: Return ONLY valid JSON, no other text.`;
}

// ---- Groq API ----
async function analyzeWithGroq(cvText, jdText, apiKey) {
  const prompt = buildMatchPrompt(cvText, jdText);

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: 'You are a JSON-only API. Always respond with valid JSON, no markdown, no explanation.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 4096,
      response_format: { type: 'json_object' }
    })
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error?.message || `Groq API error: ${response.status}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error('No response from Groq AI');

  let cleaned = text.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }

  return JSON.parse(cleaned);
}

// ---- Gemini API ----
async function analyzeWithGemini(cvText, jdText, apiKey) {
  const prompt = buildMatchPrompt(cvText, jdText);

  const models = [
    'gemini-2.0-flash-lite',
    'gemini-1.5-flash',
    'gemini-1.5-flash-8b',
    'gemini-pro',
  ];

  let lastError = null;

  for (const model of models) {
    for (const version of ['v1beta', 'v1']) {
      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/${version}/models/${model}:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.3,
              maxOutputTokens: 4096,
            }
          })
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          lastError = errData.error?.message || `${model}: HTTP ${response.status}`;
          continue; // Try next model
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) { lastError = `${model}: Empty response`; continue; }

        // Parse JSON
        let cleaned = text.trim();
        if (cleaned.startsWith('```')) {
          cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
        }

        console.log(`✅ Success with model: ${model} (${version})`);
        return JSON.parse(cleaned);
      } catch (e) {
        lastError = e.message;
        continue;
      }
    }
  }

  throw new Error(lastError || 'All models failed. Please check your API key.');
}

// ---- Display AI Results ----
function displayAIResults(results) {
  const container = document.getElementById('matcher-results');
  container.style.display = 'block';
  setTimeout(() => container.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);

  // 1. Score Ring
  const scoreHero = document.getElementById('score-hero');
  scoreHero.className = 'score-hero';
  if (results.overallScore >= 80) scoreHero.classList.add('score-excellent');
  else if (results.overallScore >= 65) scoreHero.classList.add('score-good');
  else if (results.overallScore >= 50) scoreHero.classList.add('score-fair');
  else if (results.overallScore >= 35) scoreHero.classList.add('score-low');
  else scoreHero.classList.add('score-poor');

  animateCounter(document.getElementById('score-number'), results.overallScore);

  const ringFill = document.getElementById('score-ring-fill');
  const circumference = 326.73;
  setTimeout(() => {
    ringFill.style.strokeDashoffset = circumference - (results.overallScore / 100) * circumference;
  }, 50);

  const verdictIcons = {
    'Excellent Match': '🌟', 'Good Match': '✅', 'Fair Match': '⚡',
    'Needs Improvement': '⚠️', 'Low Match': '❌'
  };
  document.getElementById('score-label').textContent = `${verdictIcons[results.verdict] || '📊'} ${results.verdict}`;
  document.getElementById('score-summary').textContent = results.summary;

  // 2. Category Grid
  const categoryGrid = document.getElementById('category-grid');
  categoryGrid.innerHTML = (results.categories || []).map(cat => {
    const scoreColor = cat.score >= 80 ? 'var(--accent-emerald)' :
                       cat.score >= 60 ? 'var(--accent-cyan)' :
                       cat.score >= 40 ? 'var(--accent-amber)' : 'var(--accent-rose)';
    const barColor = cat.score >= 80 ? 'linear-gradient(90deg, #34d399, #6ee7b7)' :
                     cat.score >= 60 ? 'linear-gradient(90deg, #22d3ee, #67e8f9)' :
                     cat.score >= 40 ? 'linear-gradient(90deg, #fbbf24, #fde68a)' :
                                        'linear-gradient(90deg, #f43f5e, #fb7185)';
    return `
      <div class="category-card">
        <div class="category-card-header">
          <h4>${escapeHtml(cat.name)}</h4>
          <span class="category-score" style="color:${scoreColor}">${cat.score}%</span>
        </div>
        <div class="progress-bar">
          <div class="progress-bar-fill" style="width:0%;background:${barColor}" data-width="${cat.score}%"></div>
        </div>
        <div class="category-keywords">
          ${(cat.matched || []).map(k => `<span class="kw-badge matched"><span class="kw-icon">✓</span> ${escapeHtml(k)}</span>`).join('')}
          ${(cat.missing || []).map(k => `<span class="kw-badge missing"><span class="kw-icon">✗</span> ${escapeHtml(k)}</span>`).join('')}
        </div>
      </div>`;
  }).join('');

  setTimeout(() => {
    categoryGrid.querySelectorAll('.progress-bar-fill').forEach(bar => {
      bar.style.width = bar.dataset.width;
    });
  }, 100);

  // 3. Strengths & Gaps
  const kwSections = document.getElementById('keyword-sections');
  kwSections.innerHTML = `
    <div class="keyword-section-card">
      <h4><span style="color:var(--accent-emerald)">💪</span> Điểm mạnh</h4>
      <div class="ai-list">
        ${(results.strengths || []).map(s => `<div class="ai-item strength">✅ ${escapeHtml(s)}</div>`).join('')}
      </div>
    </div>
    <div class="keyword-section-card">
      <h4><span style="color:var(--accent-rose)">⚡</span> Gap cần bù</h4>
      <div class="ai-list">
        ${(results.gaps || []).map(g => `<div class="ai-item gap">❌ ${escapeHtml(g)}</div>`).join('')}
      </div>
    </div>`;

  // 4. Suggestions + Interview Tips
  const suggList = document.getElementById('suggestions-list');
  let suggestionsHtml = (results.suggestions || []).map(s => `<li>💡 ${escapeHtml(s)}</li>`).join('');
  if (results.interviewTips && results.interviewTips.length > 0) {
    suggestionsHtml += '<li style="margin-top:12px;font-weight:700;color:var(--accent-indigo-hover);">🎯 Interview Tips:</li>';
    suggestionsHtml += results.interviewTips.map(t => `<li>• ${escapeHtml(t)}</li>`).join('');
  }
  suggList.innerHTML = suggestionsHtml;
}

function animateCounter(el, target) {
  let current = 0;
  const step = Math.max(1, Math.floor(target / 40));
  const interval = setInterval(() => {
    current += step;
    if (current >= target) {
      current = target;
      clearInterval(interval);
    }
    el.textContent = current;
  }, 30);
}
