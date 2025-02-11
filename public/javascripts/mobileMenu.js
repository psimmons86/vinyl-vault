document.addEventListener('DOMContentLoaded', function() {
    // Elements
    const menuButton = document.getElementById('menuButton');
    const menuDrawer = document.getElementById('menuDrawer');
    const menuOverlay = document.getElementById('menuOverlay');
    const navItems = document.querySelectorAll('.nav-item');
    
    // Set active nav item based on current path
    const currentPath = window.location.pathname;
    navItems.forEach(item => {
        const href = item.getAttribute('href');
        if (href === currentPath || currentPath.startsWith(href + '/')) {
            item.classList.add('active');
        }
    });

    // Menu drawer functionality
    if (menuButton && menuDrawer) {
        // Open menu
        menuButton.addEventListener('click', () => {
            menuDrawer.classList.remove('-translate-x-full');
            document.body.style.overflow = 'hidden'; // Prevent background scrolling
        });

        // Close menu
        const closeMenu = () => {
            menuDrawer.classList.add('-translate-x-full');
            document.body.style.overflow = '';
        };

        menuOverlay.addEventListener('click', closeMenu);

        // Handle escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !menuDrawer.classList.contains('-translate-x-full')) {
                closeMenu();
            }
        });

        // Touch gestures
        const hammer = new Hammer(menuDrawer);
        
        // Swipe to close
        hammer.on('swipeleft', closeMenu);

        // Pan gesture for smoother drawer movement
        let isDragging = false;
        let startX = 0;
        let currentX = 0;

        hammer.on('panstart', (e) => {
            isDragging = true;
            startX = e.center.x;
            menuDrawer.style.transition = 'none';
        });

        hammer.on('panmove', (e) => {
            if (!isDragging) return;
            
            currentX = Math.min(0, e.center.x - startX);
            menuDrawer.style.transform = `translateX(${currentX}px)`;
            
            // Adjust overlay opacity based on drawer position
            const progress = Math.abs(currentX) / menuDrawer.offsetWidth;
            menuOverlay.style.opacity = 1 - progress;
        });

        hammer.on('panend', (e) => {
            isDragging = false;
            menuDrawer.style.transition = 'transform 300ms ease-in-out';
            
            if (Math.abs(currentX) > menuDrawer.offsetWidth * 0.3) {
                closeMenu();
            } else {
                menuDrawer.style.transform = '';
                menuOverlay.style.opacity = '';
            }
        });
    }

    // Bottom navigation active states and ripple effect
    navItems.forEach(item => {
        // Add ripple effect
        item.addEventListener('click', function(e) {
            const ripple = document.createElement('div');
            ripple.classList.add('ripple');
            
            const rect = item.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            
            ripple.style.width = ripple.style.height = `${size}px`;
            ripple.style.left = `${e.clientX - rect.left - size/2}px`;
            ripple.style.top = `${e.clientY - rect.top - size/2}px`;
            
            item.appendChild(ripple);
            
            setTimeout(() => ripple.remove(), 600);
        });
    });

    // Handle iOS safe areas
    function updateSafeAreas() {
        const safeTop = getComputedStyle(document.documentElement).getPropertyValue('--sat') || '0px';
        const safeBottom = getComputedStyle(document.documentElement).getPropertyValue('--sab') || '0px';
        
        document.documentElement.style.setProperty('--safe-top', safeTop);
        document.documentElement.style.setProperty('--safe-bottom', safeBottom);
    }

    // Update safe areas on orientation change
    window.addEventListener('orientationchange', updateSafeAreas);
    updateSafeAreas();
});
