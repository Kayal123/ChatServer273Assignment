var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);
var crypto = require('crypto')
var mongoose = require('mongoose');

var users = {};
	
server.listen(1234);
console.log("Chat server listening on port 1234");

//connect to MongoDB
mongoose.connect('mongodb://localhost/ChatServerDB', function(err) {
    if(err) {
        console.log('Failed to collect to MongoDB');
        console.log(err);
    } else {
        console.log('Success, connected to MongoDB');
    }
});

//Schema for authentication
var authSchema = mongoose.Schema( { name: 'string', pwd: 'string' });
//schema for chat message storage with time-stamp
var chatSchema = mongoose.Schema( {name: 'string', msg: 'string', created: {type: Date, default: Date.now} });

//models
var authModel = mongoose.model('ChatServerAuth', authSchema);
var chatModel = mongoose.model('Message', chatSchema);

//app html request, send client.html file
app.get('/', function(req, res){
	res.sendfile(__dirname + '/client.html');
});

io.sockets.on('connection', function(socket){
    //handle new user request
	socket.on('new user', function(data, callback){
        console.log('newuser:' + data);
        var userData = data.trim();
        var index = userData.indexOf(',');
        if(index !== -1) {
            var userName=userData.substring(0, index);
            var userPasswd=userData.substring(index+1);
            
            if (userName in users){
                callback('Error: User already logged ON!');
            } else {  
                //user is not in current session
                var hmac = crypto.createHmac("sha1", 'ThisIsMySecretKey321');
                hmac.update(userPasswd);
                var sha1Password = hmac.digest("hex");        
                
                authModel.findOne( {name:userName} , function(err, user) {
                    if (user) {
                        //user already in DB                                              
                        console.log( 'userName: ' + user.name + 'pwd: ' + user.pwd );                    
                        if( user.pwd === sha1Password) {
                            callback('');
                            socket.nickname = userName;
                            users[socket.nickname] = socket;
                            updateNicknames();    
                        } else {
                            callback('Incorrect password, Try again!');
                        }
                    } else {
                        //user is not in DB, add it
                        var dbMsg = new authModel({name: userName, pwd: sha1Password});
                        
                        dbMsg.save( function(err) {
                            if(err) {
                                    console.log('Error writing to DB');
                                    callback('Error writing to DB');
                            } else {
                                    console.log('successfully written to DB');
                                    callback('');                                
                                    socket.nickname = userName;
                                    users[socket.nickname] = socket;
                                    updateNicknames();
                            }    
                        });
                    }
                });
            }

        } else {
            callback(false);
        }
	});
    
	
	function updateNicknames(){
		io.sockets.emit('usernames', Object.keys(users));
	}

	socket.on('send message', function(data, callback){
		var msg = data.trim();
		console.log('after trimming message is: ' + msg);
        var dbMsg = new chatModel({msg: msg, name: socket.nickname});
        dbMsg.save( function(err) {
            if(err) throw err;               
        });
		if(msg.substr(0,5) === '/Msg '){
			msg = msg.substr(5);
			var ind = msg.indexOf(' ');
			if(ind !== -1){
				var name = msg.substring(0, ind);
				var msg = msg.substring(ind + 1);
				if(name in users){
					users[name].emit('private', {msg: msg, nick: socket.nickname});
					console.log('message sent is: ' + msg);
					console.log('Private Msg!');
				} else if(name.indexOf("--All--") === 0) {
                    io.sockets.emit('new message', {msg: msg, nick: socket.nickname});
                } else {
					callback('Error!  Enter a valid user.');
				}
			} else{
				callback('Error!  No empty messages please!.');
			}
		} else{
			io.sockets.emit('new message', {msg: msg, nick: socket.nickname});
		}
	});
	
	socket.on('disconnect', function(data){
		if(!socket.nickname) return;
		delete users[socket.nickname];
		updateNicknames();
	});
});