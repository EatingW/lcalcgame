import ast
import collections
import glob
import json
import os


import esprima
import matplotlib.pyplot as plt
import networkx as nx


Level = collections.namedtuple("Level", "id actions")


class NormalizeVisitor(esprima.NodeVisitor):
    def transform(self, node, metadata, **kwargs):
        """Transform a node."""
        if isinstance(node, esprima.nodes.Node):
            method = 'transform_' + node.__class__.__name__
            transformer = getattr(self, method, self.generic_transform)
            new_node = transformer(node, metadata, **kwargs)
            if new_node is not None:
                node = new_node
        return node

    def generic_transform(self, node, metadata, **kwargs):
        """Called if no explicit transform function exists for a node."""
        return node

    def transform_CallExpression(self, node, metadata, **kwargs):
        callee = SerializeVisitor().visit(node.callee)
        if callee.startswith("_"):
            kwargs = kwargs.copy()
            kwargs["preserve"] = True
        node.callee = self.transform(node.callee, None, **kwargs)
        node.arguments = [self.transform(n, None, **kwargs) for n in node.arguments]
        return node

    def transform_BinaryExpression(self, node, metadata, **kwargs):
        if isinstance(node.left, esprima.nodes.Literal) and \
           not isinstance(node.right, esprima.nodes.Literal):
            node.left, node.right = node.right, node.left
        return node

    def transform_Literal(self, node, metadata, **kwargs):
        # Normalize literal values
        if kwargs.get("preserve"):
            return node

        if isinstance(node.value, int) and not isinstance(node.value, bool):
            node.value = 0
            node.raw = str(node.value)
        elif isinstance(node.value, str):
            node.value = 'str'
            node.raw = repr(node.value)
        return node


class SerializeVisitor(esprima.NodeVisitor):
    def visit(self, node, **kwargs):
        """Visit a node."""
        if isinstance(node, esprima.nodes.Node):
            method = 'visit_' + node.__class__.__name__
            visitor = getattr(self, method, self.generic_visit)
            return visitor(node, **kwargs)
        return node

    def visit_Literal(self, node, **kwargs):
        return node.raw

    def visit_Identifier(self, node, **kwargs):
        return node.name

    def visit_BinaryExpression(self, node, **kwargs):
        return "({} {} {})".format(self.visit(node.left), node.operator, self.visit(node.right))

    def visit_ArrowFunctionExpression(self, node, **kwargs):
        return "({}) => {}".format(", ".join([
            self.visit(x) for x in node.params
        ]), self.visit(node.body))

    def visit_Expression(self, node, **kwargs):
        return self.visit(node.body)

    def visit_ExpressionStatement(self, node, **kwargs):
        return self.visit(node.expression)

    def visit_Script(self, node, **kwargs):
        return "\n".join(self.visit(n) for n in node.body)

    def visit_Directive(self, node, **kwargs):
        return self.visit(node.expression)

    def visit_ConditionalExpression(self, node, **kwargs):
        return "{} ? {} : {}".format(self.visit(node.test),
                                     self.visit(node.consequent),
                                     self.visit(node.alternate))

    def visit_CallExpression(self, node, **kwargs):
        callee = self.visit(node.callee, **kwargs)
        return "{}({})".format(
            callee,
            ", ".join(self.visit(n, **kwargs) for n in node.arguments))

    def visit_ArrayExpression(self, node, **kwargs):
        return "[{}]".format(", ".join(
            self.visit(n, **kwargs)
            for n in node.elements
        ))

    def visit_StaticMemberExpression(self, node, **kwargs):
        return "{}.{}".format(self.visit(node.object, **kwargs),
                              self.visit(node.property, **kwargs))


def normalize(js):
    return SerializeVisitor().visit(esprima.parse(js, delegate=NormalizeVisitor()))


def read_events(directory):
    """
    Read all events from all log files in a given directory.

    Assumes that the lexicographic ordering of the log file names
    corresponds with the temporal ordering of the events in the log
    files.
    """
    log_files = glob.glob(os.path.join(directory, "*.json"))
    log_files.sort()

    events = []
    level_sequence = []

    for log_file in log_files:
        with open(log_file) as f:
            for line in f:
                events.append(json.loads(line))


    current_level = None
    actions = []
    for event in events:
        if event["0"] == "action":
            level_id = event["1"]["quest_id"]
            if level_id is None:
                print("WARNING: This event has no level ID:")
                print(event)
                continue

            if level_id != current_level:
                if current_level is not None:
                    # Exclude going back to first level, because we
                    # just concat all the levels and so changing users
                    # looks like going back a level
                    if level_id < current_level and level_id != 0:
                        actions.append({
                            "0": "action",
                            "1": {
                                "quest_id": current_level,
                                "action_id": "prev",
                            }
                        })
                    # Player likely used next, so synthesize a
                    # fake event for that case
                    if (level_id == current_level + 1 and
                        not any(event["1"]["action_id"] == "victory"
                                for event in actions
                                if event["0"] == "action")):
                        actions.append({
                            "0": "action",
                            "1": {
                                "quest_id": current_level,
                                "action_id": "next",
                            }
                        })
                    level_sequence.append(Level(current_level, actions))
                actions = []
                current_level = level_id
            actions.append(event)

    if current_level is not None and actions:
        level_sequence.append(Level(current_level, actions))

    return events, level_sequence


