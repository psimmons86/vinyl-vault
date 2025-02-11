document.addEventListener('DOMContentLoaded', function() {
    // Initialize mobile menu
    const mobileMenuButton = document.querySelector('.sidenav-trigger');
    const sideNav = document.querySelector('.sidenav');
    
    if (mobileMenuButton && sideNav) {
        // Initialize Materialize sidenav
        const sideNavInstance = M.Sidenav.init(sideNav, {
            edge: 'left',
            draggable: true,
            preventScrolling: true,
            onOpenStart: function() {
                // Close any open dropdowns when sidenav opens
                const dropdowns = document.querySelectorAll('.dropdown-trigger');
                dropdowns.forEach(dropdown => {
                    if (dropdown.M_Dropdown) {
                        dropdown.M_Dropdown.close();
                    }
                });
            }
        });
        
        // Add active class to current page link
        const currentPath = window.location.pathname;
        const sideNavLinks = sideNav.querySelectorAll('a');
        sideNavLinks.forEach(link => {
            if (link.getAttribute('href') === currentPath) {
                link.classList.add('active');
            }
        });

        // Store instance for later use
        mobileMenuButton.M_Sidenav = sideNavInstance;
    }
});
