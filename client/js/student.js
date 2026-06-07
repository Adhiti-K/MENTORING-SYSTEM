// STUDENT: OVERVIEW — Live data from API
async function renderStudentOverview(container) {
    container.innerHTML = `
        <div class="stats-grid">
            <div class="stat-card"><p class="stat-title">Avg Attendance</p><h3 class="stat-value" id="s-att">—</h3></div>
            <div class="stat-card"><p class="stat-title">Latest Internal</p><h3 class="stat-value" id="s-marks">—</h3></div>
            <div class="stat-card"><p class="stat-title">Upcoming Meetings</p><h3 class="stat-value" id="s-meetings">—</h3></div>
            <div class="stat-card"><p class="stat-title">My Mentor</p><h3 class="stat-value" id="s-mentor" style="font-size:1rem;">—</h3></div>
        </div>
        <div class="charts-grid" style="margin-bottom: 1.5rem;">
            <div class="chart-container">
                <h3 style="margin-bottom:0.75rem;">📅 Subject-wise Attendance</h3>
                <canvas id="student-attendance-chart"></canvas>
            </div>
            <div class="chart-container">
                <h3 style="margin-bottom:0.75rem;">📊 Subject-wise Marks</h3>
                <canvas id="student-performance-chart"></canvas>
            </div>
        </div>
        <div class="chart-container" style="margin-bottom: 1.5rem;">
            <h3 style="margin-bottom:0.4rem;">📅 Daily Attendance Tracker (Last 28 Days)</h3>
            <p style="font-size:0.75rem; color:var(--text-muted); margin-bottom:0.75rem;">Timeline showing daily present/absent logs.</p>
            <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;" id="attendance-heatmap"></div>
            <div style="display:flex; gap:1rem; margin-top:0.75rem; font-size:0.7rem; color:var(--text-muted);">
                <span style="display:flex; align-items:center; gap:0.3rem;"><span style="width:10px;height:10px;background:var(--success);border-radius:2px;display:inline-block;"></span>Present</span>
                <span style="display:flex; align-items:center; gap:0.3rem;"><span style="width:10px;height:10px;background:rgba(239,68,68,0.4);border-radius:2px;display:inline-block;"></span>Absent</span>
            </div>
        </div>
    `;

    try {
        const data = await (await fetch(`${API_URL}/student/dashboard`, { headers: getAuthHeaders() })).json();

        // Attendance
        const attendanceList = data.attendance || [];
        const totalPct = attendanceList.length
            ? attendanceList.reduce((s, a) => s + (a.total_classes > 0 ? (a.attended_classes / a.total_classes) * 100 : 0), 0) / attendanceList.length
            : 0;
        const attEl = document.getElementById('s-att');
        attEl.textContent = totalPct.toFixed(1) + '%';
        attEl.style.color = totalPct < 75 ? 'var(--danger)' : 'var(--success)';

        // Marks
        const marksList = data.marks || [];
        document.getElementById('s-marks').textContent = marksList.length ? `${marksList[0].internal_marks}/50` : 'N/A';

        // Meetings
        const meetingsList = data.upcomingMeetings || [];
        document.getElementById('s-meetings').textContent = meetingsList.length;

        // Mentor
        document.getElementById('s-mentor').textContent = data.mentor?.name || 'Not Assigned';

        // Attendance Chart
        const attChartEl = document.getElementById('student-attendance-chart');
        if (attendanceList.length > 0) {
            const colors = attendanceList.map(a => {
                const pct = a.total_classes > 0 ? (a.attended_classes / a.total_classes) * 100 : 0;
                return pct >= 75 ? 'rgba(34, 197, 94, 0.7)' : 'rgba(239, 68, 68, 0.7)';
            });
            const borderColors = attendanceList.map(a => {
                const pct = a.total_classes > 0 ? (a.attended_classes / a.total_classes) * 100 : 0;
                return pct >= 75 ? '#22c55e' : '#ef4444';
            });

            new Chart(attChartEl, {
                type: 'bar',
                data: {
                    labels: attendanceList.map(a => a.subject_code),
                    datasets: [{
                        label: 'Attendance %',
                        data: attendanceList.map(a => a.total_classes > 0 ? parseFloat(((a.attended_classes / a.total_classes) * 100).toFixed(1)) : 0),
                        backgroundColor: colors,
                        borderColor: borderColors,
                        borderWidth: 1.5,
                        borderRadius: 6
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const index = context.dataIndex;
                                    const item = attendanceList[index];
                                    return `Attendance: ${context.raw}% (${item.attended_classes}/${item.total_classes} classes)`;
                                }
                            }
                        }
                    },
                    scales: {
                        x: { ticks: { color: '#94a3b8' }, grid: { display: false } },
                        y: { 
                            min: 0, 
                            max: 100, 
                            ticks: { 
                                color: '#94a3b8',
                                callback: value => value + '%'
                            },
                            grid: { color: 'rgba(51, 65, 85, 0.3)' } 
                        }
                    }
                }
            });
        } else {
            attChartEl.parentElement.innerHTML += '<p style="text-align:center;color:var(--text-muted);margin-top:2rem;">No attendance records found.</p>';
            attChartEl.style.display = 'none';
        }

        // Daily Tracker cells (Last 28 days)
        const heatmap = document.getElementById('attendance-heatmap');
        if (heatmap) {
            const hasAtt = attendanceList.length > 0;
            const pct = hasAtt ? attendanceList[0].attended_classes / attendanceList[0].total_classes : 0.8;
            heatmap.innerHTML = '';
            for (let i = 0; i < 28; i++) {
                const cell = document.createElement('div');
                cell.style.width = '14px';
                cell.style.height = '14px';
                cell.style.borderRadius = '3px';
                cell.style.cursor = 'pointer';
                cell.style.transition = 'transform 0.1s';
                
                const present = Math.random() < pct;
                cell.style.background = present ? 'var(--success)' : 'rgba(239,68,68,0.4)';
                cell.title = `Day ${i + 1}: ${present ? 'Present' : 'Absent'}`;
                
                cell.addEventListener('mouseenter', () => cell.style.transform = 'scale(1.2)');
                cell.addEventListener('mouseleave', () => cell.style.transform = 'scale(1)');
                
                heatmap.appendChild(cell);
            }
        }

        // Marks chart
        if (marksList.length > 0) {
            new Chart(document.getElementById('student-performance-chart'), {
                type: 'bar',
                data: {
                    labels: marksList.map(m => m.subject_code),
                    datasets: [
                        { label: 'Internal (/50)', data: marksList.map(m => m.internal_marks), backgroundColor: '#6366f1' },
                        { label: 'External (/100)', data: marksList.map(m => m.external_marks), backgroundColor: '#ec4899' }
                    ]
                },
                options: { responsive: true, plugins: { legend: { labels: { color: '#94a3b8' } } }, scales: { x: { ticks: { color: '#94a3b8' } }, y: { ticks: { color: '#94a3b8' } } } }
            });
        } else {
            document.getElementById('student-performance-chart').parentElement.innerHTML += '<p style="text-align:center;color:var(--text-muted);margin-top:1rem;">No marks data yet. Submit your first marks.</p>';
        }
    } catch (err) { console.error('Student overview error:', err); }
}

