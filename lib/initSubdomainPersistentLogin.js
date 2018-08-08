'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = initSubdomainPersistentLogin;
// based on the kadirahq/fast-render package, might collide!
var defaultOptions = { expiresAfterDays: 30, cookieName: 'meteor_subdomain_token' };

function initSubdomainPersistentLogin(meteor, domains) {
  var _ref = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : defaultOptions,
      expiresAfterDays = _ref.expiresAfterDays,
      cookieName = _ref.cookieName;

  // --------------------------------------------------------------------------
  // Helpers
  // --------------------------------------------------------------------------
  var setCookieToken = function setCookieToken(token, domain, expirationDate) {
    var expires = expirationDate.toUTCString();
    document.cookie = cookieName + '=' + token + '; expires=' + expires + '; domain=' + domain + '; path=/';
  };

  var setToken = function setToken(loginToken, expires) {
    domains.map(function (domain) {
      return setCookieToken(loginToken, domain, expires);
    });
  };

  var removeToken = function removeToken() {
    return setToken(null, new Date('1.1.1970'));
  };

  // parse cookie string and look for the login token
  var getToken = function getToken() {
    var name = cookieName + "=";
    var ca = document.cookie.split(';');
    for (var i = 0; i < ca.length; i++) {
      var c = ca[i];
      while (c.charAt(0) == ' ') {
        c = c.substring(1);
      }if (c.indexOf(name) != -1) return c.substring(name.length, c.length);
    }
    return "";
  };

  // --------------------------------------------------------------------------
  // Monkey Patching
  // --------------------------------------------------------------------------

  // override the getter, so in a different subdomain it will get the token
  // from a cookie first when a logintoken in localstorage is not found
  var originalGetItem = meteor._localStorage.getItem;
  meteor._localStorage.getItem = function (key) {
    // eslint-disable-line no-param-reassign
    var original = originalGetItem.call(meteor._localStorage, key);
    if (key === 'Meteor.loginToken') {
      // in case there is no login token in local storage, try get it from a cookie
      if (!original) return getToken();
    }
    return original;
  };

  // override Meteor._localStorage methods and resetToken accordingly
  var originalSetItem = meteor._localStorage.setItem;
  meteor._localStorage.setItem = function (key, value) {
    // eslint-disable-line no-param-reassign
    if (key === 'Meteor.loginToken') {
      var loginTokenExpires = meteor._localStorage.getItem('Meteor.loginTokenExpires');

      var date = void 0;
      if (loginTokenExpires) {
        date = new Date(loginTokenExpires);
      } else {
        date = new Date();
        date.setDate(date.getDate() + expiresAfterDays);
      }
      setToken(value, date);
    }

    originalSetItem.call(meteor._localStorage, key, value);
  };

  var originalRemoveItem = meteor._localStorage.removeItem;
  meteor._localStorage.removeItem = function (key) {
    // eslint-disable-line no-param-reassign
    if (key === 'Meteor.loginToken') removeToken();
    originalRemoveItem.call(meteor._localStorage, key);
  };
}