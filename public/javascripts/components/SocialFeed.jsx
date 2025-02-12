window.SocialFeed = function SocialFeed() {
  const [feed, setFeed] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [newPost, setNewPost] = React.useState('');
  const [selectedRecord, setSelectedRecord] = React.useState(null);
  const [records, setRecords] = React.useState([]);
  const [currentUser, setCurrentUser] = React.useState(null);

  React.useEffect(() => {
    loadCurrentUser();
    loadFeed();
    loadUserRecords();
  }, []);

  const loadCurrentUser = async () => {
    try {
      const response = await fetch('/api/profile/current');
      if (!response.ok) throw new Error('Failed to load current user');
      const data = await response.json();
      setCurrentUser(data);
    } catch (err) {
      console.error('Error loading current user:', err);
      setError('Failed to load user data');
    }
  };

  const loadFeed = async () => {
    try {
      const [feedResponse, activitiesResponse] = await Promise.all([
        fetch('/social/feed'),
        fetch('/api/activities')
      ]);

      if (feedResponse.status === 401 || activitiesResponse.status === 401) {
        setError('Please sign in to view the social feed');
        return;
      }

      if (!feedResponse.ok || !activitiesResponse.ok) {
        throw new Error('Failed to load feed data');
      }

      const [feedData, activities] = await Promise.all([
        feedResponse.json(),
        activitiesResponse.json()
      ]);

      // Process activities into feed format
      const activityItems = activities.map(activity => {
        let content = '';
        switch (activity.activityType) {
          case 'signup':
            content = 'joined Vinyl Vault!';
            break;
          case 'update_profile_picture':
            content = 'updated their profile picture';
            break;
          case 'update_location':
            content = `updated their location to ${activity.details.location}`;
            break;
          case 'add_record':
            content = `added ${activity.record.title} by ${activity.record.artist} to their collection`;
            break;
          default:
            return null;
        }
        
        return {
          _id: activity._id,
          user: activity.user,
          content,
          type: 'activity',
          createdAt: activity.createdAt,
          data: {
            imageUrl: activity.activityType === 'update_profile_picture' ? activity.details.imageUrl : 
                     activity.activityType === 'add_record' ? activity.record.imageUrl : null,
            title: activity.record?.title,
            artist: activity.record?.artist,
            location: activity.details?.location
          }
        };
      }).filter(Boolean);

      // Combine and sort all items by date
      const combinedFeed = [...feedData, ...activityItems]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      setFeed(combinedFeed);
    } catch (err) {
      setError('Failed to load social feed');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadUserRecords = async () => {
    try {
      const response = await fetch('/records', {
        headers: {
          'Accept': 'application/json'
        }
      });
      if (!response.ok) throw new Error('Failed to load records');
      const data = await response.json();
      setRecords(data);
    } catch (err) {
      console.error('Error loading records:', err);
    }
  };

  const createPost = async () => {
    if (!newPost.trim()) return;

    try {
      const response = await fetch('/social/post', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: newPost,
          recordId: selectedRecord
        })
      });

      if (!response.ok) throw new Error('Failed to create post');

      setNewPost('');
      setSelectedRecord(null);
      loadFeed();
    } catch (err) {
      console.error('Error creating post:', err);
    }
  };

  const toggleLike = async (userId, postId, isLiked) => {
    try {
      const response = await fetch(`/social/${isLiked ? 'unlike' : 'like'}/${userId}/${postId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to toggle like');
      loadFeed();
    } catch (err) {
      console.error('Error toggling like:', err);
    }
  };

  const addComment = async (userId, postId, comment) => {
    if (!comment.trim()) return;

    try {
      const response = await fetch(`/social/comment/${userId}/${postId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content: comment })
      });

      if (!response.ok) throw new Error('Failed to add comment');
      loadFeed();
    } catch (err) {
      console.error('Error adding comment:', err);
    }
  };

  if (loading) return (
    <div className="flex justify-center items-center py-8">
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
    </div>
  );

  if (error) return (
    <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-lg">
      <div className="flex items-center">
        <span className="material-icons mr-2">error_outline</span>
        <p>{error}</p>
      </div>
    </div>
  );

  if (feed.length === 0) return (
    <div className="text-center py-8">
      <span className="material-icons text-4xl text-gray-400 dark:text-gray-600 mb-2">people</span>
      <p className="text-gray-500 dark:text-gray-400 mb-4">Follow other users to see their posts here!</p>
      <a href="/social/search" className="inline-flex items-center px-4 py-2 bg-primary text-white dark:bg-primary-light dark:text-gray-900 rounded-lg hover:bg-primary-dark dark:hover:bg-primary transition-colors">
        <span className="material-icons mr-2">search</span>
        <span>Find Users</span>
      </a>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Create Post */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
        <textarea
          value={newPost}
          onChange={(e) => setNewPost(e.target.value)}
          placeholder="Share something about music..."
          className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-primary dark:focus:ring-primary-light resize-none mb-3"
          rows="3"
        />
        
        <div className="flex items-center justify-between">
          <select
            value={selectedRecord || ''}
            onChange={(e) => setSelectedRecord(e.target.value)}
            className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-3 py-1.5 text-sm"
          >
            <option value="">Link a record (optional)</option>
            {records.map(record => (
              <option key={record._id} value={record._id}>
                {record.title} - {record.artist}
              </option>
            ))}
          </select>

          <button
            onClick={createPost}
            disabled={!newPost.trim()}
            className="inline-flex items-center px-4 py-2 bg-primary text-white dark:bg-primary-light dark:text-gray-900 rounded-lg hover:bg-primary-dark dark:hover:bg-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>Post</span>
            <span className="material-icons ml-2">send</span>
          </button>
        </div>
      </div>

      {/* Feed */}
      <div className="space-y-4">
        {feed.map(item => (
          <div key={item._id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
            <div className="p-4">
              {/* Post Header */}
              <div className="flex items-center space-x-3 mb-3">
                <img
                  src={item.user.profile?.avatarUrl || '/images/default-avatar.png'}
                  alt={item.user.profile?.name || item.user.username}
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">
                    {item.user.profile?.name || item.user.username}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {new Date(item.createdAt).toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Content */}
              {item.type === 'activity' ? (
                <div>
                  <p className="text-gray-700 dark:text-gray-300">
                    <span className="font-medium">{item.user.profile?.name || item.user.username}</span>
                    {' '}{item.content}
                  </p>
                  {item.data?.imageUrl && (
                    <img 
                      src={item.data.imageUrl} 
                      alt="Activity" 
                      className="mt-3 rounded-lg max-h-48 w-full object-cover"
                    />
                  )}
                </div>
              ) : (
                <>
                  <p className="text-gray-700 dark:text-gray-300 mb-3">{item.content}</p>
                  {item.recordRef && (
                    <div className="flex items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg mb-3">
                      <img 
                        src={item.recordRef.imageUrl || '/images/default-album.png'} 
                        alt={item.recordRef.title}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{item.recordRef.title}</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">{item.recordRef.artist}</div>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center space-x-4 text-gray-600 dark:text-gray-400">
                    <button
                      onClick={() => toggleLike(item.user._id, item._id, currentUser && item.likes?.includes(currentUser._id))}
                      className={`flex items-center space-x-1 ${
                        currentUser && item.likes?.includes(currentUser._id) ? 'text-red-500' : ''
                      }`}
                    >
                      <span className="material-icons text-sm">favorite</span>
                      <span>{item.likes?.length || 0}</span>
                    </button>
                    <div className="flex items-center space-x-1">
                      <span className="material-icons text-sm">comment</span>
                      <span>{item.comments?.length || 0}</span>
                    </div>
                  </div>

                  {/* Comments */}
                  {item.comments?.length > 0 && (
                    <div className="mt-4 space-y-3">
                      {item.comments.map(comment => (
                        <div key={comment._id} className="flex items-start space-x-3">
                          <img
                            src={comment.user.profile?.avatarUrl || '/images/default-avatar.png'}
                            alt={comment.user.profile?.name || comment.user.username}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                          <div className="flex-1 bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                            <div className="font-medium text-sm text-gray-900 dark:text-gray-100">
                              {comment.user.profile?.name || comment.user.username}
                            </div>
                            <p className="text-sm text-gray-700 dark:text-gray-300">{comment.content}</p>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {new Date(comment.createdAt).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add Comment */}
                  <div className="mt-4">
                    <textarea
                      placeholder="Add a comment..."
                      className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-primary dark:focus:ring-primary-light resize-none"
                      rows="1"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          addComment(item.user._id, item._id, e.target.value);
                          e.target.value = '';
                        }
                      }}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
