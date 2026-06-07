// ==============================
// MENTOR: ALERTS PAGE
// ==============================
async function renderAlerts(container) {
    container.innerHTML = `
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:1.5rem;">
            <div>
                <h3 style="color:var(--danger); margin-bottom:1rem;">🔴 Low Attendance (&lt;75%)</h3>
                <div id="low-att-list"></div>
            </div>
            <div>
                <h3 style="color:var(--warning); margin-bottom:1rem;">⚠️ Low Marks (&lt;40%)</h3>
                <div id="low-marks-list"></div>
            </div>
        </div>
    `;

    try {
        const res = await fetch(`${API_URL}/mentor/at-risk-students`, { headers: getAuthHeaders() });
        const { lowAttendance, lowMarks } = await res.json();

        document.getElementById('low-att-list').innerHTML = lowAttendance.length
            ? lowAttendance.map(s => `
                <div style="background:var(--bg-card); border:1px solid var(--danger); border-radius:0.75rem; padding:1rem; margin-bottom:0.75rem;">
                    <p style="font-weight:600;">${s.name} <span style="color:var(--text-muted); font-weight:400;">(${s.usn})</span></p>
                    <p style="font-size:0.85rem; color:var(--danger);">Attendance: ${parseFloat(s.percentage || 0).toFixed(2)}%</p>
                </div>
            `).join('') : '<p style="color:var(--text-muted);">All students above 75% 🎉</p>';

        document.getElementById('low-marks-list').innerHTML = lowMarks.length
            ? lowMarks.map(s => `
                <div style="background:var(--bg-card); border:1px solid var(--warning); border-radius:0.75rem; padding:1rem; margin-bottom:0.75rem;">
                    <p style="font-weight:600;">${s.name} <span style="color:var(--text-muted); font-weight:400;">(${s.usn})</span></p>
                    <p style="font-size:0.85rem; color:var(--warning);">${s.subject_name}: ${s.internal_marks}/50</p>
                </div>
            `).join('') : '<p style="color:var(--text-muted);">No low marks students 🎉</p>';
    } catch (err) { console.error(err); }
}

// ==============================
// MENTOR: ISSUES PAGE
// ==============================
async function renderMentorIssues(container) {
    container.innerHTML = `
        <div class="data-table-container">
            <div style="padding:1rem; border-bottom:1px solid var(--border);">
                <h3>Student Issues</h3>
            </div>
            <table class="data-table">
                <thead>
                    <tr><th>Student</th><th>Category</th><th>Title</th><th>Status</th><th>Action</th></tr>
                </thead>
                <tbody id="issues-tbody"><tr><td colspan="5" style="text-align:center;">Loading...</td></tr></tbody>
            </table>
        </div>

        <!-- Respond Modal -->
        <div id="respond-modal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.7); z-index:1000; display:flex; align-items:center; justify-content:center;">
            <div style="background:var(--bg-card); padding:2rem; border-radius:1rem; width:450px; border:1px solid var(--border);">
                <h3 style="margin-bottom:1rem;">Respond to Issue</h3>
                <input type="hidden" id="respond-issue-id">
                <div class="form-group"><label>Response</label><textarea id="respond-text" class="form-input" rows="4"></textarea></div>
                <div class="form-group"><label>Update Status</label>
                    <select id="respond-status" class="form-input">
                        <option value="In Progress">In Progress</option>
                        <option value="Solved">Solved</option>
                    </select>
                </div>
                <div style="display:flex; gap:0.75rem; margin-top:1rem;">
                    <button class="btn btn-primary" onclick="submitIssueResponse()">Submit</button>
                    <button class="btn" style="background:var(--border); color:var(--text-muted);" onclick="closeRespondModal()">Cancel</button>
                </div>
            </div>
        </div>
    `;

    try {
        const res = await fetch(`${API_URL}/mentor/issues`, { headers: getAuthHeaders() });
        const issues = await res.json();
        const statusColors = { Pending: 'var(--warning)', 'In Progress': 'var(--primary)', Solved: 'var(--success)' };

        document.getElementById('issues-tbody').innerHTML = issues.map(i => `
            <tr>
                <td>${i.student_name} (${i.usn})</td>
                <td>${i.category}</td>
                <td>${i.title}</td>
                <td><span style="color:${statusColors[i.status]||'white'}; font-weight:600;">${i.status}</span></td>
                <td><button class="btn btn-primary" style="width:auto; padding:0.3rem 0.7rem; font-size:0.8rem;" onclick="openRespondModal(${i.id})">Respond</button></td>
            </tr>
        `).join('') || '<tr><td colspan="5" style="text-align:center;">No issues raised</td></tr>';
    } catch (err) { console.error(err); }
}

