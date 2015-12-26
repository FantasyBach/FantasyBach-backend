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
    action(event.userId, event.body.id, event.seasonId, done);
};

var getGroup = function(groupId, seasonId, callback) {
    return dynamodbDoc.get({
        TableName : process.env.GROUPS_TABLE,
        Key : {
            seasonId : seasonId,
            facebookId : groupId
        },
        ProjectionExpression : '#id, #seasonId, #adminId',
        ExpressionAttributeNames : {
            '#id' : 'id',
            '#seasonId' : 'seasonId',
            '#adminId' : 'adminId'
        }
    }, function(err, data) {
        if (err) { return callback(err); }
        callback(null, data.Item);
    });
};

var deleteGroup = function(groupId, callback) {
    fb.post('/' + appId + '/groups/' + groupId, {
        method : 'DELETE'
    }, callback);
};

// Your Code
var action = function(userId, groupId, seasonId, done) {
    fb = new fbgraph.Facebook(appId + '|' + appSecret, 'v2.5');
    getGroup(groupId, seasonId, function(err, group) {
        if (err) { return done(err); }
        if (group.adminId != userId) { return done(new Error('User is not an admin of this group')); }
        deleteGroup(groupId, function(err) {
            if (err) { return done(new Error(err)); }
            done();
        });
    });
};
