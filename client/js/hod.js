// HOD: DEPT OVERVIEW — Live data from API
async function renderDeptOverview(container) {
    container.innerHTML = `
        <div class="stats-grid">
            <div class="stat-card"><p class="stat-title">Total Students</p><h3 class="stat-value" id="hod-students">—</h3></div>
            <div class="stat-card"><p class="stat-title">Active Mentors</p><h3 class="stat-value" id="hod-mentors">—</h3></div>
            <div class="stat-card"><p class="stat-title">Avg Attendance</p><h3 class="stat-value" id="hod-att">—</h3></div>
            <div class="stat-card"><p class="stat-title">Avg Internal Marks</p><h3 class="stat-value" id="hod-marks">—</h3></div>
        </div>
        <div class="charts-grid" style="margin-top:1.5rem;">
            <div class="chart-container"><h3>Semester-wise Performance</h3><canvas id="dept-performance-chart"></canvas></div>
            <div class="chart-container"><h3>Learner Classification</h3><canvas id="dept-learners-chart"></canvas></div>
        </div>
    `;
    try {
        const stats = await (await fetch(`${API_URL}/hod/stats`, { headers: getAuthHeaders() })).json();
        document.getElementById('hod-students').textContent = stats.totalStudents || 0;
        document.getElementById('hod-mentors').textContent = stats.totalMentors || 0;
        document.getElementById('hod-att').textContent = (stats.avgAttendance || 0) + '%';
        document.getElementById('hod-marks').textContent = (stats.avgInternal || 0) + '/50';

        const analytics = await (await fetch(`${API_URL}/hod/analytics`, { headers: getAuthHeaders() })).json();
        const { attendanceBySem, marksBySem, learners } = analytics;

        new Chart(document.getElementById('dept-performance-chart'), {
            type: 'line',
            data: {
                labels: marksBySem.map(m => m.year_semester) || ['S1','S2','S3','S4','S5','S6'],
                datasets: [
                    { label: 'Avg Internal (/50)', data: marksBySem.map(m => m.avg_internal), borderColor: '#6366f1', fill: true, backgroundColor: 'rgba(99,102,241,0.1)', tension: 0.4 },
                    { label: 'Avg Attendance %', data: attendanceBySem.map(a => a.avg_attendance), borderColor: '#22c55e', fill: false, tension: 0.4 }
                ]
            },
            options: { responsive: true, plugins: { legend: { labels: { color: '#94a3b8' } } }, scales: { x: { ticks: { color: '#94a3b8' } }, y: { ticks: { color: '#94a3b8' } } } }
        });

        new Chart(document.getElementById('dept-learners-chart'), {
            type: 'doughnut',
            data: {
                labels: ['Fast Learners', 'Slow Learners'],
                datasets: [{ data: [learners?.fastLearners || 0, learners?.slowLearners || 0], backgroundColor: ['#22c55e', '#ef4444'] }]
            },
            options: { plugins: { legend: { labels: { color: '#94a3b8' } } } }
        });
    } catch (err) { console.error('HOD overview error:', err); }
}
