var M_TAU = 6.283185307179586476925286766559

var _renderer;

function star(renderer, shader, points, red, green, blue) {
    // Generate vertices
    var vertexPositions = [];

    var theta = M_TAU / points;
    var cosTheta = Math.cos(theta);
    var sinTheta = Math.sin(theta);

    var x = 0;
    var y = 1;

    for (var point = 0; point < points + 2; point++)
    {
        var rotX = (cosTheta * x) + (sinTheta * y);
        var rotY = (-sinTheta * x) + (cosTheta * y);
        x = rotX;
        y = rotY;

        vertexPositions.push(x);
        vertexPositions.push(y);
        vertexPositions.push(0);
    }

    var lineVerts = [];
    for (var i = 0; i < points; i++) {
        var here = i * 3;
        var next = (i + 2) * 3;
        
        lineVerts.push(vertexPositions[here + 0]);
        lineVerts.push(vertexPositions[here + 1]);
        lineVerts.push(0);

        lineVerts.push(red);
        lineVerts.push(green);
        lineVerts.push(blue);

        lineVerts.push(vertexPositions[next + 0]);
        lineVerts.push(vertexPositions[next + 1]);
        lineVerts.push(0);

        lineVerts.push(red);
        lineVerts.push(green);
        lineVerts.push(blue);
        
    }

    // Generate Render Object
    this.ro = renderer.createLineObject(shader, lineVerts, points * 2);
    this.renderer = renderer;
}

function starSceneInit(canvas, vertShader, fragShader) {


    // Create the renderer
    _renderer = new wglRenderer(canvas);
    var starShader = _renderer.createShader(vertShader, fragShader);
    //_renderer.setViewport(svg_data._min[0], svg_data._min[1], svg_data._max[0], svg_data._max[1]);
    //_renderer.setViewport(0, 0, svg_data._max[0] - svg_data._min[0], svg_data._max[1] - svg_data._min[1]);
    console.log("min(" + svg_data._min[0] + "," + svg_data._min[1] + ") - max(" + svg_data._max[0] + "," + svg_data._max[1] + ")");
    //_renderer.setViewport(0, 0, 640, 640);
    _renderer.setClearColor(0.8, 0.8, 0.8);
    _renderer.setImageSpace(svg_data._max[0], svg_data._max[1]);

    // Create Stars
    //var stars = [];
    //stars[0] = new star(_renderer, starShader, 5, 1, 0, 0);
    //stars[1] = new star(_renderer, starShader, 17, 0, 1, 0);
    console.log("dataNodes: " + svg_data._dataNodes.length);
    var vertices = [];
    for (var i = 0; i < svg_data._dataNodes.length; i++) {
        //vertices = vertices.concat(svg_data._dataNodes[i]._vertices);
        nodeRO = _renderer.createLineObject(starShader, svg_data._dataNodes[i]._vertices, svg_data._dataNodes[i]._vertices.length / 6);
    }
    console.log("Creating render object");
    //_renderer.createLineObject(starShader, vertices, vertices.length / 6);
    console.log("finished");

    // Setup the star update
    setInterval(updateStars, 15);
}

function updateStars() {
    // Rotate stars

    // Draw
    _renderer.drawScene();
}