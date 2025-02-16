document.addEventListener('DOMContentLoaded', function() {
    const darkModeToggle = document.getElementById('darkModeToggle');
    const darkModeIcon = darkModeToggle && darkModeToggle.querySelector('.dark-mode-icon');
    const html = document.documentElement;
    
    // Check system preference and localStorage
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
    const storedTheme = localStorage.getItem('theme');
    
    // Function to update theme
    function updateTheme(isDark) {
        if (isDark) {
            html.classList.add('dark');
            if (darkModeIcon) darkModeIcon.textContent = 'dark_mode';
            localStorage.setItem('theme', 'dark');
        } else {
            html.classList.remove('dark');
            if (darkModeIcon) darkModeIcon.textContent = 'light_mode';
            localStorage.setItem('theme', 'light');
        }
        
        // Update meta theme color
        const metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (metaThemeColor) {
            metaThemeColor.setAttribute('content', isDark ? '#1e1e1e' : '#D81B60');
        }
    }
    
    // Initialize theme
    if (storedTheme) {
        updateTheme(storedTheme === 'dark');
    } else {
        updateTheme(prefersDark.matches);
    }
    
    // Toggle theme on button click
    if (darkModeToggle) darkModeToggle.addEventListener('click', () => {
        const isDark = !html.classList.contains('dark');
        updateTheme(isDark);
        
        // Add ripple effect
        const ripple = document.createElement('div');
        ripple.classList.add('ripple', 'bg-gray-500', 'opacity-20');
        darkModeToggle.appendChild(ripple);
        
        setTimeout(() => ripple.remove(), 600);
    });
    
    // Listen for system theme changes
    prefersDark.addEventListener('change', (e) => {
        if (!storedTheme) {
            updateTheme(e.matches);
        }
    });
    
    // Add smooth transition for theme changes
    const style = document.createElement('style');
    style.textContent = `
        * {
            transition-property: color, background-color, border-color, outline-color, text-decoration-color, fill, stroke;
            transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
            transition-duration: 200ms;
        }
    `;
    document.head.appendChild(style);
});
