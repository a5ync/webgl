///////////////////////////////////////////////////
// selectionObject
///////////////////////////////////////////////////
function texturedQuad_Draw(gl) {
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vb);
   
    gl.useProgram(this.shader.program);
    gl.enableVertexAttribArray(this.shader.vertexPositionAttribute);
    gl.vertexAttribPointer(this.shader.vertexPositionAttribute, 3, gl.FLOAT, false, 12, 0);


    gl.uniformMatrix4fv(this.shader.projMatrix, false, gl.proj);
    gl.uniformMatrix4fv(this.shader.viewMatrix, false, gl.view);
    gl.uniformMatrix4fv(this.shader.ltwMatrix, false, this.ltw);

    this.texture.bind(0);
    gl.uniform1i(this.shader.textureLoc, 0);

    gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
}

function texturedQuad_SetExtents(min, max) {

    var width = max[0] - min[0];
    var height = max[1] - min[1];

    var vscale = vec3.fromValues(width, height, 1);
    var vtrans = vec3.fromValues(min[0], min[1], 0);

    var m = mat4.create();
    mat4.translate(m, m, vtrans);
    mat4.scale(m, m, vscale);
    this.ltw = m;
}

function texturedQuad(shader, quadvb, texture) {
    this.draw = texturedQuad_Draw;
    this.setExtents = texturedQuad_SetExtents;

    this.shader = shader;
    this.texture = texture;
    this.ltw = mat4.create();

    this.vb = quadvb;
}

///////////////////////////////////////////////////
// selectionObject
///////////////////////////////////////////////////
function selectionObject_Draw(gl) {
    if (this.visible) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vb);
        this.shader.bind(gl);

        gl.uniformMatrix4fv(this.shader.projMatrix, false, gl.proj);
        gl.uniformMatrix4fv(this.shader.viewMatrix, false, this.worldSpace ? gl.view : mat4.create());
        gl.uniformMatrix4fv(this.shader.ltwMatrix, false, this.ltw);
        gl.uniform4fv(this.shader.quadColorLoc, this.color);

        gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
    }
}

function selectionObject_SetExtents(min, max) {

    var width = max[0] - min[0];
    var height = max[1] - min[1];

    var vscale = vec3.fromValues(width, height, 1);
    var vtrans = vec3.fromValues(min[0], min[1], 0);

    var m = mat4.create();
    mat4.translate(m, m, vtrans);
    mat4.scale(m, m, vscale);
    this.ltw = m;
}

function selectionObject_SetColor(red, green, blue, alpha) {
    this.color = vec4.fromValues(red, green, blue, alpha);
}

function selectionObject(gl, shader, quadvb) {
    this.draw = selectionObject_Draw;
    this.setExtents = selectionObject_SetExtents;
    this.setColor = selectionObject_SetColor;

    this.shader = shader;
    this.visible = false;
    this.worldSpace = false;
    this.ltw = mat4.create();
    this.color = vec4.fromValues(1, 1, 1, 1);

    this.vb = quadvb;
}

///////////////////////////////////////////////////
// lineObject
///////////////////////////////////////////////////
function lineObject_Draw(gl) {
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vb);
    //this.shader.bind(gl);

    gl.useProgram(this.shader.program);
    gl.enableVertexAttribArray(this.shader.vertexPositionAttribute);
    gl.vertexAttribPointer(this.shader.vertexPositionAttribute, 2, gl.FLOAT, false, 8, 0);

    gl.uniformMatrix4fv(this.shader.projMatrix, false, gl.proj);
    gl.uniformMatrix4fv(this.shader.viewMatrix, false, gl.view);
    gl.uniformMatrix4fv(this.shader.ltwMatrix, false, this.ltw);
    gl.uniform3fv(this.shader.selectColorLoc, this.color);

    gl.drawArrays(gl.LINES, 0, this.pointCount);
}

function lineObject_Translate(xyOffset) {
    var trans = vec3.fromValues(xyOffset[0], xyOffset[1], 0);
    vec3.add(this.translation, this.translation, trans);

    this.updateMatrix();
}

function lineObject_Resize(oldbox, newbox) {

    var oldWidth = oldbox.width();
    var oldHeight = oldbox.height();
    var newWidth = newbox.width();
    var newHeight = newbox.height();

    var originalWidth = oldWidth / this.scale[0];
    var originalHeight = oldHeight / this.scale[1];

    this.scale[0] = newWidth / originalWidth;
    this.scale[1] = newHeight / originalHeight;

    this.updateMatrix();
}

