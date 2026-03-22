const hostname = window.location.hostname || 'localhost';
const API_URL = `http://${hostname}:8000`;
// --- UI State Management (Login Page) ---
function switchAuthMode(mode) {
    console.log(`switchAuthMode called with: ${mode}`);
    console.trace();
    const loginSection = document.getElementById('loginSection');
    const registerSection = document.getElementById('registerSection');
    const twoFASection = document.getElementById('twoFASection');
    const setup2FASection = document.getElementById('setup2FASection');
    const tabLogin = document.getElementById('tabLogin');
    const tabRegister = document.getElementById('tabRegister');
    const authTitle = document.getElementById('authTitle');
    const authSubtitle = document.getElementById('authSubtitle');

    if (!loginSection || !registerSection) return;

    // Reset visibility
    [loginSection, registerSection, twoFASection, setup2FASection].forEach(s => s.classList.remove('active'));
    [tabLogin, tabRegister].forEach(t => t.classList.remove('active'));

    if (mode === 'login') {
        loginSection.classList.add('active');
        tabLogin.classList.add('active');
        authTitle.textContent = "Welcome Back";
        authSubtitle.textContent = "Enter your credentials to access BlockCert";
    } else if (mode === 'register') {
        registerSection.classList.add('active');
        tabRegister.classList.add('active');
        authTitle.textContent = "Create Account";
        authSubtitle.textContent = "Join the future of certificate verification";
    } else if (mode === '2fa') {
        twoFASection.classList.add('active');
        authTitle.textContent = "Identity Verification";
        authSubtitle.textContent = "Step 2: Enter your security code";
    } else if (mode === '2fa-setup') {
        setup2FASection.classList.add('active');
        authTitle.textContent = "Secure Your Identity";
        authSubtitle.textContent = "Enable Two-Factor Authentication";
    }
}

function setRole(role) {
    const regRole = document.getElementById('regRole');
    const instFields = document.getElementById('institutionFields');
    const studentFields = document.getElementById('studentFields');
    const btnInst = document.getElementById('btnRoleInstitution');
    const btnStu = document.getElementById('btnRoleStudent');

    if (!regRole) return;

    regRole.value = role;
    btnInst.classList.toggle('active', role === 'institution');
    btnStu.classList.toggle('active', role === 'student');

    instFields.style.display = role === 'institution' ? 'block' : 'none';
    studentFields.style.display = role === 'student' ? 'block' : 'none';

    // Toggle required attributes
    instFields.querySelectorAll('input').forEach(i => i.required = (role === 'institution'));
    studentFields.querySelectorAll('input').forEach(i => i.required = (role === 'student'));
}

