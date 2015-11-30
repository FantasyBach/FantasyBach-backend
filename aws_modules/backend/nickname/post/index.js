/**
 * AWS Module: Action: Modularized Code
 */

var AWS = require('aws-sdk');
var dynamodbDoc = new AWS.DynamoDB.DocumentClient();

// Export For Lambda Handler
module.exports.run = function(event, context, done) {
    return action(event.body.nickname, event.userId, done);
};

// Your Code
var action = function(nickname, userId, done) {
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
