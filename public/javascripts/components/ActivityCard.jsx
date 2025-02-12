// ActivityCard.jsx
const ActivityCard = ({ activity }) => {
    const renderContent = () => {
        switch (activity.activityType) {
            case 'signup':
                return (
                    <div>
                        <p>joined Vinyl Vault!</p>
                    </div>
                );
            case 'update_profile_picture':
                return (
                    <div>
                        <p>updated their profile picture</p>
                        {activity.details?.imageUrl && (
                            <div className="card">
                                <div className="card-image">
                                    <img 
                                        src={activity.details.imageUrl} 
                                        alt="New profile picture"
                                        className="responsive-img"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                );
            case 'update_location':
                return (
                    <div>
                        <p>updated their location to {activity.details?.location}</p>
                    </div>
                );
            case 'add_record':
                return (
                    <div>
                        <p>Added a new record to their collection</p>
                        {activity.record && (
                            <div className="card horizontal">
                                <div className="card-image">
                                    <img 
                                        src={activity.record.imageUrl || '/images/default-album.png'} 
                                        alt={activity.record.title}
                                    />
                                </div>
                                <div className="card-stacked">
                                    <div className="card-content">
                                        <p className="card-title">{activity.record.title}</p>
                                        <p>{activity.record.artist}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                );
            case 'play_record':
                return (
                    <div>
                        <p>Played a record</p>
                        {activity.record && (
                            <div className="card horizontal">
                                <div className="card-image">
                                    <img 
                                        src={activity.record.imageUrl || '/images/default-album.png'}
                                        alt={activity.record.title}
                                    />
                                </div>
                                <div className="card-stacked">
                                    <div className="card-content">
                                        <p className="card-title">{activity.record.title}</p>
                                        <p>{activity.record.artist}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                );
            default:
                return null;
        }
    };

    const getAvatarUrl = (user) => {
        return user && user.profile && user.profile.avatarUrl 
            ? user.profile.avatarUrl 
            : '/images/default-avatar.png';
    };

    const getDisplayName = (user) => {
        return user && user.profile && user.profile.name 
            ? user.profile.name 
            : user.username;
    };

    return (
        <div className="card">
            <div className="card-content">
                <div className="row valign-wrapper">
                    <div className="col s2">
                        <img 
                            src={getAvatarUrl(activity.user)}
                            alt=""
                            className="circle responsive-img"
                        />
                    </div>
                    <div className="col s10">
                        <span className="black-text">
                            <strong>{getDisplayName(activity.user)}</strong>
                        </span>
                        {renderContent()}
                        <p className="grey-text">
                            {new Date(activity.createdAt).toLocaleDateString()}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

window.ActivityCard = ActivityCard;
