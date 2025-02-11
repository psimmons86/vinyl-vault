document.addEventListener('DOMContentLoaded', function() {
    // Initialize mobile menu
    const mobileMenuButton = document.querySelector('.sidenav-trigger');
    const sideNav = document.querySelector('.sidenav');
    
    if (mobileMenuButton && sideNav) {
        // Initialize Materialize sidenav with enhanced options
        const sideNavInstance = M.Sidenav.init(sideNav, {
            edge: 'left',
            draggable: true,
            preventScrolling: true,
            inDuration: 250,
            outDuration: 200,
            onOpenStart: function() {
                // Close any open dropdowns when sidenav opens
                const dropdowns = document.querySelectorAll('.dropdown-trigger');
                dropdowns.forEach(dropdown => {
                    if (dropdown.M_Dropdown) {
                        dropdown.M_Dropdown.close();
                    }
                });
                
                // Add opening animation
                sideNav.style.transition = 'transform 250ms cubic-bezier(0.4, 0, 0.2, 1)';
                mobileMenuButton.classList.add('active');
            },
            onCloseStart: function() {
                // Add closing animation
                sideNav.style.transition = 'transform 200ms cubic-bezier(0.4, 0, 0.2, 1)';
                mobileMenuButton.classList.remove('active');
            }
        });
        
        // Add active class to current page link and its parent
        const currentPath = window.location.pathname;
        const sideNavLinks = sideNav.querySelectorAll('a');
        sideNavLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (href === currentPath || currentPath.startsWith(href + '/')) {
                link.classList.add('active');
                // Add active state to parent list item for better visual feedback
                const parentLi = link.closest('li');
                if (parentLi) {
                    parentLi.classList.add('active');
                }
            }
        });

        // Add touch ripple effect to menu items
        sideNavLinks.forEach(link => {
            link.classList.add('waves-effect');
        });

        // Store instance for later use
        mobileMenuButton.M_Sidenav = sideNavInstance;
    }
});
