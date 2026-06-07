// ==============================
// STUDENT: MEETINGS PAGE
// ==============================
async function renderStudentMeetings(container) {
    container.innerHTML = `
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:1.5rem; margin-bottom:1.5rem;">
            <div>
                <h3 style="margin-bottom:1rem; color:var(--primary);">📅 Upcoming Meetings</h3>
                <div id="upcoming-meetings"></div>
            </div>
            <div>
                <h3 style="margin-bottom:1rem; color:var(--text-muted);">📁 Past Meetings</h3>
                <div id="past-meetings"></div>
            </div>
        </div>
    `;
    try {
        const res = await fetch(`${API_URL}/academic/student/meetings`, { headers: getAuthHeaders() });
        const meetings = await res.json();
        const now = new Date();
        const upcoming = meetings.filter(m => new Date(m.meeting_date) >= now && m.status === 'active');
        const past = meetings.filter(m => new Date(m.meeting_date) < now || m.status === 'completed');

        const renderCard = (m, isPast) => `
            <div style="background:var(--bg-card); border:1px solid var(--border); border-radius:0.75rem; padding:1rem; margin-bottom:0.75rem;">
                <p style="font-weight:600;">${m.title}</p>
                <p style="font-size:0.8rem; color:var(--text-muted);">${new Date(m.meeting_date).toLocaleString()} &bull; ${m.meeting_type}</p>
                <p style="font-size:0.8rem; color:var(--text-muted);">By: ${m.created_by_name}</p>
                <p style="font-size:0.8rem; margin-top:0.3rem;">Attendance: 
                    <span style="color:${m.attendance_status==='present'?'var(--success)':'var(--danger)'}; font-weight:600;">${m.attendance_status || 'Not marked'}</span>
                </p>
                ${isPast && m.status === 'completed' ? `<button onclick="viewStudentProceeding(${m.id})" style="background:none; border:1px solid var(--primary); color:var(--primary); border-radius:0.5rem; padding:0.3rem 0.7rem; cursor:pointer; font-size:0.8rem; margin-top:0.5rem;">View Notes</button>` : ''}
                ${isPast && m.status === 'completed' ? `<button onclick="openFeedbackModal(${m.id}, ${m.created_by})" style="background:none; border:1px solid var(--secondary); color:var(--secondary); border-radius:0.5rem; padding:0.3rem 0.7rem; cursor:pointer; font-size:0.8rem; margin-top:0.5rem; margin-left:0.4rem;">Give Feedback</button>` : ''}
            </div>`;

        document.getElementById('upcoming-meetings').innerHTML = upcoming.map(m => renderCard(m, false)).join('') || '<p style="color:var(--text-muted);">No upcoming meetings</p>';
        document.getElementById('past-meetings').innerHTML = past.map(m => renderCard(m, true)).join('') || '<p style="color:var(--text-muted);">No past meetings</p>';
    } catch (err) { console.error(err); }
}

async function viewStudentProceeding(meetingId) {
    try {
        const res = await fetch(`${API_URL}/academic/student/meeting-proceeding/${meetingId}`, { headers: getAuthHeaders() });
        const proc = await res.json();
        if (!proc) return alert('No proceedings recorded yet.');
        alert(`Meeting Notes:\n\n${proc.notes || 'N/A'}\n\nOutcome:\n${proc.outcome || 'N/A'}`);
    } catch (err) { console.error(err); }
}

let feedbackMeetingId = null, feedbackMentorId = null;
function openFeedbackModal(meetingId, mentorId) {
    feedbackMeetingId = meetingId; feedbackMentorId = mentorId;
    const modal = document.createElement('div');
    modal.id = 'feedback-modal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:1000;display:flex;align-items:center;justify-content:center;';
    modal.innerHTML = `
        <div style="background:var(--bg-card);padding:2rem;border-radius:1rem;width:420px;border:1px solid var(--border);">
            <h3 style="margin-bottom:1rem;">Give Feedback</h3>
            <div class="form-group"><label>Rating (1-5)</label><input type="number" id="fb-rating" class="form-input" min="1" max="5" value="5"></div>
            <div class="form-group"><label>Comments</label><textarea id="fb-comments" class="form-input" rows="4"></textarea></div>
            <div style="display:flex;gap:0.75rem;margin-top:1rem;">
                <button class="btn btn-primary" onclick="submitStudentFeedback()">Submit</button>
                <button class="btn" style="background:var(--border);color:white;" onclick="document.getElementById('feedback-modal').remove()">Cancel</button>
            </div>
        </div>`;
    document.body.appendChild(modal);
}