function openRespondModal(issueId) {
    document.getElementById('respond-issue-id').value = issueId;
    document.getElementById('respond-modal').style.display = 'flex';
}
function closeRespondModal() {
    document.getElementById('respond-modal').style.display = 'none';
}
async function submitIssueResponse() {
    const data = {
        issueId: document.getElementById('respond-issue-id').value,
        response: document.getElementById('respond-text').value,
        status: document.getElementById('respond-status').value
    };
    const res = await fetch(`${API_URL}/mentor/respond-issue`, {
        method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify(data)
    });
    if (res.ok) {
        alert('Response submitted!');
        closeRespondModal();
        renderMentorIssues(document.getElementById('dashboard-content'));
    }
}

// ==============================
// MENTOR: MESSAGES PAGE
// ==============================
let activeChatUserId = null;

async function renderMessages(container) {
    const mentees = await (await fetch(`${API_URL}/mentor/my-mentees`, { headers: getAuthHeaders() })).json();

    container.innerHTML = `
        <div style="display:grid; grid-template-columns:280px 1fr; height:70vh; background:var(--bg-card); border-radius:1rem; border:1px solid var(--border); overflow:hidden;">
            <!-- Contacts list -->
            <div style="border-right:1px solid var(--border); overflow-y:auto;">
                <div style="padding:1rem; border-bottom:1px solid var(--border); font-weight:600;">Mentees</div>
                <div id="contacts-list">
                ${mentees.map(m => `
                    <div class="contact-item" style="padding:0.75rem 1rem; cursor:pointer; display:flex; align-items:center; gap:0.75rem;" onclick="openChat(${m.id}, '${m.name}')">
                        <div style="width:36px; height:36px; border-radius:50%; background:var(--primary); display:flex; align-items:center; justify-content:center; font-weight:700;">${m.name.charAt(0)}</div>
                        <div>
                            <p style="font-weight:600; font-size:0.9rem;">${m.name}</p>
                            <p style="font-size:0.75rem; color:var(--text-muted);">${m.usn}</p>
                        </div>
                    </div>
                `).join('') || '<p style="padding:1rem; color:var(--text-muted);">No mentees</p>'}
                </div>
            </div>
            <!-- Chat Area -->
            <div style="display:flex; flex-direction:column;">
                <div id="chat-header" style="padding:1rem; border-bottom:1px solid var(--border); font-weight:600;">
                    Select a mentee to chat
                </div>
                <div id="chat-messages" style="flex:1; overflow-y:auto; padding:1rem; display:flex; flex-direction:column; gap:0.5rem;"></div>
                <div style="padding:1rem; border-top:1px solid var(--border); display:flex; gap:0.75rem;" id="chat-input-area">
                    <input id="msg-input" type="text" class="form-input" placeholder="Type a message..." onkeydown="if(event.key==='Enter') sendChatMessage()">
                    <button class="btn btn-primary" style="width:auto; padding:0.5rem 1rem;" onclick="sendChatMessage()">Send</button>
                </div>
            </div>
        </div>
    `;
}

async function openChat(userId, userName) {
    activeChatUserId = userId;
    document.getElementById('chat-header').textContent = `Chat with ${userName}`;
    loadChatMessages(userId);
    // Highlight contact
    document.querySelectorAll('.contact-item').forEach(el => el.style.background = '');
    event.currentTarget.style.background = 'rgba(99,102,241,0.1)';
}

