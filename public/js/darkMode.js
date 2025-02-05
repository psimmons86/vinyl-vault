document.addEventListener('DOMContentLoaded', () => {
    // Get the dark mode toggle element
    const darkModeToggle = document.getElementById('darkModeToggle');
    
    // Check if user has a saved preference
    const darkMode = localStorage.getItem('darkMode') === 'enabled';
    
    // Function to enable dark mode
    const enableDarkMode = () => {
        document.body.classList.add('dark-mode');
        localStorage.setItem('darkMode', 'enabled');
        if (darkModeToggle) {
            darkModeToggle.checked = true;
        }
    };
    
    // Function to disable dark mode
    const disableDarkMode = () => {
        document.body.classList.remove('dark-mode');
        localStorage.setItem('darkMode', 'disabled');
        if (darkModeToggle) {
            darkModeToggle.checked = false;
        }
    };
    
    // Apply saved preference on load
    if (darkMode) {
        enableDarkMode();
    }
    
    // Listen for toggle changes
    if (darkModeToggle) {
        darkModeToggle.addEventListener('change', () => {
            if (darkModeToggle.checked) {
                enableDarkMode();
            } else {
                disableDarkMode();
            }
        });
    }
});

/* Dark mode styles */
body.dark-mode {
    background-color: #121212;
    color: #ffffff;
}

.dark-mode .card {
    background-color: #1e1e1e;
}

.dark-mode .navbar {
    background-color: #1e1e1e;
}

/* Add more dark mode styles as needed */ 