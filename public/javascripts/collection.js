document.addEventListener('DOMContentLoaded', function() {
    // Only run on collection page
    if (!document.querySelector('.records-container')) return;
    
    // Initialize Materialize components
    M.FormSelect.init(document.querySelectorAll('select'));
    M.Tooltip.init(document.querySelectorAll('.tooltipped'));

    // Initialize floating action button
    const fab = document.querySelector('.fixed-action-btn');
    if (fab) {
        M.FloatingActionButton.init(fab, {
            direction: 'top',
            hoverEnabled: false,
            toolbarEnabled: false
        });
    }

    // Initialize search functionality
    const searchInput = document.getElementById('recordSearch');
    if (searchInput) {
        searchInput.addEventListener('input', handleSearch);
        // Initialize Materialize input
        M.updateTextFields();
    }

    // Initialize sort buttons
    const sortAlphabeticalBtn = document.getElementById('sortAlphabeticalBtn');
    const sortRecentBtn = document.getElementById('sortRecentBtn');
    if (sortAlphabeticalBtn) {
        sortAlphabeticalBtn.addEventListener('click', () => {
            window.location.href = '/records?sort=artist';
        });
    }
    if (sortRecentBtn) {
        sortRecentBtn.addEventListener('click', () => {
            window.location.href = '/records?sort=recent';
        });
    }

    // Initialize view buttons
    const gridViewBtn = document.getElementById('gridViewBtn');
    const listViewBtn = document.getElementById('listViewBtn');
    if (gridViewBtn) {
        gridViewBtn.addEventListener('click', function() {
            console.log('Grid view clicked');
            toggleView('grid');
        });
    }
    if (listViewBtn) {
        listViewBtn.addEventListener('click', function() {
            console.log('List view clicked');
            toggleView('list');
        });
    }

    // Initialize active states for sort/view buttons
    initializeButtonStates();

    // Initialize view state
    const savedView = localStorage.getItem('recordsView') || 'grid';
    toggleView(savedView);

    // Debug log
    console.log('DOM Content Loaded, components initialized');
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
        const parentCol = record.closest('.col');
        
        if (isVisible) {
            parentCol.style.display = '';
            // Add a subtle animation
            parentCol.style.opacity = '1';
            parentCol.style.transform = 'scale(1)';
        } else {
            parentCol.style.opacity = '0';
            parentCol.style.transform = 'scale(0.95)';
            setTimeout(() => {
                if (!title.includes(searchTerm) && !artist.includes(searchTerm)) {
                    parentCol.style.display = 'none';
                }
            }, 200);
        }
    });

    // Show/hide empty state
    const emptyState = document.querySelector('.empty-state');
    const visibleRecords = Array.from(records).filter(r => r.closest('.col').style.display !== 'none');
    
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
    console.log('toggleView called with:', viewType);
    
    const container = document.querySelector('.records-container');
    const gridBtn = document.getElementById('gridViewBtn');
    const listBtn = document.getElementById('listViewBtn');
    
    if (!container || !gridBtn || !listBtn) {
        console.error('Required elements not found:', {
            container: !!container,
            gridBtn: !!gridBtn,
            listBtn: !!listBtn
        });
        return;
    }

    console.log('Updating view to:', viewType);

    // Update container class
    container.classList.remove('grid-view', 'list-view');
    container.classList.add(`${viewType}-view`);

    // Update button states
    gridBtn.classList.remove('active');
    listBtn.classList.remove('active');
    if (viewType === 'grid') {
        gridBtn.classList.add('active');
    } else {
        listBtn.classList.add('active');
    }

    // Save preference
    localStorage.setItem('recordsView', viewType);

    const recordColumns = document.querySelectorAll('.records-container .col');
    
    if (viewType === 'list') {
        recordColumns.forEach(col => {
            col.classList.remove('s12', 'm6', 'l3');
            col.classList.add('s12');
            
            const card = col.querySelector('.card');
            if (card) {
                card.style.display = 'flex';
                card.style.flexDirection = 'row';
                card.style.height = '150px';
                
                const imageDiv = card.querySelector('.card-image');
                if (imageDiv) {
                    imageDiv.style.width = '150px';
                    imageDiv.style.flexShrink = '0';
                    imageDiv.style.paddingTop = '0';
                    imageDiv.style.height = '100%';
                }
                
                const contentDiv = card.querySelector('.card-content');
                if (contentDiv) {
                    contentDiv.style.flexGrow = '1';
                    contentDiv.style.display = 'flex';
                    contentDiv.style.flexDirection = 'column';
                    contentDiv.style.justifyContent = 'center';
                }
                
                const actionDiv = card.querySelector('.card-action');
                if (actionDiv) {
                    actionDiv.style.width = '150px';
                    actionDiv.style.borderLeft = '1px solid rgba(0,0,0,0.1)';
                    actionDiv.style.borderTop = 'none';
                    actionDiv.style.display = 'flex';
                    actionDiv.style.alignItems = 'center';
                }
            }
        });
    } else {
        recordColumns.forEach(col => {
            col.classList.remove('s12');
            col.classList.add('s12', 'm6', 'l3');
            
            const card = col.querySelector('.card');
            if (card) {
                card.style.display = '';
                card.style.flexDirection = '';
                card.style.height = '';
                
                const imageDiv = card.querySelector('.card-image');
                if (imageDiv) {
                    imageDiv.style.width = '';
                    imageDiv.style.flexShrink = '';
                    imageDiv.style.paddingTop = '100%';
                    imageDiv.style.height = '';
                }
                
                const contentDiv = card.querySelector('.card-content');
                if (contentDiv) {
                    contentDiv.style.flexGrow = '';
                    contentDiv.style.display = '';
                    contentDiv.style.flexDirection = '';
                    contentDiv.style.justifyContent = '';
                }
                
                const actionDiv = card.querySelector('.card-action');
                if (actionDiv) {
                    actionDiv.style.width = '';
                    actionDiv.style.borderLeft = '';
                    actionDiv.style.borderTop = '1px solid rgba(0,0,0,0.1)';
                    actionDiv.style.display = '';
                    actionDiv.style.alignItems = '';
                }
            }
        });
    }

    console.log('View updated successfully');
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
