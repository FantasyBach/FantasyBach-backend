/**
 * AWS Module: Action: Modularized Code
 */

var _ = require('lodash');
var AWS = require('aws-sdk');
var dynamodbDoc = new AWS.DynamoDB.DocumentClient();

// Export For Lambda Handler
module.exports.run = function(event, context, done) {
    console.log('New event:');
    console.log(event);
    action(event.seasonId, done);
};

var getTopUsers = function(seasonId, callback) {
    return dynamodbDoc.query({
        TableName : process.env.TOP_USERS_TABLE,
        KeyConditionExpression: 'seasonId = :seasonId',
        ExpressionAttributeValues: {
            ':seasonId': seasonId
        }
    }, function(err, data) {
        if (err) { return callback(err); }
        callback(null, data.Items);
    });
};

var getUsers = function(seasonId, users, callback) {
    var params = {
        RequestItems : {}
    };
    params.RequestItems[process.env.USERS_TABLE] = {
        Keys : _.map(users, function(user) {
            return {
                id : user.id
            }
        }),
        ProjectionExpression : '#id, #nickname, #profilePicture, #picks.#seasonId, #scores.#seasonId',
        ExpressionAttributeNames : {
            '#id' : 'id',
            '#nickname' : 'nickname',
            '#profilePicture' : 'profilePicture',
            '#picks' : 'picks',
            '#scores' : 'scores',
            '#seasonId' : seasonId
        }
    };
    console.log('params: ' + JSON.stringify(params));
    return dynamodbDoc.batchGet(params, function(err, data) {
        if (err) { return callback(err); }
        var users = data.Responses[process.env.USERS_TABLE];
        _.each(users, function(user) {
            if (!user.picks || !user.scores) { return; }
            user.picks = user.picks[seasonId];
            user.scores = user.scores[seasonId];
        });
        callback(null, users);
    });
};

// Your Code
var action = function(seasonId, done) {
    getTopUsers(seasonId, function(err, users) {
        if (err) { return done(err); }
        getUsers(seasonId, users, done);
    });
};
