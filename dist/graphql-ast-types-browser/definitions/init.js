'use strict';
var _slicedToArray = (function () {
  function sliceIterator(arr, i) {
    var _arr = [];
    var _n = true;
    var _d = false;
    var _e = undefined;
    try {
      for (
        var _i = arr[Symbol.iterator](), _s;
        !(_n = (_s = _i.next()).done);
        _n = true
      ) {
        _arr.push(_s.value);
        if (i && _arr.length === i) break;
      }
    } catch (err) {
      _d = true;
      _e = err;
    } finally {
      try {
        if (!_n && _i['return']) _i['return']();
      } finally {
        if (_d) throw _e;
      }
    }
    return _arr;
  }
  return function (arr, i) {
    if (Array.isArray(arr)) {
      return arr;
    } else if (Symbol.iterator in Object(arr)) {
      return sliceIterator(arr, i);
    } else {
      throw new TypeError(
        'Invalid attempt to destructure non-iterable instance'
      );
    }
  };
})();
var _index = require('./index');
var _index2 = _interopRequireDefault(_index);
var _graphql = require('./graphql');
var _graphql2 = _interopRequireDefault(_graphql);
function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}
(0, _graphql2.default)().forEach(function (_ref) {
  var _ref2 = _slicedToArray(_ref, 2),
    name = _ref2[0],
    params = _ref2[1];
  return (0, _index2.default)(name, params);
});
