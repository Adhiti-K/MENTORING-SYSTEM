const API_URL = 'http://localhost:5000/api';

// ─── TOGGLE FORMS ─────────────────────────────────────
function toggleAuth() {
    const loginCard = document.getElementById('login-card');
    const registerCard = document.getElementById('register-card');
    const isLoginVisible = loginCard.style.display !== 'none';
    loginCard.style.display = isLoginVisible ? 'none' : 'block';
    registerCard.style.display = isLoginVisible ? 'block' : 'none';
}

// ─── LOGIN TYPE CHANGE ────────────────────────────────
document.getElementById('login-type')?.addEventListener('change', (e) => {
    document.getElementById('email-group').style.display = e.target.value === 'usn' ? 'none' : 'block';
    document.getElementById('usn-group').style.display = e.target.value === 'usn' ? 'block' : 'none';
});

// ─── ROLE CHANGE (Registration) ───────────────────────
function handleRoleChange() {
    const role = document.getElementById('reg-role').value;
    document.getElementById('student-fields').style.display = role === 'student' ? 'block' : 'none';
}

// ─── SHOW ERROR / SUCCESS ─────────────────────────────
function showFormMsg(id, message, isError = true) {
    let el = document.getElementById(id);
    if (!el) {
        el = document.createElement('div');
        el.id = id;
        el.style.cssText = `padding:0.75rem 1rem;border-radius:0.75rem;margin-bottom:1rem;font-size:0.875rem;font-weight:600;`;
        const form = document.querySelector(`#${id.includes('reg') ? 'register' : 'login'}-form`);
        if (form) form.prepend(el);
    }
    el.style.background = isError ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)';
    el.style.color = isError ? '#ef4444' : '#22c55e';
    el.style.border = `1px solid ${isError ? '#ef4444' : '#22c55e'}`;
    el.textContent = message;
    el.style.display = 'block';
}

// ─── REGISTRATION ─────────────────────────────────────
document.getElementById('register-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const role = document.getElementById('reg-role').value;
    const name = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const dept = document.getElementById('reg-dept').value.trim();
    const password = document.getElementById('reg-password').value;
    const usn = document.getElementById('reg-usn')?.value.trim() || '';
    const year_semester = document.getElementById('reg-year')?.value.trim() || '';

    // ── Client-side validation ──
    if (!name) return showFormMsg('reg-msg', 'Full name is required.');
    if (!email || !email.includes('@')) return showFormMsg('reg-msg', 'Enter a valid email address.');
    if (!dept) return showFormMsg('reg-msg', 'Department is required.');
    if (!password || password.length < 6) return showFormMsg('reg-msg', 'Password must be at least 6 characters.');
    if (role === 'student') {
        if (!usn) return showFormMsg('reg-msg', 'USN is required for students.');
        if (!year_semester) return showFormMsg('reg-msg', 'Year/Semester is required for students.');
    }

    const data = { role, name, email, department: dept, password, usn, year_semester };

    // ── Show loading state ──
    const btn = e.target.querySelector('button[type="submit"]');
    btn.textContent = 'Registering...';
    btn.disabled = true;

    try {
        const res = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await res.json();

        if (res.ok) {
            showFormMsg('reg-msg', result.message, false);
            setTimeout(toggleAuth, 2000);
        } else {
            showFormMsg('reg-msg', result.error || result.message || 'Registration failed. Check all fields.');
        }
    } catch (err) {
        if (err.message.includes('fetch')) {
            showFormMsg('reg-msg', '❌ Cannot connect to server. Make sure the server is running on port 5000.');
        } else {
            showFormMsg('reg-msg', 'Error: ' + err.message);
        }
    } finally {
        btn.textContent = 'Register';
        btn.disabled = false;
    }
});

// ─── LOGIN ────────────────────────────────────────────
document.getElementById('login-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const loginType = document.getElementById('login-type').value;
    const password = document.getElementById('login-password').value;

    if (!password) return showFormMsg('login-msg', 'Password is required.');

    const data = { password };
    if (loginType === 'email') {
        const email = document.getElementById('login-email').value.trim();
        if (!email) return showFormMsg('login-msg', 'Email is required.');
        data.email = email;
    } else {
        const usn = document.getElementById('login-usn').value.trim();
        if (!usn) return showFormMsg('login-msg', 'USN is required.');
        data.usn = usn;
    }

    const btn = e.target.querySelector('button[type="submit"]');
    btn.textContent = 'Logging in...';
    btn.disabled = true;

    try {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await res.json();

        if (res.ok) {
            localStorage.setItem('token', result.token);
            localStorage.setItem('user', JSON.stringify(result.user));
            window.location.href = 'dashboard.html';
        } else {
            showFormMsg('login-msg', result.message || 'Login failed.');
        }
    } catch (err) {
        if (err.message.includes('fetch')) {
            showFormMsg('login-msg', '❌ Cannot connect to server. Make sure "npm start" is running.');
        } else {
            showFormMsg('login-msg', 'Error: ' + err.message);
        }
    } finally {
        btn.textContent = 'Login';
        btn.disabled = false;
    }
});

// ─── GLOBAL HELPERS ───────────────────────────────────
function getAuthHeaders() {
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
    };
}

function logout() {
    localStorage.clear();
    window.location.href = 'index.html';
}
