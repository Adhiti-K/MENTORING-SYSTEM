document.addEventListener('DOMContentLoaded', () => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) { window.location.href = 'index.html'; return; }

    document.getElementById('user-name').textContent = user.name;
    document.getElementById('user-role').textContent = user.role.toUpperCase();
    document.getElementById('user-avatar').textContent = user.name.charAt(0).toUpperCase();

    initSidebar(user.role);
    loadDefaultPage(user.role);
    fetchNotifications();
    setInterval(fetchNotifications, 30000); // refresh every 30s
});

const NAV_ITEMS = {
    admin: [
        { icon: 'layout-dashboard', label: 'Overview', page: 'adminOverview' },
        { icon: 'user-check', label: 'Approvals', page: 'approvals' },
        { icon: 'users', label: 'Allocation', page: 'allocation' },
        { icon: 'calendar', label: 'Meetings', page: 'adminMeetings' },
        { icon: 'clipboard-list', label: 'Marks Approval', page: 'adminMarks' },
        { icon: 'bar-chart-3', label: 'Attendance', page: 'adminAttendance' },
        { icon: 'file-down', label: 'Reports', page: 'reports' },
        { icon: 'scroll-text', label: 'Activity Logs', page: 'logs' }
    ],
    mentor: [
        { icon: 'layout-dashboard', label: 'Overview', page: 'mentorOverview' },
        { icon: 'users', label: 'My Mentees', page: 'myMentees' },
        { icon: 'clipboard-list', label: 'Marks Management', page: 'mentorMarks' },
        { icon: 'calendar', label: 'Meetings', page: 'mentorMeetings' },
        { icon: 'alert-triangle', label: 'Alerts', page: 'alerts' },
        { icon: 'help-circle', label: 'Issues', page: 'mentorIssues' },
        { icon: 'message-square', label: 'Messages', page: 'messages' }
    ],
    student: [
        { icon: 'layout-dashboard', label: 'Overview', page: 'studentOverview' },
        { icon: 'calendar', label: 'Meetings', page: 'studentMeetings' },
        { icon: 'book-open', label: 'My Marks', page: 'studentMarks' },
        { icon: 'award', label: 'Achievements', page: 'achievements' },
        { icon: 'lightbulb', label: 'Courses & Progress', page: 'recommendations' },
        { icon: 'help-circle', label: 'Raise Issue', page: 'reportIssue' },
        { icon: 'message-square', label: 'Messages', page: 'studentMessages' }
    ],
    hod: [
        { icon: 'layout-dashboard', label: 'Dept Overview', page: 'deptOverview' },
        { icon: 'users', label: 'Mentors', page: 'mentors' },
        { icon: 'search', label: 'Student Search', page: 'search' },
        { icon: 'trending-up', label: 'Analytics', page: 'analytics' },
        { icon: 'brain', label: 'Learners', page: 'hodLearners' },
        { icon: 'file-text', label: 'Proceedings', page: 'hodProceedings' }
    ],
    principal: [
        { icon: 'layout-dashboard', label: 'College Overview', page: 'collegeOverview' },
        { icon: 'layers', label: 'Departments', page: 'departments' },
        { icon: 'trending-up', label: 'Analytics', page: 'instAnalytics' }
    ]
};

function initSidebar(role) {
    const nav = document.getElementById('sidebar-nav');
    nav.innerHTML = (NAV_ITEMS[role] || []).map(item => `
        <a href="#" class="nav-item" id="nav-${item.page}" onclick="loadDashboardPage('${item.page}'); setActiveNav('${item.page}'); return false;">
            <i data-lucide="${item.icon}"></i>
            <span>${item.label}</span>
        </a>
    `).join('');
    lucide.createIcons();
}

function setActiveNav(page) {
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    const el = document.getElementById(`nav-${page}`);
    if (el) el.classList.add('active');
}

function loadDefaultPage(role) {
    const defaults = { admin: 'adminOverview', mentor: 'mentorOverview', student: 'studentOverview', hod: 'deptOverview', principal: 'collegeOverview' };
    loadDashboardPage(defaults[role]);
    setActiveNav(defaults[role]);
}

function loadDashboardPage(page) {
    const container = document.getElementById('dashboard-content');
    document.getElementById('page-title').textContent = page.replace(/([A-Z])/g, ' $1').trim();
    container.innerHTML = '<div style="text-align:center;padding:3rem;color:var(--text-muted);">Loading...</div>';
    const fn = window[`render${page.charAt(0).toUpperCase() + page.slice(1)}`];
    if (typeof fn === 'function') fn(container);
    else container.innerHTML = `<div class="stat-card"><p>Page "${page}" coming soon.</p></div>`;
}

function toggleNotifPanel() {
    const p = document.getElementById('notif-panel');
    p.style.display = p.style.display === 'none' ? 'block' : 'none';
}

async function fetchNotifications() {
    try {
        const res = await fetch(`${API_URL}/common/notifications`, { headers: getAuthHeaders() });
        if (!res.ok) return;
        const notifs = await res.json();
        const unread = notifs.filter(n => !n.is_read);
        const badge = document.getElementById('notif-count');
        badge.textContent = unread.length;
        badge.style.display = unread.length > 0 ? 'block' : 'none';
        document.getElementById('notif-list').innerHTML = notifs.slice(0, 15).map(n => `
            <div style="padding:0.75rem;border-radius:0.5rem;margin-bottom:0.25rem;background:${n.is_read?'transparent':'rgba(99,102,241,0.08)'};border:1px solid ${n.is_read?'transparent':'rgba(99,102,241,0.2)'};">
                <p style="font-weight:600;font-size:0.85rem;">${n.title}</p>
                <p style="color:var(--text-muted);font-size:0.8rem;">${n.message}</p>
                <small style="color:var(--primary);font-size:0.7rem;">${new Date(n.created_at).toLocaleString()}</small>
            </div>
        `).join('') || '<p style="text-align:center;color:var(--text-muted);padding:1rem;">No notifications</p>';
    } catch (err) {}
}

async function markAllRead() {
    await fetch(`${API_URL}/common/notifications/mark-read`, { method: 'PUT', headers: getAuthHeaders() });
    fetchNotifications();
}
