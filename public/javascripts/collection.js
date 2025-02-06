document.addEventListener('DOMContentLoaded', function() {
    // Initialize view from localStorage or default to 'grid'
    const currentView = localStorage.getItem('collectionView') || 'grid';
    setView(currentView);

    // Initialize Materialize components
    const elems = document.querySelectorAll('select, .dropdown-trigger');
    M.FormSelect.init(elems);
    M.Dropdown.init(document.querySelectorAll('.dropdown-trigger'), {
        constrainWidth: false,
        coverTrigger: false
    });

    // Initialize search functionality
    const searchInput = document.getElementById('recordSearch');
    if (searchInput) {
        searchInput.addEventListener('input', handleSearch);
        // Initialize Materialize input
        M.updateTextFields();
    }

    // Initialize active states for sort/view buttons
    initializeButtonStates();
});

function initializeButtonStates() {
    // Get current URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const currentSort = urlParams.get('sort');

    // Set active state for sort buttons
    const alphabeticalBtn = document.querySelector('.sort-btn:first-child');
    const recentBtn = document.querySelector('.sort-btn:last-child');

    if (currentSort === 'artist') {
        alphabeticalBtn?.classList.add('active');
        recentBtn?.classList.remove('active');
    } else if (currentSort === 'recent') {
        recentBtn?.classList.add('active');
        alphabeticalBtn?.classList.remove('active');
    }
}

function handleSearch(event) {
    const searchTerm = event.target.value.toLowerCase();
    const records = document.querySelectorAll('.record-card');

    records.forEach(record => {
        const title = record.querySelector('.card-title')?.textContent.toLowerCase() || '';
        const artist = record.querySelector('.artist')?.textContent.toLowerCase() || '';
        const isVisible = title.includes(searchTerm) || artist.includes(searchTerm);
        
        if (isVisible) {
            record.style.display = '';
            // Add a subtle animation
            record.style.opacity = '1';
            record.style.transform = 'scale(1)';
        } else {
            record.style.opacity = '0';
            record.style.transform = 'scale(0.95)';
            setTimeout(() => {
                if (!title.includes(searchTerm) && !artist.includes(searchTerm)) {
                    record.style.display = 'none';
                }
            }, 200);
        }
    });

    // Show/hide empty state
    const emptyState = document.querySelector('.empty-state');
    const visibleRecords = Array.from(records).filter(r => r.style.display !== 'none');
    
    if (emptyState) {
        if (visibleRecords.length === 0 && searchTerm) {
            emptyState.style.display = 'block';
            emptyState.querySelector('h4').textContent = 'No matches found';
            emptyState.querySelector('p').textContent = 'Try adjusting your search terms';
            emptyState.querySelector('a')?.style.display = 'none';
        } else {
            emptyState.style.display = records.length === 0 ? 'block' : 'none';
        }
    }
}

function toggleView(viewType) {
    setView(viewType);
    localStorage.setItem('collectionView', viewType);
}

function setView(viewType) {
    const recordsContainer = document.querySelector('.records-container');
    const gridBtn = document.querySelector('[data-view="grid"]');
    const listBtn = document.querySelector('[data-view="list"]');

    if (!recordsContainer || !gridBtn || !listBtn) return;

    if (viewType === 'grid') {
        recordsContainer.classList.remove('list-view');
        recordsContainer.classList.add('grid-view');
        gridBtn.classList.add('active');
        listBtn.classList.remove('active');
    } else {
        recordsContainer.classList.remove('grid-view');
        recordsContainer.classList.add('list-view');
        listBtn.classList.add('active');
        gridBtn.classList.remove('active');
    }

    // Add transition effect
    const records = document.querySelectorAll('.record-card');
    records.forEach((record, index) => {
        record.style.transitionDelay = `${index * 50}ms`;
        record.style.opacity = '1';
        record.style.transform = 'scale(1)';
    });
}

function sortAlphabetically() {
    window.location.href = '/records?sort=artist';
}

function sortByRecent() {
    window.location.href = '/records?sort=recent';
}

async function trackPlay(recordId) {
    try {
        const response = await fetch(`/records/${recordId}/play`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            // Update plays count in the UI
            const playsElement = document.querySelector(`[data-record-id="${recordId}"] .plays`);
            if (playsElement) {
                playsElement.textContent = `Plays: ${data.plays}`;
            }
            // Show success message
            M.toast({html: 'Play tracked successfully!', classes: 'green'});
        } else {
            throw new Error('Failed to track play');
        }
    } catch (error) {
        console.error('Error tracking play:', error);
        M.toast({html: 'Failed to track play', classes: 'red'});
    }
}
