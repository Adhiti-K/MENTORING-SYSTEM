// ==============================
// PRINCIPAL: COLLEGE OVERVIEW (enhanced)
// ==============================
async function renderCollegeOverview(container) {
    container.innerHTML = `
        <div class="stats-grid" id="principal-stats">
            <div class="stat-card"><p class="stat-title">Total Students</p><h3 id="pc-students">—</h3></div>
            <div class="stat-card"><p class="stat-title">Total Mentors</p><h3 id="pc-mentors">—</h3></div>
            <div class="stat-card"><p class="stat-title">Meetings Completed</p><h3 id="pc-meetings">—</h3></div>
            <div class="stat-card"><p class="stat-title">Institution Attendance</p><h3 id="pc-attendance">—</h3></div>
        </div>
        <div class="charts-grid" style="margin-top:1.5rem;">
            <div class="chart-container"><h3>Department Comparison — Avg Marks</h3><canvas id="pc-dept-marks-chart"></canvas></div>
            <div class="chart-container"><h3>Department Comparison — Avg Attendance</h3><canvas id="pc-dept-att-chart"></canvas></div>
        </div>
    `;
    try {
        const [stats, depts] = await Promise.all([
            fetch(`${API_URL}/principal/stats`, { headers: getAuthHeaders() }).then(r => r.json()),
            fetch(`${API_URL}/principal/departments`, { headers: getAuthHeaders() }).then(r => r.json())
        ]);
        document.getElementById('pc-students').textContent = stats.totalStudents;
        document.getElementById('pc-mentors').textContent = stats.totalMentors;
        document.getElementById('pc-meetings').textContent = stats.totalMeetings;
        document.getElementById('pc-attendance').textContent = (stats.avgAttendance || 0) + '%';

        const colors = ['#6366f1','#ec4899','#22c55e','#f59e0b','#ef4444','#8b5cf6','#06b6d4'];
        new Chart(document.getElementById('pc-dept-marks-chart'), {
            type: 'bar',
            data: { labels: depts.map(d => d.department), datasets: [{ label: 'Avg Internal Marks', data: depts.map(d => d.avg_marks || 0), backgroundColor: colors }] },
            options: { responsive: true, plugins: { legend: { labels: { color: '#94a3b8' } } }, scales: { x: { ticks: { color: '#94a3b8' } }, y: { ticks: { color: '#94a3b8' }, max: 50 } } }
        });
        new Chart(document.getElementById('pc-dept-att-chart'), {
            type: 'bar',
            data: { labels: depts.map(d => d.department), datasets: [{ label: 'Avg Attendance %', data: depts.map(d => d.avg_attendance || 0), backgroundColor: colors }] },
            options: { responsive: true, plugins: { legend: { labels: { color: '#94a3b8' } } }, scales: { x: { ticks: { color: '#94a3b8' } }, y: { ticks: { color: '#94a3b8' }, max: 100 } } }
        });
    } catch (err) { console.error(err); }
}

// ==============================
// PRINCIPAL: DEPARTMENTS PAGE
// ==============================
async function renderDepartments(container) {
    container.innerHTML = `
        <div class="data-table-container">
            <div style="padding:1rem;border-bottom:1px solid var(--border);"><h3>All Departments Overview</h3></div>
            <table class="data-table">
                <thead><tr><th>Department</th><th>Students</th><th>Avg Attendance</th><th>Avg Internal Marks</th></tr></thead>
                <tbody id="dept-table-body"><tr><td colspan="4" style="text-align:center;">Loading...</td></tr></tbody>
            </table>
        </div>
    `;
    try {
        const depts = await (await fetch(`${API_URL}/principal/departments`, { headers: getAuthHeaders() })).json();
        document.getElementById('dept-table-body').innerHTML = depts.map(d => `
            <tr>
                <td style="font-weight:600;">${d.department}</td>
                <td>${d.student_count || 0}</td>
                <td style="color:${(d.avg_attendance||0)<75?'var(--danger)':'var(--success)'};">${d.avg_attendance || 'N/A'}%</td>
                <td>${d.avg_marks || 'N/A'}/50</td>
            </tr>
        `).join('') || '<tr><td colspan="4" style="text-align:center;">No departments found</td></tr>';
    } catch (err) { console.error(err); }
}

// ==============================
// PRINCIPAL: INSTITUTION ANALYTICS
// ==============================
async function renderInstAnalytics(container) {
    container.innerHTML = `
        <div class="charts-grid">
            <div class="chart-container"><h3>Mentor Effectiveness Across College</h3><canvas id="pc-mentor-eff-chart"></canvas></div>
            <div class="chart-container"><h3>Overall Learner Classification</h3><canvas id="pc-learner-chart"></canvas></div>
        </div>
        <div class="chart-container" style="margin-top:1.5rem;">
            <h3>Recent Achievements College-wide</h3>
            <div id="pc-achievements-list" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:1rem;margin-top:1rem;"></div>
        </div>
    `;
    try {
        const [mentorEff, achievements] = await Promise.all([
            fetch(`${API_URL}/principal/mentor-effectiveness`, { headers: getAuthHeaders() }).then(r => r.json()),
            fetch(`${API_URL}/principal/achievements`, { headers: getAuthHeaders() }).then(r => r.json())
        ]);

        new Chart(document.getElementById('pc-mentor-eff-chart'), {
            type: 'bar',
            data: { labels: mentorEff.map(m => m.mentor_name), datasets: [{ label: 'Avg Mentee Attendance %', data: mentorEff.map(m => m.avg_attendance || 0), backgroundColor: '#6366f1' }] },
            options: { indexAxis: 'y', responsive: true, plugins: { legend: { labels: { color: '#94a3b8' } } }, scales: { x: { ticks: { color: '#94a3b8' }, max: 100 }, y: { ticks: { color: '#94a3b8' } } } }
        });

        // Mock learner chart (institution level)
        new Chart(document.getElementById('pc-learner-chart'), {
            type: 'doughnut',
            data: { labels: ['Fast Learners', 'Average', 'Slow Learners'], datasets: [{ data: [45, 35, 20], backgroundColor: ['#22c55e', '#6366f1', '#ef4444'] }] },
            options: { plugins: { legend: { labels: { color: '#94a3b8' } } } }
        });

        document.getElementById('pc-achievements-list').innerHTML = achievements.slice(0, 9).map(a => `
            <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:0.75rem;padding:1rem;">
                <p style="font-weight:600;">${a.title}</p>
                <p style="font-size:0.8rem;color:var(--text-muted);">${a.student_name} (${a.usn})</p>
                <p style="font-size:0.75rem;color:var(--primary);">${a.department}</p>
            </div>
        `).join('') || '<p style="color:var(--text-muted);">No achievements recorded</p>';
    } catch (err) { console.error(err); }
}
