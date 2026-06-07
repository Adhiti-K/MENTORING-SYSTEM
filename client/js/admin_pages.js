// ==============================
// ADMIN: MEETINGS PAGE
// ==============================
async function renderAdminMeetings(container) {
    container.innerHTML = `
        <div class="page-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem;">
            <h2>Meeting Management</h2>
            <button class="btn btn-primary" style="width:auto; padding:0.6rem 1.2rem;" onclick="showScheduleMeetingForm()">+ Schedule Meeting</button>
        </div>

        <div id="schedule-form-wrap" style="display:none; background:var(--bg-card); padding:1.5rem; border-radius:1rem; border:1px solid var(--border); margin-bottom:1.5rem;">
            <h3 style="margin-bottom:1rem;">Schedule New Meeting</h3>
            <div style="display:grid; grid-template-columns:repeat(2,1fr); gap:1rem;">
                <div class="form-group"><label>Title</label><input id="am-title" class="form-input" type="text"></div>
                <div class="form-group"><label>Date & Time</label><input id="am-date" class="form-input" type="datetime-local"></div>
                <div class="form-group"><label>Type</label>
                    <select id="am-type" class="form-input"><option value="group">Group</option><option value="individual">Individual</option></select>
                </div>
                <div class="form-group"><label>Description</label><input id="am-desc" class="form-input" type="text"></div>
            </div>
            <button class="btn btn-primary" style="width:auto; margin-top:1rem;" onclick="adminScheduleMeeting()">Create Meeting</button>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:1.5rem;">
            <div>
                <h3 style="margin-bottom:1rem; color:var(--warning);">⏳ Pending Approval</h3>
                <div id="pending-meetings-list"></div>
            </div>
            <div>
                <h3 style="margin-bottom:1rem; color:var(--success);">✅ Active / Completed</h3>
                <div id="active-meetings-list"></div>
            </div>
        </div>
    `;
    loadAdminMeetings();
}

function showScheduleMeetingForm() {
    const wrap = document.getElementById('schedule-form-wrap');
    wrap.style.display = wrap.style.display === 'none' ? 'block' : 'none';
}

async function adminScheduleMeeting() {
    const data = {
        title: document.getElementById('am-title').value,
        date: document.getElementById('am-date').value,
        type: document.getElementById('am-type').value,
        description: document.getElementById('am-desc').value,
        studentIds: [],
        createdByAdmin: true
    };
    try {
        const res = await fetch(`${API_URL}/admin/schedule-meeting`, {
            method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(data)
        });
        const result = await res.json();
        alert(result.message);
        loadAdminMeetings();
    } catch (err) { alert(err.message); }
}

async function loadAdminMeetings() {
    try {
        const res = await fetch(`${API_URL}/admin/all-meetings`, { headers: getAuthHeaders() });
        const meetings = await res.json();
        
        const pending = meetings.filter(m => m.status === 'pending');
        const active = meetings.filter(m => m.status !== 'pending');

        document.getElementById('pending-meetings-list').innerHTML = pending.map(m => `
            <div class="meeting-card" style="background:var(--bg-card); border:1px solid var(--border); border-radius:0.75rem; padding:1rem; margin-bottom:0.75rem;">
                <p style="font-weight:600;">${m.title}</p>
                <p style="font-size:0.8rem; color:var(--text-muted);">${new Date(m.meeting_date).toLocaleString()} &bull; ${m.meeting_type}</p>
                <p style="font-size:0.8rem; color:var(--text-muted);">Created by: ${m.creator_name}</p>
                <div style="margin-top:0.75rem; display:flex; gap:0.5rem;">
                    <button class="btn btn-primary" style="width:auto; padding:0.4rem 0.8rem; font-size:0.8rem;" onclick="approveMeeting(${m.id})">Approve</button>
                    <button class="btn" style="width:auto; padding:0.4rem 0.8rem; font-size:0.8rem; background:var(--danger);" onclick="rejectMeeting(${m.id})">Reject</button>
                </div>
            </div>
        `).join('') || '<p style="color:var(--text-muted);">No pending meetings</p>';

        document.getElementById('active-meetings-list').innerHTML = active.map(m => `
            <div class="meeting-card" style="background:var(--bg-card); border:1px solid var(--border); border-radius:0.75rem; padding:1rem; margin-bottom:0.75rem;">
                <p style="font-weight:600;">${m.title}</p>
                <p style="font-size:0.8rem; color:var(--text-muted);">${new Date(m.meeting_date).toLocaleString()}</p>
                <span class="badge" style="font-size:0.7rem; padding:2px 8px; border-radius:4px; background:${m.status==='active'?'rgba(34,197,94,0.2)':'rgba(99,102,241,0.2)'}; color:${m.status==='active'?'var(--success)':'var(--primary)'};">${m.status.toUpperCase()}</span>
                ${m.status === 'completed' ? `<button class="btn btn-primary" style="width:auto; padding:0.3rem 0.7rem; font-size:0.75rem; margin-left:0.5rem;" onclick="viewProceedings(${m.id})">View Proceedings</button>` : ''}
            </div>
        `).join('') || '<p style="color:var(--text-muted);">No meetings</p>';
    } catch (err) { console.error(err); }
}

