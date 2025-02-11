document.addEventListener('DOMContentLoaded', () => {
    // Initialize Materialize Components first
    if (typeof M !== 'undefined') {
        // Initialize dropdowns
        const dropdowns = document.querySelectorAll('.dropdown-trigger');
        dropdowns.forEach(dropdown => {
            const instance = M.Dropdown.init(dropdown, {
                constrainWidth: false,
                coverTrigger: true,
                alignment: dropdown.classList.contains('add-record') ? 'left' : 'right',
                container: document.body,
                hover: false,
                closeOnClick: true,
                inDuration: 150,
                outDuration: 150,
                onOpenStart: function() {
                    const content = document.getElementById(dropdown.getAttribute('data-target'));
                    if (content) {
                        const rect = dropdown.getBoundingClientRect();
                        const contentHeight = content.offsetHeight;
                        content.style.position = 'fixed';
                        content.style.top = (rect.top - contentHeight) + 'px';
                        content.style.left = dropdown.classList.contains('add-record') ? 
                            (rect.left + window.scrollX) + 'px' : 
                            (rect.right + window.scrollX - content.offsetWidth) + 'px';
                    }
                }
            });

            // Store instance for later use
            dropdown.M_Dropdown = instance;
        });

        // Initialize sidenav
        const sidenav = document.querySelectorAll('.sidenav');
        M.Sidenav.init(sidenav, {
            edge: 'left',
            draggable: true
        });
    }

    // Dark Mode Functionality
    const darkModeToggle = document.getElementById('darkModeToggle');
    const darkModeToggleMobile = document.getElementById('darkModeToggle-mobile');
    const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');
    
    // Function to enable dark mode
    const enableDarkMode = () => {
        document.body.classList.add('dark-mode');
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
        if (darkModeToggle) {
            darkModeToggle.checked = true;
            M.updateTextFields(); // Update any Materialize text fields
        }
        if (darkModeToggleMobile) {
            darkModeToggleMobile.checked = true;
        }
    };

    // Function to disable dark mode
    const disableDarkMode = () => {
        document.body.classList.remove('dark-mode');
        document.documentElement.setAttribute('data-theme', 'light');
        localStorage.setItem('theme', 'light');
        if (darkModeToggle) {
            darkModeToggle.checked = false;
            M.updateTextFields(); // Update any Materialize text fields
        }
        if (darkModeToggleMobile) {
            darkModeToggleMobile.checked = false;
        }
    };

    // Check for saved theme preference or use system preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        enableDarkMode();
    } else if (savedTheme === 'light') {
        disableDarkMode();
    } else if (prefersDarkScheme.matches) {
        enableDarkMode();
    }

    // Listen for toggle changes
    [darkModeToggle, darkModeToggleMobile].forEach(toggle => {
        if (toggle) {
            toggle.addEventListener('change', () => {
                if (toggle.checked) {
                    enableDarkMode();
                } else {
                    disableDarkMode();
                }
            });
        }
    });

    // Listen for system theme changes
    prefersDarkScheme.addEventListener('change', (e) => {
        if (!localStorage.getItem('theme')) {
            if (e.matches) {
                enableDarkMode();
            } else {
                disableDarkMode();
            }
        }
    });

    // Social Sharing Functionality
    window.shareToSocial = (platform, data) => {
        const urls = {
            twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(data.text)}&url=${encodeURIComponent(data.url)}`,
            facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(data.url)}`,
            linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(data.url)}`
        };

        const width = 600;
        const height = 400;
        const left = (window.innerWidth - width) / 2;
        const top = (window.innerHeight - height) / 2;

        window.open(
            urls[platform],
            'share',
            `width=${width},height=${height},left=${left},top=${top}`
        );
    };
});
