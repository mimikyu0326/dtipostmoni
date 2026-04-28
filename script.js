/* ========================================
   DTI POST Monitoring Dashboard
   Complete JavaScript Functionality - Fully Functional Expanding Names & Edits
   ======================================== */

const firebaseConfig = {
    apiKey: "AIzaSyDw1kNFcNWqhev0VlEiWCbTduHXXyr72u4",
    authDomain: "dti-post-monitoring.firebaseapp.com",
    databaseURL: "https://dti-post-monitoring-default-rtdb.firebaseio.com",
    projectId: "dti-post-monitoring",
    storageBucket: "dti-post-monitoring.firebasestorage.app",
    messagingSenderId: "10361359502",
    appId: "1:10361359502:web:19a045419da64788688ddf",
    measurementId: "G-J7HH1R54X9"
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();

let masterNames = [];
let entries = [];
let calendarNotes = {}; 
let stagedNames = [];
let currentView = 'perMonth';
let currentPage = 'home';

let currentCalDate = new Date();

document.addEventListener('DOMContentLoaded', function() {
    initNavigation();
    initEventListeners();
    setDefaultDate();
    toggleEntryType(); 
    initFirebase();
});

function parseFirebaseArray(data) {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    const keys = Object.keys(data).map(Number).filter(k => !isNaN(k));
    if (keys.length === 0) return [];
    const maxKey = Math.max(...keys);
    const arr = new Array(maxKey + 1).fill(null);
    for (const key in data) { if (!isNaN(key)) arr[key] = data[key]; }
    return arr;
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const icon = type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle';
    toast.innerHTML = `<i class="fas ${icon}"></i> <span>${message}</span>`;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function toggleMobileMenu() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    if (window.innerWidth <= 768) {
        sidebar.classList.toggle('open');
        overlay.classList.toggle('active');
    }
}

function initFirebase() {
    database.ref('masterNames').on('value', (snapshot) => {
        masterNames = parseFirebaseArray(snapshot.val());
        updateBadges(); updateCategoryDropdowns(); 
        if (currentPage === 'names') renderNamesList();
    });

    database.ref('entries').on('value', (snapshot) => {
        entries = parseFirebaseArray(snapshot.val());
        updateBadges();
        if (currentPage === 'home') renderAnalytics();
        if (currentPage === 'database') renderDatabase();
        if (currentPage === 'add') updateExistingMonthDropdown();
        if (currentPage === 'calendar') renderCalendar();
    });

    database.ref('calendarNotes').on('value', (snapshot) => {
        calendarNotes = snapshot.val() || {};
        if (currentPage === 'calendar') renderCalendar();
    });

    database.ref('theme').on('value', (snapshot) => {
        const theme = snapshot.val();
        if (theme === 'dark') {
            document.body.setAttribute('data-theme', 'dark');
            document.getElementById('themeBtn').innerHTML = '<i class="fas fa-sun"></i>';
        } else {
            document.body.removeAttribute('data-theme');
            document.getElementById('themeBtn').innerHTML = '<i class="fas fa-moon"></i>';
        }
    });
}

function initNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function() {
            navigateTo(this.getAttribute('data-page'));
            if(window.innerWidth <= 768) {
                document.getElementById('sidebar').classList.remove('open');
                document.querySelector('.sidebar-overlay').classList.remove('active');
            }
        });
    });
}

function navigateTo(page) {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('data-page') === page) item.classList.add('active');
    });

    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('page-' + page).classList.add('active');
    currentPage = page;

    if (page === 'home') renderAnalytics();
    else if (page === 'names') renderNamesList();
    else if (page === 'add') { updateExistingMonthDropdown(); updateCategoryDropdowns(); }
    else if (page === 'database') renderDatabase();
    else if (page === 'calendar') renderCalendar();
}

function initEventListeners() {
    document.getElementById('entryForm').addEventListener('submit', function(e) {
        e.preventDefault();
        saveEntry();
    });
    
    document.getElementById('entryForm').addEventListener('reset', function(e) {
        e.preventDefault();
        resetEntryForm();
        clearPreview();
    });
    
    document.getElementById('inlineNameForm').addEventListener('submit', function(e) {
        e.preventDefault();
        saveName();
    });
}

function clearPreview() {
    document.getElementById('previewTableBody').innerHTML = '';
    document.getElementById('entryPreviewSection').style.display = 'none';
}

function resetEntryForm() {
    document.getElementById('postTitle').value = '';
    document.getElementById('postLink').value = '';
    document.getElementById('rawPostNames').value = '';
    document.getElementById('existingMonthSelect').value = '';
    document.getElementById('entryCategorySelect').value = '';
    document.getElementById('shareRows').innerHTML = '';
    document.getElementById('entryRemarks').value = '0';
    document.getElementById('entryType').value = 'Post Like';
    
    setDefaultDate();
    toggleEntryType();
    updateExistingMonthDropdown();
}

function setDefaultDate() {
    const today = new Date();
    document.getElementById('entryMonth').value = today.getMonth() + 1;
    document.getElementById('entryYear').value = today.getFullYear();
    document.getElementById('entryDate').value = today.toISOString().split('T')[0];
}

function updateBadges() {
    const uniqueCats = new Set(masterNames.filter(n=>n).map(n => n.category || 'Default')).size;
    document.getElementById('namesCount').textContent = uniqueCats;
    document.getElementById('entriesCount').textContent = entries.filter(e=>e).length;
}

function updateCategoryDropdowns() {
    const categories = [...new Set(masterNames.filter(n=>n).map(n => n.category || 'Default'))];
    
    ['listCategorySelect', 'entryCategorySelect'].forEach(id => {
        const sel = document.getElementById(id);
        if (sel) {
            const currentVal = sel.value;
            if(id === 'listCategorySelect') {
                sel.innerHTML = '<option value="">-- Select Category --</option><option value="new">+ Create New Category</option>';
            } else {
                sel.innerHTML = '<option value="">All Categories</option>';
            }
            categories.forEach(c => sel.innerHTML += `<option value="${c}">${c}</option>`);
            if (Array.from(sel.options).some(opt => opt.value === currentVal)) sel.value = currentVal;
        }
    });
}

