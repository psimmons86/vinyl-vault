window.SocialFeed = function SocialFeed() {
  const [feed, setFeed] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [newPost, setNewPost] = React.useState('');
  const [selectedRecord, setSelectedRecord] = React.useState(null);
  const [records, setRecords] = React.useState([]);

  React.useEffect(() => {
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

  const loadFeed = async () => {
    try {
      const response = await fetch('/social/feed');
      if (response.status === 401) {
        setError('Please sign in to view the social feed');
        return;
      }
      if (!response.ok) throw new Error('Failed to load feed');
      const data = await response.json();
      setFeed(data);
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
      {feed.map(user => (
        user.posts.map(post => (
          <div key={post._id} className="card">
            <div className="card-content">
              {/* Post Header */}
              <div className="post-header">
                <img
                  src={user.profile?.avatarUrl || '/images/default-avatar.png'}
                  alt={user.profile?.name || user.username}
                  className="circle responsive-img post-avatar"
                />
                <div className="post-user-info">
                  <span className="post-name">{user.profile?.name || user.username}</span>
                  <small className="post-time">
                    {new Date(post.createdAt).toLocaleString()}
                  </small>
                </div>
              </div>

              {/* Post Content */}
              <p className="post-content">{post.content}</p>

              {/* Linked Record */}
              {post.recordRef && (
                <div className="linked-record">
                  <i className="material-icons">album</i>
                  <span>
                    {post.recordRef.title} - {post.recordRef.artist}
                  </span>
                </div>
              )}

              {/* Post Actions */}
              <div className="post-actions">
                <button
                  className={`btn-flat waves-effect waves-light ${
                    post.likes?.includes(currentUser._id) ? 'red-text' : ''
                  }`}
                  onClick={() => toggleLike(user._id, post._id, post.likes?.includes(currentUser._id))}
                >
                  <i className="material-icons left">favorite</i>
                  {post.likes?.length || 0}
                </button>
                <button className="btn-flat waves-effect waves-light">
                  <i className="material-icons left">comment</i>
                  {post.comments?.length || 0}
                </button>
              </div>

              {/* Comments */}
              <div className="comments-section">
                {post.comments?.map(comment => (
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
                          addComment(user._id, post._id, e.target.value);
                          e.target.value = '';
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))
      ))}
    </div>
  );
};
