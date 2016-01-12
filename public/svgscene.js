var _renderer;
var _quadtree;
var _canvas;

var _svgShader;
var _selShader;
var _texShader;
var svg_data;
var _leftRulerTexture;
var _topRulerTexture;


var _manipulator;
var _history = [];
var _future = [];

var DRAG_MODE_None = 0;
var DRAG_MODE_Selecting = 1;
var DRAG_MODE_Manipulator = 2;

var _dragging = DRAG_MODE_None;
var _dragPoint = [];
var _selectionQuad;
var _zoom = 1;
var _zoomMatrix;

var _startRotation = -1;
var _uniformScale = true;

var _rulerSize = 72;
var _workspaceWidth = 1440; // 72dpi * 20 inches
var _workspaceHeight = 864; // 72dpi * 12 inches

function viewToWorld(point, screenSpace) {
    // Convert into normalized canvas space coordinates
    var normX = (point[0] - _canvas.left) / _canvas.clientWidth;
    var normY = (point[1] - _canvas.top) / _canvas.clientHeight;

    // Convert into screen space coordinates
    normX = (normX * 2) - 1;
    normY = (normY * 2) - 1;

    // Go from screen space to view space
    var v = vec4.fromValues(normX, -normY, 0, 1);
    var inv = mat4.create();
    mat4.invert(inv, _renderer.gl.proj);
    vec4.transformMat4(v, v, inv);
    
    // View space into world space
    if (screenSpace == null || !screenSpace) {
        mat4.invert(inv, _renderer.gl.view);
        vec4.transformMat4(v, v, inv);
    }

    var tpoint = [];
    //tpoint[0] = (normX * _renderer.imageSpaceWidth);// + _renderer.imageSpaceOffsetX;
    //tpoint[1] = (normY * _renderer.imageSpaceHeight);// + _renderer.imageSpaceOffsetY;
    tpoint[0] = v[0];
    tpoint[1] = v[1];
    return tpoint;
}

function svgOnMouseDown(e) {

    if (_manipulator == null)
        return;

    // Record the start point in world space
    _dragPoint = [];
    _dragPoint[0] = e.x;
    _dragPoint[1] = e.y;
    _dragPoint = viewToWorld(_dragPoint);

    // Set drag selection box size so that there is no flash of the old size
    if(_selectionQuad != null)
        _selectionQuad.setExtents(_dragPoint, _dragPoint);

    // Check Manipulator
    if (_manipulator.handleClick(_dragPoint)) {
        // Manipulator is dealing with this
        _dragging = DRAG_MODE_Manipulator;
    }
    else {
        // Check to see if we clicked anything
        var clickbox = new box(_dragPoint[0], _dragPoint[1], _dragPoint[0], _dragPoint[1]);
        var clickSelect = _quadtree.boxTest(clickbox);
        var a = new action(ACTION_TYPE_Select, clickSelect);
        a.do();
        if (clickSelect.length > 0) {
            // Clicked one or more objects, transfer control to the manipulator
            _history.push(a);
            _dragging = DRAG_MODE_Manipulator;
        }
        else {
            // Clicked on empty space, start drag selection
            _dragging = DRAG_MODE_Selecting;
            _dragPoint = [e.x, e.y];
            _dragPoint = viewToWorld(_dragPoint, true)
        }
    }
}

function svgOnMouseMove(e) {    
    if (_dragging != DRAG_MODE_None) {
        if (_dragging == DRAG_MODE_Selecting) {
            var wp = viewToWorld([e.x, e.y], true);
            _selectionQuad.setExtents(_dragPoint, wp);
        }
        else if (_dragging == DRAG_MODE_Manipulator) {
            var wp = viewToWorld([e.x, e.y]);
            _dragPoint = _manipulator.handleMouseMove(_dragPoint, wp);
        }
    }
}

function svgOnMouseUp(e) {

    if (_dragging == DRAG_MODE_Selecting) {

        // Get view space point where dragging ended
        var curPoint = [e.x, e.y];
        var wp = viewToWorld(curPoint, true);

        // Get world space points for all corners of the box
        var invView = mat4.create();
        mat4.invert(invView, _renderer.gl.view);
        var tl = vec3.create();
        var tr = vec3.create();
        var br = vec3.create();
        var bl = vec3.create();
        vec3.transformMat4(tl, vec3.fromValues(_dragPoint[0], _dragPoint[1], 0), invView);
        vec3.transformMat4(tr, vec3.fromValues(wp[0], _dragPoint[1], 0), invView);
        vec3.transformMat4(br, vec3.fromValues(wp[0], wp[1], 0), invView);
        vec3.transformMat4(bl, vec3.fromValues(_dragPoint[0], wp[1], 0), invView);

        var selPoly = new polygon(null, 0, 0);
        selPoly.verts.push(tl);
        selPoly.verts.push(tr);
        selPoly.verts.push(br);
        selPoly.verts.push(bl);

        // Get all hits from the quadtree   
        var objects = _quadtree.polyTest(selPoly);
        var a = new action(ACTION_TYPE_Select, objects);
        a.do();
        if (objects.length > 0)
            _history.push(a);
    }
    else if (_dragging == DRAG_MODE_Manipulator) {
        // Get view space point where dragging ended
        var curPoint = [e.x, e.y];
        var wp = viewToWorld(curPoint, true);
        _manipulator.finalize(wp);
    }

    _dragging = DRAG_MODE_None;
}

