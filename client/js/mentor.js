// MENTOR: OVERVIEW — Live data + real charts
async function renderMentorOverview(container) {
    container.innerHTML = `
        <div class="stats-grid">
            <div class="stat-card"><p class="stat-title">Assigned Mentees</p><h3 class="stat-value" id="mentor-total-mentees">—</h3></div>
            <div class="stat-card"><p class="stat-title">Pending Issues</p><h3 class="stat-value text-warning" id="mentor-pending-issues">—</h3></div>
            <div class="stat-card"><p class="stat-title">At Risk Students</p><h3 class="stat-value text-danger" id="mentor-at-risk">—</h3></div>
            <div class="stat-card"><p class="stat-title">Pending Meetings</p><h3 class="stat-value text-primary" id="mentor-pending-meetings">—</h3></div>
        </div>
        <div class="charts-grid">
            <div class="chart-container"><h3>Attendance Distribution</h3><canvas id="mentor-attendance-chart"></canvas></div>
            <div class="chart-container"><h3>Marks Distribution</h3><canvas id="mentor-marks-chart"></canvas></div>
        </div>
    `;

    try {
        const [mentees, risk, issues, meetings] = await Promise.all([
            fetch(`${API_URL}/mentor/my-mentees`, { headers: getAuthHeaders() }).then(r => r.json()),
            fetch(`${API_URL}/mentor/at-risk-students`, { headers: getAuthHeaders() }).then(r => r.json()),
            fetch(`${API_URL}/mentor/issues`, { headers: getAuthHeaders() }).then(r => r.json()),
            fetch(`${API_URL}/academic/mentor/meetings`, { headers: getAuthHeaders() }).then(r => r.json())
        ]);

        document.getElementById('mentor-total-mentees').textContent = mentees.length;
        document.getElementById('mentor-at-risk').textContent = (risk.lowAttendance?.length || 0) + (risk.lowMarks?.length || 0);
        document.getElementById('mentor-pending-issues').textContent = issues.filter(i => i.status === 'Pending').length;
        document.getElementById('mentor-pending-meetings').textContent = meetings.filter(m => m.status === 'pending').length;

        // Attendance distribution from real data
        const above75 = mentees.filter(m => parseFloat(m.attendance || 100) >= 75).length;
        const between = mentees.filter(m => parseFloat(m.attendance || 100) >= 60 && parseFloat(m.attendance || 100) < 75).length;
        const below60 = mentees.filter(m => parseFloat(m.attendance || 100) < 60).length;

        new Chart(document.getElementById('mentor-attendance-chart'), {
            type: 'pie',
            data: {
                labels: ['Good (≥75%)', 'Risk (60-75%)', 'Critical (<60%)'],
                datasets: [{
                    data: [above75, between, below60],
                    backgroundColor: ['#22c55e', '#f59e0b', '#ef4444'],
                    borderWidth: 1,
                    borderColor: '#1e293b',
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { color: '#94a3b8', boxWidth: 12, padding: 15 }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const total = above75 + between + below60;
                                const val = context.raw;
                                const pct = total > 0 ? ((val / total) * 100).toFixed(1) : 0;
                                return ` ${context.label}: ${val} students (${pct}%)`;
                            }
                        }
                    }
                }
            }
        });

        new Chart(document.getElementById('mentor-marks-chart'), {
            type: 'bar',
            data: {
                labels: ['<20', '20-35', '35-50'],
                datasets: [{ label: 'Students', data: [risk.lowMarks?.length || 0, Math.max(0, mentees.length - (risk.lowMarks?.length || 0)), 0], backgroundColor: ['#ef4444','#f59e0b','#22c55e'] }]
            },
            options: { responsive: true, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: '#94a3b8' } }, y: { ticks: { color: '#94a3b8' } } } }
        });
    } catch (err) { console.error('Mentor overview error:', err); }
}

