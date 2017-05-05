const lotteryModule = require('./lottery');
const databaseModule = require('./server');
const serverModule = require('./server');
const communicationsModule = require('./communications');


const SECONDS_UNTIL_CHECK_FOR_PERFROMING_LOTTERIES = 3;

//Check if lotteries should be performed
exports.checkIfServerShouldPerformLottery = function() {
    // console.log('checking lottery');
    // do whatever you like here
    // console.log('Checking if lottery should be performed')
    checkLotteries();
    setTimeout(lotteryModule.checkIfServerShouldPerformLottery, SECONDS_UNTIL_CHECK_FOR_PERFROMING_LOTTERIES * 1000);
}


//Check database for if lotteries should be performed
var checkLotteries = function() {
    databaseModule.findAllItems(function(items) {
        for (i = 0; i < items.length; i++) {
            var item = items[i];
            if (item.expired || item.sold) {
                continue;
            }
            var expirDate = new Date(item.expirationDate);
            if (item.amountRaised >= item.price) {
                var winner = performLottery(item);
                console.log('Item sold to ' + winner)
                communicationsModule.emailBiddersForItem(item, "LottoDeal: You lost!", "Sorry, you lost your bid for " + item.title + ". Bid again on LottoDeal!", winner);
            } else if (expirDate < Date.now()) {
                //Refund and notify users
                refundUsers(item);
                console.log('Date has past - notifying users and marking item as expired');

                communicationsModule.emailBiddersForItem(item, "LottoDeal:" + item.title + " expired", "You have been fully refunded", "");
                item.expired = true;
                item.save();
            } else {
                // console.log('Item checked - no changes')
            }
        }
    });
}

//returns the userID of the winner
var performLottery = function(item) {
    var bids = item.bids;
    //Shuffle to ensure no bias (extra precaution)
    var shuffledBids = shuffleArray(bids);
    var randomNum = Math.random();
    var num = 0.0;
    var winner = "";
    for (var j = 0; j < shuffledBids.length; j++) {
        var bidderID = shuffledBids[j].ID;
        var bidderAmount = shuffledBids[j].amount;
        num += bidderAmount / item.price;
        if (randomNum < num) {
            winner = bidderID;
            break;
        }
    }
    if (winner == "") {
        console.log('No winner - defaulting to first bidder in random array')
        if (bids.length != 0) {
            winner = shuffledBids[0].bidderID
        }
    }
    item.sold = true;
    item.winnerID = winner;


    databaseModule.findUser(winner, function(user) {
        if (user != null) {
            // get the user name
            item.winnerName = user[0].fullName;
            item.save();
            return winner;
        } else {
            console.log('User not successfully found')
            return null;
        }
    }, function() {
        console.log('Error in performLottery');
    });
}

//Shuffle array - modified from http://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array
var shuffleArray = function(array) {
    for (var i = array.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
    return array;
}

function refundUsers(item) {
    for (var j = 0; j < item.bids.length; j++) {
        console.log('attempting to refund user');
        var bid = item.bids[j];
        for (var i = 0; i < bid.chargeIDs.length; i++) {
            console.log('attempt refund for charge ID');
            var chargeID = bid.chargeIDs[i];
            var stripe = require("stripe")("sk_test_eg2HQcx67oK4rz5G57XiWXgG");

            stripe.refunds.create({
                charge: chargeID,
            }, function(err, refund) {
                if (refund != null) {
                    console.log(refund.amount + " cents refunded successfully");
                } else {
                    console.log('Refund failed')
                }
            });
        }
    }
}