(function() {
  function initSocialFeed() {
    try {
      const container = document.getElementById('social-feed-root');
      if (!container) {
        console.error('Social feed root element not found');
        return;
      }

      const root = ReactDOM.createRoot(container);
      root.render(React.createElement(window.SocialFeed, { currentUser: window.CURRENT_USER }));
    } catch (error) {
      console.error('Error mounting Social Feed component:', error);
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSocialFeed);
  } else {
    initSocialFeed();
  }
})();
