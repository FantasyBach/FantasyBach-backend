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
    action(event.userId, event.body.groupName, event.seasonId, done);
};

var getUser = function(userId, callback) {
    return dynamodbDoc.get({
        TableName : process.env.USERS_TABLE,
        Key : {
            id : userId
        },
        ProjectionExpression : '#id, #facebookId',
        ExpressionAttributeNames : {
            '#id' : 'id',
            '#facebookId' : 'facebookId'
        }
    }, function(err, data) {
        if (err) { return callback(err); }
        callback(null, data.Item);
    });
};

var updateUser = function(userId, seasonId, groupId, callback) {
    dynamodbDoc.update({
        TableName : process.env.USERS_TABLE,
        Key : { id : userId },
        UpdateExpression : 'SET #groups.#seasonId = list_append(#groups.#seasonId, :groupId)',
        ExpressionAttributeNames : {
            '#groups' : 'groups',
            '#seasonId' : seasonId
        },
        ExpressionAttributeValues : {
            ':groupId' : [groupId]
        }
    }, callback);
};

var putGroup = function(groupFacebookId, seasonId, memberFacebookIds, userId, callback) {
    dynamodbDoc.put({
        TableName : process.env.GROUPS_TABLE,
        Item : {
            facebookId : groupFacebookId,
            seasonId : seasonId,
            memberFacebookIds : memberFacebookIds,
            adminId : userId
        }
    }, callback);
};

var createGroup = function(userFacebookId, groupName, callback) {
    fb.post('/' + appId + '/groups', {
        method : 'POST',
        name : groupName,
        privacy : 'closed',
        description : 'Group for organizing a Fantasy Bachelor league. Add members and talk trash here and go to http://www.fantasybach.com to make your picks!',
        admin : userFacebookId
    }, function(err, data) {
        if (err) { return callback(err); }
        callback(null, data.id);
    })
};

// Your Code
var action = function(userId, groupName, seasonId, done) {
    fb = new fbgraph.Facebook(appId + '|' + appSecret, 'v2.5');
    getUser(userId, function(err, user) {
        if (err) { return done(err); }
        createGroup(user.facebookId, groupName, function(err, groupId) {
            if (err) { return done(new Error(err)); }
            putGroup(groupId, seasonId, [user.facebookId], userId, function(err) {
                if (err) { return done(err); }
                updateUser(user.id, seasonId, groupId, function(err) {
                    if (err) { return done(err); }
                    done(null, groupId);
                });
            });
        });
    });
};
