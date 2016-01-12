var MANIPULATE_MODE_None = 0;
var MANIPULATE_MODE_Move = 1;
var MANIPULATE_MODE_Box = 2;

var MANIP_TYPE_SizeLT = 0;
var MANIP_TYPE_SizeT = 1;
var MANIP_TYPE_SizeRT = 2;
var MANIP_TYPE_SizeR = 3;
var MANIP_TYPE_SizeRB = 4;
var MANIP_TYPE_SizeB = 5;
var MANIP_TYPE_SizeLB = 6;
var MANIP_TYPE_SizeL = 7;
var MANIP_TYPE_Rotate = 8;

///////////////////////////////////////////////
// manipulatorBox
///////////////////////////////////////////////
function manipulatorBox_HandleMouseMove(start, end, manip, uniform) {

    // Calculate delta between current point and last point
    var delta = [];
    delta[0] = end[0] - start[0];
    delta[1] = end[1] - start[1];

    var leftDelta = 0;
    var rightDelta = 0;
    var topDelta = 0;
    var botDelta = 0;

    // Apply the type
    switch (this.type) {
        case MANIP_TYPE_SizeLT:
            if (uniform) {
                leftDelta = topDelta = (delta[0] + delta[1]) / 2;
            }
            else {
                leftDelta = delta[0];
                topDelta = delta[1];
            }
            break;
        case MANIP_TYPE_SizeT:
            topDelta = delta[1];
            break;
        case MANIP_TYPE_SizeRT:
            if (uniform) {
                rightDelta = (delta[0] - delta[1]) / 2;
                topDelta = -rightDelta;
            }
            else {
                rightDelta = delta[0];
                topDelta = delta[1];
            }
            break;
        case MANIP_TYPE_SizeR:
            rightDelta = delta[0];
            break;
        case MANIP_TYPE_SizeRB:
            if (uniform) {
                rightDelta = botDelta = (delta[0] + delta[1]) / 2;
            }
            else {
                rightDelta = delta[0];
                botDelta = delta[1];
            }
            break;
        case MANIP_TYPE_SizeB:
            botDelta = delta[1];
            break;
        case MANIP_TYPE_SizeLB:
            if (uniform) {
                leftDelta = (delta[0] - delta[1]) / 2;
                botDelta = -leftDelta;
            }
            else {
                leftDelta = delta[0];
                botDelta = delta[1];
            }
            break;
        case MANIP_TYPE_SizeL:
            leftDelta = delta[0];
            break;
        case MANIP_TYPE_Rotate:
            {
                var oldRot = manip.rotation;
                
                var point = vec3.fromValues(end[0], end[1], 0);
                var centerToPoint = vec3.create();
                vec3.sub(centerToPoint, point, manip.rotationPoint);
                vec3.normalize(centerToPoint, centerToPoint);

                var up = vec3.fromValues(0, -1, 0);
                var right = vec3.create();
                vec3.cross(right, vec3.fromValues(0, 0, -1), centerToPoint);
                var cdot = vec3.dot(up, right);

                var cosA = vec3.dot(centerToPoint, up);
                var angle = Math.acos(cosA);
                if (cdot < 0)
                    angle = -angle;
                manip.rotation = angle;
                manip.rotate(manip.rotation - oldRot);
            }
            return end;
    }

    var limitW = Math.min(10, manip.box.width());
    var limitH = Math.min(10, manip.box.height());
    var w = manip.box.right - (manip.box.left + leftDelta);
    if (w < limitW)
        leftDelta = limitW - manip.box.width();
    w = (manip.box.right + rightDelta) - manip.box.left;
    if (w < limitW)
        rightDelta = limitW - manip.box.width();
    var h = manip.box.bottom - (manip.box.top + topDelta);
    if (h < limitH)
        topDelta = limitH - manip.box.height();
    h = (manip.box.bottom + botDelta) - manip.box.top;
    if (h < limitH)
        botDelta = limitH - manip.box.height();

    var oldWidth = manip.box.width();
    var oldHeight = manip.box.height();
    var oldCenter = vec3.fromValues(-(manip.box.left + (oldWidth * 0.5)), -(manip.box.top + (oldHeight * 0.5)), 0);

    manip.box.left += leftDelta;
    manip.box.right += rightDelta;
    manip.box.top += topDelta;
    manip.box.bottom += botDelta;
    manip.setBox(manip.box);

    var newWidth = manip.box.width();
    var newHeight = manip.box.height();
    var newCenter = vec3.fromValues(manip.box.left + (newWidth * 0.5), manip.box.top + (newHeight * 0.5), 0);

    var scale = vec3.fromValues(newWidth / oldWidth, newHeight / oldHeight, 1);
    for (var i = 0; i < manip.selectedObjects.length; i++) {
        var so = manip.selectedObjects[i];

        so.ro.translate(oldCenter);
        so.ro.setScale(scale)
        so.ro.translate(newCenter);
        so.box.update(so);
    }
    return end;
}

