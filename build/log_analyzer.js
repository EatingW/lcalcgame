'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var LogAnalyzer = function () {

    var __LOG_STORAGE_PATH = 'log_analyzer/logs';
    var pub = {};
    var users = {};

    var User = function () {
        function User(name) {
            _classCallCheck(this, User);

            this.name = name;
            this.sessions = [];
        }

        _createClass(User, [{
            key: 'addSession',
            value: function addSession(session) {
                this.sessions.push(session);
            }
        }, {
            key: 'getAllTasks',
            value: function getAllTasks() {
                return this.sessions.reduce(function (tasks, session) {
                    return tasks.concat(session.tasks);
                }, []);
            }
        }, {
            key: 'getTasksNamed',
            value: function getTasksNamed(taskName) {
                return this.sessions.reduce(function (tasks, session) {
                    return tasks.concat(session.getTasksNamed(taskName));
                }, []);
            }

            // Gets the user for the log, if any.

        }], [{
            key: 'for',
            value: function _for(logs) {
                var sessionStart = getFirstTask('startSession', logs);
                if (!sessionStart) console.error('@ User: startSession is ', sessionStart);
                return sessionStart[1]['user_id'];
            }
        }]);

        return User;
    }();

    var Session = function () {
        function Session(name, logs) {
            _classCallCheck(this, Session);

            this.name = name;
            this.logs = logs;
            this.tasks = Task.tasksFor(logs);
            console.log(' >>> session ' + name + ' has ' + this.tasks.length + ' tasks.');
        }

        _createClass(Session, [{
            key: 'getTasksNamed',
            value: function getTasksNamed(taskName) {
                //console.log('getting tasks named ' + taskName, this);
                return this.tasks.filter(function (task) {
                    return task.name === taskName;
                });
            }

            // Gets the session for the log, if any.

        }], [{
            key: 'for',
            value: function _for(logs) {
                var sessionStart = getFirstTask('startSession', logs);
                if (!sessionStart) console.error('@ User: startSession is ', sessionStart);
                return sessionStart[1]['session_id'];
            }
        }]);

        return Session;
    }();

    var StateRepr = function () {
        function StateRepr(str) {
            _classCallCheck(this, StateRepr);

            var exprs = argsForExprString(str);

            // Convert lambda expressions to an invariant representation.
            this.exprs = exprs.map(function (e) {

                e = e.replace(/diamond/g, '■').replace(/rect/g, '■').replace(/star/g, '★').replace(/triangle/g, '▲').replace(/tri/g, '▲').replace(/circle/g, '●');

                if (isLambdaExpr(e)) return deBruijn(e);else return e;
            });
        }

        _createClass(StateRepr, [{
            key: 'equals',
            value: function equals(otherExprSet) {

                // Compares the expression arrays like sets,
                // using the expression comparison function above.
                return setCompare(this.exprs, otherExprSet.exprs, StateRepr.areExpressionsEqual);
            }
        }, {
            key: 'toString',
            value: function toString() {
                var s = '';
                this.exprs.forEach(function (e) {
                    s += e + ' ';
                });
                return s.trim();
            }
        }], [{
            key: 'areExpressionsEqual',
            value: function areExpressionsEqual(e1, e2) {

                e1 = stripParen(e1);
                e2 = stripParen(e2);
                if (e1 === e2) return true; // true even for lambdas now...

                // Finer equivalence for expressions invariant to order-of-operations.
                if (isComparisonExpr(e1) && isComparisonExpr(e2)) {
                    var a1 = argsForExprString(e1);
                    var a2 = argsForExprString(e2);
                    if (a1[0] === a2[0]) {
                        // if same operation, then check other args...
                        return setCompare(a1.slice(1), a2.slice(1), StateRepr.areExpressionsEqual); // blah, magic
                    }
                }

                return false;
            }
        }]);

        return StateRepr;
    }();

    var StateReprSet = function () {
        function StateReprSet() {
            _classCallCheck(this, StateReprSet);

            this.states = [];
        }

        _createClass(StateReprSet, [{
            key: 'get',
            value: function get(equivStateRepr) {
                var len = this.states.length;
                for (var i = 0; i < len; i++) {
                    if (equivStateRepr.equals(this.states[i])) return this.states[i]; // This state is already in the set.
                }
                return null;
            }
        }, {
            key: 'map',
            value: function map(mapfunc) {
                return this.states.map(mapfunc);
            }
        }, {
            key: 'slice',
            value: function slice() {
                var srs = new StateReprSet();
                srs.states = this.states.slice();
                return srs;
            }
        }, {
            key: 'forEach',
            value: function forEach(fefunc) {
                this.states.forEach(fefunc);
            }
        }, {
            key: 'update',
            value: function update(stateRepr) {
                var node = this.get(stateRepr);
                if (node) {
                    if (stateRepr.final) node.final = true;else if (stateRepr.initial) node.initial = true;
                    return node;
                } else {
                    this.states.push(stateRepr);
                    return stateRepr;
                }
            }
        }, {
            key: 'last',
            value: function last() {
                return this.states[this.states.length - 1];
            }
        }]);

        return StateReprSet;
    }();

    var Task = function () {
        function Task(task_logs) {
            _classCallCheck(this, Task);

            this.logs = task_logs;
            this.name = task_logs[0][1]['quest_id'];
        }

        _createClass(Task, [{
            key: 'getStateGraph',


            // Casts task to reduction state graph.
            value: function getStateGraph() {
                var nodes = new StateReprSet();
                var edges = [];
                var actions = this.actions;
                var prev_node = null;
                var next_edge_detail = null;

                // Add initial state.
                nodes.update(this.initialState);
                prev_node = nodes.last();

                actions.forEach(function (action) {
                    var name = action['action_id'];
                    var data = action['action_detail'];
                    var victory = name === 'victory';
                    if (victory) {
                        data = JSON.parse(data)['final_state'];
                    }
                    if (name === 'state-save' || victory) {

                        data = JSON.parse(data).board;

                        var state = new StateRepr(data);
                        //console.log(' >> state-save', data, state);
                        if (victory) state.final = true;

                        // Add a node for this state (does nothing if node already exists).
                        var node = nodes.update(state);

                        // Make an edge from the previous state to this one.
                        if (prev_node && !prev_node.equals(node)) {
                            var e = { from: prev_node, to: node, reduce: 1, undo: 0 };
                            if (next_edge_detail) {
                                e.reduction = next_edge_detail;
                                next_edge_detail = null;
                            }
                            edges.push(e);
                        }

                        prev_node = node;
                    } else if (name === 'state-restore') {

                        data = JSON.parse(data).board;

                        var _state = new StateRepr(data);

                        // This state should already be a node. Get it.
                        var _node = nodes.get(_state);
                        if (!_node) {
                            console.error('Error @ getStateGraph: Restored state was never reached in the first place!');
                            return;
                        }

                        // Make an edge from the current state (prev_node) to the previous state (node).
                        if (prev_node && !prev_node.equals(_node)) {
                            edges.push({ from: prev_node, to: _node, reduce: 0, undo: 1 });
                        }

                        prev_node = _node;
                    } else if (name.substring(0, 9) === 'reduction') {

                        data = JSON.parse(data);
                        if ('applied' in data) data.before = data.before + ' ' + data.applied;
                        next_edge_detail = data.before + ' → ' + data.after;
                    }
                });

                return { nodes: nodes, edges: edges };
            }
        }, {
            key: 'playTime',
            get: function get() {
                if (this.logs.length === 0) return 0;

                var startTask = this.logs[0][1];
                var vic = this.victoryAction;
                if (vic) return vic.client_timestamp - startTask.client_timestamp;else return this.logs[this.logs.length - 1][1].client_timestamp - startTask.client_timestamp;
            }
        }, {
            key: 'actions',
            get: function get() {
                return this.logs.filter(function (log) {
                    return log[0] === 'action';
                }).map(function (action) {
                    return action[1];
                });
            }
        }, {
            key: 'logIntervals',
            get: function get() {
                var len = this.logs.length;
                var intervalTimesMS = [];
                for (var i = 0; i < len - 1; i++) {
                    intervalTimesMS.push(this.logs[i + 1][1]['client_timestamp'] - this.logs[i][1]['client_timestamp']);
                }
                return intervalTimesMS;
            }
        }, {
            key: 'moves',
            get: function get() {
                //let v = this.victoryAction;
                var moveActionIDs = ['reduction-lambda', 'toolbox-remove', 'bag-spill', 'reduction', 'detach-commit', 'placed-expr']; // bag-add...
                return this.actions.filter(function (act, idx, arr) {

                    // this patches map level logs in the late-game...
                    var bagspillCheck = function bagspillCheck() {
                        var isMapReductPair = function isMapReductPair(i) {
                            if (i < 0) return false;
                            var a = arr[i];
                            return a.action_id === 'reduction' && a.action_detail.indexOf('map') > -1 && i < arr.length - 2 && arr[i + 2].action_id === 'bag-spill';
                        };

                        // Skip BOTH elements of the pair.
                        if (isMapReductPair(idx) || isMapReductPair(idx - 2)) return false;

                        return true;
                    };

                    return moveActionIDs.indexOf(act.action_id) > -1 && bagspillCheck();
                    //if (act.action_id === 'state-save' && (!v || v.client_timestamp > act.client_timestamp)) return true;
                    //else if (act.action_id === 'bag-add') return true;
                    //return false;
                });
            }
        }, {
            key: 'initialState',
            get: function get() {
                var state = new StateRepr(JSON.parse(this.logs.filter(function (log) {
                    return log[0] === 'startTask';
                })[0][1]['quest_detail']).board);
                state.initial = true;
                return state;
            }
        }, {
            key: 'victoryAction',
            get: function get() {
                var actions = this.actions;
                var _iteratorNormalCompletion = true;
                var _didIteratorError = false;
                var _iteratorError = undefined;

                try {
                    for (var _iterator = actions[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                        var a = _step.value;

                        if (a.action_id === 'victory') return a;
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

                return null;
            }
        }, {
            key: 'playerWon',
            get: function get() {
                return this.victoryAction !== null;
            }
        }], [{
            key: 'tasksFor',
            value: function tasksFor(logs) {
                var tasks = [];
                var len = logs.length;
                var start_idx = -1;
                for (var i = 0; i < len; i++) {
                    var log = logs[i];
                    if (log[0] === 'startTask') start_idx = i;else if (log[0] === 'endTask') {
                        if (i === start_idx + 1) continue; // skip tasks with no inner actions (skip overs)
                        tasks.push(new Task(logs.slice(start_idx, i + 1)));
                    }
                }
                tasks.push(new Task(logs.slice(start_idx, logs.length)));
                return tasks;
            }
        }]);

        return Task;
    }();

    /** USER INTERFACE */


    var userSelElem, sessionSelElem, taskSelElem, createStateGraph;
    pub.setUserSelect = function (selectElem) {
        userSelElem = selectElem;
        userSelElem.onchange = function () {
            refreshSessionList();
            sessionSelElem.selectedIndex = -1;
            refreshTaskVis();
            refreshTimeCompletionBar();
        };
    };
    pub.setSessionSelect = function (selectElem) {
        sessionSelElem = selectElem;
    };
    pub.setTaskSelect = function (selectElem) {
        selectElem.onchange = refreshTaskVis;
        taskSelElem = selectElem;
        removeAllOptions(taskSelElem);
        for (var i = 0; i < 72; i++) {
            var opt = document.createElement("option");
            opt.text = i.toString();
            opt.value = i.toString();
            taskSelElem.add(opt);
        }
    };
    pub.setStateGraphCallback = function (cb) {
        createStateGraph = cb;
    };
    var removeAllOptions = function removeAllOptions(selectElem) {
        $(selectElem).empty();
        //var opts = selectElem.options;
        //for (let i = 0; i < opts.length; i++)
        //    selectElem.remove(opts[i]);
    };
    var getSelectedOptions = function getSelectedOptions(selectElem) {
        var opts = selectElem.options;
        var sel_opts = [];
        for (var i = 0; i < opts.length; i++) {
            if (opts[i].selected) sel_opts.push(opts[i]);
        }
        return sel_opts;
    };
    var getSelectedUsers = function getSelectedUsers() {
        var sel_opts = getSelectedOptions(userSelElem);
        return sel_opts.map(function (opt) {
            return users[opt.text];
        });
    };
    pub.getSelectedUsers = getSelectedUsers;
    var getSelectedTask = function getSelectedTask() {
        return parseInt(taskSelElem.options[taskSelElem.selectedIndex].value);
    };
    pub.getSelectedTask = getSelectedTask;
    var refreshUserList = function refreshUserList() {
        removeAllOptions(userSelElem);
        for (var user in users) {
            if (users.hasOwnProperty(user)) {
                var opt = document.createElement("option");
                opt.text = user;
                opt.value = user;
                userSelElem.add(opt);
            }
        }
    };
    var refreshSessionList = function refreshSessionList() {
        removeAllOptions(sessionSelElem);
        var sel_users = getSelectedUsers();
        sel_users.forEach(function (user) {
            user.sessions.forEach(function (session) {
                var opt = document.createElement("option");
                opt.text = session.name;
                opt.value = session.name;
                sessionSelElem.add(opt);
            });
        });
    };
    var refreshTimeCompletionBar = function refreshTimeCompletionBar() {

        if (parseInt(userSelElem.selectedIndex) === -1) return;
        if (parseInt(sessionSelElem.selectedIndex) === -1) {
            // No sessions selected. Go off user selection.
            var sel_users = getSelectedUsers();

            var users_with_tasks = {};
            var avg_time_by_name = {};
            var avg_resets = {};
            var skip_overs = {};
            var total_moves = {};

            var action_times = {};
            var single_user = sel_users.length === 1;

            sel_users.forEach(function (user) {

                // Get all tasks for this user.
                var all_tasks = user.getAllTasks();

                // For each task, compile the average playtime, and sort by task #.
                var tasks_by_name = {};
                all_tasks.forEach(function (task) {
                    //if (!task.playerWon) {} // skip tasks the player skipped.
                    if (task.name in tasks_by_name) tasks_by_name[task.name].push(task);else {
                        tasks_by_name[task.name] = [task];
                        if (task.name in users_with_tasks) users_with_tasks[task.name]++;else users_with_tasks[task.name] = 1;
                    }
                });

                for (var name in tasks_by_name) {
                    var ts = tasks_by_name[name];
                    var cumu_playtime = ts.reduce(function (acc, t) {
                        return acc + t.playTime;
                    }, 0);
                    var skipped = ts.reduce(function (acc, t) {
                        return acc || t.playerWon;
                    }, false) ? 0 : 1;
                    var num_resets = ts.length - 1;
                    //let min_move = Math.min.apply(null, ts.filter((t) => t.victoryAction !== null)
                    //                                      .map((t) => t.moves.length));
                    //min_moves[name] = min_move;

                    if (single_user) {
                        action_times[name] = ts.map(function (t) {
                            return t.logIntervals.map(function (a) {
                                return a / 1000.0;
                            });
                        });
                        total_moves[name] = ts.map(function (t) {
                            return t.moves.length;
                        }).reduce(function (a, b) {
                            return a + b;
                        }, 0);
                    }

                    if (name in avg_time_by_name) avg_time_by_name[name] += cumu_playtime;else avg_time_by_name[name] = cumu_playtime;

                    if (name in avg_resets) avg_resets[name] += num_resets;else avg_resets[name] = num_resets;

                    if (name in skip_overs) skip_overs[name] += skipped;else skip_overs[name] = skipped;
                }
            });

            for (var name in users_with_tasks) {
                avg_time_by_name[name] /= users_with_tasks[name];
                avg_resets[name] /= users_with_tasks[name];
                skip_overs[name] /= users_with_tasks[name];
            }

            var parts = [];
            var names = Object.keys(avg_time_by_name);
            names.sort(function (a, b) {
                return a - b;
            });
            for (var i = 0; i < names.length; i++) {
                var _name = names[i];
                parts.push({
                    name: _name,
                    value: 1.0 / names.length,
                    time: avg_time_by_name[_name],
                    resets: avg_resets[_name],
                    skips: skip_overs[_name],
                    actionTimes: _name in action_times ? action_times[_name] : undefined,
                    moves: _name in total_moves ? Math.max(total_moves[_name], 1) : undefined // cannot have zero moves!
                    //optimalMoves: min_moves[name]
                });
            }

            // Get data on all tasks that the selected users have played.
            //var all_tasks = sel_users.reduce((tasks, user) => tasks.concat(user.getAllTasks()), []);

            console.log('selected users: ', sel_users);
            loadPartitionBar('levelTimeBarContainer', parts);
        } else loadPartitionBar('levelTimeBarContainer', []);
    };
    var refreshTaskVis = function refreshTaskVis() {
        var task = getSelectedTask();

        if (parseInt(userSelElem.selectedIndex) === -1) return;
        if (parseInt(sessionSelElem.selectedIndex) === -1) {
            // No sessions selected. Go off user selection.
            var sel_users = getSelectedUsers();

            // Get all data on level taskName that the selected users have played.
            var sel_tasks = sel_users.reduce(function (tasks, user) {
                return tasks.concat(user.getTasksNamed(task));
            }, []);

            // Convert these tasks into state graphs.
            var state_graphs = sel_tasks.map(function (task) {
                return task.getStateGraph();
            });

            // Merge the state graphs.
            // (a) Merge the nodes.
            var all_nodes = new StateReprSet();
            var raw_nodesets = state_graphs.reduce(function (nodes, graph) {
                return nodes.concat(graph.nodes.slice());
            }, []);
            raw_nodesets.forEach(function (nodeset) {
                nodeset.forEach(function (node) {
                    all_nodes.update(node); // Add node to merged set.
                });
            });
            // (b) Recalculate the edges with respect to the kept nodes.
            var raw_edges = state_graphs.reduce(function (edges, graph) {
                return edges.concat(graph.edges.slice());
            }, []);
            raw_edges = raw_edges.map(function (edge) {
                var e = { from: all_nodes.get(edge.from),
                    to: all_nodes.get(edge.to),
                    reduce: edge.reduce,
                    undo: edge.undo };
                if (edge.reduction) e.reduction = edge.reduction;
                return e;
            });
            // (c) Merge identical edges.
            for (var i = 0; i < raw_edges.length - 1; i++) {
                var e1 = raw_edges[i];
                for (var j = i + 1; j < raw_edges.length; j++) {
                    var e2 = raw_edges[j];
                    if (e1.from.equals(e2.from) && e1.to.equals(e2.to)) {

                        // Edges are equal. Merge and remove.
                        e1.reduce += e2.reduce;
                        e1.undo += e2.undo; // tally any properties...
                        raw_edges.splice(j, 1);
                        j--;
                    }
                }
            }

            // Edges and nodes should now be unique.
            // Merge back into a single state graph + display with vis.js.
            createStateGraph(all_nodes.map(function (state) {
                var s = state.toString();
                var node = { id: s, label: s, shape: 'box' };
                if (state.initial) {
                    node.color = {
                        background: 'LightGreen',
                        border: 'green',
                        highlight: {
                            background: 'Aquamarine',
                            border: 'LightSeaGreen'
                        }
                    };
                    node.initial = true;
                } else if (state.final) {
                    node.color = {
                        background: 'Gold',
                        border: 'Orange',
                        highlight: {
                            background: 'Yellow',
                            border: 'OrangeRed'
                        }
                    };
                    node.final = true;
                }
                return node;
            }), raw_edges.map(function (edge) {
                var e = { from: edge.from.toString(), to: edge.to.toString() };
                if (edge.undo > 0) e.color = 'red';
                // if (edge.reduction) e.label = edge.reduction;
                return e;
            }));
            //label:('reduce:' + edge.reduce + '\nundo:' + edge.undo) }) ));
        } else {
                // ... TBI ...
                console.error('Not yet implemented.');
            }
    };
    pub.refreshTaskVis = refreshTaskVis;

    /** DATA */
    var getTasks = function getTasks(taskName, logs) {
        return logs.filter(function (log) {
            return log[0] === taskName;
        });
    };
    var getFirstTask = function getFirstTask(taskName, logs) {
        for (var i = 0; i < logs.length; i++) {
            if (logs[i][0] === taskName) return logs[i];
        }
        return null;
    };

    var parseLog = function parseLog(json) {

        // Convert format of NodeJS data logs...
        var logs;
        if (json[0] === '{') {
            var lines = json.match(/[^\r\n]+/g);
            logs = lines.map(function (line) {
                var logobj = JSON.parse(line);
                return [logobj["0"], logobj["1"]];
            });
        } else logs = JSON.parse(json);

        var username = User.for(logs);
        var sessionID = Session.for(logs);
        var new_user = false;

        if (!(username in users)) {
            console.log(' > Added user ' + username + '.');
            users[username] = new User(username);
            refreshUserList();
            new_user = true;
        }

        console.log(' > For user: ' + username + '\n >> added session ' + sessionID + '.');
        users[username].addSession(new Session(sessionID, logs));

        if (new_user) refreshSessionList();
    };

    pub.handleFiles = function (files) {

        var numFiles = files.length;

        var _loop = function _loop(i) {
            var file = files[i];
            var filename = file.name;

            var reader = new FileReader();
            reader.onload = function (e) {
                var contents = e.target.result;
                console.log('Read file "' + filename + '"...');
                //console.log( " > " + contents);
                parseLog(contents);
            };

            reader.readAsText(file);
        };

        for (var i = 0; i < numFiles; i++) {
            _loop(i);
        }
    };

    return pub;
}();