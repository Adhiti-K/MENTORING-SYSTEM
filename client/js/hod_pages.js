// ==============================
// HOD: ANALYTICS PAGE (Charts)
// ==============================
async function renderAnalytics(container) {
    container.innerHTML = `
        <div class="charts-grid">
            <div class="chart-container"><h3>Attendance by Semester</h3><canvas id="hod-att-chart"></canvas></div>
            <div class="chart-container"><h3>Avg Marks by Semester</h3><canvas id="hod-marks-chart"></canvas></div>
        </div>
        <div class="charts-grid" style="margin-top:1.5rem;">
            <div class="chart-container"><h3>Learner Classification</h3><canvas id="hod-learners-chart"></canvas></div>
            <div class="chart-container"><h3>Mentor Effectiveness (Avg Attendance)</h3><canvas id="hod-mentor-chart"></canvas></div>
        </div>
    `;
    try {
        const res = await fetch(`${API_URL}/hod/analytics`, { headers: getAuthHeaders() });
        const { attendanceBySem, marksBySem, learners, mentorEffectiveness } = await res.json();

        new Chart(document.getElementById('hod-att-chart'), {
            type: 'bar',
            data: { labels: attendanceBySem.map(a => a.year_semester), datasets: [{ label: 'Avg Attendance %', data: attendanceBySem.map(a => a.avg_attendance), backgroundColor: '#6366f1' }] },
            options: { responsive: true, plugins: { legend: { labels: { color: '#94a3b8' } } }, scales: { x: { ticks: { color: '#94a3b8' } }, y: { ticks: { color: '#94a3b8' }, max: 100 } } }
        });

        new Chart(document.getElementById('hod-marks-chart'), {
            type: 'line',
            data: {
                labels: marksBySem.map(m => m.year_semester),
                datasets: [
                    { label: 'Internal (/50)', data: marksBySem.map(m => m.avg_internal), borderColor: '#6366f1', tension: 0.4 },
                    { label: 'External (/100)', data: marksBySem.map(m => m.avg_external), borderColor: '#ec4899', tension: 0.4 }
                ]
            },
            options: { responsive: true, plugins: { legend: { labels: { color: '#94a3b8' } } }, scales: { x: { ticks: { color: '#94a3b8' } }, y: { ticks: { color: '#94a3b8' } } } }
        });

        new Chart(document.getElementById('hod-learners-chart'), {
            type: 'doughnut',
            data: { labels: ['Fast Learners', 'Slow Learners'], datasets: [{ data: [learners?.fastLearners || 0, learners?.slowLearners || 0], backgroundColor: ['#22c55e', '#ef4444'] }] },
            options: { plugins: { legend: { labels: { color: '#94a3b8' } } } }
        });

        new Chart(document.getElementById('hod-mentor-chart'), {
            type: 'bar',
            data: { labels: mentorEffectiveness.map(m => m.mentor_name), datasets: [{ label: 'Avg Mentee Attendance %', data: mentorEffectiveness.map(m => m.avg_attendance), backgroundColor: '#f59e0b' }] },
            options: { indexAxis: 'y', responsive: true, plugins: { legend: { labels: { color: '#94a3b8' } } }, scales: { x: { ticks: { color: '#94a3b8' } }, y: { ticks: { color: '#94a3b8' } } } }
        });
    } catch (err) { console.error(err); }
}

// ==============================
// HOD: STUDENT SEARCH PAGE
// ==============================
async function renderSearch(container) {
    container.innerHTML = `
        <div style="background:var(--bg-card);padding:1.5rem;border-radius:1rem;border:1px solid var(--border);margin-bottom:1.5rem;">
            <h3 style="margin-bottom:1rem;">🔍 Search Student by USN</h3>
            <div style="display:flex;gap:1rem;">
                <input id="hod-usn-search" class="form-input" type="text" placeholder="Enter USN e.g. 1XY20CS001" style="max-width:320px;">
                <button class="btn btn-primary" style="width:auto;padding:0.6rem 1.2rem;" onclick="hodSearchStudent()">Search</button>
            </div>
        </div>
        <div id="hod-student-result"></div>
    `;
}