// ========================================
// AI Analytics & Dashboard 2D Charts
// ========================================
function generateAIAnalytics() {
    const today = new Date().toISOString().split('T')[0];
    const todaysEntries = entries.filter(e => e && e.createdAt && e.createdAt.startsWith(today));
    
    let text = "";
    if (todaysEntries.length === 0) {
        text = "No records were processed today. Use the Quick Actions above to map new names or post engagements.";
    } else {
        const likes = todaysEntries.filter(e => e.entryType === 'Post Like').length;
        const shares = todaysEntries.filter(e => e.entryType === 'Post Share').length;
        text = `<strong>Excellent progress!</strong> You have logged or updated <strong>${todaysEntries.length}</strong> post record(s) today, encompassing <strong>${likes}</strong> like(s) and <strong>${shares}</strong> share(s).`;
    }
    document.getElementById('aiAnalyticsText').innerHTML = text;
}

function renderAnalytics() {
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    document.getElementById('statTotalEntries').textContent = entries.filter(e=>e).length;
    
    const uniqueCats = new Set(masterNames.filter(n=>n).map(n => n.category || 'Default')).size;
    document.getElementById('statTotalNames').textContent = uniqueCats; 
    
    document.getElementById('statThisMonth').textContent = entries.filter(e => e && e.month == currentMonth && e.year == currentYear).length;
    document.getElementById('statThisYear').textContent = entries.filter(e => e && e.year == currentYear).length;

    generateAIAnalytics();
    renderTopNamesChart();
    renderMonthlyActivityChart();
    renderEntryTypeStats();
    renderLikesSharesChart();
}

