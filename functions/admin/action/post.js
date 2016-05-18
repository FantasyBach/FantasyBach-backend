'use strict';

var AWS = require('aws-sdk');
var dynamodbDoc = new AWS.DynamoDB.DocumentClient();

// Export For Lambda Handler
module.exports.handler = function(userId, pathParams, queryParams, body, done) {
    return action(userId, pathParams.seasonId, body.contestantId, body.roundId, body.roleId, body.countDelta, done);
};

var getUser = function(userId, callback) {
    return dynamodbDoc.get({
        TableName : process.env.USERS_TABLE,
        Key : {
            id : userId
        },
        ProjectionExpression : '#isAdmin',
        ExpressionAttributeNames : {
            '#isAdmin' : 'isAdmin'
        }
    }, function(err, data) {
        if (err) { return callback(err); }
        callback(null, data.Item);
    });
};

var action = function(userId, seasonId, contestantId, roundId, roleId, countDelta, done) {
    getUser(userId, function(err, user) {
        if (err) { return done(err); }
        if (!user.isAdmin) {
            return done(new Error('User is not authorized'));
        }

        return dynamodbDoc.update({
            TableName : process.env.CONTESTANTS_TABLE,
            Key : { id : contestantId },
            UpdateExpression : 'ADD #roundResults.#roundId.#roleId.#occurrences :countDelta',
            ExpressionAttributeNames: {
                '#roundResults' : 'roundResults',
                '#roundId' : roundId,
                '#roleId' : roleId,
                '#occurrences' : 'occurrences'
            },
            ExpressionAttributeValues: {
                ':countDelta' : countDelta
            }
        }, function(err, data) {
            if (err) { return done(err); }
            return done(null, null);
        });
    });
};

