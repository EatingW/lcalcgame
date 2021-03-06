const SHRINK_DURATION = 800;
const EXPAND_DURATION = 400;
/// Variable nodes - separate from lambda variable expressions, for
/// now.
class VarExpr extends Expression {
    constructor(name) {
        super([]);
        this.name = name;
        // See MissingTypedExpression#constructor
        this.equivalentClasses = [VarExpr];
    }

    open(preview, animate=true) {
    }

    close() {
    }

    canReduce() {
        return this.getEnvironment() && (this.parent || this.stage) && this.getEnvironment().lookup(this.name);
    }

    reduce() {
        let env = this.getEnvironment();
        if (!env) return this;

        let parent = this.parent ? this.parent : this.stage;
        if (!parent) return this;

        let value = env.lookup(this.name);
        if (!value) return this;

        return value;
    }

    performReduction() {
        let value = this.reduce();
        if (value != this) {
            value = value.clone();
            let parent = this.parent ? this.parent : this.stage;
            parent.swap(this, value);
        }
    }

    onmouseclick() {
        this.performReduction();
    }
}

class ChestVarExpr extends VarExpr {
    constructor(name) {
        super(name);
        // See MissingTypedExpression#constructor
        this.equivalentClasses = [ChestVarExpr];
        this._preview = null;
    }

    get _superSize() {
        return super.size;
    }

    get size() {
        return { w:this._size.w, h:this._size.h };
    }

    get _baseImage() {
        if (this.name == "x") {
            return Resource.getImage("chest-wood-base");
        }
        return Resource.getImage("chest-metal-base");
    }

    get _lidClosedImage() {
         if (this.name == "x") {
            return Resource.getImage("chest-wood-lid-closed");
        }
        return Resource.getImage("chest-metal-lid-closed");
    }

    get _lidOpenImage() {
         if (this.name == "x") {
            return Resource.getImage("chest-wood-lid-open");
        }
        return Resource.getImage("chest-metal-lid-open");
    }

    open(preview, animate=true) {
        preview = preview.clone();
        preview.ignoreEvents = true;
        preview.scale = { x: 0.6, y: 0.6 };
        preview.anchor = { x: -0.1, y: 0.5 };
        this._preview = preview;
        if (this.holes.length > 0) {
            this.holes[0] = preview;
        }
        else {
            this.holes.push(preview);
        }
        this._opened = true;
    }

    close() {
        this._opened = false;
        this.removeChild(this.holes[0]);
        this._preview = null;
    }

    drawInternal(ctx, pos, boundingSize) {
        if (this._preview) {
            this._preview.pos = {
                x: 0,
                y: 5,
            };
        }

        if (this.parent && !this.ignoreEvents) {
            // Draw gray background analogous to other values
            ctx.fillStyle = "#777";
            roundRect(ctx,
                      pos.x, pos.y,
                      boundingSize.w, boundingSize.h,
                      6*this.absoluteScale.x, true, false, null);
        }

        let size = this._size;
        let scale = this.absoluteScale;
        let adjustedSize = this.absoluteSize;
        let offset = Math.max(2, (adjustedSize.w - size.w) / 2);
        ctx.drawImage(this._baseImage, pos.x + offset, pos.y + offset, size.w * scale.x - 2 * offset, size.h * scale.y - 2 * offset);
        if (this._opened) {
            ctx.drawImage(this._lidOpenImage, pos.x + offset, pos.y + offset, size.w * scale.x - 2 * offset, size.h * scale.y - 2 * offset);
        }
        else {
            ctx.drawImage(this._lidClosedImage, pos.x + offset, pos.y + offset, size.w * scale.x - 2 * offset, size.h * scale.y - 2 * offset);
        }
        if (this.stroke) {
            ctx.save();
            ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.globalCompositeOperation = 'screen';
            ctx.fillRect(pos.x, pos.y, boundingSize.w, boundingSize.h);
            ctx.restore();
        }
    }

