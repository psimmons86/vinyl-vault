// NewsCard.jsx
const NewsCard = ({ article }) => {
    return (
        <div className="card">
            <div className="card-image">
                {article.imageUrl && (
                    <img src={article.imageUrl} alt={article.title} />
                )}
            </div>
            <div className="card-content">
                <span className="card-title">{article.title}</span>
                <p>{article.description}</p>
            </div>
            <div className="card-action">
                <a href={article.url} target="_blank" rel="noopener noreferrer">
                    Read More
                </a>
            </div>
        </div>
    );
};

window.NewsCard = NewsCard;