function boxToVerts(box) {
    var left = box.left - 1;
    var right = box.right + 1;
    var top = box.top - 1;
    var bot = box.bottom + 1;

    var boxVerts = [];
    boxVerts.push(left); boxVerts.push(top); 
    boxVerts.push(right); boxVerts.push(top);

    boxVerts.push(right); boxVerts.push(top);
    boxVerts.push(right); boxVerts.push(bot);

    boxVerts.push(right); boxVerts.push(bot);
    boxVerts.push(left); boxVerts.push(bot);

    boxVerts.push(left); boxVerts.push(bot);
    boxVerts.push(left); boxVerts.push(top);

    return boxVerts;
}

function svgResetZoom() {
    _zoom = 1;
    var desiredCenter = [(_workspaceWidth / 2), (_workspaceHeight / 2)];
    var view = mat4.create();
    mat4.scale(view, view, vec3.fromValues(_zoom, _zoom, 1));
    mat4.translate(view, view, vec3.fromValues(-desiredCenter[0], -desiredCenter[1], 0));
    _zoomMatrix = view;
    _renderer.gl.view = _zoomMatrix;
}

function svgOnMouseWheel(e) {
    var delta = e.wheelDelta / 120;

    var zoomStep = 0.15;
    var startZoom = _zoom;
    _zoom += delta * zoomStep;

    if (_zoom < 0.01)
        _zoom = 0.01;

    var desiredCenter = [(_workspaceWidth / 2), (_workspaceHeight / 2)];
    if (_zoom > 1) {
        // Get the point of the mouse
        var mousePointSP = viewToWorld([e.x, e.y], true);
        var mousePoint = viewToWorld([e.x, e.y]);

        // New center point is mousePoint - the new zoomed screen space point keeping the world space point of the mouse the same
        desiredCenter[0] = mousePoint[0] - (mousePointSP[0] / _zoom);
        desiredCenter[1] = mousePoint[1] - (mousePointSP[1] / _zoom);
    }

    var view = mat4.create();
    mat4.scale(view, view, vec3.fromValues(_zoom, _zoom, 1));
    mat4.translate(view, view, vec3.fromValues(-desiredCenter[0], -desiredCenter[1], 0));
    _zoomMatrix = view;
    _renderer.gl.view = _zoomMatrix;
}

function svgSetupScene(sceneData) {
    
    svg_data = sceneData;

    _renderer.clear();

    // Create quadtree
    var quadTreeSpace = 1200;
    var halfWorkspaceWidth = (_workspaceWidth / 2);
    var halfWorkspaceHeight = (_workspaceHeight / 2);
    _quadtree = new quadTreeNode(-quadTreeSpace + halfWorkspaceWidth, -quadTreeSpace + halfWorkspaceHeight, quadTreeSpace + halfWorkspaceWidth, quadTreeSpace + halfWorkspaceHeight, 0, 5, null, null);

    if (svg_data != null) {
        // Process data nodes
        console.log("dataNodes: " + svg_data._dataNodes.length);
        for (var i = 0; i < svg_data._dataNodes.length; i++) {
            var dn = svg_data._dataNodes[i];

            // create the box
            dn.box = new box(dn.box[0], dn.box[1], dn.box[2], dn.box[3]);

            // add to the quad tree
            _quadtree.add(dn);

            // Create the render object
            dn.ro = _renderer.createLineObject(_svgShader, dn._vertices, dn._vertices.length / 2);
            dn.ro.color = dn.color;
            dn.ro.translate([dn.box.centerX(), dn.box.centerY()])
        }
    }
    
    // Create Rulers
    var leftRuler = _renderer.createTexturedQuad(_texShader, _leftRulerTexture)
    leftRuler.setExtents([-_rulerSize, 0], [0, _workspaceHeight]);

    var topRuler = _renderer.createTexturedQuad(_texShader, _topRulerTexture);
    topRuler.setExtents([0, -_rulerSize], [_workspaceWidth, 0]);

    // Create workspace box
    var boxobj = _renderer.createLineObject(_svgShader, boxToVerts(new box(0, 0, _workspaceWidth, _workspaceHeight)), 8);
    boxobj.color = vec3.fromValues(1, 0, 0);

    // Setup selection quad
    _selectionQuad = _renderer.createSelectionQuad(_selShader);
    _selectionQuad.setColor(0.4, 0.4, 0.4, 0.5);

    // Create manipulator
    _manipulator = new manipulator(_renderer, _selShader);

    _renderer.rotation = 0;
    _zoomMatrix = mat4.create();
}

