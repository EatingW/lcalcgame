var __SHOW_DEV_INFO = true;
var __COND = 'unknown';

var GLOBAL_DEFAULT_CTX = null;
var GLOBAL_DEFAULT_SCREENSIZE = null;
var stage;
var canvas;

var level_idx = getCookie('level_idx') || 0;
if (level_idx !== 0) level_idx = parseInt(level_idx);
var cur_menu = null;

function init() {

    // -- TEST CORS --
    // $.ajax({
    //     type: "GET",
    //     url: 'http://gdiac.cs.cornell.edu/research_games/page_load.php',
    //     data:{game_id:7017018, client_timestamp:1},
    //     async:true,
    //     dataType : 'jsonp',   //you may use jsonp for cross origin request
    //     crossDomain:true,
    //     success: function(data, status, xhr) {
    //         //console.log('Connected to server.');
    //     }
    // });

    Resource.setCurrentLoadSequence('init');
    LOAD_REDUCT_RESOURCES(Resource);

    if (!__SHOW_DEV_INFO)
        $('#devinfo').hide();

    if (__GET_PARAMS) {
        var start_from = __GET_PARAMS.level;
        var fade_level = __GET_PARAMS.fade;
        //var playerId = __GET_PARAMS.player;
        if (start_from) {
            console.log(start_from);
            level_idx = parseInt(start_from);
        }
        //if (playerId) {
        //    Logger.playerId = playerId;
        //}
        if (fade_level && fade_level > 0) {
           ExprManager.setDefaultFadeLevel(parseInt(fade_level));
        }
    }

    // Wait until page is loaded, then...
    Pace.on('done', () => {

        // Wait until all resources are loaded...
        // * This callback must be set only after all load() method calls... *
        Resource.afterLoadSequence('init', () => {

            // Start a new log session (creating userID as necessary),
            // and then begin the game.
            Logger.startSession().then(function (userinfo) {

                if (userinfo.cond) {
                    __COND = userinfo.cond;

                    if (userinfo.cond === 'B')
                        ExprManager.setDefaultFadeLevel(100);
                }

                return loadChapterSelect();
            }).then(initMainMenu);

        });

    });
}

function loadCustomLevel(lvl_desc, goal_desc) {
    stage = Resource.buildLevel( { board:lvl_desc, goal:goal_desc, toolbox:"" }, canvas );
    stage.update();
    stage.draw();
}
function levelChanged(val) {
    if (!isNaN(parseInt(val))) {
        if (val < 0) val = 0;
        else if (val >= Resource.level.length) val = Resource.level.length - 1;
        level_idx = val;
        initBoard();
    }
}

function clearStage() {
    if (stage) {
        stage.clear();
        stage.invalidate();
        //delete stage;
        stage = null;
    }

    if (mag.AnimationUpdateLoop) {
        mag.AnimationUpdateLoop.clear();
    }
}

function redraw(stage) {
    if (stage) {
        stage.update();
        stage.draw();
        stage.draw();
    }
}

// function initChapterMenu(chapterName) {
//     canvas = document.getElementById('canvas');
//     stage = Resource.startChapter(chapterName, canvas);
//     cur_chapter = chapterName;
//     redraw(stage);
// }

function initLevel(levelSelected, levelSelectedIdx) {
    if (stage instanceof ChapterSelectMenu) {
        cur_menu = stage;
        cur_menu.invalidate();
    }
    level_idx = levelSelectedIdx;
    stage = Resource.buildLevel(levelSelected, canvas);
    redraw(stage);
}

function returnToMenu() {
    if (cur_menu) {
        prepareCanvas();
        cur_menu.validate();
        console.log(cur_menu);
        cur_menu.updateLevelSpots();
        stage = cur_menu;
        redraw(stage);
    } else {
        initMainMenu();
    }
}

function initChapterSelectMenu(flyToChapIdx) {
    canvas = document.getElementById('canvas');
    if (canvas.getContext) {
        clearStage();
        prepareCanvas();
        stage = new ChapterSelectMenu(canvas, initLevel, flyToChapIdx);
        redraw(stage);
    }
}

