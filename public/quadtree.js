
function polygon_AxisSeparatePolygons(axis, otherPoly) {

    var minMaxA = this.calculateInterval(axis);
    var minMaxB = otherPoly.calculateInterval(axis);

    if( minMaxA[0] > minMaxB[1] || minMaxB[0] > minMaxA[1])
        return true;

    var d0 = minMaxA[1] - minMaxB[0];
    var d1 = minMaxB[1] - minMaxA[0];
    var depth = (d0 < d1) ? d0 : d1;

    var axis_length_squared = vec3.dot(axis, axis);
    vec3.scale(axis, axis, depth / axis_length_squared);
    return false;
}

function polygon_IntersectTest(otherPoly) {
    var j;
    var i;
    var E = vec3.create();
    for( j = this.verts.length - 1, i = 0; i < this.verts.length; j = i, i++)
    {
        vec3.subtract(E, this.verts[i], this.verts[j]);
        var N = vec3.fromValues(-E[1], E[0], 0);

        if( this.axisSeparatePolygons(N, otherPoly))
            return false;
    }
    return true;
}

function polygon_CalculateInterval(axis) {
    var d = vec3.dot(axis, this.verts[0]);
    var minMax = [d,d];
    for( var i = 1; i < this.verts.length; i++ ) {
        d = vec3.dot(axis, this.verts[i]);
        if( d < minMax[0] ) minMax[0] = d;
        else if( d > minMax[1] ) minMax[1] = d;
    }
    return minMax;
}

function polygon_Translate(translation) {
    
    for( var i = 0; i < this.verts.length; i++ )
    {
        vec3.add(this.verts[i], this.verts[i], translation);
    }
}

function polygon_Scale(scale) {
    
    for( var i = 0; i < this.verts.length; i++ )
    {
        vec3.multiply(this.verts[i], this.verts[i], scale);
    }
}

function polygon_Rotate(angle) {
    var m = mat4.create();
    mat4.rotateZ(m, m, angle);

    for (var i = 0; i < this.verts.length; i++) {
        vec3.transformMat4(this.verts[i], this.verts[i], m);
    }
}

function polygon_Transform(mtx) {
    for (var i = 0; i < this.verts.length; i++)
        vec3.transformMat4(this.verts[i], this.verts[i], mtx);
}

function polygon(vertFloats, vertCount, stride) {
    this.calculateInterval = polygon_CalculateInterval;
    this.intersectTest = polygon_IntersectTest;
    this.axisSeparatePolygons = polygon_AxisSeparatePolygons;
    this.translate = polygon_Translate;
    this.scale = polygon_Scale;
    this.rotate = polygon_Rotate;
    this.transform = polygon_Transform;

    var v = [];
    for( var i = 0; i < vertCount; i++ )
    {
        var vertIndex = i * stride;
        v.push(vec3.fromValues(vertFloats[vertIndex], vertFloats[vertIndex + 1], 0));
    }
    this.verts = v;
}

function boxToPolygon(box) {
    return new polygon([box.left, box.top, box.right + 1, box.top, box.right + 1, box.bottom + 1, box.left, box.bottom + 1], 4, 2);
}

function polyCollision(box, polyVerts, mtx) {

    // Generate box polygon
    var boxPoly = boxToPolygon(box);

    // Generate obj polygon
    var objPoly = new polygon(polyVerts, polyVerts.length / 2, 2);

    // Bring object into world space
    objPoly.transform(mtx);

    // Test Box
    if (!boxPoly.intersectTest(objPoly))
        return false;

    // Test Obj
    if (!objPoly.intersectTest(boxPoly))
        return false;

    // They must intersect
    return true;
}

function quadTree_AddObject(object) {

    // Does it fit here?
    if (this.depth == 0 || this.box.containsBox(object.box)) {
        // Box fits inside here, see if it fits in my children
        
        var childIndex = -1;
        for (var i = 0; i < this.children.length; i++) {
            if (this.children[i].add(object)) {
                childIndex = i;
            }
        }

        if (childIndex < 0) {
            // Doesnt fit in any children, it has to go in this node
            this.objects.push(object);
            object.treeNode = this;
        }
        else {
            // My child ate this object then
        }
    }
    else {
        return false;
    }
    return true;
}

function quadTree_RemoveObject(object) {

    var index = this.objects.indexOf(object);
    if (index > -1) {
        this.objects.splice(index, 1);
    }
    object.treeNode = null;
}

function quadTree_BoxTest(box) {
    var objects = [];

    if (this.box.overlapsBox(box)) {        
        // This node is relevent

        // Check all objects contained in this node
        for (var i = 0; i < this.objects.length; i++) {
            if (box.overlapsBox(this.objects[i].box)) {
                if (polyCollision(box, this.objects[i]._vertices, this.objects[i].ro.ltw)) {
                    objects.push(this.objects[i]);
                }
            }
        }

        // Check child nodes
        for (var i = 0; i < this.children.length; i++) {
            var childHits = this.children[i].boxTest(box);
            if( childHits.length > 0 )
                objects = objects.concat(childHits);
        }
    }

    return objects;
}

function quadTree_PolyTest(poly) {
    var objects = [];
    
    var boxPoly = boxToPolygon(this.box);
    if (boxPoly.intersectTest(poly) && poly.intersectTest(boxPoly)) {
        // Check all objects contained in this node
        for (var i = 0; i < this.objects.length; i++) {
            boxPoly = boxToPolygon(this.objects[i].box);

            if (boxPoly.intersectTest(poly) && poly.intersectTest(boxPoly)) {
                var objPoly = new polygon(this.objects[i]._vertices, this.objects[i]._vertices.length / 2, 2);
                objPoly.transform(this.objects[i].ro.ltw);

                if( objPoly.intersectTest(poly) && poly.intersectTest(objPoly) )
                    objects.push(this.objects[i]);
            }   
        }

        // Check child nodes
        for (var i = 0; i < this.children.length; i++) {
            var childHits = this.children[i].polyTest(poly);
            if (childHits.length > 0)
                objects = objects.concat(childHits);
        }
    }

    return objects;
}

function quadTreeNode(minX, minY, maxX, maxY, depth, maxDepth, parent, root) {
    this.add = quadTree_AddObject;
    this.remove = quadTree_RemoveObject;
    this.boxTest = quadTree_BoxTest;
    this.polyTest = quadTree_PolyTest;

    this.box = new box(minX, minY, maxX, maxY);
    this.parent = parent;
    this.root = (root == null) ? this : root;
    this.depth = depth;

    this.children = [];
    this.objects = [];
    
    // This code is for visually debugging/setup of the quadtree
    //var ro = _renderer.createLineObject(_svgShader, boxToVerts(this.box), 8);
    //ro.color = vec3.fromValues(0.5, 0.5, 1.0);

    if (depth < maxDepth) {
        var width = maxX - minX;
        var height = maxY - minY;
        var halfWidth = minX + (width * 0.5);
        var halfHeight = minY + (height * 0.5);

        // Split the tree
        this.children[0] = new quadTreeNode(minX, minY, halfWidth, halfHeight, depth + 1, maxDepth, this, this.root);
        this.children[1] = new quadTreeNode(halfWidth, minY, maxX, halfHeight, depth + 1, maxDepth, this, this.root);
        this.children[2] = new quadTreeNode(minX, halfHeight, halfWidth, maxY, depth + 1, maxDepth, this, this.root);
        this.children[3] = new quadTreeNode(halfWidth, halfHeight, maxX, maxY, depth + 1, maxDepth, this, this.root);
    }
}

