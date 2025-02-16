"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));
var _toConsumableArray2 = _interopRequireDefault(require("@babel/runtime/helpers/toConsumableArray"));
var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));
var _slicedToArray2 = _interopRequireDefault(require("@babel/runtime/helpers/slicedToArray"));
var _React = React,
  useState = _React.useState,
  useEffect = _React.useEffect,
  useCallback = _React.useCallback,
  useRef = _React.useRef;
var Feed = function Feed() {
  var _useState = useState([]),
    _useState2 = (0, _slicedToArray2["default"])(_useState, 2),
    activities = _useState2[0],
    setActivities = _useState2[1];
  var _useState3 = useState([]),
    _useState4 = (0, _slicedToArray2["default"])(_useState3, 2),
    news = _useState4[0],
    setNews = _useState4[1];
  var _useState5 = useState(''),
    _useState6 = (0, _slicedToArray2["default"])(_useState5, 2),
    genre = _useState6[0],
    setGenre = _useState6[1];
  var _useState7 = useState(1),
    _useState8 = (0, _slicedToArray2["default"])(_useState7, 2),
    page = _useState8[0],
    setPage = _useState8[1];
  var _useState9 = useState(false),
    _useState10 = (0, _slicedToArray2["default"])(_useState9, 2),
    loading = _useState10[0],
    setLoading = _useState10[1];
  var _useState11 = useState(true),
    _useState12 = (0, _slicedToArray2["default"])(_useState11, 2),
    hasMore = _useState12[0],
    setHasMore = _useState12[1];
  var observer = useRef();
  var selectRef = useRef();

  // Initialize Materialize select
  useEffect(function () {
    if (selectRef.current) {
      M.FormSelect.init(selectRef.current);
    }
  }, []);

  // Load news
  useEffect(function () {
    var fetchNews = /*#__PURE__*/function () {
      var _ref = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee() {
        var response, data;
        return _regenerator["default"].wrap(function _callee$(_context) {
          while (1) switch (_context.prev = _context.next) {
            case 0:
              _context.prev = 0;
              _context.next = 3;
              return fetch("/records/news?genre=".concat(genre));
            case 3:
              response = _context.sent;
              if (response.ok) {
                _context.next = 6;
                break;
              }
              throw new Error('Failed to fetch news');
            case 6:
              _context.next = 8;
              return response.json();
            case 8:
              data = _context.sent;
              console.log('News data:', data);
              setNews(Array.isArray(data) ? data : []);
              _context.next = 17;
              break;
            case 13:
              _context.prev = 13;
              _context.t0 = _context["catch"](0);
              console.error('Error fetching news:', _context.t0);
              setNews([]);
            case 17:
            case "end":
              return _context.stop();
          }
        }, _callee, null, [[0, 13]]);
      }));
      return function fetchNews() {
        return _ref.apply(this, arguments);
      };
    }();
    fetchNews();
  }, [genre]);

  // Load feed items
  useEffect(function () {
    var fetchFeed = /*#__PURE__*/function () {
      var _ref2 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee2() {
        var response, data;
        return _regenerator["default"].wrap(function _callee2$(_context2) {
          while (1) switch (_context2.prev = _context2.next) {
            case 0:
              if (!(!loading && hasMore)) {
                _context2.next = 21;
                break;
              }
              setLoading(true);
              _context2.prev = 2;
              _context2.next = 5;
              return fetch("/records/feed?page=".concat(page));
            case 5:
              response = _context2.sent;
              if (response.ok) {
                _context2.next = 8;
                break;
              }
              throw new Error('Failed to fetch feed');
            case 8:
              _context2.next = 10;
              return response.json();
            case 10:
              data = _context2.sent;
              console.log('Feed data:', data);
              setActivities(function (prev) {
                return [].concat((0, _toConsumableArray2["default"])(prev), (0, _toConsumableArray2["default"])(Array.isArray(data) ? data : []));
              });
              setHasMore(Array.isArray(data) && data.length === 10);
              _context2.next = 20;
              break;
            case 16:
              _context2.prev = 16;
              _context2.t0 = _context2["catch"](2);
              console.error('Error fetching feed:', _context2.t0);
              setHasMore(false);
            case 20:
              setLoading(false);
            case 21:
            case "end":
              return _context2.stop();
          }
        }, _callee2, null, [[2, 16]]);
      }));
      return function fetchFeed() {
        return _ref2.apply(this, arguments);
      };
    }();
    fetchFeed();
  }, [page, loading, hasMore]);

  // Last element ref for infinite scroll
  var lastActivityRef = useCallback(function (node) {
    if (loading) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting && hasMore) {
        setPage(function (prev) {
          return prev + 1;
        });
      }
    });
    if (node) observer.current.observe(node);
  }, [loading, hasMore]);
  return /*#__PURE__*/React.createElement("div", {
    className: "row"
  }, /*#__PURE__*/React.createElement("div", {
    className: "col s12 m6"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "section-title"
  }, "Music News"), /*#__PURE__*/React.createElement("div", {
    className: "input-field"
  }, /*#__PURE__*/React.createElement("select", {
    ref: selectRef,
    value: genre,
    onChange: function onChange(e) {
      return setGenre(e.target.value);
    },
    className: "browser-default"
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "All Genres"), /*#__PURE__*/React.createElement("option", {
    value: "rock"
  }, "Rock"), /*#__PURE__*/React.createElement("option", {
    value: "jazz"
  }, "Jazz"), /*#__PURE__*/React.createElement("option", {
    value: "hip hop"
  }, "Hip Hop"), /*#__PURE__*/React.createElement("option", {
    value: "electronic"
  }, "Electronic"))), Array.isArray(news) && news.map(function (article, index) {
    return /*#__PURE__*/React.createElement(NewsCard, {
      key: "news-".concat(article.url || index),
      article: article
    });
  })), /*#__PURE__*/React.createElement("div", {
    className: "col s12 m6"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "section-title"
  }, "Recent Activity"), Array.isArray(activities) && activities.map(function (activity, index) {
    // Create a unique key using multiple properties
    var uniqueKey = "".concat(activity._id, "-").concat(activity.activityType, "-").concat(index);
    return /*#__PURE__*/React.createElement("div", {
      key: uniqueKey,
      ref: index === activities.length - 1 ? lastActivityRef : null
    }, /*#__PURE__*/React.createElement(ActivityCard, {
      activity: activity
    }));
  }), loading && /*#__PURE__*/React.createElement("div", {
    className: "center-align"
  }, /*#__PURE__*/React.createElement("div", {
    className: "preloader-wrapper small active"
  }, /*#__PURE__*/React.createElement("div", {
    className: "spinner-layer spinner-blue-only"
  }, /*#__PURE__*/React.createElement("div", {
    className: "circle-clipper left"
  }, /*#__PURE__*/React.createElement("div", {
    className: "circle"
  })), /*#__PURE__*/React.createElement("div", {
    className: "gap-patch"
  }, /*#__PURE__*/React.createElement("div", {
    className: "circle"
  })), /*#__PURE__*/React.createElement("div", {
    className: "circle-clipper right"
  }, /*#__PURE__*/React.createElement("div", {
    className: "circle"
  })))))));
};
window.Feed = Feed;