def get_state_graphs(level):
    """
    Get all the state graphs for a given playthough of a given level.
    """
    graphs = []
    condition = None
    victory = False
    for action in level.actions:
        if action["1"]["action_id"] == "condition":
            condition = action["1"]["action_detail"]
        elif action["1"]["action_id"] in ("victory", "game-complete"):
            victory = True
        elif action["1"]["action_id"] == "dead-end":
            # TODO: synthesize a reset event?
            graphs[-1].graph["reset"] = True
        elif action["1"]["action_id"] == "prev":
            # This is a fake event
            graphs[-1].add_node("prev", victory=False, reset=False)
            graphs[-1].graph["prev"] = True
        elif action["1"]["action_id"] == "next":
            # This is a fake event
            graphs[-1].add_node("next", victory=False, reset=True)
            graphs[-1].graph["next"] = True

        if action["1"]["action_id"] != "state-path-save":
            continue

        graph_detail = json.loads(action["1"]["action_detail"])
        graph = nx.DiGraph(victory=False, reset=False,
                           prev=False, next=False)
        nodes = []
        for idx, node in enumerate(graph_detail["nodes"]):
            if node["data"] == "reset":
                nodes.append("reset")
                graph.graph["reset"] = True
                graph.add_node("reset", reset=True)
            else:
                # Nodes are labeled with the sorted string representation
                # of the board state

                # Seems like WatExpr made it in somehow? '?' in some board states
                nodes.append(repr(list(sorted(normalize(js) for js in node["data"]["board"] if js != '?'))))
                graph.add_node(nodes[-1], node_data=node, reset=False)

        for edge in graph_detail["edges"]:
            graph.add_edge(nodes[edge["from"]], nodes[edge["to"]],
                           uid=edge["uid"], edge_data=edge)

        graph.graph["dynamic_quest_id"] = action["1"]["dynamic_quest_id"]
        graph.graph["quest_seq_id"] = action["1"]["quest_seq_id"]

        graphs.append(graph)

    if victory:
        graphs[-1].graph["victory"] = True

    for graph in graphs:
        graph.graph["condition"] = condition
        victory = graph.graph["victory"]
        for node, data in graph.nodes(data=True):
            out_degree = graph.out_degree(node)
            if victory and out_degree == 0:
                data["victory"] = True
            else:
                if (node != "prev" and
                    out_degree == 0 and
                    graph.graph["prev"]):
                    new_uid = max((data["uid"] for _, _, data in graph.edges(data=True)), default=0) + 1
                    graph.add_edge(node, "prev", uid=new_uid)
                if (node != "next" and
                    out_degree == 0 and
                    graph.graph["next"]):
                    new_uid = max((data["uid"] for _, _, data in graph.edges(data=True)), default=0) + 1
                    graph.add_edge(node, "next", uid=new_uid)
                data["victory"] = False

    return graphs


def get_complete_state_graphs(level_sequence, level_id):
    """Get all state graphs for all playthroughs of a given level."""
    graphs = []
    for level in level_sequence:
        if level.id == level_id:
            graphs.extend(get_state_graphs(level))
    return graphs


def only_complete_graphs(graphs):
    """
    Filter out graphs not caused by victory or reset.
    """
    finished_quests = set()
    max_quest_seq_id = {}
    result = []
    for graph in graphs:
        dynamic_quest_id = graph.graph["dynamic_quest_id"]
        quest_seq_id = graph.graph["quest_seq_id"]
        if (graph.graph["reset"] or
            graph.graph["victory"] or
            graph.graph["prev"] or
            graph.graph["next"]):
            result.append(graph)
            finished_quests.add(dynamic_quest_id)
        else:
            if dynamic_quest_id not in max_quest_seq_id:
                max_quest_seq_id[dynamic_quest_id] = (graph, quest_seq_id)
            elif quest_seq_id > max_quest_seq_id[dynamic_quest_id][1]:
                max_quest_seq_id[dynamic_quest_id] = (graph, quest_seq_id)

    for dynamic_quest_id, (graph, _) in max_quest_seq_id.items():
        if dynamic_quest_id not in finished_quests:
            result.append(graph)

    return result