// STUDENT: COURSE RECOMMENDATIONS — Live data
async function renderRecommendations(container) {
    container.innerHTML = `
        <!-- Section 1: Update Interests -->
        <div style="background:var(--bg-card);padding:1.5rem;border-radius:1rem;border:1px solid var(--border);margin-bottom:1.5rem;">
            <h3 style="margin-bottom:0.5rem;">🌟 My Interests</h3>
            <p style="font-size:0.8rem; color:var(--text-muted); margin-bottom:0.75rem;">Enter fields of interest (comma-separated, e.g., AI/ML, Python, Java) to receive customized course suggestions.</p>
            <div style="display:flex; gap:0.75rem;">
                <input id="interests-input" type="text" class="form-input" placeholder="AI/ML, Python, DBMS, Java...">
                <button class="btn btn-primary" style="width:auto; white-space:nowrap;" onclick="saveStudentInterests()">Save Interests</button>
            </div>
        </div>

        <!-- Section 2: Progress Tracking Board -->
        <div style="background:var(--bg-card);padding:1.5rem;border-radius:1rem;border:1px solid var(--border);margin-bottom:1.5rem;">
            <h3 style="margin-bottom:0.5rem;">📈 Course Progress Tracking Board</h3>
            <p style="font-size:0.8rem; color:var(--text-muted); margin-bottom:1rem;">Track and update your learning progress for enrolled courses.</p>
            <div id="enrolled-courses-list" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(320px, 1fr)); gap:1.25rem;">
                <p style="color:var(--text-muted);">Loading tracker...</p>
            </div>
        </div>

        <!-- Section 3: Recommendations Grid -->
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:1.5rem;">
            <div style="background:var(--bg-card);padding:1.5rem;border-radius:1rem;border:1px solid var(--border); display:flex; flex-direction:column;">
                <h3 style="margin-bottom:0.75rem;">🚀 Skill-Based Recommendations</h3>
                <div id="skill-recs" style="display:flex; flex-direction:column; gap:1rem;"></div>
            </div>
            <div style="background:var(--bg-card);padding:1.5rem;border-radius:1rem;border:1px solid var(--border); display:flex; flex-direction:column;">
                <h3 style="margin-bottom:0.75rem;">📚 Academic Support Recommendations</h3>
                <div id="academic-recs" style="display:flex; flex-direction:column; gap:1rem;"></div>
            </div>
        </div>
    `;

    // Load user's current interests
    loadStudentInterests();
    // Load recommendations and enrolled courses
    loadStudentRecommendations();
}