    performReduction(animated=true) {
        if (this._opened) return;
        let value = this.reduce();
        if (value != this) {
            if (!animated) {
                let parent = this.parent ? this.parent : this.stage;
                parent.swap(this, value);
                return;
            }
            value = value.clone();
            value.scale = { x: 0.1, y: 0.1 };
            value.pos = {
                x: this.absolutePos.x + 0.5 * this.size.w - 0.5 * value.absoluteSize.w,
                y: this.absolutePos.y + 30,
            };
            value.opacity = 0.0;

            let stage = this.stage;
            stage.add(value);
            this._opened = true;

            Animate.tween(value, {
                scale: { x: 1.0, y: 1.0 },
                pos: {
                    x: this.absolutePos.x + 0.5 * this.size.w - 0.5 * value.size.w,
                    y: this.absolutePos.y - value.size.h,
                },
                opacity: 1.0,
            }, 500).after(() => {
                window.setTimeout(() => {
                    Animate.poof(this);
                    if (this.parent) {
                        stage.remove(value);
                        this.parent.swap(this, value);
                    }
                    else {
                        this.stage.remove(this);
                    }
                    stage.draw();
                    stage.update();
                }, 200);
            });
        }
    }

    onmouseenter() {
        super.onmouseenter();
        document.querySelector('canvas').style.cursor = 'pointer';
    }

    onmouseleave() {
        super.onmouseleave();
        document.querySelector('canvas').style.cursor = 'auto';
    }
}

class LabeledChestVarExpr extends ChestVarExpr {
    constructor(name) {
        super(name);
        // See MissingTypedExpression#constructor
        this.equivalentClasses = [LabeledChestVarExpr];
        this.label = new TextExpr(name);
        this.label.color = 'white';
        this.holes.push(this.label);
    }

    open(preview, animate=true) {
    }

    close() {
    }

    drawInternal(ctx, pos, boundingSize) {
        this.holes[0].pos = {
            x: this.size.w / 2 - this.holes[0].absoluteSize.w / 2,
            y: this.size.h / 2,
        };

        super.drawInternal(ctx, pos, boundingSize);
    }
}

class DisplayChest extends ChestVarExpr {
    constructor(name, expr) {
        super(name);
        this._opened = true;
        this.holes.push(expr);
        expr.ignoreEvents = true;
        expr.scale = { x: 0.6, y: 0.6 };
        expr.anchor = { x: -0.1, y: 0.5 };
        this.childPos = { x: 10, y: 5 };
    }

    get size() {
        return this._superSize;
    }

    setExpr(expr) {
        this.holes[0] = expr;
        expr.ignoreEvents = true;
        expr.scale = { x: 0.6, y: 0.6 };
        // expr.anchor = { x: -0.1, y: 0.5 };
    }

    performReduction() {}

    prepareAssign() {
        let target = {
            childPos: {
                x: 10,
                y: -200,
            },
        };
        return Animate.tween(this, target, 600).after(() => {
            this.childPos = { x: 10, y: 5 };
        });
    }

    drawInternal(ctx, pos, boundingSize) {
        let size = this._size;
        let scale = this.absoluteScale;
        let adjustedSize = this.absoluteSize;
        let offsetX = (adjustedSize.w - size.w) / 2;
        ctx.drawImage(this._lidOpenImage, pos.x + offsetX, pos.y, size.w * scale.x, size.h * scale.y);
        this.holes[0].pos = {
            x: this.childPos.x,
            y: this.childPos.y,
        };
    }

    drawInternalAfterChildren(ctx, pos, boundingSize) {
        let size = this._size;
        let scale = this.absoluteScale;
        let adjustedSize = this.absoluteSize;
        let offsetX = (adjustedSize.w - size.w) / 2;
        ctx.drawImage(this._baseImage, pos.x + offsetX, pos.y, size.w * scale.x, size.h * scale.y);
    }
}

class AssignExpr extends Expression {
    constructor(variable, value) {
        super([]);
        if (variable && !(variable instanceof MissingExpression)) {
            this.holes.push(variable);
        }
        else {
            let missing = new MissingTypedExpression(new VarExpr("_"));
            missing.acceptedClasses = [VarExpr];
            this.holes.push(missing);
        }

        this.holes.push(new TextExpr("←"));

        if (value) {
            this.holes.push(value);
        }
        else {
            this.holes.push(new MissingExpression());
        }
    }

    get variable() {
        return this.holes[0] instanceof MissingExpression ? null : this.holes[0];
    }

    get value() {
        return this.holes[2] instanceof MissingExpression ? null : this.holes[2];
    }

    onmouseclick() {
        this.performReduction();
    }

