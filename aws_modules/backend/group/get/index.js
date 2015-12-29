/**
 * AWS Module: Action: Modularized Code
 */

var _ = require('lodash');
var async = require('async');
var fbgraph = require('fbgraphapi');
var AWS = require('aws-sdk');
var dynamodbDoc = new AWS.DynamoDB.DocumentClient();

var appId = process.env.FB_APP_ID;
var appSecret = process.env.FB_APP_SECRET;
var fb;

// Export For Lambda Handler
module.exports.run = function(event, context, done) {
    console.log('New event:');
    console.log(event);
    action(event.userId, event.id, event.seasonId, done);
};

var getGroup = function(groupId, seasonId, callback) {
    return dynamodbDoc.get({
        TableName : process.env.GROUPS_TABLE,
        Key : {
            facebookId : groupId,
            seasonId : seasonId
        },
        ProjectionExpression : '#memberFacebookIds, #adminId',
        ExpressionAttributeNames : {
            '#memberFacebookIds' : 'memberFacebookIds',
            '#adminId' : 'adminId'
        }
    }, function(err, data) {
        if (err) { return callback(err); }
        callback(null, data.Item);
    });
};

var queryUser = function(facebookId, seasonId, callback) {
    dynamodbDoc.query({
        TableName : process.env.USERS_TABLE,
        IndexName: 'facebookId-index',
        KeyConditionExpression: 'facebookId = :facebookId',
        ExpressionAttributeValues: {
            ':facebookId': facebookId
        },
        ProjectionExpression : '#id, #nickname, #profilePicture, #picks.#seasonId, #scores.#seasonId',
        ExpressionAttributeNames : {
            '#id' : 'id',
            '#nickname' : 'nickname',
            '#profilePicture' : 'profilePicture',
            '#picks' : 'picks',
            '#scores' : 'scores',
            '#seasonId' : seasonId
        }
    }, function(err, data) {
        if (err) { return callback(err); }
        var user = data.Items[0];
        if (!user) { return callback(null, null); }
        if (user.picks) {
            user.picks = user.picks[seasonId];
        }
        if (user.scores) {
            user.scores = user.scores[seasonId];
        }
        callback(null, user);
    });
};

// Your Code
var action = function(userId, groupId, seasonId, done) {
    fb = new fbgraph.Facebook(appId + '|' + appSecret, 'v2.5');
    getGroup(groupId, seasonId, function(err, group) {
        if (err) { return done(err); }

        var users = [];
        var usersQueryQueue = async.queue(function(facebookId, callback) {
            console.log('user: ' + JSON.stringify(facebookId));
            queryUser(facebookId, seasonId, function(err, user) {
                if (err) { return callback(err); }
                if (!user) { return callback(); }
                if (facebookId == group.adminId) { user.isAdmin = true; }
                users.push(user);
                callback();
            });
        }, 8);
        usersQueryQueue.push(group.memberFacebookIds, function(err) {
            if (err) { return done(err); }
        });
        usersQueryQueue.drain = function() {
            return done(err, users);
        };
        if (usersQueryQueue.idle()) { usersQueryQueue.drain() }

    });
};
