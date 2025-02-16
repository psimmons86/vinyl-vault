"use strict";

// ActivityCard.jsx
var ActivityCard = function ActivityCard(_ref) {
  var activity = _ref.activity;
  var renderContent = function renderContent() {
    var _activity$details, _activity$details2;
    switch (activity.activityType) {
      case 'signup':
        return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", null, "joined Vinyl Vault!"));
      case 'update_profile_picture':
        return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", null, "updated their profile picture"), ((_activity$details = activity.details) === null || _activity$details === void 0 ? void 0 : _activity$details.imageUrl) && /*#__PURE__*/React.createElement("div", {
          className: "mt-2 rounded-lg overflow-hidden"
        }, /*#__PURE__*/React.createElement("img", {
          src: activity.details.imageUrl,
          alt: "New profile picture",
          className: "w-full h-48 object-cover"
        })));
      case 'update_location':
        return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", null, "updated their location to ", (_activity$details2 = activity.details) === null || _activity$details2 === void 0 ? void 0 : _activity$details2.location));
      case 'add_record':
        return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", null, "added ", activity.record.title, " by ", activity.record.artist, " to their collection"), activity.record && /*#__PURE__*/React.createElement("div", {
          className: "flex items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg mt-2"
        }, /*#__PURE__*/React.createElement("img", {
          src: activity.record.imageUrl || '/images/default-album.png',
          alt: activity.record.title,
          className: "w-12 h-12 rounded-lg object-cover"
        }), /*#__PURE__*/React.createElement("div", {
          className: "ml-3"
        }, /*#__PURE__*/React.createElement("div", {
          className: "text-sm font-medium text-gray-900 dark:text-gray-100"
        }, activity.record.title), /*#__PURE__*/React.createElement("div", {
          className: "text-xs text-gray-600 dark:text-gray-400"
        }, activity.record.artist))));
      case 'play_record':
        return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", null, "played ", activity.record.title, " by ", activity.record.artist), activity.record && /*#__PURE__*/React.createElement("div", {
          className: "flex items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg mt-2"
        }, /*#__PURE__*/React.createElement("img", {
          src: activity.record.imageUrl || '/images/default-album.png',
          alt: activity.record.title,
          className: "w-12 h-12 rounded-lg object-cover"
        }), /*#__PURE__*/React.createElement("div", {
          className: "ml-3"
        }, /*#__PURE__*/React.createElement("div", {
          className: "text-sm font-medium text-gray-900 dark:text-gray-100"
        }, activity.record.title), /*#__PURE__*/React.createElement("div", {
          className: "text-xs text-gray-600 dark:text-gray-400"
        }, activity.record.artist))));
      default:
        return null;
    }
  };
  var getAvatarUrl = function getAvatarUrl(user) {
    return user && user.profile && user.profile.avatarUrl ? user.profile.avatarUrl : '/images/default-avatar.png';
  };
  var getDisplayName = function getDisplayName(user) {
    return user && user.profile && user.profile.name ? user.profile.name : user.username;
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center space-x-3 mb-3"
  }, /*#__PURE__*/React.createElement("img", {
    src: getAvatarUrl(activity.user),
    alt: getDisplayName(activity.user),
    className: "w-10 h-10 rounded-full object-cover"
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "font-medium text-gray-900 dark:text-gray-100"
  }, getDisplayName(activity.user)), /*#__PURE__*/React.createElement("div", {
    className: "text-sm text-gray-500 dark:text-gray-400"
  }, new Date(activity.createdAt).toLocaleString()))), /*#__PURE__*/React.createElement("div", {
    className: "text-gray-700 dark:text-gray-300"
  }, renderContent())));
};
window.ActivityCard = ActivityCard;