function renderTopNamesChart() {
    const container = document.getElementById('topNamesChart');
    if (masterNames.filter(n=>n).length === 0) { container.innerHTML = '<div class="empty-state"><p>No names added yet</p></div>'; return; }
    
    const nameCounts = {};
    masterNames.forEach((n, i) => { if(n) nameCounts[i] = { name: n.full, count: 0 }; });
    entries.forEach(e => {
        if(e && e.selectedNames) {
            e.selectedNames.forEach(idx => { if (nameCounts[idx]) nameCounts[idx].count++; });
        }
    });

    const sorted = Object.values(nameCounts).sort((a, b) => b.count - a.count).slice(0, 5);
    if (sorted.length === 0 || sorted[0].count === 0) { container.innerHTML = '<div class="empty-state"><p>No data</p></div>'; return; }
    
    let html = '<div class="bar-chart">';
    const max = sorted[0].count;
    const colors = ['#0ea5e9', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'];
    
    sorted.forEach((item, i) => {
        const h = (item.count/max)*150;
        html += `
            <div class="bar-item">
                <div class="bar" style="height: ${h}px; background: ${colors[i]}; border-radius: 4px 4px 0 0;">
                    <span class="bar-value" style="top:-20px;">${item.count}</span>
                </div>
                <span class="bar-label" style="font-size:10px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:50px;" title="${item.name}">${item.name}</span>
            </div>
        `;
    });
    html += '</div>';
    container.innerHTML = html;
}

function renderMonthlyActivityChart() {
    const container = document.getElementById('monthlyActivityChart');
    const monthlyData = Array(13).fill(0);
    entries.filter(e => e && e.year == new Date().getFullYear()).forEach(e => monthlyData[e.month]++);
    const max = Math.max(...monthlyData.slice(1), 1);
    
    let html = '<div class="bar-chart">';
    const mNames = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    for(let i=1; i<=12; i++) {
        const h = (monthlyData[i]/max)*150;
        html += `
            <div class="bar-item">
                <div class="bar" style="height: ${h}px; background: var(--primary); border-radius: 4px 4px 0 0;">
                    ${monthlyData[i] > 0 ? `<span class="bar-value" style="top:-20px; font-size:10px;">${monthlyData[i]}</span>` : ''}
                </div>
                <span class="bar-label" style="font-size:9px;">${mNames[i]}</span>
            </div>
        `;
    }
    html += '</div>';
    container.innerHTML = html;
}

function renderEntryTypeStats() {
    const container = document.getElementById('entryTypePieChart');
    const validEntries = entries.filter(e=>e);
    const likes = validEntries.filter(e => e.entryType === 'Post Like').length;
    const shares = validEntries.filter(e => e.entryType === 'Post Share').length;
    const total = likes + shares;
    if (total === 0) { container.innerHTML = '<div class="empty-state"><p>No data</p></div>'; return; }
    
    const likePercent = Math.round((likes/total)*100);
    const sharePercent = Math.round((shares/total)*100);
    const likeAngle = (likes/total)*360;
    const gradient = `conic-gradient(#10b981 0deg ${likeAngle}deg, #f59e0b ${likeAngle}deg 360deg)`;

    container.innerHTML = `
        <div class="pie-chart" style="background: ${gradient}; box-shadow: var(--shadow-lg);"></div>
        <div class="pie-legend">
            <div class="pie-legend-item"><div class="pie-legend-color" style="background: #10b981;"></div><strong>Like:</strong> ${likes} (${likePercent}%)</div>
            <div class="pie-legend-item"><div class="pie-legend-color" style="background: #f59e0b;"></div><strong>Share:</strong> ${shares} (${sharePercent}%)</div>
        </div>`;
}

function renderLikesSharesChart() {
    const container = document.getElementById('likesSharesChart');
    const data = Array.from({length: 13}, () => ({l:0, s:0}));
    entries.filter(e => e && e.year == new Date().getFullYear()).forEach(e => {
        if(e.entryType === 'Post Like') data[e.month].l++;
        else if(e.entryType === 'Post Share') data[e.month].s++;
    });
    const max = Math.max(...data.map(d=>d.l), ...data.map(d=>d.s), 1);
    
    let html = '<div class="bar-chart">';
    const mNames = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    for(let i=1; i<=12; i++) {
        const hl = (data[i].l/max)*150;
        const hs = (data[i].s/max)*150;
        
        html += `
            <div class="bar-item" style="flex-direction:row; align-items:flex-end; justify-content:center; gap:2px; height:150px; position:relative;">
                <div class="bar" style="height: ${hl}px; background: #10b981; width: 12px; border-radius: 2px 2px 0 0;"></div>
                <div class="bar" style="height: ${hs}px; background: #f59e0b; width: 12px; border-radius: 2px 2px 0 0;"></div>
                <span class="bar-label" style="position:absolute; bottom:-25px; font-size:9px;">${mNames[i]}</span>
            </div>
        `;
    }
    html += '</div>';
    container.innerHTML = html;
}

// ========================================
// CALENDAR FEATURE
// ========================================
const PH_HOLIDAYS = {
    "01-01": "New Year's Day",
    "02-25": "EDSA Revolution",
    "04-09": "Araw ng Kagitingan",
    "05-01": "Labor Day",
    "06-12": "Independence Day",
    "08-21": "Ninoy Aquino Day",
    "08-26": "National Heroes Day",
    "11-01": "All Saints' Day",
    "11-02": "All Souls' Day",
    "11-30": "Bonifacio Day",
    "12-08": "Immaculate Conception",
    "12-25": "Christmas Day",
    "12-30": "Rizal Day",
    "12-31": "New Year's Eve"
};

function changeMonth(offset) {
    currentCalDate.setMonth(currentCalDate.getMonth() + offset);
    renderCalendar();
}

function renderCalendar() {
    const year = currentCalDate.getFullYear();
    const month = currentCalDate.getMonth();
    
    document.getElementById('calendarMonthYear').innerHTML = `<i class="fas fa-calendar-alt" style="margin-right:8px;"></i> ${getMonthName(month+1)} ${year}`;
    
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const tbody = document.getElementById('calendarBody');
    let html = '';
    
    for(let i = 0; i < firstDay; i++) {
        html += `<div class="cal-cell empty-cal-cell"></div>`;
    }

    const todayStr = new Date().toISOString().split('T')[0];

    for(let day = 1; day <= daysInMonth; day++) {
        const monthStr = String(month+1).padStart(2, '0');
        const dayStr = String(day).padStart(2, '0');
        const cellDateStr = `${year}-${monthStr}-${dayStr}`;
        const isTodayClass = (cellDateStr === todayStr) ? 'today' : '';
        
        const md = `${monthStr}-${dayStr}`;
        let holiday = PH_HOLIDAYS[md] || null;
        let note = calendarNotes[cellDateStr] || null;
        
        const dayEntries = entries.filter(e => e && e.date === cellDateStr);
        const uniqueTitles = [...new Set(dayEntries.map(e => e.title))];

        let frontIndicators = '';
        let backSummary = '';

        if (holiday) {
            frontIndicators += `<div class="cal-indicator ind-hol">${holiday}</div>`;
            backSummary += `<div class="cal-back-item"><i class="fas fa-star" style="color:#fbcfe8;"></i> ${holiday}</div>`;
        }
        if (uniqueTitles.length > 0) {
            frontIndicators += `<div class="cal-indicator ind-post">${uniqueTitles.length} Post(s)</div>`;
            uniqueTitles.forEach(t => {
                backSummary += `<div class="cal-back-item"><i class="fas fa-file-alt" style="color:#cffafe;"></i> ${t}</div>`;
            });
        }
        if (note) {
            frontIndicators += `<div class="cal-indicator ind-note">Note attached</div>`;
            backSummary += `<div class="cal-back-item"><i class="fas fa-sticky-note" style="color:#fef08a;"></i> ${note}</div>`;
        }

        if(!backSummary) backSummary = '<div style="text-align:center; padding-top:20px; opacity:0.8;">No event</div>';

        html += `
            <div class="cal-cell ${isTodayClass}" onclick="openCalendarModal('${cellDateStr}')">
                <div class="cal-inner" style="pointer-events:none;">
                    <div class="cal-front">
                        <span class="cal-date-num">${day}</span>
                        <div style="flex:1; overflow:hidden;">${frontIndicators}</div>
                    </div>
                    <div class="cal-back">
                        <strong style="margin-bottom:5px; text-align:center; border-bottom:1px solid rgba(255,255,255,0.3); padding-bottom:2px;">${monthStr}/${dayStr} summary</strong>
                        ${backSummary}
                    </div>
                </div>
            </div>
        `;
    }
    tbody.innerHTML = html;
}

let activeModalDateStr = null;
function openCalendarModal(dateStr) {
    activeModalDateStr = dateStr;
    document.getElementById('calendarModalOverlay').style.display = 'flex';
    document.getElementById('calModalDate').innerHTML = `<i class="fas fa-calendar-day"></i> ${dateStr}`;
    
    const md = dateStr.substring(5);
    const holiday = PH_HOLIDAYS[md];
    
    let holHtml = '';
    if(holiday) {
        holHtml = `<div style="background: #fbcfe8; color: #be185d; padding: 10px; border-radius: 4px; font-weight: bold; border-left: 4px solid #be185d; margin-bottom: 10px;"><i class="fas fa-star"></i> Holiday: ${holiday}</div>`;
    }
    document.getElementById('calModalHolidays').innerHTML = holHtml;

    const dayEntries = entries.filter(e => e && e.date === dateStr);
    const uniqueTitles = [...new Set(dayEntries.map(e => e.title))];
    
    let postsHtml = '';
    if(uniqueTitles.length > 0) {
        postsHtml = `<h4 style="font-size: 13px; color: var(--text-light); text-transform: uppercase; margin-bottom: 5px;">Recorded Posts:</h4><ul style="padding-left: 20px; color: var(--text); font-size: 14px;">`;
        uniqueTitles.forEach(t => postsHtml += `<li style="margin-bottom: 3px;"><strong>${t}</strong></li>`);
        postsHtml += `</ul>`;
    } else if(!holiday) {
        postsHtml = `<div style="color: var(--text-light); text-align: center; padding: 20px; font-style: italic;">No event or posts for today.</div>`;
    }
    document.getElementById('calModalPosts').innerHTML = postsHtml;
    document.getElementById('calModalNote').value = calendarNotes[dateStr] || '';
}

function closeCalendarModal(e, force = false) {
    if (force || e.target.id === 'calendarModalOverlay') {
        document.getElementById('calendarModalOverlay').style.display = 'none';
        activeModalDateStr = null;
    }
}

function saveCalendarNote() {
    if(!activeModalDateStr) return;
    const note = document.getElementById('calModalNote').value.trim();
    
    if (note) calendarNotes[activeModalDateStr] = note;
    else delete calendarNotes[activeModalDateStr];

    database.ref('calendarNotes').set(calendarNotes).then(() => {
        closeCalendarModal(null, true);
        if(currentPage === 'calendar') renderCalendar();
    });
}

// ========================================
// Master Names Management
// ========================================
function toggleNewCategory() {
    const select = document.getElementById('listCategorySelect');
    const input = document.getElementById('newCategoryInput');
    if (select.value === 'new') { input.style.display = 'block'; input.setAttribute('required', 'true'); } 
    else { input.style.display = 'none'; input.removeAttribute('required'); }
}

function renderNamesList() {
    const container = document.getElementById('namesListContainer');
    if (masterNames.filter(n=>n).length === 0) {
        container.innerHTML = `<div class="empty-state"><i class="fas fa-user-plus"></i><h3>No Names Added</h3></div>`;
        return;
    }
    const categories = {};
    masterNames.forEach((n, i) => {
        if (!n) return;
        const c = n.category || 'Default';
        if (!categories[c]) categories[c] = [];
        categories[c].push({ data: n, idx: i });
    });
    let html = '';
    for (const [cat, items] of Object.entries(categories)) {
        html += `
            <div class="table-section">
                <div class="table-header collapsed" onclick="toggleTable(this)">
                    <span class="title"><i class="fas fa-folder"></i> ${cat} (${items.length})</span>
                    <i class="fas fa-chevron-down toggle-icon"></i>
                </div>
                <div class="table-content collapsed" style="padding: 10px;">
                    <div class="names-list">`;
        items.forEach(item => {
            html += `<div class="name-item">
                        <div class="name-info">
                            <div class="full-name">${item.data.full}</div>
                            <div class="alias-name">${item.data.alias || ''}</div>
                        </div>
                        <div class="actions">
                            <button type="button" class="btn btn-outline btn-sm" onclick="editName(${item.idx})"><i class="fas fa-edit"></i></button>
                            <button type="button" class="btn btn-danger btn-sm" onclick="deleteName(${item.idx})"><i class="fas fa-trash"></i></button>
                        </div>
                    </div>`;
        });
        html += `</div></div></div>`;
    }
    container.innerHTML = html;
}

function addStagedName() {
    const full = document.getElementById('singleFullName').value.trim();
    const alias = document.getElementById('singleAliasName').value.trim();
    if (!full) return; 
    
    const existsInMaster = masterNames.some(n => n && n.full.toLowerCase() === full.toLowerCase());
    const existsInStaged = stagedNames.some(n => n.full.toLowerCase() === full.toLowerCase());

    if (existsInMaster || existsInStaged) return; 

    stagedNames.push({ full, alias });
    document.getElementById('singleFullName').value = '';
    document.getElementById('singleAliasName').value = '';
    renderStagedNames();
}

function renderStagedNames() {
    const container = document.getElementById('stagedNamesContainer');
    const list = document.getElementById('stagedNamesList');
    if (stagedNames.length === 0) { container.style.display = 'none'; return; }
    container.style.display = 'block';
    list.innerHTML = stagedNames.map((n, i) => `
        <div style="display:inline-flex; align-items:center; background:var(--light); padding:6px 12px; border-radius:20px; border:1px solid var(--border); font-size:13px; color: var(--text);">
            <strong>${n.full}</strong> ${n.alias ? ` <span style="color:var(--text-light)">(${n.alias})</span>` : ''}
            <button type="button" onclick="stagedNames.splice(${i},1); renderStagedNames()" style="background:none;border:none;cursor:pointer;margin-left:8px;color:var(--danger);"><i class="fas fa-times"></i></button>
        </div>`).join('');
}

function saveName() {
    let cat = document.getElementById('listCategorySelect').value;
    if (cat === 'new') cat = document.getElementById('newCategoryInput').value.trim();
    if (!cat) return;

    const sFull = document.getElementById('singleFullName').value.trim();
    const sAlias = document.getElementById('singleAliasName').value.trim();
    const eIdx = document.getElementById('editNameIndex').value;

    if (eIdx !== '') {
        if (!sFull) return;
        masterNames[parseInt(eIdx)] = { category: cat, full: sFull, alias: sAlias };
    } else {
        if (sFull) {
            if (!masterNames.some(n => n && n.full.toLowerCase() === sFull.toLowerCase())) {
                stagedNames.push({ full: sFull, alias: sAlias });
            }
        }
        if (stagedNames.length === 0) return;
        stagedNames.forEach(n => masterNames.push({ category: cat, full: n.full, alias: n.alias }));
    }

    const sanitizedMaster = JSON.parse(JSON.stringify(masterNames));
    database.ref('masterNames').set(sanitizedMaster).then(() => {
        resetNameForm(); 
    });
}

function editName(index) {
    const n = masterNames[index];
    if(!n) return;
    document.getElementById('editNameIndex').value = index;
    const sel = document.getElementById('listCategorySelect');
    if (Array.from(sel.options).some(o => o.value === n.category)) { sel.value = n.category; toggleNewCategory(); }
    else { sel.value = 'new'; toggleNewCategory(); document.getElementById('newCategoryInput').value = n.category; }
    
    document.getElementById('singleFullName').value = n.full;
    document.getElementById('singleAliasName').value = n.alias || '';
    stagedNames = []; renderStagedNames();
    document.getElementById('addStagedBtn').style.display = 'none';
    document.getElementById('nameFormTitle').innerHTML = '<i class="fas fa-edit"></i> Edit Name';
    document.getElementById('addNameCard').scrollIntoView({behavior: 'smooth'});
}

function resetNameForm() {
    document.getElementById('inlineNameForm').reset();
    document.getElementById('editNameIndex').value = '';
    document.getElementById('listCategorySelect').value = '';
    toggleNewCategory();
    stagedNames = []; renderStagedNames();
    document.getElementById('addStagedBtn').style.display = 'inline-flex';
    document.getElementById('nameFormTitle').innerHTML = '<i class="fas fa-user-plus"></i> Add Master Names';
}

function deleteName(index) {
    masterNames[index] = null; 
    const sanitizedMaster = JSON.parse(JSON.stringify(masterNames));
    database.ref('masterNames').set(sanitizedMaster);
}

// ========================================
// Add/Update Monthly Entry Page
// ========================================
function updateExistingMonthDropdown() {
    const select = document.getElementById('existingMonthSelect');
    select.innerHTML = '<option value="">-- Start New Monthly Record --</option>';
    
    const uniqueMonths = {};
    entries.forEach((e, idx) => {
        if(!e) return;
        const key = `${e.month}|${e.year}`;
        if (!uniqueMonths[key]) uniqueMonths[key] = { label: `${getMonthName(e.month)} ${e.year}`, originalIdx: idx };
    });

    Object.keys(uniqueMonths).forEach(key => {
        select.innerHTML += `<option value="${key}">${uniqueMonths[key].label}</option>`;
    });
}

function handleExistingMonth() {
    const val = document.getElementById('existingMonthSelect').value;
    if (val) {
        const [m, y] = val.split('|');
        document.getElementById('entryMonth').value = m;
        document.getElementById('entryYear').value = y;
    }
}

function entryCategoryChanged() {
    document.getElementById('shareRows').innerHTML = ''; 
    calculateRemarks();
}

function toggleEntryType() {
    const type = document.getElementById('entryType').value;
    if (type === 'Post Like') {
        document.getElementById('likeInputSection').style.display = 'block';
        document.getElementById('shareInputSection').style.display = 'none';
    } else {
        document.getElementById('likeInputSection').style.display = 'none';
        document.getElementById('shareInputSection').style.display = 'block';
    }
    calculateRemarks();
}

function getFilteredMasterNames() {
    const cat = document.getElementById('entryCategorySelect').value;
    const valid = masterNames.map((n, i) => n ? {...n, originalIndex: i} : null).filter(n => n !== null);
    if (!cat) return valid;
    return valid.filter(n => (n.category || 'Default') === cat);
}

function addShareRow() {
    const container = document.getElementById('shareRows');
    const row = document.createElement('div');
    row.style.cssText = "display:flex; gap:10px; margin-bottom:10px; align-items:center; flex-wrap:wrap;";
    
    let options = '<option value="">-- Select Name --</option>';
    getFilteredMasterNames().forEach(n => {
        options += `<option value="${n.originalIndex}">${n.full} ${n.alias ? '('+n.alias+')' : ''}</option>`;
    });

    row.innerHTML = `
        <select class="share-name-select" onchange="calculateRemarks()" style="flex:1; min-width:200px; padding:8px;" required>${options}</select>
        <input type="date" class="share-date-input" onchange="calculateRemarks()" style="width:150px; padding:8px;" required>
        <button type="button" class="btn btn-danger btn-sm" onclick="this.parentElement.remove(); calculateRemarks()"><i class="fas fa-times"></i></button>
    `;
    container.appendChild(row);
}

function calculateRemarks() {
    const type = document.getElementById('entryType').value;
    let count = 0;
    
    if (type === 'Post Like') {
        const rawText = document.getElementById('rawPostNames').value.toLowerCase();
        if (rawText.trim() !== '') {
            getFilteredMasterNames().forEach((n) => {
                const fullLower = n.full.toLowerCase();
                const aliasLower = (n.alias || '').toLowerCase();
                if ((aliasLower && rawText.includes(aliasLower)) || rawText.includes(fullLower)) count++;
            });
        }
    } else {
        document.querySelectorAll('#shareRows > div').forEach(row => {
            if (row.querySelector('.share-date-input').value) count++;
        });
    }
    document.getElementById('entryRemarks').value = count;
}

function saveEntry() {
    const month = parseInt(document.getElementById('entryMonth').value);
    const year = parseInt(document.getElementById('entryYear').value);
    const entryType = document.getElementById('entryType').value;
    
    const postTitle = document.getElementById('postTitle').value.trim();
    const postLink = document.getElementById('postLink').value.trim();
    const entryDate = document.getElementById('entryDate').value; 
    const entryCategory = document.getElementById('entryCategorySelect').value || 'Default';

    if (!postTitle || !entryDate || !month || !year || !entryType) return; 

    const selectedNames = [];
    let shareDates = {};
    let remarksCount = 0;

    if (entryType === 'Post Like') {
        const rawText = document.getElementById('rawPostNames').value.toLowerCase();
        getFilteredMasterNames().forEach(n => {
            const f = n.full.toLowerCase();
            const a = (n.alias || '').toLowerCase();
            if ((a && rawText.includes(a)) || rawText.includes(f)) selectedNames.push(n.originalIndex);
        });
        remarksCount = selectedNames.length;
    } else {
        document.querySelectorAll('#shareRows > div').forEach(row => {
            const nIdxStr = row.querySelector('.share-name-select').value;
            const dInput = row.querySelector('.share-date-input').value || "No Date";
            if (nIdxStr !== '') {
                const idx = parseInt(nIdxStr);
                if (!selectedNames.includes(idx)) selectedNames.push(idx);
                shareDates[idx] = dInput;
                if (dInput !== "No Date") remarksCount++;
            }
        });
    }

    const remarksStr = "Remark total of : " + remarksCount;
    let existingIndex = entries.findIndex(e => e && e.title === postTitle && e.date === entryDate && e.entryType === entryType);
    let savedEntryObj = null;

    if (existingIndex !== -1) {
        let entry = entries[existingIndex];
        entry.category = entryCategory; 
        entry.selectedNames = entry.selectedNames || [];
        selectedNames.forEach(i => { if (!entry.selectedNames.includes(i)) entry.selectedNames.push(i); });
        
        if (entryType === 'Post Share') {
            entry.shareDates = entry.shareDates || {};
            Object.assign(entry.shareDates, shareDates);
            entry.remarks = "Remark total of : " + Object.values(entry.shareDates).filter(d => d !== "No Date").length;
        } else {
            entry.remarks = "Remark total of : " + entry.selectedNames.length;
        }
        savedEntryObj = entry;
    } else {
        let newEntry = { title: postTitle, link: postLink, date: entryDate, month, year, entryType, category: entryCategory, selectedNames, remarks: remarksStr, createdAt: new Date().toISOString() };
        if (entryType === 'Post Share') newEntry.shareDates = shareDates;
        entries.push(newEntry);
        savedEntryObj = newEntry;
    }

    resetEntryForm();
    const sanitizedEntries = JSON.parse(JSON.stringify(entries.filter(e => e !== null && e !== undefined)));
    database.ref('entries').set(sanitizedEntries).then(() => {
        addEntryToPreview(savedEntryObj);
    });
}

function addEntryToPreview(entry) {
    const previewSec = document.getElementById('entryPreviewSection');
    const tbody = document.getElementById('previewTableBody');
    previewSec.style.display = 'block';
    
    let nameStrings = '';
    if (entry.entryType === 'Post Share') {
        nameStrings = (entry.selectedNames || []).map(i => {
            const n = masterNames[i];
            if (!n) return '';
            let d = n.alias || n.full;
            let bgClass = 'tag-success'; 
            if (entry.shareDates && entry.shareDates[i]) {
                const sDate = entry.shareDates[i];
                d += ` (${sDate})`;
                if (sDate !== "No Date") {
                    let diffDays = Math.floor(Math.abs(new Date(sDate) - new Date(entry.date)) / (1000 * 60 * 60 * 24));
                    if (diffDays === 0) bgClass = 'tag-success';
                    else if (diffDays >= 1 && diffDays <= 5) bgClass = 'tag-primary'; 
                    else bgClass = 'tag-danger';
                } else {
                    bgClass = 'tag-warning'; 
                }
            }
            return `<span class="tag tag-bubble ${bgClass}">${d}</span>`;
        }).join(' ');
    } else {
        if (entry.category && entry.category !== 'Default') {
            nameStrings = masterNames.map((n, i) => {
                if (!n || (n.category || 'Default') !== entry.category) return '';
                let d = n.alias || n.full;
                if ((entry.selectedNames || []).includes(i)) {
                    return `<span class="tag tag-bubble tag-success">${d} <i class="fas fa-check"></i></span>`;
                } else {
                    return `<span class="tag tag-bubble tag-danger">${d} - Not Reacting</span>`;
                }
            }).filter(s => s !== '').join(' ');
        } else {
            nameStrings = (entry.selectedNames || []).map(i => {
                const n = masterNames[i];
                return n ? `<span class="tag tag-bubble tag-success">${n.alias || n.full} <i class="fas fa-check"></i></span>` : '';
            }).join(' ');
        }
    }

    const typeClass = entry.entryType === 'Post Like' ? 'tag-success' : 'tag-warning';
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td>${entry.date}</td>
        <td><span class="tag ${typeClass}">${entry.entryType}</span></td>
        <td><div class="truncate-caption" title="Click to expand" onclick="this.classList.toggle('expanded')"><strong>${entry.title}</strong></div></td>
        <td><div class="expandable-names" title="Click to expand" onclick="this.classList.toggle('expanded')">${nameStrings || '<em style="color:var(--text-light);">No names mapped</em>'}</div></td>
        <td><strong>${entry.remarks}</strong></td>
    `;
    tbody.insertBefore(tr, tbody.firstChild);
}

// ========================================
// Database & Bulk Delete (No Matrix)
// ========================================
function renderDatabase() { applyFilters(); }

function applyFilters() {
    const fMonth = document.getElementById('filterMonth').value;
    const fYear = document.getElementById('filterYear').value;
    const fType = document.getElementById('filterEntryType').value;

    let filtered = entries.map((e, i) => e ? {...e, _originalIndex: i} : null).filter(e => e !== null);
    if (fMonth) filtered = filtered.filter(e => e.month == fMonth);
    if (fYear) filtered = filtered.filter(e => e.year == fYear);
    if (fType) filtered = filtered.filter(e => e.entryType === fType);

    updateDeleteButtonVisibility(); 
    renderPerMonthView(filtered);
}

function renderPerMonthView(filtered) {
    const container = document.getElementById('databaseContainer');
    if (filtered.length === 0) { container.innerHTML = '<div class="empty-state"><i class="fas fa-database"></i><h3>No Data</h3></div>'; return; }
    
    const groups = {};
    filtered.forEach(entry => {
        const key = `${entry.month}|${entry.year}|${entry.entryType}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(entry);
    });

    const sortedKeys = Object.keys(groups).sort((a, b) => {
        const [mA, yA, tA] = a.split('|');
        const [mB, yB, tB] = b.split('|');
        if (yA !== yB) return Number(yA) - Number(yB);
        if (mA !== mB) return Number(mA) - Number(mB);
        return tA.localeCompare(tB); 
    });

    let html = '';
    sortedKeys.forEach(key => {
        const [m, y, t] = key.split('|');
        groups[key].sort((a, b) => new Date(a.date) - new Date(b.date)); 
        html += renderTableSection(`${getMonthName(Number(m))} ${y} - ${t}`, groups[key]);
    });
    container.innerHTML = html;
}

