const body = document.body;

function updateThemeUI(theme) {
    const toggleBtns = document.querySelectorAll('#themeToggle');
    toggleBtns.forEach(btn => {
        btn.textContent = theme === 'dark' ? '☀️' : '🌙';
    });
}

function applyTheme(theme) {
    body.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    updateThemeUI(theme);
}

function toggleTheme() {
    const current = body.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
}

// Initial Load
const savedTheme = localStorage.getItem('theme') || 'light';
applyTheme(savedTheme);

// Also attach to existing button if any (for non-dynamic pages)
document.addEventListener('DOMContentLoaded', () => {
    const initialBtn = document.getElementById('themeToggle');
    if (initialBtn) {
        initialBtn.addEventListener('click', toggleTheme);
    }
});