// --- Authentication Logic ---
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const twoFAForm = document.getElementById('twoFAForm');

    // 1. Handle Login (Step 1)
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            const errorEl = document.getElementById('loginError');

            try {
                const response = await fetch(`${API_URL}/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });

                const data = await response.json();

                if (response.ok && data['2fa_required']) {
                    // Transition to 2FA screen
                    sessionStorage.setItem('pending_email', data.email);
                    switchAuthMode('2fa');
                } else {
                    errorEl.textContent = data.detail || 'Login failed';
                    errorEl.style.display = 'block';
                }
            } catch (err) {
                errorEl.textContent = 'Connection error. Is the backend running?';
                errorEl.style.display = 'block';
            }
        });
    }

    // 2. Handle 2FA Verification (Step 2)
    if (twoFAForm) {
        twoFAForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = sessionStorage.getItem('pending_email');
            const otp = document.getElementById('otpCode').value;
            const errorEl = document.getElementById('otpError');

            try {
                const response = await fetch(`${API_URL}/auth/verify-2fa`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, otp })
                });

                const data = await response.json();

                if (response.ok) {
                    localStorage.setItem('access_token', data.access_token);
                    localStorage.setItem('user_role', data.role);
                    localStorage.setItem('user_name', data.username);
                    localStorage.setItem('user_email', data.email);
                    sessionStorage.removeItem('pending_email');
                    window.location.href = 'dashboard.html';
                } else {
                    errorEl.textContent = data.detail || 'Invalid code';
                    errorEl.style.display = 'block';
                }
            } catch (err) {
                errorEl.textContent = 'Verification error';
                errorEl.style.display = 'block';
            }
        });
    }

    // 3. Handle Registration
    const regSubmitBtn = document.getElementById('regSubmitBtn');
    if (registerForm) {
        // Prevent default submission to stop reloads
        registerForm.addEventListener('submit', (e) => e.preventDefault());

        const handleRegistration = async () => {
            console.log("Registration handle triggered.");

            // Validate form manually
            if (!registerForm.checkValidity()) {
                registerForm.reportValidity();
                return;
            }

            const role = document.getElementById('regRole').value;
            const email = document.getElementById('regEmail').value;
            const password = document.getElementById('regPassword').value;
            const name = role === 'institution' ? document.getElementById('instName').value : document.getElementById('stuName').value;
            const reg_id = document.getElementById('regId').value;
            const student_id = document.getElementById('stuId').value;
            const errorEl = document.getElementById('regError');

            if (errorEl) errorEl.style.display = 'none';

            const payload = { email, password, name, role, reg_id, student_id };
            console.log("Registration Payload:", payload);

            try {
                const response = await fetch(`${API_URL}/auth/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                const data = await response.json();
                console.log("Registration Response:", data);

                if (response.ok) {
                    console.log("Registration success. Switching to 2FA Setup.");

                    // Persist for reloads (Important for Live Server)
                    sessionStorage.setItem('pending_reg_qr', data.provisioning_uri);
                    sessionStorage.setItem('pending_reg_secret', data.totp_secret);

                    showSetupQR(data.provisioning_uri, data.totp_secret);
                } else {
                    console.error("Registration failed:", data.detail);
                    if (errorEl) {
                        errorEl.textContent = data.detail || 'Registration failed';
                        errorEl.style.display = 'block';
                    }
                }
            } catch (err) {
                console.error("Registration error:", err);
                if (errorEl) {
                    errorEl.textContent = 'Registration error. Check console for details.';
                    errorEl.style.display = 'block';
                }
            }
        };

        // Trigger on button click or form submit
        if (regSubmitBtn) regSubmitBtn.addEventListener('click', handleRegistration);
        registerForm.addEventListener('submit', (e) => {
            e.preventDefault();
            handleRegistration();
        });
    }

    // --- Check for persisted QR setup (in case of reload) ---
    const savedQR = sessionStorage.getItem('pending_reg_qr');
    const savedSecret = sessionStorage.getItem('pending_reg_secret');
    if (savedQR && savedSecret) {
        console.log("Found persisted 2FA setup. Restoring...");
        // Use a small delay to ensure DOM is ready and other scripts didn't reset it
        setTimeout(() => {
            if (sessionStorage.getItem('pending_reg_qr')) { // Re-check
                showSetupQR(savedQR, savedSecret);
            }
        }, 100);
    }

    initNavbar();
});

function showSetupQR(uri, secret) {
    switchAuthMode('2fa-setup');
    const qrContainer = document.getElementById('qrCodeContainer');
    if (qrContainer) {
        qrContainer.innerHTML = "";
        new QRCode(qrContainer, {
            text: uri,
            width: 200,
            height: 200
        });
        console.log("QR Code rendered in setup screen.");
    }
    const manualEl = document.getElementById('manualSecret');
    if (manualEl) manualEl.textContent = secret;
}

function clearPendingReg() {
    sessionStorage.removeItem('pending_reg_qr');
    sessionStorage.removeItem('pending_reg_secret');
    switchAuthMode('login');
}

// --- Auth Utilities ---
function requireAuth() {
    const token = localStorage.getItem('access_token');
    if (!token) {
        window.location.href = 'login.html';
    }
}

function logout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_role');
    localStorage.removeItem('user_name');
    localStorage.removeItem('user_email');
    window.location.href = 'index.html';
}

// Global Navbar Management
function initNavbar() {
    const nav = document.querySelector('.navbar');
    if (!nav) return;

    const token = localStorage.getItem('access_token');
    const role = localStorage.getItem('user_role');
    const currentTheme = document.body.getAttribute('data-theme') || 'light';
    const themeIcon = currentTheme === 'dark' ? '☀️' : '🌙';

    let navLinks = `
        <a href="index.html">Home</a>
        <a href="verify.html">Verify</a>
    `;

    if (token) {
        if (role === 'institution') {
            navLinks += `<a href="issue.html">Issue</a>`;
        }
        navLinks += `<a href="dashboard.html">Dashboard</a>`;
    }

    const authHtml = token
        ? `<button onclick="logout()" class="btn btn-outline" style="margin-left: 10px; padding: 5px 15px;">Logout</button>`
        : `<a href="login.html" class="btn btn-outline" style="margin-left: 10px; padding: 5px 15px;">Sign In</a>`;

    nav.innerHTML = `
        <div class="logo">BlockCert</div>
        <div class="nav-links">
            ${navLinks}
            ${authHtml}
            <button id="themeToggle" class="theme-toggle" style="margin-left: 10px;" onclick="toggleTheme()">${themeIcon}</button>
        </div>
    `;
}
