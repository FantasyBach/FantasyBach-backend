/**
 * AWS Module: Action: Modularized Code
 */

var _ = require('lodash');
var AWS = require('aws-sdk');
var dynamodbDoc = new AWS.DynamoDB.DocumentClient();

// Export For Lambda Handler
module.exports.run = function(event, context, done) {
    action(event.seasonId, event.body.roundId, event.userId, done);
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

var getRounds = function(seasonId, callback) {
    return dynamodbDoc.query({
        TableName : process.env.ROUNDS_TABLE,
        IndexName: 'seasonId-id-index',
        KeyConditionExpression: 'seasonId = :seasonId',
        ExpressionAttributeValues: {
            ':seasonId': seasonId
        }
    }, function(err, data) {
        if (err) { return callback(err); }
        callback(null, data.Items);
    });
};

var getContestants = function(seasonId, callback) {
    return dynamodbDoc.query({
        TableName : process.env.CONTESTANTS_TABLE,
        IndexName: 'seasonId-id-index',
        KeyConditionExpression: 'seasonId = :seasonId',
        ExpressionAttributeValues: {
            ':seasonId': seasonId
        }
    }, function(err, data) {
        if (err) { return callback(err); }
        callback(null, data.Items);
    });
};

var updateRound = function(roundId, eligibleContestantIds, callback) {
    return dynamodbDoc.update({
        TableName : process.env.ROUNDS_TABLE,
        Key : { id : roundId },
        UpdateExpression : 'SET #eligibleContestantIds = :eligibleContestantIds',
        ExpressionAttributeNames: {
            '#eligibleContestantIds' : 'eligibleContestantIds'
        },
        ExpressionAttributeValues: {
            ':eligibleContestantIds' : eligibleContestantIds
        }
    }, function(err, data) {
        if (err) { return callback(err); }
        return callback(null, null);
    });
};

// Your Code
var action = function(seasonId, roundId, userId, done) {
    //return done(null, {
    //    seasonId : seasonId,
    //    contestantId : contestantId,
    //    roundId : roundId,
    //    roleId : roleId,
    //    countDelta : countDelta,
    //    userId : userId
    //});
    getUser(userId, function(err, user) {
        if (err) { return done(err); }
        if (!user.isAdmin) {
            return done(new Error('User is not authorized'));
        }

        getRounds(seasonId, function(err, rounds) {
            if (err) { return done(err); }

            var round = _.find(rounds, 'id', roundId);
            if (round.index === 0) {
                return getContestants(seasonId, function(err, contestants) {
                    var eligibleContestantIds = _.map(contestants, 'id');
                    updateRound(roundId, eligibleContestantIds, done);
                });
            }
            var previousRound = _.find(rounds, 'index', round.index - 1);
            var eligibleContestantIds = _.difference(previousRound.eligibleContestantIds, previousRound.eliminatedContestantIds);
            updateRound(roundId, eligibleContestantIds, done);
        });
    });
};