async function hodSearchStudent() {
    const usn = document.getElementById('hod-usn-search').value.trim();
    if (!usn) return alert('Enter a USN');
    const res = document.getElementById('hod-student-result');
    res.innerHTML = '<p style="text-align:center;">Loading...</p>';
    try {
        const data = await (await fetch(`${API_URL}/hod/search/${usn}`, { headers: getAuthHeaders() })).json();
        if (data.message) { res.innerHTML = `<p style="color:var(--danger);">${data.message}</p>`; return; }
        const { profile, attendance, marks, achievements, goals, meetings } = data;
        const avgAtt = attendance.length ? (attendance.reduce((s, a) => s + (a.total_classes > 0 ? a.attended_classes / a.total_classes * 100 : 0), 0) / attendance.length).toFixed(1) : 0;
        const avgMrk = marks.length ? (marks.reduce((s, m) => s + m.internal_marks, 0) / marks.length).toFixed(1) : 0;
        res.innerHTML = `
            <div class="stats-grid" style="margin-bottom:1.5rem;">
                <div class="stat-card"><p class="stat-title">Name</p><h3>${profile.name}</h3></div>
                <div class="stat-card"><p class="stat-title">USN</p><h3>${profile.usn}</h3></div>
                <div class="stat-card"><p class="stat-title">Year/Sem</p><h3>${profile.year_semester}</h3></div>
                <div class="stat-card"><p class="stat-title">Avg Attendance</p><h3 style="color:${avgAtt < 75 ? 'var(--danger)' : 'var(--success)'};">${avgAtt}%</h3></div>
                <div class="stat-card"><p class="stat-title">Avg Internal</p><h3>${avgMrk}/50</h3></div>
                <div class="stat-card"><p class="stat-title">Meetings Attended</p><h3>${meetings.length}</h3></div>
            </div>
            <div class="charts-grid">
                <div class="chart-container">
                    <h3 style="margin-bottom:1rem;">Subject Marks</h3>
                    <canvas id="hod-student-marks-chart"></canvas>
                </div>
                <div class="chart-container">
                    <h3 style="margin-bottom:1rem;">Goals (${goals.length})</h3>
                    ${goals.map(g => `<div style="padding:0.6rem;border-bottom:1px solid var(--border);font-size:0.85rem;"><strong>${g.goal_type}</strong>: ${g.target_value} — <span style="color:${g.status==='achieved'?'var(--success)':'var(--warning)'};">${g.status}</span></div>`).join('') || '<p style="color:var(--text-muted);">No goals</p>'}
                </div>
            </div>`;
        if (marks.length) {
            new Chart(document.getElementById('hod-student-marks-chart'), {
                type: 'bar',
                data: { labels: marks.map(m => m.subject_code), datasets: [{ label: 'Internal', data: marks.map(m => m.internal_marks), backgroundColor: '#6366f1' }, { label: 'External', data: marks.map(m => m.external_marks), backgroundColor: '#ec4899' }] },
                options: { responsive: true, plugins: { legend: { labels: { color: '#94a3b8' } } }, scales: { x: { ticks: { color: '#94a3b8' } }, y: { ticks: { color: '#94a3b8' } } } }
            });
        }
    } catch (err) { res.innerHTML = `<p style="color:var(--danger);">${err.message}</p>`; }
}

