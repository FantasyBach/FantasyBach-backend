'use strict';

var AWS = require('aws-sdk');
var dynamodbDoc = new AWS.DynamoDB.DocumentClient();

// Export For Lambda Handler
module.exports.handler = function(userId, pathParams, queryParams, body, done) {
    return action(userId, body.nickname, done);
};

var action = function(userId, nickname, done) {
    if (!nickname) { done('Invalid Nickname'); }
    dynamodbDoc.update({
        TableName : process.env.USERS_TABLE,
        Key : { id : userId },
        AttributeUpdates : {
            nickname : {
                Action : 'PUT',
                Value : nickname
            }
        }
    }, function(err, data) {
        return done(err);
    });
};