function mergeEntries(groupEntries) {
    const merged = [];
    const seen = new Map();

    groupEntries.forEach(entry => {
        const key = `${entry.title}|${entry.link}|${entry.date}|${entry.entryType}`;
        if (seen.has(key)) {
            const existing = seen.get(key);
            if(entry.selectedNames) {
                entry.selectedNames.forEach(nameIndex => {
                    if (!existing.selectedNames.includes(nameIndex)) existing.selectedNames.push(nameIndex);
                });
            }
            if(entry.entryType === 'Post Share' && entry.shareDates) {
                if(!existing.shareDates) existing.shareDates = {};
                Object.keys(entry.shareDates).forEach(k => existing.shareDates[k] = entry.shareDates[k]);
                let count = Object.values(existing.shareDates).filter(d => d !== "No Date").length;
                existing.remarks = "Remark total of : " + count;
            } else if (entry.entryType === 'Post Like') {
                existing.remarks = "Remark total of : " + existing.selectedNames.length;
            }
            existing._originalIndexes.push(entry._originalIndex);
        } else {
            let clone = JSON.parse(JSON.stringify(entry)); 
            if (!clone.selectedNames) clone.selectedNames = [];
            clone._originalIndexes = [entry._originalIndex];
            seen.set(key, clone);
            merged.push(clone);
        }
    });
    return merged;
}

