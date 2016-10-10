"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

// The panel at the bottom of the screen.
var EnvironmentDisplay = function (_mag$ImageRect) {
    _inherits(EnvironmentDisplay, _mag$ImageRect);

    function EnvironmentDisplay(x, y, w, h) {
        _classCallCheck(this, EnvironmentDisplay);

        var _this = _possibleConstructorReturn(this, (EnvironmentDisplay.__proto__ || Object.getPrototypeOf(EnvironmentDisplay)).call(this, x, y, w, h, 'toolbox-bg'));

        _this.padding = 20;
        _this.env = null;
        _this.contents = [];
        _this.opacity = 0.1;
        return _this;
    }

    _createClass(EnvironmentDisplay, [{
        key: "showEnvironment",
        value: function showEnvironment(env) {
            var _this2 = this;

            if (!env) return;
            this.opacity = 0.8;
            this.env = env;
            var pos = this.leftEdgePos;
            var setup = function setup(e, padding) {
                e.update();
                _this2.stage.add(e);
                _this2.contents.push(e);
                e.anchor = { x: 0, y: 0.5 };
                e.pos = pos;
                pos = addPos(pos, { x: e.size.w, y: 0 });
            };
            env.names().forEach(function (name) {
                var label = new TextExpr(name + "=");
                setup(label, 0);

                var e = env.lookup(name).clone();
                setup(e, _this2.padding);
            });
        }
    }, {
        key: "clear",
        value: function clear() {
            this.opacity = 0.1;
            if (this.env) {
                var _iteratorNormalCompletion = true;
                var _didIteratorError = false;
                var _iteratorError = undefined;

                try {
                    for (var _iterator = this.contents[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                        var child = _step.value;

                        this.stage.remove(child);
                    }
                } catch (err) {
                    _didIteratorError = true;
                    _iteratorError = err;
                } finally {
                    try {
                        if (!_iteratorNormalCompletion && _iterator.return) {
                            _iterator.return();
                        }
                    } finally {
                        if (_didIteratorError) {
                            throw _iteratorError;
                        }
                    }
                }
            }
            this.contents = [];
            this.env = null;
        }
    }, {
        key: "leftEdgePos",
        get: function get() {
            return { x: this.padding * 2 + this.pos.x, y: this.size.h / 2.0 + this.pos.y };
        }
    }]);

    return EnvironmentDisplay;
}(mag.ImageRect);