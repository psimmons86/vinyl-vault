"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));
var _toConsumableArray2 = _interopRequireDefault(require("@babel/runtime/helpers/toConsumableArray"));
var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));
var _slicedToArray2 = _interopRequireDefault(require("@babel/runtime/helpers/slicedToArray"));
window.SocialFeed = function SocialFeed() {
  var _React$useState = React.useState([]),
    _React$useState2 = (0, _slicedToArray2["default"])(_React$useState, 2),
    feed = _React$useState2[0],
    setFeed = _React$useState2[1];
  var _React$useState3 = React.useState(true),
    _React$useState4 = (0, _slicedToArray2["default"])(_React$useState3, 2),
    loading = _React$useState4[0],
    setLoading = _React$useState4[1];
  var _React$useState5 = React.useState(null),
    _React$useState6 = (0, _slicedToArray2["default"])(_React$useState5, 2),
    error = _React$useState6[0],
    setError = _React$useState6[1];
  var _React$useState7 = React.useState(''),
    _React$useState8 = (0, _slicedToArray2["default"])(_React$useState7, 2),
    newPost = _React$useState8[0],
    setNewPost = _React$useState8[1];
  var _React$useState9 = React.useState(null),
    _React$useState10 = (0, _slicedToArray2["default"])(_React$useState9, 2),
    selectedRecord = _React$useState10[0],
    setSelectedRecord = _React$useState10[1];
  var _React$useState11 = React.useState([]),
    _React$useState12 = (0, _slicedToArray2["default"])(_React$useState11, 2),
    records = _React$useState12[0],
    setRecords = _React$useState12[1];
  var _React$useState13 = React.useState(null),
    _React$useState14 = (0, _slicedToArray2["default"])(_React$useState13, 2),
    currentUser = _React$useState14[0],
    setCurrentUser = _React$useState14[1];
  React.useEffect(function () {
    loadCurrentUser();
    loadFeed();
    loadUserRecords();
  }, []);
  var loadCurrentUser = /*#__PURE__*/function () {
    var _ref = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee() {
      var response, data;
      return _regenerator["default"].wrap(function _callee$(_context) {
        while (1) switch (_context.prev = _context.next) {
          case 0:
            _context.prev = 0;
            _context.next = 3;
            return fetch('/api/current-user');
          case 3:
            response = _context.sent;
            if (response.ok) {
              _context.next = 6;
              break;
            }
            throw new Error('Failed to load current user');
          case 6:
            _context.next = 8;
            return response.json();
          case 8:
            data = _context.sent;
            setCurrentUser(data);
            _context.next = 16;
            break;
          case 12:
            _context.prev = 12;
            _context.t0 = _context["catch"](0);
            console.error('Error loading current user:', _context.t0);
            setError('Failed to load user data');
          case 16:
          case "end":
            return _context.stop();
        }
      }, _callee, null, [[0, 12]]);
    }));
    return function loadCurrentUser() {
      return _ref.apply(this, arguments);
    };
  }();
  var loadFeed = /*#__PURE__*/function () {
    var _ref2 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee2() {
      var _yield$Promise$all, _yield$Promise$all2, feedResponse, activitiesResponse, _yield$Promise$all3, _yield$Promise$all4, feedData, activities, activityItems, combinedFeed;
      return _regenerator["default"].wrap(function _callee2$(_context2) {
        while (1) switch (_context2.prev = _context2.next) {
          case 0:
            _context2.prev = 0;
            _context2.next = 3;
            return Promise.all([fetch('/social/feed'), fetch('/api/activities')]);
          case 3:
            _yield$Promise$all = _context2.sent;
            _yield$Promise$all2 = (0, _slicedToArray2["default"])(_yield$Promise$all, 2);
            feedResponse = _yield$Promise$all2[0];
            activitiesResponse = _yield$Promise$all2[1];
            if (!(feedResponse.status === 401 || activitiesResponse.status === 401)) {
              _context2.next = 10;
              break;
            }
            setError('Please sign in to view the social feed');
            return _context2.abrupt("return");
          case 10:
            if (!(!feedResponse.ok || !activitiesResponse.ok)) {
              _context2.next = 12;
              break;
            }
            throw new Error('Failed to load feed data');
          case 12:
            _context2.next = 14;
            return Promise.all([feedResponse.json(), activitiesResponse.json()]);
          case 14:
            _yield$Promise$all3 = _context2.sent;
            _yield$Promise$all4 = (0, _slicedToArray2["default"])(_yield$Promise$all3, 2);
            feedData = _yield$Promise$all4[0];
            activities = _yield$Promise$all4[1];
            // Process activities into feed format
            activityItems = activities.map(function (activity) {
              var content = '';
              switch (activity.activityType) {
                case 'signup':
                  content = 'joined Vinyl Vault!';
                  break;
                case 'update_profile_picture':
                  content = 'updated their profile picture';
                  break;
                case 'update_location':
                  content = "updated their location to ".concat(activity.details.location);
                  break;
                case 'add_record':
                  content = "added ".concat(activity.record.title, " by ").concat(activity.record.artist, " to their collection");
                  break;
                case 'play_record':
                  content = "played ".concat(activity.record.title, " by ").concat(activity.record.artist);
                  break;
                default:
                  return null;
              }
              return {
                _id: activity._id,
                user: activity.user,
                content: content,
                type: 'activity',
                createdAt: activity.createdAt,
                data: {
                  imageUrl: activity.activityType === 'update_profile_picture' ? activity.details.imageUrl : activity.activityType === 'add_record' ? activity.record.imageUrl : null,
                  title: activity.record && activity.record.title,
                  artist: activity.record && activity.record.artist,
                  location: activity.details && activity.details.location
                }
              };
            }).filter(Boolean); // Combine and sort all items by date
            combinedFeed = [].concat((0, _toConsumableArray2["default"])(feedData), (0, _toConsumableArray2["default"])(activityItems)).sort(function (a, b) {
              return new Date(b.createdAt) - new Date(a.createdAt);
            });
            setFeed(combinedFeed);
            _context2.next = 27;
            break;
          case 23:
            _context2.prev = 23;
            _context2.t0 = _context2["catch"](0);
            setError('Failed to load social feed');
            console.error(_context2.t0);
          case 27:
            _context2.prev = 27;
            setLoading(false);
            return _context2.finish(27);
          case 30:
          case "end":
            return _context2.stop();
        }
      }, _callee2, null, [[0, 23, 27, 30]]);
    }));
    return function loadFeed() {
      return _ref2.apply(this, arguments);
    };
  }();
  var loadUserRecords = /*#__PURE__*/function () {
    var _ref3 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee3() {
      var response, data;
      return _regenerator["default"].wrap(function _callee3$(_context3) {
        while (1) switch (_context3.prev = _context3.next) {
          case 0:
            _context3.prev = 0;
            _context3.next = 3;
            return fetch('/records', {
              headers: {
                'Accept': 'application/json'
              }
            });
          case 3:
            response = _context3.sent;
            if (response.ok) {
              _context3.next = 6;
              break;
            }
            throw new Error('Failed to load records');
          case 6:
            _context3.next = 8;
            return response.json();
          case 8:
            data = _context3.sent;
            setRecords(data);
            _context3.next = 15;
            break;
          case 12:
            _context3.prev = 12;
            _context3.t0 = _context3["catch"](0);
            console.error('Error loading records:', _context3.t0);
          case 15:
          case "end":
            return _context3.stop();
        }
      }, _callee3, null, [[0, 12]]);
    }));
    return function loadUserRecords() {
      return _ref3.apply(this, arguments);
    };
  }();
  var createPost = /*#__PURE__*/function () {
    var _ref4 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee4() {
      var response;
      return _regenerator["default"].wrap(function _callee4$(_context4) {
        while (1) switch (_context4.prev = _context4.next) {
          case 0:
            if (newPost.trim()) {
              _context4.next = 2;
              break;
            }
            return _context4.abrupt("return");
          case 2:
            _context4.prev = 2;
            _context4.next = 5;
            return fetch('/social/post', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                content: newPost,
                recordId: selectedRecord
              })
            });
          case 5:
            response = _context4.sent;
            if (response.ok) {
              _context4.next = 8;
              break;
            }
            throw new Error('Failed to create post');
          case 8:
            setNewPost('');
            setSelectedRecord(null);
            loadFeed();
            _context4.next = 16;
            break;
          case 13:
            _context4.prev = 13;
            _context4.t0 = _context4["catch"](2);
            console.error('Error creating post:', _context4.t0);
          case 16:
          case "end":
            return _context4.stop();
        }
      }, _callee4, null, [[2, 13]]);
    }));
    return function createPost() {
      return _ref4.apply(this, arguments);
    };
  }();
  var toggleLike = /*#__PURE__*/function () {
    var _ref5 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee5(userId, postId, isLiked) {
      var response;
      return _regenerator["default"].wrap(function _callee5$(_context5) {
        while (1) switch (_context5.prev = _context5.next) {
          case 0:
            _context5.prev = 0;
            _context5.next = 3;
            return fetch("/social/".concat(isLiked ? 'unlike' : 'like', "/").concat(userId, "/").concat(postId), {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              }
            });
          case 3:
            response = _context5.sent;
            if (response.ok) {
              _context5.next = 6;
              break;
            }
            throw new Error('Failed to toggle like');
          case 6:
            loadFeed();
            _context5.next = 12;
            break;
          case 9:
            _context5.prev = 9;
            _context5.t0 = _context5["catch"](0);
            console.error('Error toggling like:', _context5.t0);
          case 12:
          case "end":
            return _context5.stop();
        }
      }, _callee5, null, [[0, 9]]);
    }));
    return function toggleLike(_x, _x2, _x3) {
      return _ref5.apply(this, arguments);
    };
  }();
  var addComment = /*#__PURE__*/function () {
    var _ref6 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee6(userId, postId, comment) {
      var response;
      return _regenerator["default"].wrap(function _callee6$(_context6) {
        while (1) switch (_context6.prev = _context6.next) {
          case 0:
            if (comment.trim()) {
              _context6.next = 2;
              break;
            }
            return _context6.abrupt("return");
          case 2:
            _context6.prev = 2;
            _context6.next = 5;
            return fetch("/social/comment/".concat(userId, "/").concat(postId), {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                content: comment
              })
            });
          case 5:
            response = _context6.sent;
            if (response.ok) {
              _context6.next = 8;
              break;
            }
            throw new Error('Failed to add comment');
          case 8:
            loadFeed();
            _context6.next = 14;
            break;
          case 11:
            _context6.prev = 11;
            _context6.t0 = _context6["catch"](2);
            console.error('Error adding comment:', _context6.t0);
          case 14:
          case "end":
            return _context6.stop();
        }
      }, _callee6, null, [[2, 11]]);
    }));
    return function addComment(_x4, _x5, _x6) {
      return _ref6.apply(this, arguments);
    };
  }();
  if (loading) return /*#__PURE__*/React.createElement("div", {
    className: "flex justify-center items-center py-8"
  }, /*#__PURE__*/React.createElement("div", {
    className: "animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"
  }));
  if (error) return /*#__PURE__*/React.createElement("div", {
    className: "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-lg"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center"
  }, /*#__PURE__*/React.createElement("span", {
    className: "material-icons mr-2"
  }, "error_outline"), /*#__PURE__*/React.createElement("p", null, error)));
  if (feed.length === 0) return /*#__PURE__*/React.createElement("div", {
    className: "text-center py-8"
  }, /*#__PURE__*/React.createElement("span", {
    className: "material-icons text-4xl text-gray-400 dark:text-gray-600 mb-2"
  }, "people"), /*#__PURE__*/React.createElement("p", {
    className: "text-gray-500 dark:text-gray-400 mb-4"
  }, "Follow other users to see their posts here!"), /*#__PURE__*/React.createElement("a", {
    href: "/social/search",
    className: "inline-flex items-center px-4 py-2 bg-primary text-white dark:bg-primary-light dark:text-gray-900 rounded-lg hover:bg-primary-dark dark:hover:bg-primary transition-colors"
  }, /*#__PURE__*/React.createElement("span", {
    className: "material-icons mr-2"
  }, "search"), /*#__PURE__*/React.createElement("span", null, "Find Users")));
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4"
  }, /*#__PURE__*/React.createElement("textarea", {
    value: newPost,
    onChange: function onChange(e) {
      return setNewPost(e.target.value);
    },
    placeholder: "Share something about music...",
    className: "w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-primary dark:focus:ring-primary-light resize-none mb-3",
    rows: "3"
  }), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("select", {
    value: selectedRecord || '',
    onChange: function onChange(e) {
      return setSelectedRecord(e.target.value);
    },
    className: "rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-3 py-1.5 text-sm"
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "Link a record (optional)"), records.map(function (record) {
    return /*#__PURE__*/React.createElement("option", {
      key: record._id,
      value: record._id
    }, record.title, " - ", record.artist);
  })), /*#__PURE__*/React.createElement("button", {
    onClick: createPost,
    disabled: !newPost.trim(),
    className: "inline-flex items-center px-4 py-2 bg-primary text-white dark:bg-primary-light dark:text-gray-900 rounded-lg hover:bg-primary-dark dark:hover:bg-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
  }, /*#__PURE__*/React.createElement("span", null, "Post"), /*#__PURE__*/React.createElement("span", {
    className: "material-icons ml-2"
  }, "send")))), /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, feed.map(function (item) {
    var _item$data;
    return /*#__PURE__*/React.createElement("div", {
      key: item._id,
      className: "bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden"
    }, /*#__PURE__*/React.createElement("div", {
      className: "p-4"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center space-x-3 mb-3"
    }, /*#__PURE__*/React.createElement("img", {
      src: item.user.profile && item.user.profile.avatarUrl || '/images/default-avatar.png',
      alt: item.user.profile && item.user.profile.name || item.user.username,
      className: "w-10 h-10 rounded-full object-cover"
    }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      className: "font-medium text-gray-900 dark:text-gray-100"
    }, item.user.profile && item.user.profile.name || item.user.username), /*#__PURE__*/React.createElement("div", {
      className: "text-sm text-gray-500 dark:text-gray-400"
    }, new Date(item.createdAt).toLocaleString()))), item.type === 'activity' ? /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
      className: "text-gray-700 dark:text-gray-300"
    }, /*#__PURE__*/React.createElement("span", {
      className: "font-medium"
    }, item.user.profile && item.user.profile.name || item.user.username), ' ', item.content), ((_item$data = item.data) === null || _item$data === void 0 ? void 0 : _item$data.imageUrl) && /*#__PURE__*/React.createElement("img", {
      src: item.data.imageUrl,
      alt: "Activity",
      className: "mt-3 rounded-lg max-h-48 w-full object-cover"
    })) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("p", {
      className: "text-gray-700 dark:text-gray-300 mb-3"
    }, item.content), item.recordRef && /*#__PURE__*/React.createElement("div", {
      className: "flex items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg mb-3"
    }, /*#__PURE__*/React.createElement("img", {
      src: item.recordRef.imageUrl || '/images/default-album.png',
      alt: item.recordRef.title,
      className: "w-12 h-12 rounded-lg object-cover"
    }), /*#__PURE__*/React.createElement("div", {
      className: "ml-3"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-sm font-medium text-gray-900 dark:text-gray-100"
    }, item.recordRef.title), /*#__PURE__*/React.createElement("div", {
      className: "text-xs text-gray-600 dark:text-gray-400"
    }, item.recordRef.artist))), /*#__PURE__*/React.createElement("div", {
      className: "flex items-center space-x-4 text-gray-600 dark:text-gray-400"
    }, /*#__PURE__*/React.createElement("button", {
      onClick: function onClick() {
        return toggleLike(item.user._id, item._id, currentUser && item.likes && item.likes.includes(currentUser._id));
      },
      className: "flex items-center space-x-1 ".concat(currentUser && item.likes && item.likes.includes(currentUser._id) ? 'text-red-500' : '')
    }, /*#__PURE__*/React.createElement("span", {
      className: "material-icons text-sm"
    }, "favorite"), /*#__PURE__*/React.createElement("span", null, item.likes && item.likes.length || 0)), /*#__PURE__*/React.createElement("div", {
      className: "flex items-center space-x-1"
    }, /*#__PURE__*/React.createElement("span", {
      className: "material-icons text-sm"
    }, "comment"), /*#__PURE__*/React.createElement("span", null, item.comments && item.comments.length || 0))), item.comments && item.comments.length > 0 && /*#__PURE__*/React.createElement("div", {
      className: "mt-4 space-y-3"
    }, item.comments.map(function (comment) {
      return /*#__PURE__*/React.createElement("div", {
        key: comment._id,
        className: "flex items-start space-x-3"
      }, /*#__PURE__*/React.createElement("img", {
        src: comment.user.profile && comment.user.profile.avatarUrl || '/images/default-avatar.png',
        alt: comment.user.profile && comment.user.profile.name || comment.user.username,
        className: "w-8 h-8 rounded-full object-cover"
      }), /*#__PURE__*/React.createElement("div", {
        className: "flex-1 bg-gray-50 dark:bg-gray-700 rounded-lg p-3"
      }, /*#__PURE__*/React.createElement("div", {
        className: "font-medium text-sm text-gray-900 dark:text-gray-100"
      }, comment.user.profile && comment.user.profile.name || comment.user.username), /*#__PURE__*/React.createElement("p", {
        className: "text-sm text-gray-700 dark:text-gray-300"
      }, comment.content), /*#__PURE__*/React.createElement("div", {
        className: "text-xs text-gray-500 dark:text-gray-400 mt-1"
      }, new Date(comment.createdAt).toLocaleString())));
    })), /*#__PURE__*/React.createElement("div", {
      className: "mt-4"
    }, /*#__PURE__*/React.createElement("textarea", {
      placeholder: "Add a comment...",
      className: "w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-primary dark:focus:ring-primary-light resize-none",
      rows: "1",
      onKeyPress: function onKeyPress(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          addComment(item.user._id, item._id, e.target.value);
          e.target.value = '';
        }
      }
    })))));
  })));
};