document.addEventListener('DOMContentLoaded', function() {
    // Initialize progress bars
    const progressBars = document.querySelectorAll('[data-width]');
    progressBars.forEach(bar => {
        const width = bar.getAttribute('data-width');
        if (width) {
            bar.style.width = width + '%';
        }
    });
});