function renderTableSection(title, groupEntries) {
    const merged = mergeEntries(groupEntries);
    let html = `
        <div class="table-section">
            <div class="table-header collapsed" onclick="toggleTable(this)">
                <span class="title">${title} (${merged.length} Posts)</span>
                <i class="fas fa-chevron-down toggle-icon"></i>
            </div>
            <div class="table-content collapsed">
                <table class="table-striped" style="table-layout: auto;">
                    <thead><tr>
                        <th style="width: 40px; text-align: center;" class="print-hide"><input type="checkbox" onclick="toggleAllCheckboxes(this)" style="cursor: pointer;"></th>
                        <th style="width: 40px;">#</th>
                        <th style="width: 100px;">Date</th>
                        <th style="width: 100px;">Type</th>
                        <th>Post Caption</th>
                        <th>Link</th>
                        <th style="width: 350px;">Names Mapped</th>
                        <th style="width: 100px;">Remarks</th>
                        <th class="print-hide" style="width: 80px;">Action</th>
                    </tr></thead>
                    <tbody>
    `;
    merged.forEach((entry, index) => {
        let innerRows = '';
        const targetCategory = entry.category || 'Default';
        
        // Filter master names for this entry's category to build the vertical sub-table
        const namesToRender = masterNames.map((n, i) => n ? {...n, originalIndex: i} : null)
            .filter(n => n !== null && (n.category || 'Default') === targetCategory);

        namesToRender.forEach(nameObj => {
            const isPresent = entry.selectedNames && entry.selectedNames.includes(nameObj.originalIndex);
            let bubble = '';
            let statusText = '';
            
            if (entry.entryType === 'Post Share') {
                let sDate = (isPresent && entry.shareDates && entry.shareDates[nameObj.originalIndex]) ? entry.shareDates[nameObj.originalIndex] : "No Date";
                statusText = sDate === "No Date" ? "0" : sDate;
                
                let bgClass = 'tag-danger';
                if (sDate !== "No Date") {
                    let diffDays = Math.floor(Math.abs(new Date(sDate) - new Date(entry.date)) / (1000 * 60 * 60 * 24));
                    if (diffDays === 0) bgClass = 'tag-success';
                    else if (diffDays >= 1 && diffDays <= 5) bgClass = 'tag-primary';
                    else bgClass = 'tag-danger';
                }
                bubble = `<span class="tag tag-bubble ${bgClass}">${nameObj.full} ${nameObj.alias ? '('+nameObj.alias+')' : ''}</span>`;
            } else {
                statusText = isPresent ? "1" : "0";
                if (isPresent) {
                    bubble = `<span class="tag tag-bubble tag-success">${nameObj.full} ${nameObj.alias ? '('+nameObj.alias+')' : ''} <i class="fas fa-check"></i></span>`;
                } else {
                    bubble = `<span class="tag tag-bubble tag-danger">${nameObj.full} ${nameObj.alias ? '('+nameObj.alias+')' : ''} - Not Reacting</span>`;
                }
            }
            
            innerRows += `
                <tr>
                    <td style="border:none; padding:4px;">${bubble}</td>
                    <td style="border:none; padding:4px; text-align:center; font-weight:bold;">${statusText}</td>
                    <td style="border:none; padding:4px; text-align:center;">
                        <button class="btn btn-outline btn-sm" onclick="editNameStatus('${entry._originalIndexes.join(',')}', ${nameObj.originalIndex}, '${entry.entryType}')"><i class="fas fa-edit"></i> Edit</button>
                    </td>
                </tr>
            `;
        });

        const typeClass = entry.entryType === 'Post Like' ? 'tag-success' : 'tag-warning';
        const mappedCount = entry.selectedNames ? entry.selectedNames.length : 0;

        html += `<tr>
            <td style="text-align: center;" class="print-hide"><input type="checkbox" class="entry-checkbox" value="${entry._originalIndexes.join(',')}" onchange="updateDeleteButtonVisibility()"></td>
            <td>${index + 1}</td>
            <td>${entry.date}</td>
            <td><span class="tag ${typeClass}">${entry.entryType}</span></td>
            <td><div class="truncate-caption" title="Click to expand" onclick="this.classList.toggle('expanded')"><strong>${entry.title}</strong></div></td>
            <td><div class="truncate-link" title="${entry.link}">${entry.link ? `<a href="${entry.link}" target="_blank" style="color:var(--primary);"><i class="fas fa-external-link-alt"></i></a>` : '-'}</div></td>
            <td>
                <div class="expandable-names" onclick="if(event.target.tagName==='BUTTON' || event.target.closest('button')) return; this.classList.toggle('expanded')" title="Click to expand">
                    <div class="expand-summary">
                        <strong>${mappedCount} / ${namesToRender.length} Mapped</strong> <i class="fas fa-chevron-down" style="font-size: 10px; margin-left: 5px;"></i>
                    </div>
                    <div class="expand-details">
                        <table class="inner-names-table">
                            <thead>
                                <tr>
                                    <th style="background:transparent; border-bottom:1px solid #eee;">Name</th>
                                    <th style="background:transparent; border-bottom:1px solid #eee; text-align:center;">Status</th>
                                    <th style="background:transparent; border-bottom:1px solid #eee; text-align:center;">Action</th>
                                </tr>
                            </thead>
                            <tbody>${innerRows}</tbody>
                        </table>
                    </div>
                </div>
            </td>
            <td><strong>${entry.remarks}</strong></td>
            <td class="print-hide" style="white-space: nowrap;">
                <button class="btn btn-primary btn-sm" onclick="editPostDetails('${entry._originalIndexes.join(',')}')" title="Edit Entry"><i class="fas fa-edit"></i></button>
                <button class="btn btn-danger btn-sm" onclick="deleteSingleEntry('${entry._originalIndexes.join(',')}')" title="Delete Entry"><i class="fas fa-trash"></i></button>
            </td>
        </tr>`;
    });
    html += `</tbody></table></div></div>`;
    return html;
}

