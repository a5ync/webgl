function box_IntersectTest(boxB) {
    if (this.right < boxB.left) return false; // a is left of b
    if (this.left > boxB.right) return false; // a is right of b
    if (this.bottom < boxB.top) return false; // a is above b
    if (this.top > boxB.bottom) return false; // a is below b
    return true; // boxes overlap
}

function box_ContainsBox(testBox) {
    if (this.left <= testBox.left && this.top <= testBox.top && this.right >= testBox.right && this.bottom >= testBox.bottom)
        return true;
    return false;
}

function box_ContainsPoint(point) {
    return (point[0] > this.left && point[0] < this.right && point[1] > this.top && point[1] < this.bottom);
}

function box_OverlapsBox(boxB) {
    return (this.intersects(boxB) || this.containsBox(boxB) || boxB.containsBox(this));
}

function box_Translate(delta) {
    this.left += delta[0];
    this.top += delta[1];
    this.right += delta[0];
    this.bottom += delta[1];
}

function box_Update(dataNode) {
    var minx = 1.79E+308;
    var miny = 1.79E+308;
    var maxx = -1.79E+308;
    var maxy = -1.79E+308;

    for (var i = 0; i < dataNode._vertices.length; i++) {
        var v = i * 2;
        var vert = vec3.fromValues(dataNode._vertices[v], dataNode._vertices[v + 1], 0);

        vec3.transformMat4(vert, vert, dataNode.ro.ltw);
        if (vert[0] < minx) minx = vert[0];
        if (vert[1] < miny) miny = vert[1];
        if (vert[0] > maxx) maxx = vert[0];
        if (vert[1] > maxy) maxy = vert[1];
    }

    this.left = minx;
    this.top = miny;
    this.right = maxx;
    this.bottom = maxy;
}

function box(left, top, right, bottom) {
    this.intersects = box_IntersectTest;
    this.overlapsBox = box_OverlapsBox;
    this.containsBox = box_ContainsBox;
    this.containsPoint = box_ContainsPoint;
    this.translate = box_Translate;
    this.update = box_Update;
    this.width = function() { return this.right - this.left; }
    this.height = function () { return this.bottom - this.top; }
    this.centerX = function () { return (this.left + ((this.right - this.left) * 0.5)); }
    this.centerY = function () { return (this.top + ((this.bottom - this.top) * 0.5)); }
    this.str = function () { return ("{" + this.left + "," + this.top + "," + this.right + "," + this.bottom + "}");}
    

    this.left = left;
    this.top = top;
    this.right = right;
    this.bottom = bottom;
}