async function submitStudentFeedback() {
    const res = await fetch(`${API_URL}/academic/student/feedback`, {
        method: 'POST', headers: getAuthHeaders(),
        body: JSON.stringify({ meetingId: feedbackMeetingId, toUserId: feedbackMentorId, rating: document.getElementById('fb-rating').value, comments: document.getElementById('fb-comments').value })
    });
    if (res.ok) { alert('Feedback submitted!'); document.getElementById('feedback-modal').remove(); }
}

// ==============================
// STUDENT: GOALS & SKILLS PAGE
// ==============================
async function renderGoals(container) {
    container.innerHTML = `
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:1.5rem;">
            <div style="background:var(--bg-card);padding:1.5rem;border-radius:1rem;border:1px solid var(--border);">
                <h3 style="margin-bottom:1rem;">🎯 Set New Goal</h3>
                <div class="form-group"><label>Goal Type</label>
                    <select id="goal-type" class="form-input" onchange="updateGoalTargetPlaceholder()">
                        <option value="attendance">Attendance</option>
                        <option value="marks">Marks</option>
                        <option value="skill">Skill</option>
                    </select>
                </div>
                <div class="form-group"><label>Target Value</label><input id="goal-target" class="form-input" type="text" placeholder="e.g. 85%"></div>
                <div class="form-group"><label>Deadline</label><input id="goal-deadline" class="form-input" type="date"></div>
                <button class="btn btn-primary" onclick="submitGoal()">Set Goal</button>

                <hr style="border-color:var(--border); margin:1.5rem 0;">
                <h3 style="margin-bottom:1rem;">🌟 My Interests</h3>
                <p style="font-size:0.8rem; color:var(--text-muted); margin-bottom:0.5rem;">Comma separated (e.g. AI/ML, Full Stack, Cloud)</p>
                <textarea id="interests-input" class="form-input" rows="3" placeholder="AI/ML, Cybersecurity, Backend..."></textarea>
                <button class="btn btn-primary" style="margin-top:0.75rem;" onclick="saveInterests()">Save Interests</button>
            </div>
            <div>
                <h3 style="margin-bottom:1rem;">My Goals</h3>
                <div id="goals-list"></div>
            </div>
        </div>
    `;
    updateGoalTargetPlaceholder();
    loadMyGoals();
}

function updateGoalTargetPlaceholder() {
    const type = document.getElementById('goal-type').value;
    const targetInput = document.getElementById('goal-target');
    if (!targetInput) return;
    
    if (type === 'attendance') {
        targetInput.placeholder = 'e.g. 85%';
    } else if (type === 'marks') {
        targetInput.placeholder = 'e.g. 45/50 (Internals) or 9.5 CGPA';
    } else if (type === 'skill') {
        targetInput.placeholder = 'e.g. Learn React, Complete SQL course';
    }
}

async function submitGoal() {
    const res = await fetch(`${API_URL}/student/set-goal`, {
        method: 'POST', headers: getAuthHeaders(),
        body: JSON.stringify({ type: document.getElementById('goal-type').value, target: document.getElementById('goal-target').value, deadline: document.getElementById('goal-deadline').value })
    });
    if (res.ok) { alert('Goal set!'); loadMyGoals(); }
}

async function saveInterests() {
    const res = await fetch(`${API_URL}/student/update-interests`, {
        method: 'PUT', headers: getAuthHeaders(),
        body: JSON.stringify({ interests: document.getElementById('interests-input').value })
    });
    if (res.ok) alert('Interests saved!');
}