async function loadChatMessages(userId) {
    const chatDiv = document.getElementById('chat-messages');
    const currentUser = JSON.parse(localStorage.getItem('user'));
    try {
        const res = await fetch(`${API_URL}/common/messages/${userId}`, { headers: getAuthHeaders() });
        const messages = await res.json();
        chatDiv.innerHTML = messages.map(m => {
            const isMine = m.sender_id === currentUser.id;
            return `<div style="display:flex; justify-content:${isMine ? 'flex-end' : 'flex-start'}; margin:0.25rem 0;">
                <div style="max-width:70%; padding:0.6rem 0.9rem; border-radius:0.75rem; background:${isMine ? 'var(--primary)' : 'var(--border)'}; font-size:0.875rem;">
                    ${m.message}
                    <div style="font-size:0.65rem; color:rgba(255,255,255,0.6); margin-top:0.2rem; text-align:right;">${new Date(m.created_at).toLocaleTimeString()}</div>
                </div>
            </div>`;
        }).join('') || '<p style="text-align:center; color:var(--text-muted);">No messages yet</p>';
        chatDiv.scrollTop = chatDiv.scrollHeight;
    } catch (err) { console.error(err); }
}

async function sendChatMessage() {
    if (!activeChatUserId) return;
    const input = document.getElementById('msg-input');
    const msg = input.value.trim();
    if (!msg) return;

    await fetch(`${API_URL}/common/messages`, {
        method: 'POST', headers: getAuthHeaders(),
        body: JSON.stringify({ receiverId: activeChatUserId, message: msg })
    });
    input.value = '';
    loadChatMessages(activeChatUserId);
}

// ==============================
// MENTOR: STUDENT PROFILE (Detailed)
// ==============================
async function viewStudentProfile(usn) {
    const container = document.getElementById('dashboard-content');
    document.getElementById('page-title').textContent = `Student Profile: ${usn}`;
    container.innerHTML = '<p style="text-align:center;">Loading...</p>';

    try {
        const res = await fetch(`${API_URL}/common/student-profile/${usn}`, { headers: getAuthHeaders() });
        const { profile, attendance, marks, achievements } = await res.json();

        container.innerHTML = `
            <button onclick="renderMyMentees(document.getElementById('dashboard-content'))" style="background:none; border:none; color:var(--primary); cursor:pointer; margin-bottom:1rem; font-size:0.9rem;">← Back to Mentees</button>
            <div class="stats-grid" style="margin-bottom:1.5rem;">
                <div class="stat-card"><p class="stat-title">Name</p><h3>${profile.name}</h3></div>
                <div class="stat-card"><p class="stat-title">USN</p><h3>${profile.usn}</h3></div>
                <div class="stat-card"><p class="stat-title">Year/Sem</p><h3>${profile.year_semester}</h3></div>
                <div class="stat-card"><p class="stat-title">Email</p><h3 style="font-size:1rem;">${profile.email}</h3></div>
            </div>
            <div class="charts-grid">
                <div class="chart-container">
                    <h3 style="margin-bottom:1rem;">Marks Overview</h3>
                    <canvas id="student-marks-chart"></canvas>
                </div>
                <div class="chart-container">
                    <h3 style="margin-bottom:1rem;">Attendance</h3>
                    ${attendance.map(a => `
                        <div style="margin-bottom:0.75rem;">
                            <div style="display:flex; justify-content:space-between; margin-bottom:0.3rem;">
                                <span>${a.subject_code}</span>
                                <span style="color:${(a.attended_classes/a.total_classes*100)<75?'var(--danger)':'var(--success)'}">
                                    ${a.total_classes > 0 ? ((a.attended_classes/a.total_classes)*100).toFixed(1)+'%' : 'N/A'}
                                </span>
                            </div>
                            <div style="background:var(--border); border-radius:9999px; height:6px;">
                                <div style="width:${a.total_classes>0?(a.attended_classes/a.total_classes*100):0}%; background:var(--primary); border-radius:9999px; height:6px;"></div>
                            </div>
                        </div>
                    `).join('') || '<p style="color:var(--text-muted);">No attendance data</p>'}
                </div>
            </div>
            <div class="chart-container" style="margin-top:1.5rem;">
                <h3 style="margin-bottom:1rem;">Achievements (${achievements.length})</h3>
                <div style="display:grid; grid-template-columns:repeat(auto-fill,minmax(250px,1fr)); gap:1rem;">
                ${achievements.map(a => `
                    <div style="background:rgba(99,102,241,0.1); padding:1rem; border-radius:0.75rem; border:1px solid var(--border);">
                        <p style="font-weight:600;">${a.title}</p>
                        <p style="font-size:0.8rem; color:var(--text-muted);">${a.description}</p>
                        ${a.certificate_path ? `<a href="/${a.certificate_path}" target="_blank" style="color:var(--primary); font-size:0.8rem;">View Certificate</a>` : ''}
                    </div>
                `).join('') || '<p style="color:var(--text-muted);">No achievements yet</p>'}
                </div>
            </div>
        `;

        if (marks.length > 0) {
            new Chart(document.getElementById('student-marks-chart'), {
                type: 'radar',
                data: {
                    labels: marks.map(m => m.subject_code),
                    datasets: [
                        { label: 'Internal (/50)', data: marks.map(m => m.internal_marks), borderColor: '#6366f1', backgroundColor: 'rgba(99,102,241,0.1)' },
                        { label: 'External (/100)', data: marks.map(m => m.external_marks), borderColor: '#ec4899', backgroundColor: 'rgba(236,72,153,0.1)' }
                    ]
                },
                options: { scales: { r: { ticks: { color: '#94a3b8' }, grid: { color: '#334155' } } } }
            });
        }
    } catch (err) { container.innerHTML = '<p>Error loading profile</p>'; }
}

