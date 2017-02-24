class Snappable extends Expression {
    constructor(expr) {
        super([expr]);
        this.topDivotStroke = this.bottomDivotStroke = null;
        this.divotHeight = 6;
        this.prev = null;
        this.next = null;

        this.tentativeTarget = null;
        this.tentativeRelation = null;
        // this._pos = null;
    }

    get contents() {
        return this.holes[0];
    }

    get size() {
        let size = super.size;
        size.h += 8;
        return size;
    }

    get topDivotPos() {
        let pos = this.pos;
        pos.x += 25;
        pos.y += this.divotHeight;
        return pos;
    }

    get bottomDivotPos() {
        let pos = this.topDivotPos;
        pos.y += this.size.h;
        return pos;
    }

    get bottom() {
        let bottom = this;

        while (bottom.next) {
            bottom = bottom.next;
        }

        return bottom;
    }

    update() {
        super.update();

        this.updatePos();

        if (this.next) {
            this.next.update();
        }

        if (!(this.prev || this.next)) {
            this.contents.opacity = 0.5;
        }
        else {
            this.contents.opacity = 1.0;
        }
    }

    updatePos() {
        if (this.prev) {
            let dx = (this.size.w - this.prev.size.w) / 2;
            this._pos = {
                x: this.prev.pos.x + dx,
                y: this.prev.pos.y + this.prev.size.h - 4,
            };
        }

        if (this.next) this.next.updatePos();
    }

    onmousedrag(pos) {
        if (!this.stage) return;

        super.onmousedrag(pos);

        if (this.prev) {
            this.prev.next = null;
            this.prev = null;
        }

        let nodes = this.stage.getNodesWithClass(Snappable, [this], false);
        let myTd = this.topDivotPos;
        // If dragging a stack around, use the last node's divot
        let bottom = this.bottom;
        let myBd = bottom.bottomDivotPos;

        this.tentativeRelation = this.tentativeTarget = null;

        for (let node of nodes) {
            if (node == this.prev || node == this.next) continue;

            let td = node.topDivotPos;
            let bd = node.bottomDivotPos;
            let distanceX = myTd.x - bd.x;
            let distanceY = myTd.y - bd.y;

            if (distanceX * distanceX + distanceY * distanceY < 360) {
                this.topDivotStroke = node.bottomDivotStroke = { color: 'green', lineWidth:2 };
                this.tentativeTarget = node;
                this.tentativeRelation = 'next';
                continue;
            }
            else {
                this.topDivotStroke = node.bottomDivotStroke = null;
            }

            distanceX = myBd.x - td.x;
            distanceY = myBd.y - td.y;

            if (distanceX * distanceX + distanceY * distanceY < 360) {
                bottom.bottomDivotStroke = node.topDivotStroke = { color: 'green', lineWidth:2 };
                this.tentativeTarget = node;
                this.tentativeRelation = 'prev';
                continue;
            }
            else {
                bottom.bottomDivotStroke = node.topDivotStroke = null;
            }
        }

        if (this.next) this.next.updatePos();
    }

    onmouseup(pos) {
        if (!this.stage) return;

        super.onmouseup(pos);

        if (this.tentativeTarget) {
            let bottom = this.bottom;
            if (this.tentativeRelation == 'next') {
                bottom.next = this.tentativeTarget.next;
                this.tentativeTarget.next = this;
                this.prev = this.tentativeTarget;

                if (bottom.next) {
                    bottom.next.prev = bottom;
                }
            }
            else {
                this.prev = this.tentativeTarget.prev;
                this.tentativeTarget.prev = this.bottom;
                bottom.next = this.tentativeTarget;

                if (this.prev) {
                    this.prev.next = this;
                }

                bottom.bottomDivotStroke = null;
            }

            this.bottomDivotStroke = this.topDivotStroke =
                this.tentativeTarget.topDivotStroke =
                this.tentativeTarget.bottomDivotStroke = null;
            this.tentativeTarget = this.tentativeRelation = null;
        }
    }

    drawInternal(ctx, pos, boundingSize) {
        ctx.fillStyle = this.shadowColor;

        boundingSize.h -= this.divotHeight;

        let radius = this.radius * this.absoluteScale.x;

        let draw = (offset) => {
            let { x, y } = pos;
            let { w: width, h: height } = boundingSize;

            y += offset;

            ctx.beginPath();
            ctx.moveTo(x + radius, y);
            ctx.lineTo(x + 20, y);
            ctx.lineTo(x + 25, y + this.divotHeight);
            ctx.lineTo(x + 30, y);
            ctx.lineTo(x + width - radius, y);
            ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
            ctx.lineTo(x + width, y + height - radius);
            ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
            ctx.lineTo(x + 30, y + height);
            ctx.lineTo(x + 25, y + height + this.divotHeight);
            ctx.lineTo(x + 20, y + height);
            ctx.lineTo(x + radius, y + height);
            ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
            ctx.lineTo(x, y + radius);
            ctx.quadraticCurveTo(x, y, x + radius, y);
            ctx.closePath();
            ctx.fill();
            if (this.stroke) {
                setStrokeStyle(ctx, this.stroke);
                strokeWithOpacity(ctx, this.stroke.opacity);
            }

            if (offset) return;

            if (this.topDivotStroke) {
                ctx.beginPath();
                ctx.lineTo(x + 20, y);
                ctx.lineTo(x + 25, y + this.divotHeight);
                ctx.lineTo(x + 30, y);
                setStrokeStyle(ctx, this.topDivotStroke);
                strokeWithOpacity(ctx, this.topDivotStroke.opacity);
            }
            if (this.bottomDivotStroke) {
                ctx.beginPath();
                ctx.lineTo(x + 30, y + height);
                ctx.lineTo(x + 25, y + height + this.divotHeight);
                ctx.lineTo(x + 20, y + height);
                setStrokeStyle(ctx, this.bottomDivotStroke);
                strokeWithOpacity(ctx, this.bottomDivotStroke.opacity);
            }
        };

        if (this.shadowOffset !== 0) {
            draw(this.shadowOffset);
        }
        if (this.color) ctx.fillStyle = this.color;
        draw(0);
    }

    drawInternalAfterChildren(ctx, pos, boundingSize) {
        let radius = this.radius * this.absoluteScale.x;
        const leftMargin = 15 * this.scale.x;
        ctx.fillStyle = "#fff";
        roundRect(ctx,
                  pos.x, pos.y,
                  leftMargin, boundingSize.h,
                  {
                      tl: radius,
                      bl: radius,
                      tr: 0,
                      br: 0,
                  }, true, false,
                  null);
    }

    onmouseclick() {
        this.performReduction();
    }

    performReduction() {
        if (this.prev) {
            this.prev.performReduction();
            return;
        }

        // Save stage since it gets erased down the line
        let stage = this.stage;

        let nodes = stage.getNodesWithClass(Snappable, [this], false);
        let canReduce = true;

        for (let node of nodes) {
            if (!node.prev) {
                while (node) {
                    Animate.blink(node, 1000, [1.0, 0.0, 0.0]);
                    node = node.next;
                }
                canReduce = false;
            }
        }

        if (!canReduce) return;

        let body = [];
        let cur = this;

        while (cur) {
            body.push(cur.contents);
            cur = cur.next;
        }

        for (let node of nodes) {
            stage.remove(node);
        }
        stage.swap(this, new (ExprManager.getClass('sequence'))(...body));
    }
}
