var express = require('express');
var app = express();
var path = require('path');


app.use(express.static('public'));
// viewed at http://localhost:8080
// app.get('/', function(req, res) {
// 	res.send(req.params.module);
//     //res.sendFile(path.join(__dirname + '/index.html'));
// });
app.set('view engine', 'html');
app.listen(8080);