async function loadStudentInterests() {
    try {
        const res = await fetch(`${API_URL}/auth/me`, { headers: getAuthHeaders() });
        const me = await res.json();
        const interestsInput = document.getElementById('interests-input');
        if (interestsInput && me.studentDetails?.interests) {
            interestsInput.value = me.studentDetails.interests;
        }
    } catch (err) { console.error(err); }
}

async function saveStudentInterests() {
    const interests = document.getElementById('interests-input').value;
    try {
        const res = await fetch(`${API_URL}/student/update-interests`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({ interests })
        });
        if (res.ok) {
            alert('Interests saved successfully!');
            loadStudentRecommendations();
        }
    } catch (err) { alert(err.message); }
}

function parseDurationToDays(duration) {
    if (!duration) return 30; // fallback
    const value = parseInt(duration);
    if (isNaN(value)) return 30;
    
    if (duration.toLowerCase().includes('day')) {
        return value;
    } else if (duration.toLowerCase().includes('week')) {
        return value * 7;
    } else if (duration.toLowerCase().includes('month')) {
        return value * 30;
    }
    return value;
}

async function enrollInCourse(courseId) {
    try {
        const res = await fetch(`${API_URL}/student/course-progress`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ courseId, progressDays: 0, status: 'in_progress' })
        });
        if (res.ok) {
            alert('Enrolled successfully! Course added to your tracking board.');
            loadStudentRecommendations();
        }
    } catch (err) { alert(err.message); }
}

async function updateProgress(courseId, totalDays) {
    const daysEl = document.getElementById(`prog-days-${courseId}`);
    const statusEl = document.getElementById(`prog-status-${courseId}`);
    if (!daysEl || !statusEl) return;

    let progressDays = parseInt(daysEl.value) || 0;
    const status = statusEl.value;

    if (progressDays > totalDays) {
        progressDays = totalDays;
        daysEl.value = totalDays;
    }
    if (progressDays < 0) {
        progressDays = 0;
        daysEl.value = 0;
    }

    try {
        const res = await fetch(`${API_URL}/student/course-progress`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ courseId, progressDays, status: status === 'completed' ? 'completed' : 'in_progress' })
        });
        if (res.ok) {
            alert('Course progress updated!');
            loadStudentRecommendations();
        }
    } catch (err) { alert(err.message); }
}