// ==============================
// HOD: MENTORS PAGE
// ==============================
async function renderMentors(container) {
    container.innerHTML = `
        <div class="data-table-container">
            <div style="padding:1rem;border-bottom:1px solid var(--border);"><h3>Department Mentors</h3></div>
            <table class="data-table">
                <thead><tr><th>Name</th><th>Email</th><th>Mentees</th><th>Avg Mentee Attendance</th></tr></thead>
                <tbody id="hod-mentors-tbody"><tr><td colspan="4" style="text-align:center;">Loading...</td></tr></tbody>
            </table>
        </div>
    `;
    try {
        const mentors = await (await fetch(`${API_URL}/hod/mentors`, { headers: getAuthHeaders() })).json();
        document.getElementById('hod-mentors-tbody').innerHTML = mentors.map(m => `
            <tr>
                <td>${m.name}</td>
                <td style="color:var(--text-muted);">${m.email}</td>
                <td>${m.mentee_count || 0}</td>
                <td style="color:${(m.avg_mentee_attendance||0)<75?'var(--danger)':'var(--success)'};">${m.avg_mentee_attendance || 'N/A'}%</td>
            </tr>
        `).join('') || '<tr><td colspan="4" style="text-align:center;">No mentors found</td></tr>';
    } catch (err) { console.error(err); }
}

// ==============================
// HOD: SLOW & FAST LEARNERS
// ==============================
async function renderHodLearners(container) {
    container.innerHTML = `
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:1.5rem;">
            <div>
                <h3 style="color:var(--danger); margin-bottom:1rem;">🐢 Slow Learners (Avg Internal &lt; 21)</h3>
                <div id="slow-learners-list"></div>
            </div>
            <div>
                <h3 style="color:var(--success); margin-bottom:1rem;">🚀 Fast Learners (Avg Internal ≥ 35)</h3>
                <div id="fast-learners-list"></div>
            </div>
        </div>
    `;
    try {
        const { slowLearners, fastLearners } = await (await fetch(`${API_URL}/hod/learners`, { headers: getAuthHeaders() })).json();
        const card = (s, color) => `
            <div style="background:var(--bg-card);border:1px solid ${color};border-radius:0.75rem;padding:0.85rem;margin-bottom:0.6rem;display:flex;justify-content:space-between;align-items:center;">
                <div><p style="font-weight:600;">${s.name}</p><p style="font-size:0.8rem;color:var(--text-muted);">${s.usn} | ${s.year_semester}</p></div>
                <span style="color:${color};font-weight:700;">${s.avg_marks}/50</span>
            </div>`;
        document.getElementById('slow-learners-list').innerHTML = slowLearners.map(s => card(s, 'var(--danger)')).join('') || '<p style="color:var(--text-muted);">None identified</p>';
        document.getElementById('fast-learners-list').innerHTML = fastLearners.map(s => card(s, 'var(--success)')).join('') || '<p style="color:var(--text-muted);">None identified</p>';
    } catch (err) { console.error(err); }
}

// ==============================
// HOD: PROCEEDINGS PAGE
// ==============================
async function renderHodProceedings(container) {
    container.innerHTML = `
        <div class="data-table-container">
            <div style="padding:1rem;border-bottom:1px solid var(--border);"><h3>Department Meeting Proceedings</h3></div>
            <table class="data-table">
                <thead><tr><th>Meeting</th><th>Date</th><th>Conducted By</th><th>Notes</th><th>Outcome</th></tr></thead>
                <tbody id="hod-proc-tbody"><tr><td colspan="5" style="text-align:center;">Loading...</td></tr></tbody>
            </table>
        </div>
    `;
    try {
        const procs = await (await fetch(`${API_URL}/hod/proceedings`, { headers: getAuthHeaders() })).json();
        document.getElementById('hod-proc-tbody').innerHTML = procs.map(p => `
            <tr>
                <td>${p.title}</td>
                <td style="font-size:0.85rem;color:var(--text-muted);">${new Date(p.meeting_date).toLocaleDateString()}</td>
                <td>${p.created_by_name}</td>
                <td style="font-size:0.85rem;">${p.notes ? p.notes.substring(0,80)+'...' : '—'}</td>
                <td style="font-size:0.85rem;">${p.outcome ? p.outcome.substring(0,80)+'...' : '—'}</td>
            </tr>
        `).join('') || '<tr><td colspan="5" style="text-align:center;">No proceedings recorded</td></tr>';
    } catch (err) { console.error(err); }
}
