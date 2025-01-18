const { useState, useEffect, useCallback, useRef } = React;

const Feed = () => {
    const [activities, setActivities] = useState([]);
    const [news, setNews] = useState([]);
    const [genre, setGenre] = useState('');
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const observer = useRef();
    const selectRef = useRef();
    
    // Initialize Materialize select
    useEffect(() => {
        if (selectRef.current) {
            M.FormSelect.init(selectRef.current);
        }
    }, []);

    // Load news
    useEffect(() => {
        const fetchNews = async () => {
            try {
                const response = await fetch(`/records/news?genre=${genre}`);
                if (!response.ok) throw new Error('Failed to fetch news');
                const data = await response.json();
                console.log('News data:', data);
                setNews(Array.isArray(data) ? data : []);
            } catch (error) {
                console.error('Error fetching news:', error);
                setNews([]);
            }
        };
        fetchNews();
    }, [genre]);

    // Load feed items
    useEffect(() => {
        const fetchFeed = async () => {
            if (!loading && hasMore) {
                setLoading(true);
                try {
                    const response = await fetch(`/records/feed?page=${page}`);
                    if (!response.ok) throw new Error('Failed to fetch feed');
                    const data = await response.json();
                    console.log('Feed data:', data);
                    setActivities(prev => [...prev, ...(Array.isArray(data) ? data : [])]);
                    setHasMore(Array.isArray(data) && data.length === 10);
                } catch (error) {
                    console.error('Error fetching feed:', error);
                    setHasMore(false);
                }
                setLoading(false);
            }
        };
        fetchFeed();
    }, [page, loading, hasMore]);

    // Last element ref for infinite scroll
    const lastActivityRef = useCallback(node => {
        if (loading) return;
        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore) {
                setPage(prev => prev + 1);
            }
        });
        if (node) observer.current.observe(node);
    }, [loading, hasMore]);

    return (
        <div className="row">
            {/* Two equal columns for News and Feed */}
            <div className="col s12 m6">
                <h4 className="section-title">Music News</h4>
                <div className="input-field">
                    <select 
                        ref={selectRef}
                        value={genre}
                        onChange={(e) => setGenre(e.target.value)}
                        className="browser-default"
                    >
                        <option value="">All Genres</option>
                        <option value="rock">Rock</option>
                        <option value="jazz">Jazz</option>
                        <option value="hip hop">Hip Hop</option>
                        <option value="electronic">Electronic</option>
                    </select>
                </div>
                {Array.isArray(news) && news.map((article, index) => (
                    <NewsCard 
                        key={`news-${article.url || index}`}
                        article={article}
                    />
                ))}
            </div>

            <div className="col s12 m6">
                <h4 className="section-title">Recent Activity</h4>
                {Array.isArray(activities) && activities.map((activity, index) => {
                    // Create a unique key using multiple properties
                    const uniqueKey = `${activity._id}-${activity.activityType}-${index}`;
                    return (
                        <div 
                            key={uniqueKey}
                            ref={index === activities.length - 1 ? lastActivityRef : null}
                        >
                            <ActivityCard activity={activity} />
                        </div>
                    );
                })}
                {loading && (
                    <div className="center-align">
                        <div className="preloader-wrapper small active">
                            <div className="spinner-layer spinner-blue-only">
                                <div className="circle-clipper left">
                                    <div className="circle"></div>
                                </div>
                                <div className="gap-patch">
                                    <div className="circle"></div>
                                </div>
                                <div className="circle-clipper right">
                                    <div className="circle"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

window.Feed = Feed;