async function trackPlay(recordId) {
    try {
        const response = await fetch(`/records/${recordId}/play`, {
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
        
        // Show success message with the server's message
        M.toast({
            html: data.message || 'Play tracked successfully!',
            classes: 'rounded bg-primary text-white',
            displayLength: 2000
        });
    } catch (error) {
        console.error('Error tracking play:', error);
console.error('Response status:', response.status);
console.error('Response body:', await response.text());
        
        // Show error message
        M.toast({
            html: error.message || 'Failed to track play',
            classes: 'rounded bg-red-500 text-white',
            displayLength: 3000
        });
    }
}