// ==============================
// MENTOR: MARKS MANAGEMENT PAGE
// ==============================
async function renderMentorMarks(container) {
    container.innerHTML = `
        <div style="background:var(--bg-card);padding:1.5rem;border-radius:1rem;border:1px solid var(--border);margin-bottom:1.5rem;">
            <h3 style="margin-bottom:1rem;">📤 Upload External Marks</h3>
            <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:1rem;">
                <div class="form-group">
                    <label>Select Mentee</label>
                    <select id="em-student" class="form-input"><option value="">Loading mentees...</option></select>
                </div>
                <div class="form-group"><label>Subject Code</label><input id="em-code" class="form-input" type="text" placeholder="CS61"></div>
                <div class="form-group"><label>Subject Name</label><input id="em-name" class="form-input" type="text" placeholder="DBMS"></div>
                <div class="form-group"><label>External Marks (max 100)</label><input id="em-marks" class="form-input" type="number" min="0" max="100"></div>
            </div>
            <button class="btn btn-primary" style="width:auto;margin-top:0.75rem;" onclick="submitExternalMarks()">Upload Marks</button>
        </div>

        <div style="display:grid; grid-template-columns: 1fr; gap:1.5rem; margin-bottom:1.5rem;">
            <div class="data-table-container">
                <div style="padding:1rem; border-bottom:1px solid var(--border);">
                    <h3>⏳ Pending Verification (Internals submitted by Mentees)</h3>
                </div>
                <table class="data-table">
                    <thead>
                        <tr><th>Student</th><th>USN</th><th>Subject</th><th>Internal Marks</th><th>Status</th><th>Action</th></tr>
                    </thead>
                    <tbody id="mentor-pending-marks-tbody"><tr><td colspan="6" style="text-align:center;">Loading...</td></tr></tbody>
                </table>
            </div>
        </div>

        <div class="data-table-container">
            <div style="padding:1rem; border-bottom:1px solid var(--border); display:flex; justify-content:space-between; align-items:center;">
                <h3>📊 Mentee Marks Record</h3>
                <div style="display:flex; gap:0.5rem; align-items:center;">
                    <label style="font-size:0.8rem; color:var(--text-muted); text-transform:uppercase; margin-right: 0.5rem;">View Student:</label>
                    <select id="em-view-student" class="form-input" style="width:200px;" onchange="loadMenteeMarksRecord(this.value)">
                        <option value="">Select a student...</option>
                    </select>
                </div>
            </div>
            <table class="data-table">
                <thead>
                    <tr><th>Subject</th><th>Internal Marks (/50)</th><th>Internal Status</th><th>External Marks (/100)</th><th>External Status</th></tr>
                </thead>
                <tbody id="mentor-mentee-marks-tbody"><tr><td colspan="5" style="text-align:center;">Select a student from the dropdown above to view records</td></tr></tbody>
            </table>
        </div>
    `;

    // Populate dropdowns & tables
    loadMenteeDropdowns();
    loadMentorPendingMarksTable();
}

async function loadMenteeDropdowns() {
    try {
        const res = await fetch(`${API_URL}/mentor/my-mentees`, { headers: getAuthHeaders() });
        const mentees = await res.json();
        const select = document.getElementById('em-student');
        const selectView = document.getElementById('em-view-student');
        
        if (!select || !selectView) return;
        
        const optionsHTML = mentees.map(m => `<option value="${m.id}">${m.name} (${m.usn})</option>`).join('');
        select.innerHTML = `<option value="">Select student...</option>` + optionsHTML;
        selectView.innerHTML = `<option value="">Select student...</option>` + optionsHTML;
    } catch (err) { console.error(err); }
}

