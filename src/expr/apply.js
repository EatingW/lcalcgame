class ApplyExpr extends Expression {
    constructor(exprToApply, lambdaExpr) {

        super([exprToApply, lambdaExpr]);

        this.lambdaExpr.pos = { x:0, y:0 };
        this.exprToApply.pos = addPos(this.lambdaExpr.pos,
            { x:-exprToApply.size.w, y:-exprToApply.size.h/2 });

        this.shadowOffset = 2;

        let applyDepth = (n, expr) => {
            if (expr instanceof ApplyExpr)
                return applyDepth(n+1, expr.exprToApply);
            else
                return n;
        };
        let levels_deep = applyDepth(0, this.exprToApply);
        this.color = colorFrom255(Math.max(0, 180 + levels_deep*40))

        this.exprToApply.lock();
        this.lambdaExpr.lock();

        let arrow = new ImageExpr(0,0,97/1.6,60/1.6,'apply-arrow');
        arrow.lock();
        this.arrow = arrow;
        this.arrow.opacity = 1;

        // Brackets
        let lbrak = new TextExpr('[');
        lbrak.color = '#fff';
        let rbrak = lbrak.clone();
        rbrak.text = ']';
        this.lbrak = lbrak;
        this.rbrak = rbrak;

        // Bg
        let bg = new mag.Rect(0, 0, this.exprToApply.size.w, this.exprToApply.size.h);
        bg.shadowOffset = 0;
        bg.color = 'pink';
        this.bg = bg;
    }

    get constructorArgs() { return [ this.exprToApply.clone(), this.lambdaExpr.clone() ]; }

    get exprToApply() { return this.children[0]; }
    get lambdaExpr()  { return this.children[1]; }

    onmouseclick() {
        this.lambdaExpr.hole.ondropenter(this.exprToApply);
        //Animate.tween( this.arrow, {opacity:0}, 200 );
        Animate.wait(500).after(() => {
            let stg = this.stage;
            let lambda = this.lambdaExpr;
            this.exprToApply.opacity = 1.0;
            this.lambdaExpr.applyExpr(this.exprToApply);
            (this.parent || stg).swap(this,this.lambdaExpr);
            this.lambdaExpr.performReduction();
            if (stg) {
                stg.update();
                stg.draw();
            }
        });
    }

    hitsChild() { return null; }

    drawInternal(ctx, pos, boundingSize) {

        super.drawInternal(ctx, pos, boundingSize);

        // this.bg.parent = this;
        // this.bg.pos = { x:this.lbrak.size.w/2.0, y:this.rbrak.size.h*0.35/2.0 };
        // this.bg.size = { w:this.exprToApply.size.w-this.lbrak.size.w/2.0, h:this.rbrak.size.h*0.65 };
        // this.bg.draw(ctx);

        this.lbrak.parent = this;
        this.lbrak.pos = { x:0, y:this.lbrak.size.h/1.4 };
        this.lbrak.draw(ctx);

        this.rbrak.parent = this;
        this.rbrak.pos = { x:this.exprToApply.size.w*this.exprToApply.scale.x, y:this.lbrak.pos.y };
        this.rbrak.draw(ctx);
    }

    drawInternalAfterChildren(ctx, pos, boundingSize) {
        this.arrow.parent = this;
        this.arrow.pos = { x:this.lambdaExpr.pos.x - this.lambdaExpr.hole.absoluteSize.w / 3, y:-16 };
        this.arrow.draw(ctx);
    }

    //update() { }
}