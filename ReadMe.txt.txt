Install MongoDB and update PATH environment variable
start MongoDB server by typing mongod [in command prompt]
start charserver by typing node server.js
open browser and typein http://localhost:1234 and continue
To view database type below commands 
mongo \ChatServerDB
db.chatserverauths.find()

MongoDB quick command reference:
show dbs
show collections

db.chatserverauths.find()
db.messages.find()

db.chatserverauths.remove({})
db.messages.remove({})
