async function trackPlay(recordId) {
    let response;
    try {
        response = await fetch(`/records/${recordId}/play`, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'csrf-token': window.csrfToken
            }
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Failed to track play');
        }
        
        // Update plays count in the UI
        const playsElement = document.querySelector('.record-plays');
        if (playsElement) {
            playsElement.textContent = `Plays: ${data.plays}`;
        }
        
        // Update last played date
        const lastPlayedElement = document.querySelector('.record-last-played');
        if (lastPlayedElement) {
            const date = new Date().toLocaleDateString();
            lastPlayedElement.textContent = `Last played: ${date}`;
        }
        
        // Show success message
        showToast(data.message || 'Play tracked successfully!', 'success');
    } catch (error) {
        console.error('Error tracking play:', error);
        if (response) {
            console.error('Response status:', response.status);
            const text = await response.text().catch(() => 'No response body');
            console.error('Response body:', text);
        }
        
        // Show error message
        showToast(error.message || 'Failed to track play', 'error');
    }
}

// Custom toast function
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `fixed bottom-4 left-1/2 transform -translate-x-1/2 px-4 py-2 rounded-lg text-white z-50 ${
        type === 'success' ? 'bg-primary' : 'bg-red-500'
    }`;
    toast.textContent = message;
    document.body.appendChild(toast);

    // Remove toast after 3 seconds
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 300ms ease-in-out';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}