function manipulatorBox(left, top, vscale, type) {
    this.handleMouseMove = manipulatorBox_HandleMouseMove;
    
    this.mtx = mat4.create();
    mat4.translate(this.mtx, this.mtx, vec3.fromValues(left, top, 0));
    mat4.scale(this.mtx, this.mtx, vscale);

    this.box = new box(left, top, left + vscale[0], top + vscale[1]);
    this.type = type;
}


///////////////////////////////////////////////
// manipulator
///////////////////////////////////////////////
function manipulator_Draw(gl) {

    if (this.visible && !this.hidden) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.renderer.quad_vb);
        this.shader.bind(gl);
        gl.uniformMatrix4fv(this.shader.projMatrix, false, gl.proj);
        gl.uniformMatrix4fv(this.shader.viewMatrix, false, gl.view);

        // Draw Background
        gl.uniformMatrix4fv(this.shader.ltwMatrix, false, this.bgMatrix);
        gl.uniform4fv(this.shader.quadColorLoc, this.bgColor);
        gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);

        // Draw Frame
        for (var i = 0; i < this.frame.length; i++) {
            gl.uniformMatrix4fv(this.shader.ltwMatrix, false, this.frame[i]);
            gl.uniform4fv(this.shader.quadColorLoc, this.frameColor);
            gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
        }

        // Draw little boxes
        for (var i = 0; i < this.manipBoxes.length; i++) {
            gl.uniformMatrix4fv(this.shader.ltwMatrix, false, this.manipBoxes[i].mtx);
            gl.uniform4fv(this.shader.quadColorLoc, this.boxColor);
            gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
        }
    }
}

function manipulator_setColor(red, green, blue, alpha) {
    this.bgColor = vec4.fromValues(red, green, blue, alpha);
}

function manipulator_setBox(box) {
    this.box = box;

    var width = box.width();
    var height = box.height();

    // background
    var vscale = vec3.fromValues(width, height, 1);
    var vtrans = vec3.fromValues(box.left, box.top, -1);

    var m = mat4.create();
    mat4.translate(m, m, vtrans);
    mat4.scale(m, m, vscale);
    this.bgMatrix = m;
    
    var littleSize = Math.min(width, height) * 0.1;
    var halfLittleSize = littleSize * 0.5;
    var tinySize = halfLittleSize * 0.1;
    var halfTinySize = tinySize * 0.5;

    // frame
    this.frame[0] = mat4.create();
    mat4.translate(this.frame[0], this.frame[0], vec3.fromValues(box.left, box.top - halfTinySize, 0));
    mat4.scale(this.frame[0], this.frame[0], vec3.fromValues(width, tinySize, 1));

    this.frame[1] = mat4.create();
    mat4.translate(this.frame[1], this.frame[1], vec3.fromValues(box.left, box.bottom - halfTinySize, 0));
    mat4.scale(this.frame[1], this.frame[1], vec3.fromValues(width, tinySize, 1));

    this.frame[2] = mat4.create();
    mat4.translate(this.frame[2], this.frame[2], vec3.fromValues(box.left - halfTinySize, box.top, 0));
    mat4.scale(this.frame[2], this.frame[2], vec3.fromValues(tinySize, height, 1));

    this.frame[3] = mat4.create();
    mat4.translate(this.frame[3], this.frame[3], vec3.fromValues(box.right - halfTinySize, box.top, 0));
    mat4.scale(this.frame[3], this.frame[3], vec3.fromValues(tinySize, height, 1));

    this.frame[4] = mat4.create();
    var rotateHandleLength = height * 0.25;
    mat4.translate(this.frame[4], this.frame[4], vec3.fromValues(box.left + (width * 0.5) - halfTinySize, box.top - rotateHandleLength, 0));
    mat4.scale(this.frame[4], this.frame[4], vec3.fromValues(tinySize, rotateHandleLength, 1));

    // size points
    vscale = vec3.fromValues(littleSize, littleSize, littleSize);

    this.manipBoxes[0] = new manipulatorBox(box.left - halfLittleSize, box.top - halfLittleSize, vscale, MANIP_TYPE_SizeLT);
    this.manipBoxes[1] = new manipulatorBox(box.left + (width * 0.5) - halfLittleSize, box.top - halfLittleSize, vscale, MANIP_TYPE_SizeT);
    this.manipBoxes[2] = new manipulatorBox(box.right - halfLittleSize, box.top - halfLittleSize, vscale, MANIP_TYPE_SizeRT);
    this.manipBoxes[3] = new manipulatorBox(box.right - halfLittleSize, box.top + (height * 0.5) - halfLittleSize, vscale, MANIP_TYPE_SizeR);
    this.manipBoxes[4] = new manipulatorBox(box.right - halfLittleSize, box.bottom - halfLittleSize, vscale, MANIP_TYPE_SizeRB);
    this.manipBoxes[5] = new manipulatorBox(box.left + (width * 0.5) - halfLittleSize, box.bottom - halfLittleSize, vscale, MANIP_TYPE_SizeB);
    this.manipBoxes[6] = new manipulatorBox(box.left - halfLittleSize, box.bottom - halfLittleSize, vscale, MANIP_TYPE_SizeLB);
    this.manipBoxes[7] = new manipulatorBox(box.left - halfLittleSize, box.top + (height * 0.5) - halfLittleSize, vscale, MANIP_TYPE_SizeL);
    this.manipBoxes[8] = new manipulatorBox(box.left + (width * 0.5) - halfLittleSize, box.top - rotateHandleLength - halfLittleSize, vscale, MANIP_TYPE_Rotate);
}

