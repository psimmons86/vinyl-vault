"use strict";

// NewsCard.jsx
var NewsCard = function NewsCard(_ref) {
  var article = _ref.article;
  return /*#__PURE__*/React.createElement("div", {
    className: "card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "card-image"
  }, article.imageUrl && /*#__PURE__*/React.createElement("img", {
    src: article.imageUrl,
    alt: article.title
  })), /*#__PURE__*/React.createElement("div", {
    className: "card-content"
  }, /*#__PURE__*/React.createElement("span", {
    className: "card-title"
  }, article.title), /*#__PURE__*/React.createElement("p", null, article.description)), /*#__PURE__*/React.createElement("div", {
    className: "card-action"
  }, /*#__PURE__*/React.createElement("a", {
    href: article.url,
    target: "_blank",
    rel: "noopener noreferrer"
  }, "Read More")));
};
window.NewsCard = NewsCard;