function lineObject_Scale(v3scale) {
    vec3.mul(this.translation, this.translation, v3scale);
    vec3.mul(this.scale, this.scale, v3scale);
    
    this.updateMatrix();
}

function lineObject_Rotate(angle) {
    this.rotation += angle;

    while (this.rotation > Math.Tau)
        this.rotation -= Math.Tau;
    while (this.rotation < -Math.Tau)
        this.rotation += Math.Tau;

    this.updateMatrix();
}

function lineObject_UpdateMatrix() {

    var m = mat4.create();
    mat4.translate(m, m, this.translation);
   
    // mat4.rotateX(m, m, this.rotationX);
    // mat4.rotateY(m, m, this.rotationY);
    mat4.rotateZ(m, m, this.rotation);
    mat4.scale(m, m, this.scale);
    this.ltw = m;
}

function lineObject_FlipX() {
    this.rotationY += Math.PI;

    while (this.rotationY > Math.Tau)
        this.rotationY -= Math.Tau;
    while (this.rotationY < -Math.Tau)
        this.rotationY += Math.Tau;

    this.updateMatrix();
}

function lineObject_FlipY() {
    this.rotationX += Math.PI;

    while (this.rotationX > Math.Tau)
        this.rotationX -= Math.Tau;
    while (this.rotationX < -Math.Tau)
        this.rotationX += Math.Tau;

    this.updateMatrix();
}

function lineObject(gl, shader, verts, vertCount) {
    this.draw = lineObject_Draw;
    this.translate = lineObject_Translate;
    this.resize = lineObject_Resize;
    this.setScale = lineObject_Scale;
    this.rotate = lineObject_Rotate;
    this.updateMatrix = lineObject_UpdateMatrix;
    this.flipX = lineObject_FlipX;
    this.flipY = lineObject_FlipY;

    this.shader = shader;
    this.pointCount = vertCount;

    this.selected = false;
    this.translation = vec3.create();
    this.scale = vec3.fromValues(1, 1, 1);
    this.rotation = 0;
    this.rotationY = 0;
    this.rotationX = 0;
    this.ltw = mat4.create();
    this.color = [0, 0, 0];

    this.vb = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vb);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);
}

///////////////////////////////////////////////////
// texture
///////////////////////////////////////////////////
function texture_Load(imageSrc) {
    var image = new Image();
    image.src = imageSrc;
    image.tex = this;
    image.addEventListener('load', function () {
        var gl = this.tex.gl;
        gl.bindTexture(gl.TEXTURE_2D, this.tex.tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    });
}

function texture_Bind(stage) {
    this.gl.activeTexture(this.gl.TEXTURE0 + stage);
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.tex);
}

function texture(gl) {
    this.load = texture_Load;
    this.bind = texture_Bind;
    
    var tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 255]));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);


    this.tex = tex;
    this.gl = gl;
}

///////////////////////////////////////////////////
// shaderProgram
///////////////////////////////////////////////////
function shaderProgram_Bind(gl) {
    gl.useProgram(this.program);

    gl.enableVertexAttribArray(this.vertexPositionAttribute);
    gl.vertexAttribPointer(this.vertexPositionAttribute, 3, gl.FLOAT, false, this.stride, 0);

    if (this.vertexColorAttribute >= 0) {
        gl.enableVertexAttribArray(this.vertexColorAttribute);
        gl.vertexAttribPointer(this.vertexColorAttribute, 3, gl.FLOAT, false, this.stride, 12);
    }
}

function shaderProgram(gl, vertShaderSrc, fragShaderSrc) {

    this.bind = shaderProgram_Bind;

    var vs = gl.createShader(gl.VERTEX_SHADER);
    var fs = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(vs, vertShaderSrc);
    gl.compileShader(vs);

    if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
        console.log("vs error");
        console.log(gl.getShaderInfoLog(vs));
    }

    gl.shaderSource(fs, fragShaderSrc);
    gl.compileShader(fs);

    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
        console.log("fs error");
        console.log(gl.getShaderInfoLog(fs));
    }

    this.program = gl.createProgram();
    gl.attachShader(this.program, vs);
    gl.attachShader(this.program, fs);
    gl.linkProgram(this.program);

    // If creating the shader program failed, alert
    if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
        alert("Unable to initialize the shader program.");
    }

    this.vertexPositionAttribute = gl.getAttribLocation(this.program, "aVertexPosition");
    this.vertexColorAttribute = gl.getAttribLocation(this.program, "aVertexColor");
    this.vertexUVAttribute = gl.getAttribLocation(this.program, "aVertexUV");

    if (this.vertexColorAttribute >= 0)
        this.stride = 24;
    else
        this.stride = 12;

    this.projMatrix = gl.getUniformLocation(this.program, "projMatrix");
    this.viewMatrix = gl.getUniformLocation(this.program, "viewMatrix");
    this.ltwMatrix = gl.getUniformLocation(this.program, "ltwMatrix");
    this.selectColorLoc = gl.getUniformLocation(this.program, "selectColor");
    this.quadColorLoc = gl.getUniformLocation(this.program, "quadColor");
    this.textureLoc = gl.getUniformLocation(this.program, "textureMap");
}