function manipulator_SelectObjects(objects) {
    
    // Set the new list as the selected list
    this.selectedObjects = objects;
    this.visible = (this.selectedObjects.length > 0);

    // Select all objects and compute new selection box that encompases all the selected boxes
    var minx = Number.MAX_VALUE;
    var miny = Number.MAX_VALUE;
    var maxx = Number.MIN_VALUE;
    var maxy = Number.MIN_VALUE;
    for (var i = 0; i < this.selectedObjects.length; i++) {

        if (this.selectedObjects[i].box.left < minx) minx = this.selectedObjects[i].box.left;
        if (this.selectedObjects[i].box.top < miny) miny = this.selectedObjects[i].box.top;
        if (this.selectedObjects[i].box.right > maxx) maxx = this.selectedObjects[i].box.right;
        if (this.selectedObjects[i].box.bottom > maxy) maxy = this.selectedObjects[i].box.bottom;
    }

    // Setup the box
    this.box = new box(minx, miny, maxx, maxy);
    this.setBox(this.box);
}

function manipulator_HandleClick(clickPoint) {
    var handled = false;
    if (this.visible) {

        // check the boxes first
        this.currentManipBox = this.hitTestManipBoxes(clickPoint);
        if (this.currentManipBox != null) {
            // hit a manipulator box
            this.manipulateMode = MANIPULATE_MODE_Box;
            handled = true;
            this.moveStart = clickPoint;            
            if (this.currentManipBox.type == MANIP_TYPE_Rotate) {
                this.rotation = 0;
                this.rotationPoint = vec3.fromValues((this.box.left + (this.box.width() * 0.5)), (this.box.top + (this.box.height() * 0.5)), 0);
                this.hidden = true;
            }
        }        
        else if (this.box.containsPoint(clickPoint)) {
            // move mode
            this.manipulateMode = MANIPULATE_MODE_Move;
            handled = true;
            this.moveStart = clickPoint;
        }
    }
    return handled;
}

function manipulator_DoMove(start, end) {
    // Calculate delta between current point and last point
    var delta = [];
    delta[0] = end[0] - start[0];
    delta[1] = end[1] - start[1];

    // Translate all selected objects by delta
    for (var i = 0; i < this.selectedObjects.length; i++) {

        // Update the render object
        this.selectedObjects[i].ro.translate(delta);

        // Remove from the quadtree
        var treeNode = this.selectedObjects[i].treeNode;
        treeNode.remove(this.selectedObjects[i]);

        // Adjust the box
        this.selectedObjects[i].box.update(this.selectedObjects[i]);

        // Re-add to the quadtree
        treeNode.root.add(this.selectedObjects[i]);
    }

    // Move the selection box
    this.box.translate(delta);
    this.setBox(this.box);

    // Set this point as the last point
    return end;
}

function manipulator_HandleMouseMove(start, end) {

    if (this.manipulateMode == MANIPULATE_MODE_Box) {
        return this.currentManipBox.handleMouseMove(start, end, this, _uniformScale);
    }
    else if (this.manipulateMode == MANIPULATE_MODE_Move) {
        return this.doMove(start, end);
    }
}

function manipulator_HitTestManipulatorBoxes(clickPoint) {
    for (var i = 0; i < this.manipBoxes.length; i++) {
        if (this.manipBoxes[i].box.containsPoint(clickPoint)) {
            return this.manipBoxes[i];
        }
    }
    return null;
}