async function loadMyGoals() {
    try {
        const res = await fetch(`${API_URL}/academic/student/goals`, { headers: getAuthHeaders() });
        const goals = await res.json();
        const statusColors = { pending: 'var(--warning)', achieved: 'var(--success)', missed: 'var(--danger)' };
        document.getElementById('goals-list').innerHTML = goals.map(g => `
            <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:0.75rem;padding:1rem;margin-bottom:0.75rem;">
                <div style="display:flex;justify-content:space-between;align-items:center;">
                    <p style="font-weight:600;">${g.goal_type.toUpperCase()} Goal</p>
                    <span style="color:${statusColors[g.status]};font-size:0.75rem;font-weight:600;">${g.status.toUpperCase()}</span>
                </div>
                <p style="font-size:0.85rem;color:var(--text-muted);">Target: ${g.target_value}</p>
                <p style="font-size:0.8rem;color:var(--text-muted);">Deadline: ${g.deadline ? new Date(g.deadline).toLocaleDateString() : 'N/A'}</p>
                ${g.mentor_comment ? `<div style="margin-top:0.5rem;background:rgba(99,102,241,0.1);border-radius:0.5rem;padding:0.5rem;font-size:0.8rem;">💬 Mentor: ${g.mentor_comment}</div>` : ''}
            </div>
        `).join('') || '<p style="color:var(--text-muted);">No goals set yet</p>';
    } catch (err) { console.error(err); }
}

// ==============================
// STUDENT: REPORT ISSUE PAGE
// ==============================
async function renderReportIssue(container) {
    container.innerHTML = `
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:1.5rem;">
            <div style="background:var(--bg-card);padding:1.5rem;border-radius:1rem;border:1px solid var(--border);">
                <h3 style="margin-bottom:1rem;">🆕 Raise New Issue</h3>
                <div class="form-group"><label>Category</label>
                    <select id="issue-cat" class="form-input"><option>Academic</option><option>Personal</option><option>Career</option><option>Technical</option></select>
                </div>
                <div class="form-group"><label>Title</label><input id="issue-title" class="form-input" type="text" placeholder="Brief issue title"></div>
                <div class="form-group"><label>Description</label><textarea id="issue-desc" class="form-input" rows="5" placeholder="Describe your issue in detail..."></textarea></div>
                <button class="btn btn-primary" onclick="submitIssue()">Raise Issue</button>
            </div>
            <div>
                <h3 style="margin-bottom:1rem;">My Issues</h3>
                <div id="my-issues-list"></div>
            </div>
        </div>
    `;
    loadMyIssues();
}

async function submitIssue() {
    const res = await fetch(`${API_URL}/student/report-issue`, {
        method: 'POST', headers: getAuthHeaders(),
        body: JSON.stringify({ category: document.getElementById('issue-cat').value, title: document.getElementById('issue-title').value, description: document.getElementById('issue-desc').value })
    });
    if (res.ok) { alert('Issue raised!'); loadMyIssues(); }
}

async function loadMyIssues() {
    try {
        const res = await fetch(`${API_URL}/academic/student/issues`, { headers: getAuthHeaders() });
        const issues = await res.json();
        const statusColors = { Pending: 'var(--warning)', 'In Progress': 'var(--primary)', Solved: 'var(--success)' };
        document.getElementById('my-issues-list').innerHTML = issues.map(i => `
            <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:0.75rem;padding:1rem;margin-bottom:0.75rem;">
                <div style="display:flex;justify-content:space-between;">
                    <p style="font-weight:600;">${i.title}</p>
                    <span style="color:${statusColors[i.status]||'white'};font-size:0.75rem;font-weight:600;">${i.status}</span>
                </div>
                <span style="font-size:0.7rem;padding:2px 6px;border-radius:4px;background:rgba(99,102,241,0.15);color:var(--primary);">${i.category}</span>
                <p style="font-size:0.8rem;color:var(--text-muted);margin-top:0.5rem;">${i.description}</p>
                ${i.mentor_response ? `<div style="margin-top:0.5rem;background:rgba(34,197,94,0.1);border-radius:0.5rem;padding:0.5rem;font-size:0.8rem;border:1px solid var(--success);">💬 Mentor: ${i.mentor_response}</div>` : ''}
            </div>
        `).join('') || '<p style="color:var(--text-muted);">No issues raised yet</p>';
    } catch (err) { console.error(err); }
}