async function loadMentorPendingMarksTable() {
    try {
        const res = await fetch(`${API_URL}/mentor/pending-mentee-marks`, { headers: getAuthHeaders() });
        const marks = await res.json();
        const tbody = document.getElementById('mentor-pending-marks-tbody');
        if (!tbody) return;
        
        tbody.innerHTML = marks.map(m => `
            <tr>
                <td style="font-weight:600;">${m.student_name}</td>
                <td>${m.usn}</td>
                <td>${m.subject_name} (${m.subject_code})</td>
                <td>${m.internal_marks} / 50</td>
                <td><span style="color:var(--warning); font-weight:600;">PENDING VERIFICATION</span></td>
                <td>
                    <button class="btn btn-primary" style="width:auto; padding:0.35rem 0.75rem; font-size:0.8rem;" onclick="mentorVerifyMarks(${m.id})">Verify & Send to Admin</button>
                </td>
            </tr>
        `).join('') || '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);">No pending marks submissions from mentees</td></tr>';
    } catch (err) { console.error(err); }
}

async function mentorVerifyMarks(markId) {
    try {
        const res = await fetch(`${API_URL}/mentor/verify-marks/${markId}`, {
            method: 'PUT',
            headers: getAuthHeaders()
        });
        const result = await res.json();
        alert(result.message);
        if (res.ok) {
            loadMentorPendingMarksTable();
            // Refresh view record if active
            const viewStudentId = document.getElementById('em-view-student').value;
            if (viewStudentId) loadMenteeMarksRecord(viewStudentId);
        }
    } catch (err) { alert(err.message); }
}

async function submitExternalMarks() {
    const studentId = document.getElementById('em-student').value;
    const subjectCode = document.getElementById('em-code').value.trim();
    const subjectName = document.getElementById('em-name').value.trim();
    const marks = parseInt(document.getElementById('em-marks').value);

    if (!studentId) return alert('Please select a student.');
    if (!subjectCode) return alert('Subject code is required.');
    if (!subjectName) return alert('Subject name is required.');
    if (isNaN(marks) || marks < 0 || marks > 100) return alert('External marks must be between 0 and 100.');

    try {
        const res = await fetch(`${API_URL}/mentor/upload-external-marks`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ studentId, subjectCode, subjectName, marks })
        });
        const result = await res.json();
        alert(result.message);
        if (res.ok) {
            document.getElementById('em-code').value = '';
            document.getElementById('em-name').value = '';
            document.getElementById('em-marks').value = '';
            
            // Refresh tables
            loadMentorPendingMarksTable();
            const viewStudentId = document.getElementById('em-view-student').value;
            if (viewStudentId) loadMenteeMarksRecord(viewStudentId);
        }
    } catch (err) { alert(err.message); }
}

async function loadMenteeMarksRecord(studentId) {
    const tbody = document.getElementById('mentor-mentee-marks-tbody');
    if (!tbody) return;
    
    if (!studentId) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Select a student from the dropdown above to view records</td></tr>';
        return;
    }
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Loading records...</td></tr>';
    
    try {
        const res = await fetch(`${API_URL}/academic/mentor/student-marks/${studentId}`, { headers: getAuthHeaders() });
        const marks = await res.json();
        
        const badgeColor = s => s === 'approved' ? 'var(--success)' : s === 'verified' ? 'var(--primary)' : s === 'rejected' ? 'var(--danger)' : 'var(--warning)';
        
        tbody.innerHTML = marks.map(m => `
            <tr>
                <td style="font-weight:600;">${m.subject_name} (${m.subject_code})</td>
                <td>${m.internal_marks}</td>
                <td><span style="color:${badgeColor(m.internal_status)}; font-weight:600;">${m.internal_status.toUpperCase()}</span></td>
                <td>${m.external_marks || '—'}</td>
                <td><span style="color:${badgeColor(m.external_status)}; font-weight:600;">${(m.external_status || '—').toUpperCase()}</span></td>
            </tr>
        `).join('') || '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);">No marks entered for this student yet</td></tr>';
    } catch (err) { console.error(err); tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--danger);">Error loading records</td></tr>'; }
}
