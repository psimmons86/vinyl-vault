document.addEventListener('DOMContentLoaded', function() {
    try {
        const container = document.getElementById('social-feed-root');
        if (container) {
            const root = ReactDOM.createRoot(container);
            const currentUser = window.CURRENT_USER || null;
            root.render(React.createElement(window.SocialFeed, { currentUser }));
        } else {
            console.error('Social feed root element not found');
        }
    } catch (error) {
        console.error('Error mounting Social Feed component:', error);
    }
});