function toggleTable(header) { header.classList.toggle('collapsed'); header.nextElementSibling.classList.toggle('collapsed'); }
function getMonthName(m) { const mos = ["","January","February","March","April","May","June","July","August","September","October","November","December"]; return mos[m]; }
function toggleTheme() {
    const body = document.body;
    let nt = 'light';
    if (body.getAttribute('data-theme') === 'dark') { body.removeAttribute('data-theme'); document.getElementById('themeBtn').innerHTML = '<i class="fas fa-moon"></i>'; } 
    else { body.setAttribute('data-theme', 'dark'); document.getElementById('themeBtn').innerHTML = '<i class="fas fa-sun"></i>'; nt = 'dark'; }
    database.ref('theme').set(nt);
}

function toggleAllCheckboxes(source) {
    const tbody = source.closest('table').querySelector('tbody');
    const checkboxes = tbody.querySelectorAll('.entry-checkbox');
    checkboxes.forEach(cb => cb.checked = source.checked);
    updateDeleteButtonVisibility();
}

function updateDeleteButtonVisibility() {
    const checkedCount = document.querySelectorAll('.entry-checkbox:checked').length;
    const btn = document.getElementById('btnDeleteSelected');
    if (btn) btn.style.display = checkedCount > 0 ? 'inline-flex' : 'none';
}

