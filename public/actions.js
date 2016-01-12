var ACTION_TYPE_Select = 1;
var ACTION_TYPE_Move = 2;
var ACTION_TYPE_Size = 3;
var ACTION_TYPE_Rotate = 4;
var ACTION_TYPE_ChangeColor = 5;

function action_Do() {
    switch (this.type) {
        case ACTION_TYPE_Select:
            this.undoData = _manipulator.selectedObjects;
            _manipulator.selectObjects(this.data);
            break;
        case ACTION_TYPE_Move:
            _manipulator.doMove(this.data[0], this.data[1]);
            break;
        case ACTION_TYPE_Size:
            this.data[0].handleMouseMove(this.data[1], this.data[2], _manipulator, this.data[3]);
            break;
        case ACTION_TYPE_Rotate:
            console.log("DoRotate: " + this.data);
            _manipulator.rotate(this.data);
            break;
        case ACTION_TYPE_ChangeColor:
            var objects = this.data[0];
            for( var i = 0; i < objects.length; i++ )
                objects[i].ro.color = vec3.fromValues(this.data[2], this.data[3], this.data[4]);
            if (this.data[5] != null)
                this.data[5](false);
            break;
    }
}

function action_Undo() {
    switch (this.type) {
        case ACTION_TYPE_Select:
            _manipulator.selectObjects(this.undoData);
            break;
        case ACTION_TYPE_Move:
            _manipulator.doMove(this.data[1], this.data[0]);
            break;
        case ACTION_TYPE_Size:
            this.data[0].handleMouseMove(this.data[2], this.data[1], _manipulator, this.data[3]);
            break;
        case ACTION_TYPE_Rotate:
            console.log("UndoRotate: " + this.data);
            _manipulator.rotate(-this.data);
            break;
        case ACTION_TYPE_ChangeColor:
            var objects = this.data[0];
            var oldColors = this.data[1];
            for (var i = 0; i < objects.length; i++) {
                var oldColor = oldColors[i];
                objects[i].ro.color = vec3.fromValues(oldColor[0], oldColor[1], oldColor[2]);
            }
            if (this.data[5])
                this.data[5](true);
            break;
    }
}

function action(type, data) {
    this.do = action_Do;
    this.undo = action_Undo;

    this.type = type;
    this.data = data;    
}