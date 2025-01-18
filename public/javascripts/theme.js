document.addEventListener('DOMContentLoaded', function() {
    const themeToggle = document.querySelector('input[name="darkMode"]');
    if (themeToggle) {
        themeToggle.addEventListener('change', function() {
            document.documentElement.setAttribute('data-theme', 
                this.checked ? 'dark' : 'light'
            );
        });
    }
});