function customSVGData() {

    svg_data = new Object();
    svg_data._min = [0, 0];
    svg_data._max = [100, 100];

    svg_data._dataNodes = [];

    var dnA = new Object();
    dnA.box = [10, 10, 12, 12];
    dnA.color = [1, 0, 0];
    dnA._vertices = [];
    dnA._vertices.push(-1); dnA._vertices.push(-1);
    dnA._vertices.push(1); dnA._vertices.push(-1);
    dnA._vertices.push(1); dnA._vertices.push(-1);
    dnA._vertices.push(1); dnA._vertices.push(1);
    dnA._vertices.push(1); dnA._vertices.push(1);
    dnA._vertices.push(-1); dnA._vertices.push(1);
    dnA._vertices.push(-1); dnA._vertices.push(1);
    dnA._vertices.push(-1); dnA._vertices.push(-1);
    svg_data._dataNodes.push(dnA);

    var dnB = new Object();
    dnB.box = [15, 15, 20, 20];
    dnB.color = [0.25, 0, 1];
    dnB._vertices = [];
    dnB._vertices.push(-2.5); dnB._vertices.push(-2.50);
    dnB._vertices.push(2.50); dnB._vertices.push(-2.50);
    dnB._vertices.push(2.50); dnB._vertices.push(-2.50);
    dnB._vertices.push(2.50); dnB._vertices.push(2.50);
    dnB._vertices.push(2.50); dnB._vertices.push(2.50);
    dnB._vertices.push(-2.50); dnB._vertices.push(2.50);
    dnB._vertices.push(-2.50); dnB._vertices.push(2.50);
    dnB._vertices.push(-2.50); dnB._vertices.push(-2.50);
    svg_data._dataNodes.push(dnB);
}

function svgSceneInit(canvas, lineShaderSrc, selShaderSrc, texShaderSrc, rulerTextures) {

    //customSVGData();

    // Register mouse move handlers
    _canvas = canvas;
    _canvas.left = _canvas.offsetLeft + _canvas.clientLeft;
    _canvas.top = _canvas.offsetTop + _canvas.clientTop;
    _canvas.width = _canvas.clientWidth;
    _canvas.height = _canvas.clientHeight;
    canvas.onmousedown = svgOnMouseDown;
    canvas.onmousemove = svgOnMouseMove;
    canvas.onmouseup = svgOnMouseUp;
    canvas.onmousewheel = svgOnMouseWheel;    

    // Create the renderer
    _renderer = new wglRenderer(canvas);
    _svgShader = _renderer.createShader(lineShaderSrc[0], lineShaderSrc[1]);
    _selShader = _renderer.createShader(selShaderSrc[0], selShaderSrc[1]);
    _texShader = _renderer.createShader(texShaderSrc[0], texShaderSrc[1]);
    _leftRulerTexture = _renderer.createTexture();    
    _topRulerTexture = _renderer.createTexture();
    _leftRulerTexture.load(rulerTextures[0]);
    _topRulerTexture.load(rulerTextures[1]);

    // Setup render params
    _renderer.setClearColor(0.8, 0.8, 0.8);

    svgSetupScene(svg_data);
    //svgSetupScene(null);


    _renderer.setImageSpace(canvas.width, canvas.height, 0, 0);
    _renderer.gl.view = mat4.create();
    mat4.translate(_renderer.gl.view, _renderer.gl.view, vec3.fromValues(-(1440 / 2), -(864 /2), 0));
    

    //_manipulator.selectObjects([svg_data._dataNodes[0], svg_data._dataNodes[1]]);

    // Setup the update
    setInterval(updateScene, 1);
}

function updateScene() {

    _canvas.width = _canvas.clientWidth;
    _canvas.height = _canvas.clientHeight;
    _renderer.setImageSpace(_canvas.width, _canvas.height, 0, 0);
    _renderer.setCanvasSize(_canvas.clientWidth, _canvas.clientHeight);
    if (_selectionQuad != null )
        _selectionQuad.visible = (_dragging == DRAG_MODE_Selecting);


    // Draw
    _renderer.drawScene();
}

