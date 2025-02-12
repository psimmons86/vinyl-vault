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
                            <div className="mt-2 rounded-lg overflow-hidden">
                                <img 
                                    src={activity.details.imageUrl} 
                                    alt="New profile picture"
                                    className="w-full h-48 object-cover"
                                />
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
                        <p>added {activity.record.title} by {activity.record.artist} to their collection</p>
                        {activity.record && (
                            <div className="flex items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg mt-2">
                                <img 
                                    src={activity.record.imageUrl || '/images/default-album.png'} 
                                    alt={activity.record.title}
                                    className="w-12 h-12 rounded-lg object-cover"
                                />
                                <div className="ml-3">
                                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                        {activity.record.title}
                                    </div>
                                    <div className="text-xs text-gray-600 dark:text-gray-400">
                                        {activity.record.artist}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                );
            case 'play_record':
                return (
                    <div>
                        <p>played {activity.record.title} by {activity.record.artist}</p>
                        {activity.record && (
                            <div className="flex items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg mt-2">
                                <img 
                                    src={activity.record.imageUrl || '/images/default-album.png'}
                                    alt={activity.record.title}
                                    className="w-12 h-12 rounded-lg object-cover"
                                />
                                <div className="ml-3">
                                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                        {activity.record.title}
                                    </div>
                                    <div className="text-xs text-gray-600 dark:text-gray-400">
                                        {activity.record.artist}
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
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
            <div className="p-4">
                <div className="flex items-center space-x-3 mb-3">
                    <img 
                        src={getAvatarUrl(activity.user)}
                        alt={getDisplayName(activity.user)}
                        className="w-10 h-10 rounded-full object-cover"
                    />
                    <div>
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                            {getDisplayName(activity.user)}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                            {new Date(activity.createdAt).toLocaleString()}
                        </div>
                    </div>
                </div>
                <div className="text-gray-700 dark:text-gray-300">
                    {renderContent()}
                </div>
            </div>
        </div>
    );
};

window.ActivityCard = ActivityCard;