function initMainMenu() {

    canvas = document.getElementById('canvas');

    if (canvas.getContext) {

        prepareCanvas();
        $(canvas).css('background-color','#EEE');

        //stage = new MainMenu(canvas, initChapterSelectMenu);

        // stage = new MainMenu(canvas, () => {
        //
        //     //Clicks 'play' button. Transition to chapter select screen.
             //stage = new ChapterSelectMenu(canvas, initLevel);
             //redraw(stage);
        //
        // });
        //}, () => {
            // Clicked 'settings' button. Transition to settings screen.
        //});

        initBoard();

        // let dropdown = new DropdownSelect( 200, 100, 120, 40, [ "A", "B", "C" ], null, "YellowGreen", "Green", "PaleGreen", false );
        // stage.add(dropdown);
        // Animate.wait(1000).after(() => dropdown.expand(true));

        // let drawer = new PulloutDrawer(200, 260, 14, 44, { 'pop':true, 'push':true, 'map':true });
        // stage.add(drawer);

        // let ee = new EntangledExpr( Level.parse('(2) (3) (4) (5)'), true );
        // ee.pos = { x:300, y:230 };
        // stage.add(ee);
        //
        // let ee2 = new EntangledExpr( Level.parse('(1) (2) (3) (4)'), false );
        // ee2.pos = { x:300, y:280 };
        // stage.add(ee2);
        //
        // EntangledExpr.pairedAnimate(ee, ee2);

        // let obj = new ObjectExtensionExpr(new BracketArrayExpr(0, 0, 44, 44),
        //                                   { // Reduce methods for the submethods of the object.
        //                                     'pop':(arrayExpr) => {
        //                                         if (arrayExpr.items.length === 0) return arrayExpr; // TODO: This should return undefined.
        //                                         let item = arrayExpr.items[0].clone();
        //                                         return item;
        //                                   },
        //                                     'push':(arrayExpr, pushedExpr) => {
        //
        //                                         if (!pushedExpr ||
        //                                             pushedExpr instanceof MissingExpression ||
        //                                             pushedExpr instanceof LambdaVarExpr)
        //                                             return arrayExpr;
        //                                         else {
        //                                             let new_coll = arrayExpr.clone();
        //                                             new_coll.addItem(pushedExpr.clone()); // add item to bag
        //                                             return new_coll; // return new bag with item appended
        //                                         }
        //
        //                                   },
        //                                     'map':(arrayExpr, lambdaExpr) => {
        //                                         let mapped = arrayExpr.map(lambdaExpr);
        //                                         if (mapped) return mapped;
        //                                         else        return arrayExpr;
        //                                   }});
        let obj = new ArrayObjectExpr(new BracketArrayExpr(0, 0, 44, 44));
        obj.pos = { x:200, y:200 };
        stage.add(obj);

        stage.add( Level.parse('(λx /(== #x /star))')[0] )
        stage.add( Level.parse('rect')[0] )
        stage.add( Level.parse('star')[0] )

        let apply = new ApplyExpr( Level.parse('3')[0], Level.parse('(λx /(+ #x /3))')[0] );
        apply.pos = { x:200, y:400 };
        stage.add(apply);
        console.log(apply);

        // let meta = new MetaExpression(stage, Resource.buildLevel(Resource.level[10], stage.canvas));
        // meta.pos = { x:200, y:200 };
        // stage.add(meta);

        //let inf = new InfiniteExpression( new (ExprManager.getClass('star'))(0,0,25,5) );

        // let inf = new InfiniteExpression( new TrueExpr() );
        // inf.pos = { x:400, y:300 };
        // stage.add(inf);
        //
        // let def = new DefineExpr( new MissingExpression(), 'double' );
        // def.pos = { x:300, y:400 };
        // stage.add(def);
        // console.log(def);

        /*
        let substage = new mag.StageNode(0, 0, Resource.buildLevel(Resource.level[10], canvas), canvas);
        //substage.scale = { x:0.5, y:0.5 };
        substage.anchor = { x:0.5, y:0.5 };
        substage.pos = { x:stage.boundingSize.w/2, y:stage.boundingSize.h/2 };
        stage.add(substage);
        substage.canvas = null;
        stage.canvas = null;
        stage.canvas = canvas;*/

        //substage.clip = { l:0.14, r:0.22, t:0, b:0.11 };

        redraw(stage);

        //Animate.tween(substage, { scale:{x:0.5, y:0.5} }, 1000);

        //Animate.tween(substage, { clip:{ l:0.14, r:0.22, t:0, b:0.11 } }, 1000, (e) => Math.pow(e, 2)).after(() => {
        //    Animate.tween(substage, { clip:{ l:0, r:1, t:0, b:1 } }, 1000, (e) => Math.pow(e, 2));
        //});

        //Animate.tween(substage, { clip:{ l:0.14, r:0.22, t:0, b:0.11 },
        //    pos:{x:stage.boundingSize.w/2 - stage.boundingSize.w*0.14 + stage.boundingSize.w/2, y:stage.boundingSize.h*(1-0.11/2)} }, 1000);
    }
}

function prepareCanvas() {
    canvas = document.getElementById('canvas');
    if (canvas.getContext) {
        clearStage();

        if (__IS_MOBILE) {

            // Width 100% and height 100%
            let resizeCanvas = function() {
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight;
                GLOBAL_DEFAULT_SCREENSIZE = canvas.getBoundingClientRect();
            };

            // Resize canvas during a mobile phone orientation change.
            window.addEventListener('resize', resizeCanvas, false);
            window.addEventListener('orientationchange', resizeCanvas, false);
            resizeCanvas();
        }

        hideHelpText();
        hideEndGame();
        updateProgressBar();

        GLOBAL_DEFAULT_CTX = canvas.getContext('2d');
        GLOBAL_DEFAULT_SCREENSIZE = canvas.getBoundingClientRect();
    }
}