// MENTOR: MY MENTEES TABLE
async function renderMyMentees(container) {
    container.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
            <h3>Assigned Mentees</h3>
            <input type="text" class="form-input" style="width:200px;" placeholder="Search name/USN..." oninput="filterMenteesTable(this.value)">
        </div>
        <div class="data-table-container">
            <table class="data-table">
                <thead><tr><th>Name</th><th>USN</th><th>Year/Sem</th><th>Department</th><th>Action</th></tr></thead>
                <tbody id="mentees-tbody"></tbody>
            </table>
        </div>
    `;
    try {
        const mentees = await (await fetch(`${API_URL}/mentor/my-mentees`, { headers: getAuthHeaders() })).json();
        window._menteeData = mentees;
        renderMenteesRows(mentees);
    } catch (err) { console.error(err); }
}

function renderMenteesRows(mentees) {
    document.getElementById('mentees-tbody').innerHTML = mentees.map(m => `
        <tr>
            <td style="font-weight:600;">${m.name}</td>
            <td>${m.usn}</td>
            <td>${m.year_semester}</td>
            <td>${m.department}</td>
            <td><button class="btn btn-primary" style="padding:0.4rem 0.8rem;width:auto;font-size:0.8rem;" onclick="viewStudentProfile('${m.usn}')">View Profile</button></td>
        </tr>
    `).join('') || '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);">No mentees assigned yet</td></tr>';
}

function filterMenteesTable(val) {
    const filtered = (window._menteeData || []).filter(m =>
        m.name.toLowerCase().includes(val.toLowerCase()) || m.usn.toLowerCase().includes(val.toLowerCase())
    );
    renderMenteesRows(filtered);
}

// MENTOR: MEETINGS (Schedule + History + Proceedings)
async function renderMentorMeetings(container) {
    container.innerHTML = `
        <div style="background:var(--bg-card);padding:1.5rem;border-radius:1rem;border:1px solid var(--border);margin-bottom:1.5rem;">
            <h3 style="margin-bottom:1rem;">📅 Schedule New Meeting</h3>
            <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:1rem;">
                <div class="form-group"><label>Title</label><input type="text" id="meet-title" class="form-input"></div>
                <div class="form-group"><label>Date & Time</label><input type="datetime-local" id="meet-date" class="form-input"></div>
                <div class="form-group"><label>Type</label>
                    <select id="meet-type" class="form-input"><option value="group">Group (All Mentees)</option><option value="individual">Individual</option></select>
                </div>
                <div class="form-group"><label>Description</label><input type="text" id="meet-desc" class="form-input"></div>
            </div>
            <button class="btn btn-primary" style="width:auto;margin-top:0.75rem;" onclick="submitMeeting()">Schedule Meeting</button>
        </div>

        <div class="data-table-container">
            <div style="padding:1rem;border-bottom:1px solid var(--border);"><h3>Meeting History</h3></div>
            <table class="data-table">
                <thead><tr><th>Title</th><th>Date</th><th>Type</th><th>Participants</th><th>Status</th><th>Action</th></tr></thead>
                <tbody id="mentor-meetings-tbody"><tr><td colspan="6" style="text-align:center;">Loading...</td></tr></tbody>
            </table>
        </div>

        <!-- Add Proceedings Modal -->
        <div id="proceedings-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:1000;display:none;align-items:center;justify-content:center;">
            <div style="background:var(--bg-card);padding:2rem;border-radius:1rem;width:500px;border:1px solid var(--border);">
                <h3 style="margin-bottom:1rem;">Add Meeting Proceedings</h3>
                <input type="hidden" id="proc-meeting-id">
                <div class="form-group"><label>Meeting Notes</label><textarea id="proc-notes" class="form-input" rows="4" placeholder="What was discussed..."></textarea></div>
                <div class="form-group"><label>Outcome / Action Items</label><textarea id="proc-outcome" class="form-input" rows="3" placeholder="Key decisions, follow-ups..."></textarea></div>
                <div style="display:flex;gap:0.75rem;margin-top:1rem;">
                    <button class="btn btn-primary" onclick="submitProceedings()">Save Proceedings</button>
                    <button class="btn" style="background:var(--border);" onclick="closeProcModal()">Cancel</button>
                </div>
            </div>
        </div>
    `;
    loadMentorMeetingsTable();
}

async function loadMentorMeetingsTable() {
    try {
        const meetings = await (await fetch(`${API_URL}/academic/mentor/meetings`, { headers: getAuthHeaders() })).json();
        const statusColor = { pending:'var(--warning)', active:'var(--success)', completed:'var(--primary)', cancelled:'var(--danger)' };
        document.getElementById('mentor-meetings-tbody').innerHTML = meetings.map(m => `
            <tr>
                <td style="font-weight:600;">${m.title}</td>
                <td style="font-size:0.85rem;">${new Date(m.meeting_date).toLocaleString()}</td>
                <td>${m.meeting_type}</td>
                <td>${m.participant_count || 0}</td>
                <td><span style="color:${statusColor[m.status]||'white'};font-weight:600;">${m.status.toUpperCase()}</span></td>
                <td>
                    ${m.status === 'active' ? `<button class="btn btn-primary" style="width:auto;padding:0.3rem 0.7rem;font-size:0.8rem;" onclick="openProcModal(${m.id})">Add Notes</button>` : ''}
                    ${m.status === 'completed' ? `<span style="color:var(--success);font-size:0.8rem;">✓ Done</span>` : ''}
                </td>
            </tr>
        `).join('') || '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);">No meetings yet</td></tr>';
    } catch (err) { console.error(err); }
}

function openProcModal(meetingId) {
    document.getElementById('proc-meeting-id').value = meetingId;
    document.getElementById('proceedings-modal').style.display = 'flex';
}
function closeProcModal() { document.getElementById('proceedings-modal').style.display = 'none'; }

async function submitProceedings() {
    const data = { meetingId: document.getElementById('proc-meeting-id').value, notes: document.getElementById('proc-notes').value, outcome: document.getElementById('proc-outcome').value };
    const res = await fetch(`${API_URL}/mentor/add-proceedings`, { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(data) });
    if (res.ok) { alert('Proceedings saved!'); closeProcModal(); loadMentorMeetingsTable(); }
}

async function submitMeeting() {
    const type = document.getElementById('meet-type').value;
    let studentIds = [];
    if (type === 'group') {
        const mentees = await (await fetch(`${API_URL}/mentor/my-mentees`, { headers: getAuthHeaders() })).json();
        studentIds = mentees.map(m => m.id);
    }
    const data = { title: document.getElementById('meet-title').value, date: document.getElementById('meet-date').value, type, description: document.getElementById('meet-desc').value, studentIds };
    const res = await fetch(`${API_URL}/mentor/schedule-meeting`, { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(data) });
    const result = await res.json();
    alert(result.message);
    if (res.ok) loadMentorMeetingsTable();
}
