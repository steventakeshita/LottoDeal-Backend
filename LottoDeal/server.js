/* SERVER FUNCTIONALITY */
var express = require('express')
var app = express()
var https = require('https')
var fs = require('fs')
const SECONDS_UNTIL_CHECK_FOR_PERFROMING_LOTTERIES = 3;
var json = require('express-json')
var bodyParser = require("body-parser")
app.use(bodyParser.urlencoded({extended:false}));
app.use(bodyParser.json())
app.use(json())


var fs = require('fs'); // add for file system

//Check if lotteries should be performed
function checkIfServerShouldPerformLottery(){
    // do whatever you like here
    console.log('test')
    checkLotteries();
    setTimeout(checkIfServerShouldPerformLottery, SECONDS_UNTIL_CHECK_FOR_PERFROMING_LOTTERIES * 1000);
}


//app.use(express.bodyParser());

var options = {
    key : fs.readFileSync('server.key'),
    cert: fs.readFileSync('server.crt')
};

app.use(function(req, res, next) {
    var allowedOrigins = ['https://dominicwhyte.github.io'];
    var origin = req.headers.origin;
    if(allowedOrigins.indexOf(origin) > -1){
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    //res.header('Access-Control-Allow-Origin', 'http://127.0.0.1:8020');
    res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Access-Control-Allow-Credentials', true);
    return next();
});


app.get('/', function(request, response) {
    response.send("API is working!")
})

// will create a new post, and associate it with a user in our database
app.post('/createPost', function(request, response) {
    // Parse the response
    console.log(request.body);

    // create a new post in the database
    var date = new Date();
  //  var timecreated = date.getTime();
    var expirationDate = request.body.expirationDate;
    var title = request.body.title;
    var price = request.body.price;
    //var image = request.body.picture; 
    var description = request.body.description;

    // var post = {
    //     timecreated: timecreated,
    //     expirationDate: expirationDate,
    //     title: title,
    //     price: price,
    //    // image: image,
    //     description: description
    // }
//    console.log(post)

// should be giving it a date instead of a time
createItem(title, price, date, expirationDate, "description");

response.send("You have created a new post.")
})

// Will add a new user to our database
app.post('/createUser', function(request, response) {
    // Parse the response
    console.log(request.body);
    var name = request.body.name;
    var id = request.body.fbid;
    var url = request.body.url;

    createUser(name, id, url);

    response.send("You have created a new user")
})

// A user has bid on an item, add this bid to database
app.post('/addBid', function(request, response) {
    // get into database, access object, update it's bid field and add to user bids

    var itemID = request.body.itemID;
    var userID = request.body.userID;
    var newAmount = request.body.newAmount;

    addBidForItem(itemID, userID, newAmount);

    response.send("Bid added")
})

// Send back all posts
app.get('/getPosts', function(request, response) {
    // get all of the posts and return them to frontend to load on feed
    // might not need to include bids

    var items = findAllItems(function(items) {
        console.log(items);
        response.send(JSON.stringify(items))
    });
    
})

// Send back either a serialized or full version of all users
app.get('/getUsers', function(request, response) {

    var users = findAllUsers();

    response.send("Here are all of the users")
})

// Send back the bids on the passed in item parameter, in case user wants to
// see the people that bid on his item
app.get('/getBids', function(request, response) {
    response.send("Here are all of the bids on this item")

    var title = request.body.title;
    var item = findItem(title);

})

// Start the server at localhost:8000
//app.listen(8000, function() {
 //   console.log("App is listening on port 8000")
//})

https.createServer(options, app).listen(8000, function() {
    console.log("Server started at port 8000");
});



/* START OF MONGO FUNCTIONS */
const ITEM_COLLECTION = 'Items';
const USER_COLLECTION = 'Users';

var MongoClient = require('mongodb').MongoClient
, assert = require('assert');

var ObjectId = require('mongodb').ObjectID;

var mongoose = require('mongoose');

// Connection URL
var url = 'mongodb://localhost:27017/LottoDeal';

// Use connect method to connect to the server

mongoose.Promise = global.Promise;


mongoose.connect(url, function(err, db) {
    assert.equal(null, err);

    //    createUser("dom", "1234", "google.com");

    //findAllUsers();
    console.log("Connected successfully to server");

    //addBidForItem("58efe4435363382e3d61137a", "58e8054642a9960421d3a566", 3);
    var date = new Date();

    //createItem("Dildo", 123, date, date, "description");



    // findAllUsers()
    findAllItems(function (items) {
        console.log(items);
    });
    //checkIfServerShouldPerformLottery();
});



var Schema = mongoose.Schema;

// create a schema
var userSchema = new Schema({
    fullName: String, // facebook given (String)
    fbid: String, // facebook given
    pictureURL: String, //profile pic URL from Facebook (String)
    bids: [{
        itemID: String,
        amount: Number
    }], //Bid object as dictionary containing all current bids of that user (indexed by itemID).  If a person bids twice on an item, the bid for that itemID is increased (Dictionary)
});

var User = mongoose.model('User', userSchema);

// create a schema
var itemSchema = new Schema({
    title: String, // title of the item being sold (String)
    price: Number, //price in USD (int)
    datePosted: Date, //date the item was posted (String - parse into Date object)
    expirationDate: Date, // date when if the item was not sold then everyone gets refunded (String- parse into Date object)
    bids: [{
        ID: String
    }],
    userIDs: [{
        ID: String,
        amount: Number,
    }], //Dictionary of fbid’s of users who have placed bids (Dictionary)
    descrip: String, // text string of what exactly is being sold (String)
    img: {data: Buffer, // stores an image here
        contentType: String}
    });

var Item = mongoose.model('Item', itemSchema);

module.exports = User;
module.exports = Item;


var createUser = function(name, id, url) {
    var newUser = new User ({fullName : name, fbid : id, pictureURL : url});
    // call the built-in save method to save to the database
    newUser.save(function(err) {
        if (err) throw err;
        console.log('User saved successfully!');
    });
}

var createItem = function(title, price, datePosted, expirationDate, descrip) {
    var newItem = new Item ({title : title, price : price, datePosted : datePosted, expirationDate: expirationDate, descrip: descrip, bids : []});
    // call the built-in save method to save to the database
    // newItem.img.data = fs.readFileSync(image);
    // newItem.img.contentType = 'image/png';
    newItem.save(function (err, newItem) {
      if (err) throw err;});

    newItem.save(function(err) {
        if (err) throw err;

        console.log('Item saved successfully!');
    });
}
//Check database for if lotteries should be performed
var checkLotteries = function() {
    Item.find({}, function(err, items) {
        if (err) throw err;
        
        for (i = 0; i < items.length; i++) {
            var date = new Date(items[i].expirationDate)
            if (date < Date.now()) {
              console.log('Date has past');
          }
      }
      return items;
  });
}


        // A.findById(a, function (err, doc) {
        //   if (err) return next(err);
        //   res.contentType(doc.img.contentType);
        //   res.send(doc.img.data);
        //   // how to send it back to the sever from my computer

        var addBidForItem = function(itemID, userID, newAmount) {
    // get a item with ID and update the userID array
    Item.findById(itemID, function(err, item) {
        if (err) throw err;
        var array = item.bids;
        var found = false;
        
        if (item.bids != null) {
            for (i = 0; i < item.bids.length; i++) {
                if (item.userIDs[i].ID == userID) {
                    var curAmount = item.userIDs[i].amount;
                    curAmount += newAmount;
                    item.userIDs[i].amount = curAmount;
                    item.save();
                    found = true;
                    break;
                }
            }
        }

        if (!found) {
            var data = {ID: userID, amount: newAmount};
            console.log(data);
            item.bids.push(data);
            item.save();
        }

        console.log('bid successfully updated!');
        


    });


    // get a user with ID and update the bids array
    User.findById(userID, function(err, user) {
        if (err) throw err;
        
        if (user != null) {
            var array = user.bids;
            var found = 0;
            if (user.bids != null) {
                for (i = 0; i < user.bids.length; i++) {
                    if (user.bids[i].itemID == itemID) {
                        var curAmount = user.bids[i].amount;
                        curAmount += newAmount;
                        user.bids[i].amount = curAmount;
                        user.save();
                        found = 1;
                        break;
                    }
                }
                if (!found) {
                    var data = {itemID: itemID, amount: newAmount};
                    console.log(data);
                    user.bids.push(data);
                    user.save();
                }

                console.log('bid successfully updated!');
            }
            
        }
        else {
            console.log('user not found');
        }
        

    });

}



var deleteUser = function(id) {
    // Remove User
    User.findById(id, function(err, user) {
        if (err) throw err;

    // delete
    user.remove(function(err) {
        if (err) throw err;
        console.log('User successfully deleted!');
    });
});
}


var deleteItem = function(id) {
    // Remove Item
    Item.findById(id, function(err, item) {
        if (err) throw err;

    // delete
    item.remove(function(err) {
        if (err) throw err;

        console.log('Item successfully deleted!');
    });
});
}


var findUsers = function(fbid) {
    // get all the users
    User.find({fbid: fbid}, function(err, user) {
        if (err) throw err;
        console.log(user);
    });
}

var findAllUsers = function() {
    // get all the users
    User.find({}, function(err, user) {
        if (err) throw err;
        console.log(user);
        return user;
    });
}

var deleteAllUsers = function() {
    // get all the users

    User.remove({}, function(err) {
        if (err) throw err;
        console.log('All User successfully deleted!');
    });

}

var deleteAllItems = function() {
    // get all the users

    Item.remove({}, function(err) {
        if (err) throw err;
        console.log('All Items successfully deleted!');
    });

}

var findItem = function(title) {
    // get all the Items
    Item.find({title: title}, function(err, item) {
        if (err) throw err;
    // object of all the users
    console.log(items);
    return item;
});
}

var findAllItems = function(callback) {
    // get all the items
    Item.find({}, function(err, items) {
        if (err) throw err;
        //console.log(items);
        callback(items)
    });

}