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
    
    // Initialize Materialize components
    const selects = document.querySelectorAll('select');
    const textareas = document.querySelectorAll('.materialize-textarea');
    M.FormSelect.init(selects);
    M.textareaAutoResize(textareas);
    textareas.forEach(textarea => M.textareaAutoResize(textarea));
  }, []);

  // Re-initialize components when records change
  React.useEffect(() => {
    const selects = document.querySelectorAll('select');
    const textareas = document.querySelectorAll('.materialize-textarea');
    M.FormSelect.init(selects);
    textareas.forEach(textarea => M.textareaAutoResize(textarea));
  }, [records]);

  // Initialize textarea when post content changes
  React.useEffect(() => {
    const textarea = document.getElementById('post-content');
    if (textarea) {
      M.textareaAutoResize(textarea);
    }
  }, [newPost]);

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
            content = `updated their location to ${activity.details.get('location')}`;
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
            imageUrl: activity.activityType === 'update_profile_picture' ? activity.details.get('imageUrl') : 
                     activity.activityType === 'add_record' ? activity.record.imageUrl : null,
            title: activity.record?.title,
            artist: activity.record?.artist,
            location: activity.details?.get('location')
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
      loadFeed(); // Reload feed
      M.toast({html: 'Post created successfully!'});
    } catch (err) {
      console.error('Error creating post:', err);
      M.toast({html: 'Error creating post'});
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
      loadFeed(); // Reload feed to update likes
    } catch (err) {
      console.error('Error toggling like:', err);
      M.toast({html: 'Error updating like'});
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
      loadFeed(); // Reload feed to show new comment
      M.toast({html: 'Comment added!'});
    } catch (err) {
      console.error('Error adding comment:', err);
      M.toast({html: 'Error adding comment'});
    }
  };

  if (loading) return <div className="center-align"><div className="preloader-wrapper big active">
    <div className="spinner-layer spinner-blue">
      <div className="circle-clipper left"><div className="circle"></div></div>
      <div className="gap-patch"><div className="circle"></div></div>
      <div className="circle-clipper right"><div className="circle"></div></div>
    </div>
  </div></div>;

  if (error) return (
    <div className="card-panel red lighten-4 red-text text-darken-4">
      <i className="material-icons left">error</i>
      {error}
    </div>
  );

  if (feed.length === 0) return (
    <div className="center-align">
      <i className="material-icons large grey-text">people</i>
      <p className="grey-text">Follow other users to see their posts here!</p>
      <a href="/social/search" className="btn waves-effect waves-light">
        <i className="material-icons left">search</i>
        Find Users
      </a>
    </div>
  );

  return (
    <div className="social-feed">
      {/* Create Post */}
      <div className="card">
        <div className="card-content">
          <div className="input-field">
            <textarea
              id="post-content"
              className="materialize-textarea"
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
              placeholder="Share something about music..."
            />
          </div>
          
          {/* Record Selection */}
          <div className="input-field">
            <select
              value={selectedRecord || ''}
              onChange={(e) => setSelectedRecord(e.target.value)}
              className="browser-default"
            >
              <option value="">Link a record (optional)</option>
              {records.map(record => (
                <option key={record._id} value={record._id}>
                  {record.title} - {record.artist}
                </option>
              ))}
            </select>
          </div>

          <button
            className="btn waves-effect waves-light right"
            onClick={createPost}
            disabled={!newPost.trim()}
          >
            Post
            <i className="material-icons right">send</i>
          </button>
          <div className="clearfix"></div>
        </div>
      </div>

      {/* Feed */}
      {feed.map(item => (
        <div key={item._id} className="card">
            <div className="card-content">
              {/* Post Header */}
              <div className="post-header">
                <img
                  src={item.user.profile?.avatarUrl || '/images/default-avatar.png'}
                  alt={item.user.profile?.name || item.user.username}
                  className="circle responsive-img post-avatar"
                />
                <div className="post-user-info">
                  <span className="post-name">{item.user.profile?.name || item.user.username}</span>
                  <small className="post-time">
                    {new Date(item.createdAt).toLocaleString()}
                  </small>
                </div>
              </div>

              {/* Content */}
              {item.type === 'activity' ? (
                <div className="activity-content">
                  <p className="post-content">
                    <span className="font-medium">{item.user.profile?.name || item.user.username}</span>
                    {' '}{item.content}
                  </p>
                  {item.data?.imageUrl && (
                    <img 
                      src={item.data.imageUrl} 
                      alt="Activity" 
                      className="activity-image rounded-lg mt-2"
                    />
                  )}
                </div>
              ) : (
                <>
                  <p className="post-content">{item.content}</p>
                  {item.recordRef && (
                    <div className="linked-record">
                      <i className="material-icons">album</i>
                      <span>
                        {item.recordRef.title} - {item.recordRef.artist}
                      </span>
                    </div>
                  )}
                  <div className="post-actions">
                    <button
                      className={`btn-flat waves-effect waves-light ${
                        currentUser && item.likes?.includes(currentUser._id) ? 'red-text' : ''
                      }`}
                      onClick={() => toggleLike(item.user._id, item._id, currentUser && item.likes?.includes(currentUser._id))}
                    >
                      <i className="material-icons left">favorite</i>
                      {item.likes?.length || 0}
                    </button>
                    <button className="btn-flat waves-effect waves-light">
                      <i className="material-icons left">comment</i>
                      {item.comments?.length || 0}
                    </button>
                  </div>

                  {/* Comments */}
                  <div className="comments-section">
                    {item.comments?.map(comment => (
                      <div key={comment._id} className="comment">
                        <img
                          src={comment.user.profile?.avatarUrl || '/images/default-avatar.png'}
                          alt={comment.user.profile?.name || comment.user.username}
                          className="circle responsive-img comment-avatar"
                        />
                        <div className="comment-content">
                          <span className="comment-name">
                            {comment.user.profile?.name || comment.user.username}
                          </span>
                          <p>{comment.content}</p>
                          <small className="comment-time">
                            {new Date(comment.createdAt).toLocaleString()}
                          </small>
                        </div>
                      </div>
                    ))}

                    {/* Add Comment */}
                    <div className="add-comment">
                      <div className="input-field">
                        <textarea
                          className="materialize-textarea"
                          placeholder="Add a comment..."
                          onKeyPress={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              addComment(item.user._id, item._id, e.target.value);
                              e.target.value = '';
                            }
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
      ))}
    </div>
  );
};