function deleteSingleEntry(indexesStr) {
    const idxs = indexesStr.split(',').map(Number);
    idxs.forEach(idx => { entries[idx] = null; }); 
    const sanitizedEntries = JSON.parse(JSON.stringify(entries.filter(e => e !== null && e !== undefined)));
    database.ref('entries').set(sanitizedEntries);
}

function deleteSelectedEntries() {
    const checked = document.querySelectorAll('.entry-checkbox:checked');
    if (checked.length === 0) return;
    checked.forEach(cb => {
        const idxs = cb.value.split(',').map(Number);
        idxs.forEach(i => { entries[i] = null; });
    });
    const sanitizedEntries = JSON.parse(JSON.stringify(entries.filter(e => e !== null && e !== undefined)));
    database.ref('entries').set(sanitizedEntries);
}

// Edit Individual Name Status inside the sub-table
function editNameStatus(indexesStr, nameIndex, entryType) {
    if(window.event) window.event.stopPropagation();
    
    const idxs = indexesStr.split(',').map(Number);
    let isPresent = false;
    let currentStr = "No Date";
    
    idxs.forEach(idx => {
        if (entries[idx] && entries[idx].selectedNames && entries[idx].selectedNames.includes(nameIndex)) {
            isPresent = true;
            if (entryType === 'Post Share' && entries[idx].shareDates && entries[idx].shareDates[nameIndex]) {
                currentStr = entries[idx].shareDates[nameIndex];
            }
        }
    });

    if (entryType === 'Post Like') {
        const newVal = prompt(`Editing Like for ${masterNames[nameIndex].full}\nEnter 1 to set as present, 0 to remove:`, isPresent ? "1" : "0");
        if (newVal === "1") {
            const mainIdx = idxs[0];
            if (!entries[mainIdx].selectedNames) entries[mainIdx].selectedNames = [];
            if (!entries[mainIdx].selectedNames.includes(nameIndex)) entries[mainIdx].selectedNames.push(nameIndex);
            entries[mainIdx].remarks = "Remark total of : " + entries[mainIdx].selectedNames.length;
            const sanitizedEntries = JSON.parse(JSON.stringify(entries.filter(e => e !== null && e !== undefined)));
            database.ref('entries').set(sanitizedEntries);
        } else if (newVal === "0") {
            idxs.forEach(idx => {
                if (entries[idx] && entries[idx].selectedNames) {
                    entries[idx].selectedNames = entries[idx].selectedNames.filter(i => i !== nameIndex);
                    entries[idx].remarks = "Remark total of : " + entries[idx].selectedNames.length;
                }
            });
            const sanitizedEntries = JSON.parse(JSON.stringify(entries.filter(e => e !== null && e !== undefined)));
            database.ref('entries').set(sanitizedEntries);
        }
    } else {
        const newVal = prompt(`Editing Share for ${masterNames[nameIndex].full}\nEnter Date (YYYY-MM-DD), 'No Date', or '0' to remove:`, currentStr);
        if (newVal === null) return;
        
        if (newVal === "0" || newVal.trim() === "") {
            idxs.forEach(idx => {
                if (entries[idx] && entries[idx].selectedNames) {
                    entries[idx].selectedNames = entries[idx].selectedNames.filter(i => i !== nameIndex);
                    if (entries[idx].shareDates) delete entries[idx].shareDates[nameIndex];
                    let c = entries[idx].shareDates ? Object.values(entries[idx].shareDates).filter(d => d !== "No Date").length : 0;
                    entries[idx].remarks = "Remark total of : " + c;
                }
            });
            const sanitizedEntries = JSON.parse(JSON.stringify(entries.filter(e => e !== null && e !== undefined)));
            database.ref('entries').set(sanitizedEntries);
        } else {
            const dVal = (newVal === "No Date" || newVal === "YYYY-MM-DD") ? "No Date" : newVal;
            const mainIdx = idxs[0];
            if (!entries[mainIdx].selectedNames) entries[mainIdx].selectedNames = [];
            if (!entries[mainIdx].selectedNames.includes(nameIndex)) entries[mainIdx].selectedNames.push(nameIndex);
            if (!entries[mainIdx].shareDates) entries[mainIdx].shareDates = {};
            entries[mainIdx].shareDates[nameIndex] = dVal;
            
            let c = Object.values(entries[mainIdx].shareDates).filter(d => d !== "No Date").length;
            entries[mainIdx].remarks = "Remark total of : " + c;
            
            const sanitizedEntries = JSON.parse(JSON.stringify(entries.filter(e => e !== null && e !== undefined)));
            database.ref('entries').set(sanitizedEntries);
        }
    }
}

