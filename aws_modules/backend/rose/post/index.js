/**
 * AWS Module: Action: Modularized Code
 */

var _ = require('lodash');
var AWS = require('aws-sdk');
var dynamodbDoc = new AWS.DynamoDB.DocumentClient();

var adminIds = process.env.ADMIN_IDS.split(',');

// Export For Lambda Handler
module.exports.run = function(event, context, done) {
    action(event.seasonId, event.body.contestantId, event.body.roundId, event.body.countDelta, event.userId, done);
};

// Your Code
var action = function(seasonId, contestantId, roundId, countDelta, userId, done) {
    //return done(null, {
    //    seasonId : seasonId,
    //    contestantId : contestantId,
    //    roundId : roundId,
    //    roleId : roleId,
    //    countDelta : countDelta,
    //    userId : userId
    //});
    if (!_.contains(adminIds, userId)) {
        return done(new Error('User is not authorized'));
    }

    return dynamodbDoc.update({
        TableName : process.env.CONTESTANTS_TABLE,
        Key : { id : contestantId },
        UpdateExpression : 'ADD #roses.#roundId :countDelta',
        ExpressionAttributeNames: {
            '#roses' : 'roses',
            '#roundId' : roundId
        },
        ExpressionAttributeValues: {
            ':countDelta' : countDelta
        }
    }, function(err, data) {
        if (err) { return done(err); }
        return done(null, null);
    });
};
