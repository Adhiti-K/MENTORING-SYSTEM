// ADMIN PAGES RENDERING
async function renderAdminOverview(container) {
    container.innerHTML = `
        <div class="stats-grid">
            <div class="stat-card">
                <p class="stat-title">Total Students</p>
                <h3 class="stat-value" id="admin-total-students">-</h3>
            </div>
            <div class="stat-card">
                <p class="stat-title">Pending Approvals</p>
                <h3 class="stat-value" id="admin-pending-approvals">-</h3>
            </div>
            <div class="stat-card">
                <p class="stat-title">Active Meetings</p>
                <h3 class="stat-value" id="admin-active-meetings">-</h3>
            </div>
        </div>
        <div class="card" style="background: var(--bg-card); padding: 1.5rem; border-radius: 1rem; border: 1px solid var(--border);">
            <h3 style="margin-bottom: 1rem;">System Activity</h3>
            <canvas id="admin-activity-chart" height="100"></canvas>
        </div>
    `;
    
    // Fetch and populate stats (mock fetch for now)
    document.getElementById('admin-total-students').textContent = '1,240';
    document.getElementById('admin-pending-approvals').textContent = '12';
    document.getElementById('admin-active-meetings').textContent = '5';

    new Chart(document.getElementById('admin-activity-chart'), {
        type: 'line',
        data: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
            datasets: [{
                label: 'Logins',
                data: [65, 59, 80, 81, 56],
                borderColor: '#6366f1',
                tension: 0.4
            }]
        },
        options: { responsive: true, plugins: { legend: { display: false } } }
    });
}

async function renderApprovals(container) {
    container.innerHTML = `
        <div class="data-table-container">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>USN / Email</th>
                        <th>Role</th>
                        <th>Dept</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody id="approvals-tbody">
                    <tr><td colspan="5" style="text-align: center;">Fetching data...</td></tr>
                </tbody>
            </table>
        </div>
    `;

    try {
        const res = await fetch(`${API_URL}/admin/pending-approvals`, { headers: getAuthHeaders() });
        const users = await res.json();
        const tbody = document.getElementById('approvals-tbody');
        tbody.innerHTML = users.map(u => `
            <tr>
                <td>${u.name}</td>
                <td>${u.usn || u.email}</td>
                <td><span class="badge">${u.role.toUpperCase()}</span></td>
                <td>${u.department || 'N/A'}</td>
                <td>
                    <button class="btn btn-primary" style="padding: 0.5rem; width: auto;" onclick="approveUser(${u.id})">Approve</button>
                </td>
            </tr>
        `).join('') || '<tr><td colspan="5" style="text-align: center;">No pending approvals</td></tr>';
    } catch (err) {
        console.error(err);
    }
}

async function approveUser(userId) {
    if (!confirm('Approve this user?')) return;
    try {
        const res = await fetch(`${API_URL}/admin/approve-user/${userId}`, {
            method: 'PUT',
            headers: getAuthHeaders()
        });
        if (res.ok) {
            alert('User approved!');
            renderApprovals(document.getElementById('dashboard-content'));
        }
    } catch (err) {
        alert('Error: ' + err.message);
    }
}

async function renderAllocation(container) {
    container.innerHTML = `
        <div style="display: grid; grid-template-columns: 1fr 300px; gap: 1.5rem;">
            <div class="data-table-container">
                <div style="padding: 1rem; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between;">
                    <h3>Unallocated Students</h3>
                    <input type="text" placeholder="Search USN..." class="form-input" style="width: 200px; padding: 0.5rem;">
                </div>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th><input type="checkbox" id="select-all-students"></th>
                            <th>Name</th>
                            <th>USN</th>
                            <th>Dept</th>
                        </tr>
                    </thead>
                    <tbody id="unallocated-tbody">
                        <!-- Data here -->
                    </tbody>
                </table>
            </div>
            <div class="card" style="background: var(--bg-card); padding: 1.5rem; border-radius: 1rem; border: 1px solid var(--border); height: fit-content;">
                <h3>Allocation</h3>
                <div class="form-group" style="margin-top: 1rem;">
                    <label>Select Mentor</label>
                    <select class="form-input" id="mentor-select">
                        <option value="">Loading mentors...</option>
                    </select>
                </div>
                <button class="btn btn-primary" onclick="allocateMentorBulk()">Assign Selected</button>
            </div>
        </div>
    `;

    // Fetch Students
    const studentRes = await fetch(`${API_URL}/admin/unallocated-students`, { headers: getAuthHeaders() });
    const students = await studentRes.json();
    document.getElementById('unallocated-tbody').innerHTML = students.map(s => `
        <tr>
            <td><input type="checkbox" class="student-checkbox" value="${s.id}"></td>
            <td>${s.name}</td>
            <td>${s.usn}</td>
            <td>${s.department}</td>
        </tr>
    `).join('') || '<tr><td colspan="4" style="text-align: center;">No unallocated students</td></tr>';

    // Fetch Mentors
    const mentorRes = await fetch(`${API_URL}/admin/mentors`, { headers: getAuthHeaders() });
    const mentors = await mentorRes.json();
    document.getElementById('mentor-select').innerHTML = mentors.map(m => `
        <option value="${m.id}">${m.name} (${m.department})</option>
    `).join('<option value="">Select Mentor</option>');
}

async function allocateMentorBulk() {
    const selected = Array.from(document.querySelectorAll('.student-checkbox:checked')).map(cb => cb.value);
    const mentorId = document.getElementById('mentor-select').value;
    
    if (selected.length === 0 || !mentorId) return alert('Select students and a mentor');

    try {
        const res = await fetch(`${API_URL}/admin/allocate-mentor`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ studentIds: selected, mentorId })
        });
        if (res.ok) {
            alert('Allocation successful!');
            renderAllocation(document.getElementById('dashboard-content'));
        }
    } catch (err) {
        alert(err.message);
    }
}