async function approveMeeting(id) {
    const res = await fetch(`${API_URL}/admin/approve-meeting/${id}`, { method: 'PUT', headers: getAuthHeaders() });
    if (res.ok) { alert('Meeting approved!'); loadAdminMeetings(); }
}

async function rejectMeeting(id) {
    const res = await fetch(`${API_URL}/admin/reject-meeting/${id}`, { method: 'PUT', headers: getAuthHeaders() });
    if (res.ok) { alert('Meeting rejected.'); loadAdminMeetings(); }
}

// ==============================
// ADMIN: REPORTS PAGE
// ==============================
async function renderReports(container) {
    container.innerHTML = `
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(300px, 1fr)); gap:1.5rem;">
            ${[
                { type: 'attendance', title: '📊 Attendance Report', desc: 'All students attendance records.' },
                { type: 'marks', title: '📝 Marks Report', desc: 'Internal and external marks summary.' },
            ].map(r => `
                <div class="stat-card">
                    <h3>${r.title}</h3>
                    <p style="color:var(--text-muted); margin:0.5rem 0;">${r.desc}</p>
                    <div style="display:flex; gap:0.75rem; margin-top:1rem;">
                        <a href="${API_URL}/admin/export-report?reportType=${r.type}&format=csv" target="_blank"
                           class="btn btn-primary" style="width:auto; padding:0.5rem 1rem; font-size:0.85rem; text-decoration:none;">
                           ⬇ CSV
                        </a>
                        <a href="${API_URL}/admin/export-report?reportType=${r.type}&format=pdf" target="_blank"
                           class="btn" style="width:auto; padding:0.5rem 1rem; font-size:0.85rem; background:var(--secondary); color:white; text-decoration:none;">
                           ⬇ PDF
                        </a>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// ==============================
// ADMIN: ACTIVITY LOGS PAGE
// ==============================
async function renderLogs(container) {
    container.innerHTML = `
        <div class="data-table-container">
            <div style="padding:1rem; border-bottom:1px solid var(--border);">
                <h3>Activity Logs</h3>
            </div>
            <table class="data-table">
                <thead>
                    <tr>
                        <th>User</th>
                        <th>Action</th>
                        <th>Details</th>
                        <th>Timestamp</th>
                    </tr>
                </thead>
                <tbody id="logs-tbody"><tr><td colspan="4" style="text-align:center;">Loading...</td></tr></tbody>
            </table>
        </div>
    `;
    try {
        const res = await fetch(`${API_URL}/admin/activity-logs`, { headers: getAuthHeaders() });
        const logs = await res.json();
        document.getElementById('logs-tbody').innerHTML = logs.map(l => `
            <tr>
                <td>${l.user_name}</td>
                <td>${l.action}</td>
                <td style="color:var(--text-muted); font-size:0.85rem;">${l.details || '—'}</td>
                <td style="font-size:0.8rem; color:var(--text-muted);">${new Date(l.created_at).toLocaleString()}</td>
            </tr>
        `).join('') || '<tr><td colspan="4" style="text-align:center;">No logs found</td></tr>';
    } catch (err) { console.error(err); }
}

// ==============================
// ADMIN: ATTENDANCE MANAGEMENT
// ==============================
async function renderAdminAttendance(container) {
    container.innerHTML = `
        <div style="background:var(--bg-card); padding:1.5rem; border-radius:1rem; border:1px solid var(--border); margin-bottom:1.5rem;">
            <h3 style="margin-bottom:1rem;">Update Attendance</h3>
            <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:1rem;">
                <div class="form-group">
                    <label>Student (USN)</label>
                    <input id="att-usn" class="form-input" type="text" placeholder="1XY20CS001">
                </div>
                <div class="form-group">
                    <label>Subject Code</label>
                    <input id="att-subject" class="form-input" type="text" placeholder="CS61">
                </div>
                <div class="form-group">
                    <label>Total Classes</label>
                    <input id="att-total" class="form-input" type="number">
                </div>
                <div class="form-group">
                    <label>Attended Classes</label>
                    <input id="att-attended" class="form-input" type="number">
                </div>
            </div>
            <button class="btn btn-primary" style="width:auto; margin-top:0.5rem;" onclick="submitAttendanceUpdate()">Update Attendance</button>
        </div>
        <div class="data-table-container">
            <div style="padding:1rem; border-bottom:1px solid var(--border); display:flex; justify-content:space-between; align-items:center;">
                <h3>All Students Attendance</h3>
                <input type="text" class="form-input" style="width:200px;" placeholder="Filter by dept..." oninput="filterAttendanceTable(this.value)" id="att-filter">
            </div>
            <table class="data-table" id="attendance-table">
                <thead><tr><th>Name</th><th>USN</th><th>Dept</th><th>Subject</th><th>Attended</th><th>Total</th><th>%</th></tr></thead>
                <tbody id="attendance-tbody"><tr><td colspan="7" style="text-align:center;">Loading...</td></tr></tbody>
            </table>
        </div>
    `;
    loadAttendanceTable();
}

async function submitAttendanceUpdate() {
    // First resolve USN to student ID
    const usn = document.getElementById('att-usn').value;
    try {
        const searchRes = await fetch(`${API_URL}/common/student-profile/${usn}`, { headers: getAuthHeaders() });
        const studentData = await searchRes.json();
        if (!studentData.profile) return alert('Student not found');

        const res = await fetch(`${API_URL}/academic/admin/update-attendance`, {
            method: 'POST', headers: getAuthHeaders(),
            body: JSON.stringify({
                studentId: studentData.profile.id,
                subjectCode: document.getElementById('att-subject').value,
                totalClasses: parseInt(document.getElementById('att-total').value),
                attendedClasses: parseInt(document.getElementById('att-attended').value)
            })
        });
        const result = await res.json();
        alert(result.message);
        loadAttendanceTable();
    } catch (err) { alert(err.message); }
}

async function loadAttendanceTable() {
    try {
        const res = await fetch(`${API_URL}/academic/admin/all-students`, { headers: getAuthHeaders() });
        const students = await res.json();
        window._attStudents = students;
        renderAttendanceRows(students);
    } catch (err) { console.error(err); }
}

function renderAttendanceRows(students) {
    document.getElementById('attendance-tbody').innerHTML = students.length
        ? students.map(s => `<tr><td>${s.name}</td><td>${s.usn}</td><td>${s.department}</td><td>—</td><td>—</td><td>—</td><td>—</td></tr>`).join('')
        : '<tr><td colspan="7" style="text-align:center;">No students</td></tr>';
}

function filterAttendanceTable(val) {
    const filtered = (window._attStudents || []).filter(s =>
        s.department.toLowerCase().includes(val.toLowerCase()) || s.usn.toLowerCase().includes(val.toLowerCase())
    );
    renderAttendanceRows(filtered);
}

// ==============================
// ADMIN: MARKS APPROVAL PAGE
// ==============================
async function renderAdminMarks(container) {
    container.innerHTML = `
        <div style="display:flex; gap:1rem; margin-bottom:1rem;">
            <button class="btn btn-primary" style="width:auto; padding:0.5rem 1rem;" onclick="loadAdminMarks('verified')">Internal (Pending Admin)</button>
            <button class="btn btn-primary" style="width:auto; padding:0.5rem 1rem; background:var(--secondary);" onclick="loadAdminMarks('external')">External Marks</button>
        </div>
        <div class="data-table-container">
            <table class="data-table">
                <thead><tr><th>Student</th><th>USN</th><th>Subject</th><th>Marks</th><th>Status</th><th>Action</th></tr></thead>
                <tbody id="admin-marks-tbody"><tr><td colspan="6" style="text-align:center;">Select a filter above</td></tr></tbody>
            </table>
        </div>
    `;
}

async function loadAdminMarks(filter) {
    try {
        const res = await fetch(`${API_URL}/admin/pending-marks`, { headers: getAuthHeaders() });
        const marks = await res.json();
        const filtered = filter === 'external' ? marks.filter(m => m.external_status === 'pending') : marks.filter(m => m.internal_status === 'verified');

        document.getElementById('admin-marks-tbody').innerHTML = filtered.map(m => `
            <tr>
                <td>${m.student_name}</td>
                <td>${m.usn}</td>
                <td>${m.subject_name} (${m.subject_code})</td>
                <td>${filter === 'external' ? m.external_marks + '/100' : m.internal_marks + '/50'}</td>
                <td>${filter === 'external' ? m.external_status : m.internal_status}</td>
                <td>
                    <button class="btn btn-primary" style="width:auto; padding:0.3rem 0.7rem; font-size:0.8rem;"
                        onclick="adminApproveMarks(${m.id}, '${filter === 'external' ? 'external' : 'internal'}')">Approve</button>
                    <button class="btn" style="width:auto; padding:0.3rem 0.7rem; font-size:0.8rem; background:var(--danger); margin-left:0.3rem;"
                        onclick="adminRejectMarks(${m.id}, '${filter === 'external' ? 'external' : 'internal'}')">Reject</button>
                </td>
            </tr>
        `).join('') || '<tr><td colspan="6" style="text-align:center;">No marks pending</td></tr>';
    } catch (err) { console.error(err); }
}

async function adminApproveMarks(markId, type) {
    const res = await fetch(`${API_URL}/admin/approve-marks`, {
        method: 'POST', headers: getAuthHeaders(), body: JSON.stringify({ markId, type })
    });
    if (res.ok) { alert('Marks approved!'); loadAdminMarks(type); }
}
async function adminRejectMarks(markId, type) {
    const res = await fetch(`${API_URL}/admin/reject-marks`, {
        method: 'POST', headers: getAuthHeaders(), body: JSON.stringify({ markId, type })
    });
    if (res.ok) { alert('Marks rejected.'); loadAdminMarks(type); }
}
