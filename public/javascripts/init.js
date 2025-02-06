document.addEventListener('DOMContentLoaded', function() {
    // Initialize all dropdowns
    var dropdowns = document.querySelectorAll('.dropdown-trigger');
    M.Dropdown.init(dropdowns, {
        constrainWidth: false,
        coverTrigger: false
    });

    // Initialize mobile sidenav
    var sidenavs = document.querySelectorAll('.sidenav');
    M.Sidenav.init(sidenavs);
}); 