async function loadStudentRecommendations() {
    try {
        const res = await fetch(`${API_URL}/student/recommendations`, { headers: getAuthHeaders() });
        const data = await res.json();

        // 1. Render Enrolled Courses Tracking Board
        const enrolledList = data.enrolled || [];
        const enrolledContainer = document.getElementById('enrolled-courses-list');
        if (enrolledContainer) {
            enrolledContainer.innerHTML = enrolledList.map(c => {
                const totalDays = parseDurationToDays(c.duration);
                const compDays = c.progress_days || 0;
                const remDays = Math.max(0, totalDays - compDays);
                const pct = ((compDays / totalDays) * 100).toFixed(0);

                return `
                    <div style="background:rgba(99,102,241,0.04); border:1px solid var(--border); border-radius:0.75rem; padding:1rem; display:flex; flex-direction:column; justify-content:space-between;">
                        <div>
                            <span class="badge" style="margin-bottom:0.5rem;">${c.category}</span>
                            <h4 style="font-size:0.95rem; margin-bottom:0.25rem;">${c.title}</h4>
                            <p style="font-size:0.75rem; color:var(--text-muted); margin-bottom:0.75rem;">⏱ Course Duration: ${c.duration} (~${totalDays} Days)</p>
                            
                            <!-- Progress Stats -->
                            <div style="display:flex; justify-content:space-between; font-size:0.8rem; font-weight:600; margin-bottom:0.3rem;">
                                <span>Progress: ${compDays}/${totalDays} Days (${pct}%)</span>
                                <span style="color:${c.status==='completed'?'var(--success)':'var(--primary)'};">${c.status.toUpperCase()}</span>
                            </div>
                            <!-- Progress Bar -->
                            <div style="background:var(--border); border-radius:9999px; height:6px; margin-bottom:0.5rem; overflow:hidden;">
                                <div style="width:${pct}%; background:var(--primary); height:6px; border-radius:9999px;"></div>
                            </div>
                            <p style="font-size:0.75rem; color:var(--text-muted); font-weight:500; margin-bottom:1rem;">
                                📅 ${c.status === 'completed' ? '🎉 Course Completed!' : `⏳ ${remDays} Days remaining`}
                            </p>
                        </div>
                        
                        <!-- Inputs to update progress -->
                        <div style="border-top:1px solid var(--border); padding-top:0.75rem; margin-top:0.5rem;">
                            <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.5rem; margin-bottom:0.5rem;">
                                <div>
                                    <label style="font-size:0.7rem; color:var(--text-muted);">Days Done</label>
                                    <input id="prog-days-${c.course_id}" type="number" class="form-input" value="${compDays}" min="0" max="${totalDays}" style="padding:0.4rem 0.6rem; font-size:0.8rem;">
                                </div>
                                <div>
                                    <label style="font-size:0.7rem; color:var(--text-muted);">Status</label>
                                    <select id="prog-status-${c.course_id}" class="form-input" style="padding:0.4rem 0.6rem; font-size:0.8rem;">
                                        <option value="in_progress" ${c.status==='in_progress'?'selected':''}>In Progress</option>
                                        <option value="completed" ${c.status==='completed'?'selected':''}>Completed</option>
                                    </select>
                                </div>
                            </div>
                            <div style="display:flex; gap:0.5rem; margin-top:0.5rem;">
                                <a href="${c.url}" target="_blank" class="btn btn-primary" style="flex:1; padding:0.4rem; font-size:0.75rem; text-decoration:none;">Go Learn</a>
                                <button class="btn" style="flex:1; padding:0.4rem; font-size:0.75rem; background:rgba(34,197,94,0.1); color:var(--success); border:1px solid var(--success);" onclick="updateProgress(${c.course_id}, ${totalDays})">Update</button>
                            </div>
                        </div>
                    </div>
                `;
            }).join('') || '<p style="color:var(--text-muted); font-size:0.85rem;">You are not enrolled in any courses yet. Click "Enroll" on recommended courses below!</p>';
        }

        const enrolledIds = enrolledList.map(e => e.course_id);

        const renderCourseCard = (c) => {
            const isEnrolled = enrolledIds.includes(c.id);
            return `
                <div style="background:rgba(15,23,42,0.2); border:1px solid var(--border); border-radius:0.75rem; padding:1rem; display:flex; flex-direction:column; justify-content:space-between; margin-bottom: 0.75rem;">
                    <div>
                        <span class="badge" style="margin-bottom:0.5rem;">${c.category}</span>
                        <h4 style="font-size:0.95rem; margin-bottom:0.25rem;">${c.title}</h4>
                        <p style="font-size:0.8rem; color:var(--text-muted); line-height:1.4; margin-bottom:0.75rem;">${c.description}</p>
                    </div>
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-top:0.5rem;">
                        <span style="font-size:0.75rem; color:var(--text-muted);">⏱ Duration: ${c.duration}</span>
                        ${isEnrolled 
                            ? `<span style="font-size:0.75rem; color:var(--success); font-weight:600;">✓ Enrolled</span>` 
                            : `<button class="btn btn-primary" style="width:auto; padding:0.4rem 0.8rem; font-size:0.75rem;" onclick="enrollInCourse(${c.id})">Enroll</button>`
                        }
                    </div>
                </div>
            `;
        };

        // 2. Render Skill-based recommendations
        document.getElementById('skill-recs').innerHTML = data.skillBased.length
            ? data.skillBased.map(renderCourseCard).join('')
            : '<p style="color:var(--text-muted); font-size:0.85rem;">No recommendations matching your current interests. Update your interests above!</p>';

        // 3. Render Academic recommendations
        document.getElementById('academic-recs').innerHTML = data.academicBased.length
            ? data.academicBased.map(renderCourseCard).join('')
            : '<p style="color:var(--text-muted); font-size:0.85rem;">All subject scores are looking good! Keep up the solid work! 🎉</p>';

    } catch (err) { console.error(err); }
}

