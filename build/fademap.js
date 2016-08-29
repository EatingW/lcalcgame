'use strict';

var ExprManager = function () {
    var pub = {};

    var _FADE_MAP = {
        'if': [LockIfStatement, InlineLockIfStatement, IfStatement],
        'ifelse': [IfElseStatement],
        'triangle': [TriangleExpr, FadedTriangleExpr],
        'rect': [RectExpr, FadedRectExpr],
        'star': [StarExpr, FadedStarExpr],
        'circle': [CircleExpr, FadedCircleExpr],
        'diamond': [RectExpr, FadedRectExpr],
        '_': [MissingExpression],
        '__': [MissingBagExpression],
        '_b': [MissingKeyExpression, MissingBooleanExpression],
        'true': [KeyTrueExpr, TrueExpr],
        'false': [KeyFalseExpr, FalseExpr],
        'cmp': [MirrorCompareExpr, CompareExpr, FadedCompareExpr],
        '==': [MirrorCompareExpr, CompareExpr, FadedCompareExpr],
        '!=': [MirrorCompareExpr, CompareExpr, FadedCompareExpr],
        'bag': [BagExpr, BracketArrayExpr],
        'count': [CountExpr],
        'map': [FunnelMapFunc, SimpleMapFunc, FadedMapFunc],
        'reduce': [ReduceFunc],
        'put': [PutExpr],
        'pop': [PopExpr],
        'define': [DefineExpr],
        'var': [LambdaVarExpr, FadedLambdaVarExpr],
        'hole': [LambdaHoleExpr, FadedLambdaHoleExpr],
        'lambda': [LambdaHoleExpr, FadedLambdaHoleExpr]
    };
    var fade_level = {};
    var DEFAULT_FADE_LEVEL = 0;

    var DEFAULT_FADE_PROGRESSION = {
        'var': [[8, 42]],
        'hole': [[8, 42]],
        'if': [32],
        '_b': [32],
        '==': [21],
        'true': [41],
        'false': [41]
    };

    pub.getClass = function (ename) {
        if (ename in _FADE_MAP) {
            return _FADE_MAP[ename][pub.getFadeLevel(ename)];
        } else {
            console.error('Expression type ' + ename + ' is not in the fade map.');
            return undefined;
        }
    };
    pub.getFadeLevel = function (ename) {
        if (ename in fade_level) return fade_level[ename];else if ((ename === 'var' || ename === 'hole') && 'lambda' in fade_level) return fade_level.lambda;else if (ename in DEFAULT_FADE_PROGRESSION) {
            var lvl_map = DEFAULT_FADE_PROGRESSION[ename];
            var fadeclass_idx = 0;
            for (var i = 0; i < lvl_map.length; i++) {
                var range = lvl_map[i];
                if (Array.isArray(range)) {
                    if (level_idx >= range[0] && level_idx < range[1]) fadeclass_idx = i + 1;
                } else if (level_idx >= range) fadeclass_idx = i + 1;
            }
            return fadeclass_idx;
        } else if (DEFAULT_FADE_LEVEL >= pub.getNumOfFadeLevels(ename)) return pub.getNumOfFadeLevels(ename) - 1;else return DEFAULT_FADE_LEVEL;
    };
    pub.getNumOfFadeLevels = function (ename) {
        if (!ename) return;else if (!(ename in _FADE_MAP)) {
            console.error('Expression type ' + ename + ' is not in the fade map.');
            return;
        }
        return _FADE_MAP[ename].length;
    };
    pub.setFadeLevel = function (ename, index) {
        if (!ename) return;else if (!(ename in _FADE_MAP)) {
            console.error('Expression type ' + ename + ' is not in the fade map.');
            return;
        } else if (pub.getNumOfFadeLevels(ename) >= index) {
            console.warn('Expression type ' + ename + ' has only ' + pub.getNumOfFadeLevels(ename) + ' fade levels. (' + index + 'exceeds)');
            index = pub.getNumOfFadeLevels(ename) - 1; // Set to max fade.
        }
        fade_level[ename] = index;
    };
    pub.setDefaultFadeLevel = function (index) {
        if (index >= 0) DEFAULT_FADE_LEVEL = index;
    };
    pub.clearFadeLevels = function () {
        fade_level = {};
    };

    return pub;
}();