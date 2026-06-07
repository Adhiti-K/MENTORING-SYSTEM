// PRINCIPAL PAGES RENDERING
async function renderCollegeOverview(container) {
    container.innerHTML = `
        <div class="stats-grid">
            <div class="stat-card">
                <p class="stat-title">Overall Placement</p>
                <h3 class="stat-value">78%</h3>
            </div>
            <div class="stat-card">
                <p class="stat-title">Institution Attendance</p>
                <h3 class="stat-value">88.5%</h3>
            </div>
            <div class="stat-card">
                <p class="stat-title">Total Mentoring Sessions</p>
                <h3 class="stat-value">450+</h3>
            </div>
        </div>
        <div class="chart-container" style="margin-top: 1.5rem;">
            <h3>Department Comparison (Avg Marks)</h3>
            <canvas id="college-dept-chart" height="100"></canvas>
        </div>
    `;

    new Chart(document.getElementById('college-dept-chart'), {
        type: 'bar',
        data: {
            labels: ['CSE', 'ISE', 'ECE', 'ME', 'CE'],
            datasets: [{
                label: 'Avg SGPA',
                data: [8.2, 8.0, 7.5, 7.2, 7.4],
                backgroundColor: ['#6366f1', '#ec4899', '#22c55e', '#f59e0b', '#ef4444']
            }]
        }
    });
}