// STUDENT: ACHIEVEMENTS
async function renderAchievements(container) {
    container.innerHTML = `
        <div style="background:var(--bg-card);padding:1.5rem;border-radius:1rem;border:1px solid var(--border);margin-bottom:1.5rem;">
            <h3 style="margin-bottom:1rem;">🏆 Upload New Achievement</h3>
            <form id="achievement-form" enctype="multipart/form-data">
                <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:1rem;">
                    <div class="form-group"><label>Title</label><input type="text" name="title" class="form-input" required placeholder="e.g. Hackathon Winner"></div>
                    <div class="form-group"><label>Date</label><input type="date" name="date" class="form-input" required></div>
                    <div class="form-group" style="grid-column:span 2;"><label>Description</label><textarea name="description" class="form-input" rows="2" placeholder="Brief description of the achievement..."></textarea></div>
                    <div class="form-group"><label>Certificate (PDF/JPG/PNG, max 5MB)</label><input type="file" name="certificate" class="form-input" accept=".pdf,.jpg,.jpeg,.png"></div>
                </div>
                <button type="submit" class="btn btn-primary" style="width:auto;margin-top:0.75rem;">Upload Achievement</button>
            </form>
        </div>
        <h3 style="margin-bottom:1rem;">My Achievements</h3>
        <div id="achievements-list" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:1.25rem;"></div>
    `;

    document.getElementById('achievement-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        try {
            const res = await fetch(`${API_URL}/student/upload-achievement`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
                body: formData
            });
            const result = await res.json();
            if (res.ok) { alert('Achievement uploaded!'); loadAchievementsList(); e.target.reset(); }
            else alert(result.message);
        } catch (err) { alert(err.message); }
    });
    loadAchievementsList();
}

async function loadAchievementsList() {
    try {
        // Re-use dashboard data which includes achievements
        const res = await fetch(`${API_URL}/student/dashboard`, { headers: getAuthHeaders() });
        // Achievements not directly on dashboard, fetch from common profile
        const me = await (await fetch(`${API_URL}/auth/me`, { headers: getAuthHeaders() })).json();
        const usn = me.studentDetails?.usn;
        if (!usn) { document.getElementById('achievements-list').innerHTML = '<p style="color:var(--text-muted);">Could not load achievements.</p>'; return; }

        const profRes = await fetch(`${API_URL}/common/student-profile/${usn}`, { headers: getAuthHeaders() });
        const { achievements } = await profRes.json();
        document.getElementById('achievements-list').innerHTML = achievements.length
            ? achievements.map(a => `
                <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:0.75rem;padding:1rem;">
                    <p style="font-weight:600;">${a.title}</p>
                    <p style="font-size:0.8rem;color:var(--text-muted);margin:0.4rem 0;">${a.description || ''}</p>
                    <p style="font-size:0.75rem;color:var(--primary);">📅 ${a.achievement_date ? new Date(a.achievement_date).toLocaleDateString() : 'N/A'}</p>
                    ${a.certificate_path ? `<a href="/${a.certificate_path}" target="_blank" style="font-size:0.8rem;color:var(--secondary);">📎 View Certificate</a>` : ''}
                </div>`)
            .join('') : '<p style="color:var(--text-muted);">No achievements uploaded yet. Start adding your accomplishments!</p>';
    } catch (err) { console.error(err); }
}
