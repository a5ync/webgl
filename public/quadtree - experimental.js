var MAX_QUADTREE_DEPTH = 5

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

    for (var i = 0; i < this.normals.length; i++) {
        if (this.axisSeparatePolygons(this.normals[i], otherPoly))
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

function polygon_Update(scale, translation) {

    //if (this.normals == null || this.scale != scale || this.translation != translation) {

        var verts = [];
        for (var i = 0; i < this.verts.length; i++) {
            var vert = vec3.create();
            vec3.multiply(vert, this.verts[i], scale);
            vec3.add(vert, vert, translation);
            verts.push(vert);
        }

        var N = [];
        var j;
        var i;
        var E = vec3.create();
        for (j = verts.length - 1, i = 0; i < verts.length; j = i, i++) {
            vec3.subtract(E, verts[i], verts[j]);
            var normal = vec3.fromValues(-E[1], E[0], 0);
            N.push(normal);
        }

        this.normals = N;
        this.scale = scale;
        this.translation = translation;
    //}
}

function polygon(vertFloats, vertCount, stride) {
    this.calculateInterval = polygon_CalculateInterval;
    this.intersectTest = polygon_IntersectTest;
    this.axisSeparatePolygons = polygon_AxisSeparatePolygons;
    this.update = polygon_Update;

    var v = [];
    for( var i = 0; i < vertCount; i++ )
    {
        var vertIndex = i * stride;
        v.push(vec3.fromValues(vertFloats[vertIndex], vertFloats[vertIndex + 1], 0));
    }
    this.verts = v;

    this.update(vec3.fromValues(1, 1, 1), vec3.fromValues(0, 0, 0));
}

function boxToPolygon(box) {
    return new polygon([box.left, box.top, box.right + 1, box.top, box.right + 1, box.bottom + 1, box.left, box.bottom + 1], 4, 2);
}

function polyCollision(box, polyVerts, translation, scale) {

    // Generate box polygon
    var boxPoly = boxToPolygon(box);

    // Generate obj polygon
    var objPoly = new polygon(polyVerts, polyVerts.length / 2, 2);

    // Bring object into world space
    objPoly.scale(scale);
    objPoly.translate(translation);

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

                var boxPoly = boxToPolygon(box);

                if (this.objects[i].objPoly == null) {
                    this.objects[i].objPoly = new polygon(this.objects[i]._vertices, this.objects[i]._vertices.length / 2, 2);
                }
                this.objects[i].objPoly.update(this.objects[i].ro.scale, this.objects[i].ro.translation);
                if( boxPoly.intersectTest(this.objects[i].objPoly) && this.objects[i].objPoly.intersectTest(boxPoly) ) {
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

    console.log("quadTree_PolyTest(" + this.depth + ") {" + this.box.left + "," + this.box.top + "," + this.box.right + "," + this.box.bottom + "}");
    
    if( this.boxPoly == null )
        this.boxPoly = boxToPolygon(this.box);
    if (this.boxPoly.intersectTest(poly) && poly.intersectTest(this.boxPoly)) {
        // Check all objects contained in this node
        console.log(" testing " + this.objects.length + " objects");
        for (var i = 0; i < this.objects.length; i++) {
            if( this.objects[i].boxPoly == null )
                this.objects[i].boxPoly = boxToPolygon(this.objects[i].box);

            if (this.objects[i].boxPoly.intersectTest(poly) && poly.intersectTest(this.objects[i].boxPoly)) {
                if (this.objects[i].objPoly == null) {
                    console.log("  generating polygon for object " + i + " with vertices: " + this.objects[i]._vertices.length / 2);
                    this.objects[i].objPoly = new polygon(this.objects[i]._vertices, this.objects[i]._vertices.length / 2, 2);
                }
                this.objects[i].objPoly.update(this.objects[i].ro.scale, this.objects[i].ro.translation);

                console.log("  doing intersection test");
                if (this.objects[i].objPoly.intersectTest(poly) && poly.intersectTest(this.objects[i].objPoly))
                    objects.push(this.objects[i]);
                console.log("  finished intersection test");
            }   
        }

        console.log(" checking children");
        // Check child nodes
        for (var i = 0; i < this.children.length; i++) {
            var childHits = this.children[i].polyTest(poly);
            if (childHits.length > 0)
                objects = objects.concat(childHits);
        }
    }

    return objects;
}

function quadTreeNode(minX, minY, maxX, maxY, depth, parent, root) {
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

    if (depth < MAX_QUADTREE_DEPTH) {
        var width = maxX - minX;
        var height = maxY - minY;
        var halfWidth = width * 0.5;
        var halfHeight = height * 0.5;

        // Split the tree
        this.children[0] = new quadTreeNode(minX, minY, halfWidth, halfHeight, depth + 1, this, this.root);
        this.children[1] = new quadTreeNode(halfWidth, minY, maxX, halfHeight, depth + 1, this, this.root);
        this.children[2] = new quadTreeNode(minX, halfHeight, halfWidth, maxY, depth + 1, this, this.root);
        this.children[3] = new quadTreeNode(halfWidth, halfHeight, maxX, maxY, depth + 1, this, this.root);
    }
}