///////////////////////////////////////////////////
// wglRenderer
///////////////////////////////////////////////////
function wglRenderer_Initialize(canvas) {
    this.gl = null;

    Math.Tau = Math.PI * 2;

    try {
        this.gl = canvas.getContext("experimental-webgl");
    }
    catch (e) { }

    if (!this.gl) {
        alert("Unable to initialize WebGL. Your browser may not support it.");
    }
    else {
        this.gl.clearColor(0.0, 0.0, 0.0, 1.0);  // Clear to black, fully opaque
        this.gl.clearDepth(1.0);                 // Clear everything
        this.gl.enable(this.gl.DEPTH_TEST);           // Enable depth testing
        this.gl.depthFunc(this.gl.LEQUAL);            // Near things obscure far things
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
        this.gl.enable(this.gl.BLEND);
        this.setCanvasSize(canvas.clientWidth, canvas.clientHeight);


        var verts = [];
        verts.push(0); verts.push(0); verts.push(0);
        verts.push(1); verts.push(0); verts.push(0);
        verts.push(1); verts.push(1); verts.push(0);
        verts.push(0); verts.push(1); verts.push(0);

        this.quad_vb = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.quad_vb);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(verts), this.gl.STATIC_DRAW);
    }

}

function wglRenderer_DrawScene() {

    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

    for (var i = 0; i < this.renderObjects.length; i++) {
        this.renderObjects[i].draw(this.gl);
    }
}

function wglRenderer_CreateShader(vertShaderSrc, fragShaderSrc) {
    return new shaderProgram(this.gl, vertShaderSrc, fragShaderSrc);
}

function wglRenderer_CreateTexture() {
    return new texture(this.gl);
}

function wglRenderer_CreateLineObject(shader, positions, vertCount) {
    var ro = new lineObject(this.gl, shader, positions, vertCount);
    this.renderObjects.push(ro);
    return ro;
}

function wglRenderer_CreateSelectionQuad(shader) {
    var ro = new selectionObject(this.gl, shader, this.quad_vb);
    this.renderObjects.push(ro);
    return ro;
}

function wglRenderer_TexturedQuad(shader, texture) {
    var ro = new texturedQuad(shader, this.quad_vb, texture);
    this.renderObjects.push(ro);
    return ro;
}

function wglRenderer_SetCanvasSize(width, height) {
    this.gl.viewport(0, 0, width, height);
}

function wglRenderer_SetImageSpace(width, height, xoffset, yoffset) {
    var pm = mat4.create();
    mat4.ortho(pm, -width, width, height, -height, 0.1, 10);
    pm[14] = 0;
    mat4.translate(pm, pm, vec3.fromValues(xoffset, yoffset, 0));
    this.gl.proj = pm;

    this.imageSpaceWidth = width;
    this.imageSpaceHeight = height;
    this.imageSpaceOffsetX = xoffset;
    this.imageSpaceOffsetY = yoffset;
}

function wglRenderer_SetClearColor(red, green, blue) {
    this.gl.clearColor(red, green, blue, 1);
}

function wglRenderer_Clear() {
    this.renderObjects = [];
}

function wglRenderer(canvas) {
    this.init = wglRenderer_Initialize;
    this.clear = wglRenderer_Clear;
    this.drawScene = wglRenderer_DrawScene;
    this.createShader = wglRenderer_CreateShader;
    this.createTexture = wglRenderer_CreateTexture;
    this.createLineObject = wglRenderer_CreateLineObject;
    this.createSelectionQuad = wglRenderer_CreateSelectionQuad;
    this.createTexturedQuad = wglRenderer_TexturedQuad;
    this.setCanvasSize = wglRenderer_SetCanvasSize;
    this.setImageSpace = wglRenderer_SetImageSpace;
    this.setClearColor = wglRenderer_SetClearColor;


    this.clear();

    this.init(canvas);
    this.gl.view = mat4.create();
}