function manipulator_Finalize(clickPoint) {
    if (this.manipulateMode == MANIPULATE_MODE_Box) {
        if (this.currentManipBox.type == MANIP_TYPE_Rotate) {
            var a = new action(ACTION_TYPE_Rotate, this.rotation);
            _history.push(a);
            this.hidden = false;
        }
        else {
            var a = new action(ACTION_TYPE_Size, [this.currentManipBox, this.moveStart, clickPoint, _uniformScale]);
            _history.push(a);
        }
    }
    else if (this.manipulateMode == MANIPULATE_MODE_Move) {
        var a = new action(ACTION_TYPE_Move, [this.moveStart, clickPoint]);
        _history.push(a);
    }
}

function manipulator_Rotate(angle) {

    var m = mat4.create();
    mat4.rotateZ(m, m, angle);

    var t = vec3.create();
    var selectCenter = vec3.fromValues(this.box.left + (this.box.width() * 0.5), this.box.top + (this.box.height() * 0.5), 0);

    for (var i = 0; i < this.selectedObjects.length; i++) {

        vec3.sub(t, this.selectedObjects[i].ro.translation, selectCenter);
        vec3.transformMat4(t, t, m);
        vec3.add(this.selectedObjects[i].ro.translation, t, selectCenter);

        this.selectedObjects[i].ro.rotate(angle);

        var treeNode = this.selectedObjects[i].treeNode;
        treeNode.remove(this.selectedObjects[i]);
        this.selectedObjects[i].box.update(this.selectedObjects[i]);
        treeNode.root.add(this.selectedObjects[i]);
    }
    this.selectObjects(this.selectedObjects);
}

function manipulator_FlipX() {
    
    var t = vec3.create();
    var selectCenter = vec3.fromValues(this.box.left + (this.box.width() * 0.5), this.box.top + (this.box.height() * 0.5), 0);

    for (var i = 0; i < this.selectedObjects.length; i++) {

        vec3.sub(t, this.selectedObjects[i].ro.translation, selectCenter);
        vec3.mul(t, t, vec3.fromValues(-1, 1, 1));
        vec3.add(this.selectedObjects[i].ro.translation, t, selectCenter);
        this.selectedObjects[i].ro.flipX();

        var treeNode = this.selectedObjects[i].treeNode;
        treeNode.remove(this.selectedObjects[i]);
        this.selectedObjects[i].box.update(this.selectedObjects[i]);
        treeNode.root.add(this.selectedObjects[i]);
    }
    this.selectObjects(this.selectedObjects);
}

function manipulator_FlipY() {

    var t = vec3.create();
    var selectCenter = vec3.fromValues(this.box.left + (this.box.width() * 0.5), this.box.top + (this.box.height() * 0.5), 0);

    for (var i = 0; i < this.selectedObjects.length; i++) {

        vec3.sub(t, this.selectedObjects[i].ro.translation, selectCenter);
        vec3.mul(t, t, vec3.fromValues(1, -1, 1));
        vec3.add(this.selectedObjects[i].ro.translation, t, selectCenter);
        this.selectedObjects[i].ro.flipY();

        var treeNode = this.selectedObjects[i].treeNode;
        treeNode.remove(this.selectedObjects[i]);
        this.selectedObjects[i].box.update(this.selectedObjects[i]);
        treeNode.root.add(this.selectedObjects[i]);
    }
    this.selectObjects(this.selectedObjects);
}

function manipulator(renderer, shader) {
    this.draw = manipulator_Draw;
    this.setColor = manipulator_setColor;
    this.setBox = manipulator_setBox;
    this.selectObjects = manipulator_SelectObjects;
    this.handleClick = manipulator_HandleClick;
    this.handleMouseMove = manipulator_HandleMouseMove;
    this.hitTestManipBoxes = manipulator_HitTestManipulatorBoxes;
    this.finalize = manipulator_Finalize;
    this.doMove = manipulator_DoMove;
    this.rotate = manipulator_Rotate;
    this.flipX = manipulator_FlipX;
    this.flipY = manipulator_FlipY;

    this.renderer = renderer;
    this.shader = shader;

    this.frame = [];
    this.manipBoxes = [];

    this.setColor(1, 1, 1, 1);
    this.boxColor = vec4.fromValues(0.5, 0.5, 0.9, 1);
    this.frameColor = vec4.fromValues(1, 0, 0, 1);

    this.selectedObjects = [];
    this.manipulateMode = MANIPULATE_MODE_None;
    this.hidden = false;

    renderer.renderObjects.push(this);
}