// ==============================
// STUDENT: MARKS PAGE
// ==============================
async function renderStudentMarks(container) {
    container.innerHTML = `
        <div style="background:var(--bg-card);padding:1.5rem;border-radius:1rem;border:1px solid var(--border);margin-bottom:1.5rem;">
            <h3 style="margin-bottom:1rem;">Submit Internal Marks</h3>
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;">
                <div class="form-group"><label>Subject Code</label><input id="sm-code" class="form-input" type="text" placeholder="CS61"></div>
                <div class="form-group"><label>Subject Name</label><input id="sm-name" class="form-input" type="text" placeholder="DBMS"></div>
                <div class="form-group"><label>Marks (max 50)</label><input id="sm-marks" class="form-input" type="number" min="0" max="50"></div>
            </div>
            <button class="btn btn-primary" style="width:auto;margin-top:0.5rem;" onclick="submitStudentMarks()">Submit for Verification</button>
        </div>
        <div class="data-table-container">
            <table class="data-table">
                <thead><tr><th>Subject</th><th>Internal (/50)</th><th>External (/100)</th><th>Internal Status</th><th>External Status</th></tr></thead>
                <tbody id="student-marks-table"><tr><td colspan="5" style="text-align:center;">Loading...</td></tr></tbody>
            </table>
        </div>
    `;
    loadStudentMarksTable();
}

async function submitStudentMarks() {
    const res = await fetch(`${API_URL}/academic/student/submit-marks`, {
        method: 'POST', headers: getAuthHeaders(),
        body: JSON.stringify({ subjectCode: document.getElementById('sm-code').value, subjectName: document.getElementById('sm-name').value, marks: parseInt(document.getElementById('sm-marks').value) })
    });
    const result = await res.json();
    alert(result.message);
    if (res.ok) loadStudentMarksTable();
}

async function loadStudentMarksTable() {
    const res = await fetch(`${API_URL}/academic/student/marks`, { headers: getAuthHeaders() });
    const marks = await res.json();
    const statusBadge = s => `<span style="font-size:0.75rem;font-weight:600;color:${s==='approved'?'var(--success)':s==='rejected'?'var(--danger)':s==='verified'?'var(--primary)':'var(--warning)'};">${s?.toUpperCase()||'—'}</span>`;
    document.getElementById('student-marks-table').innerHTML = marks.map(m => `
        <tr>
            <td>${m.subject_name} (${m.subject_code})</td>
            <td>${m.internal_marks}</td>
            <td>${m.external_marks || '—'}</td>
            <td>${statusBadge(m.internal_status)}</td>
            <td>${statusBadge(m.external_status)}</td>
        </tr>
    `).join('') || '<tr><td colspan="5" style="text-align:center;">No marks submitted yet</td></tr>';
}

// ==============================
// STUDENT: MESSAGES (Chat with Mentor)
// ==============================
async function renderStudentMessages(container) {
    const user = JSON.parse(localStorage.getItem('user'));
    // Get mentor info
    const dashRes = await fetch(`${API_URL}/student/dashboard`, { headers: getAuthHeaders() });
    const { mentor } = await dashRes.json();

    if (!mentor) {
        container.innerHTML = '<div class="stat-card"><p>No mentor assigned yet. Contact admin.</p></div>';
        return;
    }

    // Need mentor's ID — fetch from mentee's student data
    const meRes = await fetch(`${API_URL}/auth/me`, { headers: getAuthHeaders() });
    const me = await meRes.json();
    const mentorId = me.studentDetails?.mentor_id;

    activeChatUserId = mentorId;
    container.innerHTML = `
        <div style="background:var(--bg-card);border-radius:1rem;border:1px solid var(--border);overflow:hidden;height:70vh;display:flex;flex-direction:column;">
            <div style="padding:1rem;border-bottom:1px solid var(--border);font-weight:600;display:flex;align-items:center;gap:0.75rem;">
                <div style="width:36px;height:36px;border-radius:50%;background:var(--primary);display:flex;align-items:center;justify-content:center;font-weight:700;">${mentor.name.charAt(0)}</div>
                Chat with ${mentor.name}
            </div>
            <div id="chat-messages" style="flex:1;overflow-y:auto;padding:1rem;display:flex;flex-direction:column;gap:0.5rem;"></div>
            <div style="padding:1rem;border-top:1px solid var(--border);display:flex;gap:0.75rem;">
                <input id="msg-input" type="text" class="form-input" placeholder="Type a message..." onkeydown="if(event.key==='Enter') sendChatMessage()">
                <button class="btn btn-primary" style="width:auto;padding:0.5rem 1rem;" onclick="sendChatMessage()">Send</button>
            </div>
        </div>
    `;
    if (mentorId) loadChatMessages(mentorId);
}