function saveProgress() {
    var cookie = getCookie('level_idx');
    if (cookie.length === 0 || level_idx > parseInt(cookie)) {
        setCookie('level_idx', level_idx);
    }
}

function initBoard() {

    canvas = document.getElementById('canvas');

    if (canvas.getContext) {

        clearStage();
        prepareCanvas();

        // New: saves progress upon reload.
        saveProgress();
        $('#lvl_num_visible').text((level_idx+1) + '');

        stage = Resource.buildLevel(Resource.level[level_idx], canvas);

        Logger.transitionToTask(level_idx, stage.toString()).then(function() {

            Logger.log('condition', __COND);

        }).catch(function (err) {
            //console.error(err);
        });

        /*var es = stage.getNodesWithClass(Expression, [], true);
        var tes = stage.getNodesWithClass(TextExpr, [], true);
        es.forEach(function(e) {
            e.color = "white";
        });
        tes.forEach(function(t) {
            t.color = "black";
        });*/

        // One-time only blink of lambda holes on first level.
        if (level_idx === 0) {
            var holes = stage.getNodesWithClass(FadedES6LambdaHoleExpr, [], true);
            if (holes.length > 0) { // This is the 'faded' (completely abstract) version of the game.
                showHelpText();
                var runCount = 0;
                var waitBlink = function (waittime, blinktime, cancelCond) {
                    Animate.wait(waittime).after(function() {
                        if (cancelCond()) {
                            return;
                        }
                        else Animate.blink(holes, blinktime, [1,1,0], 1).after(function() {
                            runCount++;
                            waitBlink(waittime, blinktime, cancelCond);
                        });
                    });
                };
                waitBlink(3000, 1500, function() {
                    return !(holes[0].stage) || !(holes[0].parent) || stage.ranCompletionAnim || runCount > 1;
                });
            }
        }

        stage.update();
        stage.draw();

        // This fixes some render bugs. Not exactly sure why.
        stage.draw();
    }
}

function initEndGame() {
    canvas = document.getElementById('canvas');
    if (canvas.getContext) {

        clearStage();
        updateProgressBar();

        var size = canvas.getBoundingClientRect();
        $('#endscreen').css( { top:size.height / 3.0 } );
        $('#endscreen').show();

        Logger.log('game-complete', {});

        Resource.play('game-complete');
    }
}
function hideEndGame() {
    $('#endscreen').hide();
}

function showHelpText(txt) {
    var help = $('#help');
    var size = canvas.getBoundingClientRect();
    help.css( { top:size.height / 1.3, color:'#AAA' } );
    if (txt) help.text(txt);
    help.show();
}
function hideHelpText() {
    $('#help').hide();
}

function toggleDevInfo() {
    var devinfo = $('#devinfo');
    var txt = $('#devInfoBtnText');
    if (devinfo.is(':visible')) {
        devinfo.hide();
        txt.text('Show');
    } else {
        devinfo.show();
        txt.text('Hide');
    }
}

var __IS_LOGGING = true;
function toggleLogging() {
    var l = $('#toggleLogLink');
    if (Logger.isLogging()) {
        Logger.toggleLogging(false);
        l.text("Click here you'd like to turn data logging back on.");
    } else {
        Logger.toggleLogging(true);
        l.text("Click here you'd prefer to turn data logging off.");
    }
}

function updateProgressBar() {
    if ($('#progressBar').length > 0)
        setProgressBar('progressBar', 'progressBarContainer', level_idx / (Resource.level.length - 1));
}
function prev() {
    if (!Logger.sessionBegan()) return;
    if (level_idx === 0) initBoard();
    else {
        level_idx--;
        initBoard();
    }
}
function next() {
    if (!Logger.sessionBegan()) return;
    if (level_idx === Resource.level.length-1) {
        initEndGame();
    }
    else {
        level_idx++;

        Resource.getChapters().then((chapters) => {
            for (let i = 0; i < chapters.length; i++) {
                if (chapters[i].startIdx === level_idx) {
                    // Fly to the next planet,
                    // instead of going to the next level.
                    level_idx--;
                    initChapterSelectMenu(i);
                    return;
                }
            }

            // Otherwise...
            initBoard();
        });
    }
}
function undo() {
    if (!Logger.sessionBegan()) return;
    stage.restoreState();
}

function loadChapterSelect() {
    /*var sel = document.getElementById("chapterSelect");
    removeOptions(sel); // clear old options.
    return Resource.getChapters().then( function(chapters) {
        chapters.forEach(function (chap) {
            var option = document.createElement("option");
            option.text = chap.description;
            option.value = chap.name;
            sel.add(option);
        });*/
    return Resource.getChapters();
    //} );
}
function gotoChapter() {
    var sel = document.getElementById('chapterSelect');
    var selected_chapter = sel.options[sel.selectedIndex].value;
    level_idx = Resource.getChapter(selected_chapter).startIdx;
    initBoard();
}