function svgSendData() {

    var exports = [];

    var rot = mat4.create();
    mat4.translate(rot, rot, vec3.fromValues(_renderer.imageSpaceWidth / 2, _renderer.imageSpaceHeight / 2, 0));
    mat4.rotateZ(rot, rot, _renderer.rotation * 0.0174533);
    mat4.translate(rot, rot, vec3.fromValues(-_renderer.imageSpaceWidth / 2, -_renderer.imageSpaceHeight / 2, 0));

    for (var i = 0; i < svg_data._dataNodes.length; i++) {
        var dn = svg_data._dataNodes[i];
        var trans = dn.ro.translation;
        var scale = dn.ro.scale;

        var eo = new Object;
        eo.verts = [];

        var vertCount = dn._vertices.length / 2;
        for (var v = 0; v < vertCount; v++) {
            var vertIndex = v * 2;

            var vert = vec2.fromValues(dn._vertices[vertIndex], dn._vertices[vertIndex + 1]);
            vec2.multiply(vert, vert, scale);
            vec2.add(vert, vert, trans);
            vec2.transformMat4(vert, vert, rot);

            eo.verts.push(vert);
        }
        eo.color = dn.color;
        exports.push(eo);
    }

    /////////////// FOR FILTERING DUPLICATES (BEGIN)

    ////// Identify duplicates
    var duplicateVertices = [];
    for (var i = 0; i < exports.length; i++) {
        var duplicateIndices = [];
        var vertices = exports[i].verts;
        for(var j = 0; j <= vertices.length - 2; j = j + 2) {

            var x_1 = vertices[j][0];
            var y_1 = vertices[j][1];

            var x_2 = vertices[j + 1][0];
            var y_2 = vertices[j + 1][1];

            if(x_1 == x_2 && y_1 == y_2) {
                duplicateIndices.push(j);
                duplicateIndices.push(j + 1);
            }
        }
        duplicateVertices.push(duplicateIndices);
    }

    ////// Remove duplicates
    for (var i = 0; i < exports.length; i++) {
        var duplicates = duplicateVertices[i];
        var vertices = exports[i].verts;
        for (var j = duplicates.length - 1; j >= 0; j--) {
            var index = duplicates[j];
            vertices.splice(index, 1);
        }
        exports[i].verts = vertices;
    }

    /////////////// FOR FILTERING DUPLICATES (END)

    return exports;
}

function svgUndo() {
    if (_history.length > 0) {
        var index = _history.length - 1;
        var a = _history[index];
        _history.splice(index, 1);
        a.undo();
        _future.push(a);
    }
}

function svgRedo() {
    if (_future.length > 0) {
        var index = _future.length - 1;
        var a = _future[index];
        _future.splice(index, 1);
        a.do();
        _history.push(a);
    }
}

function svgUniformScale(enable) {
    _uniformScale = enable;
}

function svgSetSelectedColor(red, green, blue, undoRedoFunc) {
    var selected = _manipulator.selectedObjects;
    var oldColors = [];
    for (var i = 0; i < selected.length; i++) {
        oldColors.push(selected[i].ro.color);
    }

    var act = new action(ACTION_TYPE_ChangeColor, [selected, oldColors, red, green, blue, undoRedoFunc])
    act.do();
    _history.push(act);
}

function floatCheck(a, b, epsilon) {
    var v = Math.abs(a - b);
    return v < epsilon;
}

function colorCheck(a, b) {
    return floatCheck(a[0], b[0], 0.0001) && floatCheck(a[1], b[1], 0.0001) && floatCheck(a[2], b[2], 0.0001);
}

function svgRevertColor(red, green, blue, tr, tg, tb, undoRedoFunc) {

    if( svg_data == null )
        return;

    var color = [red, green, blue];

    var objects = [];
    var oldColors = [];
    for (var i = 0; i < svg_data._dataNodes.length; i++) {
        var dn = svg_data._dataNodes[i];
        if (colorCheck(dn.ro.color, color)) {
            objects.push(dn);
            oldColors.push(dn.ro.color);
        }
    }

    var act = new action(ACTION_TYPE_ChangeColor, [objects, oldColors, tr, tg, tb, undoRedoFunc]);
    act.do();
    _history.push(act);
}

function svgRotateSelected(angle) {
    var a = new action(ACTION_TYPE_Rotate, angle);
    a.do();
    _history.push(a);
}

function svgFlipX() {
    _manipulator.flipX();
}

function svgFlipY() {
    _manipulator.flipY();
}