def merge_graphs(graphs):
    """
    Given a list of graphs, make a single merged weighted graph.

    Also marks nodes as terminal or initial (based on outputs/inputs).
    """
    nodes = []
    node_mapping = {} # board_label -> node_idx
    victory = set()
    edge_weights = collections.Counter()
    node_weights = collections.Counter()

    for (graph_idx, graph) in enumerate(graphs):
        for idx, node in enumerate(graph):
            node_weights[node] += 1
            if node not in node_mapping:
                nodes.append(node)
                node_mapping[node] = len(nodes) - 1

            if graph.node[node]["victory"]:
                victory.add(node)

        for edge in graph.edges():
            edge_weights[edge] += 1

    graph = nx.DiGraph()
    max_node_count = max(node_weights.values()) if node_weights else 0
    for node, count in node_weights.items():
        graph.add_node(node, weight=count/max_node_count, count=count,
                       terminal=True, initial=True, victory=node in victory,
                       reset=node in ("reset", "prev", "next"))
    max_count = max(edge_weights.values()) if edge_weights else 0
    for edge, count in edge_weights.items():
        graph.node[edge[0]]["terminal"] = False
        graph.node[edge[1]]["initial"] = False
        graph.add_edge(*edge, weight=count/max_count, count=count)

    graph.graph["weighted"] = True
    if graphs:
        graph.graph["condition"] = graphs[0].graph["condition"]
    else:
        graph.graph["condition"] = None

    return graph


def temporal_graph(graphs):
    """
    Given all of a player's playthoughs, construct a temporal graph.
    """
    heights = {}
    next_height = 0
    result = nx.DiGraph()

    for graph in graphs:
        prev_dst = None
        for idx, (src, dst, data) in enumerate(
                sorted(graph.edges(data=True),
                       key=lambda item: item[2]["uid"])):
            if prev_dst is not None and src != prev_dst:
                print("Warning: graph is broken - src of edge does not match dst of previous edge in time")
            prev_dst = dst

            if src not in heights:
                heights[src] = next_height
                next_height += 1
            if dst not in heights:
                heights[dst] = next_height
                next_height += 1

            if (idx, src) not in result:
                result.add_node((idx, src),
                                initial=idx == 0, time=idx, terminal=False,
                                label=src, victory=graph.node[src]["victory"],
                                height=heights[src], count=1, reset=False)
            else:
                result.node[(idx, src)]["terminal"] = False
                result.node[(idx, src)]["count"] += 1

            if (idx + 1, dst) not in result:
                result.add_node((idx + 1, dst),
                                initial=False, time=idx + 1, terminal=True,
                                label=dst, victory=graph.node[dst]["victory"],
                                height=heights[dst], count=1,
                                reset=dst in ("prev", "next", "reset"))
            else:
                result.node[(idx + 1, dst)]["count"] += 1

            result.add_edge((idx, src), (idx + 1, dst))

    # Adjust heights afterwards
    by_level = collections.defaultdict(list)
    global_frequency = collections.Counter()
    for (level, node), data in sorted(result.nodes(data=True), key=lambda x:x[1]["time"]):
        by_level[level].append((node, data))
        global_frequency[node] += 1

    relative_ordering = {}
    for idx, (node, _) in enumerate(sorted(global_frequency.items(), key=lambda x: x[1], reverse=True)):
        relative_ordering[node] = idx
    for level, nodes in by_level.items():
        for i, (node, data) in enumerate(sorted(nodes, key=lambda x: relative_ordering[x[0]])):
            data["linear_height"] = i

    return result


def mark_liveness(graph):
    """
    Mark nodes in a graph as 'live' if they lead to a non-RESET
    terminal state, and 'dead' otherwise.
    """
    terminal = []
    for node, data in graph.nodes(data=True):
        data["live"] = False
        if data["terminal"] and data["victory"]:
            terminal.append(node)

    while terminal:
        node = terminal.pop()
        if graph.node[node]["live"]:
            continue

        graph.node[node]["live"] = True
        for pred in graph.predecessors(node):
            terminal.append(pred)

    for start, end, data in graph.edges(data=True):
        data["live"] = graph.node[end]["live"]
        data["reset"] = graph.node[end]["reset"]

    return graph


def get_complete_merged_graph(level_sequence, level_id):
    """
    Merge all complete graphs (completed level or reset) for all
    playthoughs of a given level.
    """
    return merge_graphs(only_complete_graphs(
        get_complete_state_graphs(level_sequence, level_id)))


def get_all_complete_merged_graphs(level_sequence):
    seen = set()
    result = []
    for level in level_sequence:
        if level.id in seen:
            continue
        seen.add(level.id)
        result.append(get_complete_merged_graph(level_sequence, level.id))
    return result