// Edit Entire Post
function editPostDetails(indexesStr) {
    const idxs = indexesStr.split(',').map(Number);
    const entry = entries[idxs[0]];
    if(!entry) return;

    document.getElementById('editPostIndexes').value = indexesStr;
    document.getElementById('editPostTitle').value = entry.title || '';
    document.getElementById('editPostLink').value = entry.link || '';
    document.getElementById('editPostDate').value = entry.date || '';
    document.getElementById('editPostModalOverlay').style.display = 'flex';
}

function closeEditModal(e, force = false) {
    if (force || e.target.id === 'editPostModalOverlay') {
        document.getElementById('editPostModalOverlay').style.display = 'none';
    }
}

function saveEditedPost() {
    const indexesStr = document.getElementById('editPostIndexes').value;
    const idxs = indexesStr.split(',').map(Number);
    
    const newTitle = document.getElementById('editPostTitle').value.trim();
    const newLink = document.getElementById('editPostLink').value.trim();
    const newDate = document.getElementById('editPostDate').value;

    if(!newTitle || !newDate) return;

    idxs.forEach(idx => {
        if (entries[idx]) {
            entries[idx].title = newTitle;
            entries[idx].link = newLink;
            entries[idx].date = newDate;
            entries[idx].month = parseInt(newDate.split('-')[1], 10);
            entries[idx].year = parseInt(newDate.split('-')[0], 10);
        }
    });

    const sanitizedEntries = JSON.parse(JSON.stringify(entries.filter(e => e !== null && e !== undefined)));
    database.ref('entries').set(sanitizedEntries).then(() => {
        closeEditModal(null, true);
    });
}

function exportToExcel() {
    const fMonth = document.getElementById('filterMonth').value;
    const fYear = document.getElementById('filterYear').value;
    const fType = document.getElementById('filterEntryType').value;

    let filtered = entries.map((e, i) => e ? {...e, _originalIndex: i} : null).filter(e => e !== null);
    if (fMonth) filtered = filtered.filter(e => e.month == fMonth);
    if (fYear) filtered = filtered.filter(e => e.year == fYear);
    if (fType) filtered = filtered.filter(e => e.entryType === fType);

    if (filtered.length === 0) return;

    const merged = mergeEntries(filtered);
    merged.sort((a, b) => new Date(a.date) - new Date(b.date)); 
    
    let csv = 'Record Group,Date,Entry Type,Post Caption,Link,Names,Remarks\n';
    merged.forEach(e => {
        let ns = '';
        if (e.entryType === 'Post Like') {
            const targetCategory = e.category || 'Default';
            ns = masterNames.map((n, i) => {
                if (!n || (n.category || 'Default') !== targetCategory) return '';
                if ((e.selectedNames || []).includes(i)) return `${n.alias || n.full} - Reacted`;
                else return `${n.alias || n.full} - Not Reacting`;
            }).filter(s=>s!=='').join('; ');
        } else if (e.entryType === 'Post Share') {
            ns = (e.selectedNames||[]).map(i=>{
                const n=masterNames[i]; 
                if(!n) return '';
                let d = n.alias || n.full;
                if(e.shareDates && e.shareDates[i]) d += ` (${e.shareDates[i]})`;
                return d;
            }).filter(n=>n).join('; ');
        }
        let cleanNS = ns.replace(/<\/?[^>]+(>|$)/g, "");
        csv += `"${getMonthName(e.month)} ${e.year}","${e.date}","${e.entryType}","${e.title ? e.title.replace(/"/g, '""') : ''}","${e.link}","${cleanNS.replace(/"/g, '""')}","${e.remarks}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.setAttribute('href', URL.createObjectURL(blob));
    link.setAttribute('download', 'DTI_Monitoring_' + new Date().toISOString().split('T')[0] + '.csv');
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
}