    canReduce() {
        return this.value && this.variable && this.value.canReduce();
    }

    reduce() {
        if (this.variable && this.value) {
            return this.value;
        }
        else {
            return this;
        }
    }

    performReduction(animated=true) {
        // The side-effect actually happens here. reduce() is called
        // multiple times as a 'canReduce', and we don't want any
        // update to happen multiple times.
        if (this.value) {
            this.value.performReduction(false);
        }
        if (this.canReduce()) {
            let initial = [];
            if (this.parent) {
                initial.push(this.parent);
            }
            else {
                initial = initial.concat(this.stage.nodes);
            }

            // Prevent background on GraphicValueExpr from being drawn
            this.value.ignoreEvents = true;
            // Keep a copy of the original value before we start
            // messing with it, to update the environment afterwards
            let value = this.value.clone();

            this.variable._opened = true;
            let target = {
                scale: { x: 0.3, y: 0.3 },
                pos: { x: this.variable.pos.x, y: this.variable.pos.y },
            };

            let environment = this.getEnvironment();

            // quadratic lerp for pos.y - makes it "arc" towards the variable
            let b = 4 * (Math.min(this.value.pos.y, this.variable.pos.y) - 120) - this.variable.pos.y;
            let c = this.value.pos.y;
            let a = this.variable.pos.y - b;
            let lerp = (src, tgt, elapsed, chain) => {
                if (chain.length == 2 && chain[0] == "pos" && chain[1] == "y") {
                    return a*elapsed*elapsed + b*elapsed + c;
                }
                else {
                    return (1.0 - elapsed) * src + elapsed * tgt;
                }
            };

            let parent = this.parent || this.stage;
            let afterCallback = () => {
                this.getEnvironment().update(this.variable.name, value);
                this.stage.environmentDisplay.showGlobals();
                this.stage.draw();
            };

            let callback = null;
            if (environment == this.stage.environment && this.stage.environmentDisplay) {
                callback = this.stage.environmentDisplay.prepareAssign(this.variable.name);
            }
            if (callback) {
                callback.after(afterCallback);
            }
            else {
                window.setTimeout(afterCallback, 500);
            }

            Animate.tween(this.value, target, 500, (x) => x, true, lerp).after(() => {
                Animate.poof(this);
                parent.swap(this, null);
            });
        }
    }

    reduceCompletely() {
        if (this.value) {
            this.value.reduceCompletely();
        }

        if (this.variable && this.value) {
            // Return non-undefined non-this value so that when the
            // user drops everything in, MissingExpression#ondropped
            // will make this expr blink
            return null;
        }
        else {
            return this;
        }
    }
}

class ExpressionView extends MissingExpression {
    constructor(expr_to_miss) {
        super(expr_to_miss);
        this._openOffset = 0;
    }

    // Disable interactivity
    ondropenter() {}
    ondropexit() {}
    ondropped() {}
    onmouseenter() {}
    drawInternal(ctx, pos, boundingSize) {
        var rad = boundingSize.w / 2.0;
        setStrokeStyle(ctx, {
            color: '#AAAAAA',
            lineWidth: 3,
        });
        ctx.beginPath();
        ctx.arc(pos.x+rad,pos.y+rad,rad,0,2*Math.PI);

        ctx.clip();
        let alpha = 0.5 * (((Math.PI / 2) - this._openOffset) / (Math.PI / 2));
        ctx.shadowColor = `rgba(0,0,0,${alpha})`;
        ctx.shadowBlur = 3;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;
        ctx.stroke();
    }
}

function findAliasingVarExpr(initial, name, ignore) {
    // TODO: needs to account for whether the variable we are looking
    // for is in an outer scope. Example:
    // x = 3
    // def test():
    //     global x
    //     x = 5
    let subvarexprs = [];
    let queue = initial;
    while (queue.length > 0) {
        let node = queue.pop();
        if (node instanceof VarExpr && node.name === name && ignore.indexOf(node) == -1) {
            subvarexprs.push(node);
        }
        else if (node instanceof LambdaExpr &&
                 (node.takesArgument &&
                   node.holes[0].name === name)) {
            // Capture-avoiding substitution
            continue;
        }

        if (node.children) {
            queue = queue.concat(node.children);
        }
    }

    return subvarexprs;
}
