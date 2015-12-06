/**
 * AWS Module: Action: Modularized Code
 */

var _ = require('lodash');
var moment = require('moment-timezone');
var AWS = require('aws-sdk');
var dynamodbDoc = new AWS.DynamoDB.DocumentClient();

var TIME_ZONE = 'America/Los_Angeles';

// Export For Lambda Handler
module.exports.run = function(event, context, done) {
    return action(event.userId, event.seasonId, event.roundId, event.body.contestantId, event.body.roleId, done);
};

var getRound = function(roundId, callback) {
    dynamodbDoc.get({
        TableName : process.env.ROUNDS_TABLE,
        Key : {
            id : roundId
        }
    }, function(err, data) {
        if (err) { return callback(err); }
        callback(null, data.Item);
    })
};

var updatePick = function(userId, seasonId, round, contestantId, roleId, callback) {
    var updateParams = {
        TableName : process.env.USERS_TABLE,
        Key : { id : userId },
        ConditionExpression: 'attribute_not_exists(#picks.#seasonId.#roundId.#roleId)',
        UpdateExpression : 'SET #picks.#seasonId.#roundId.#roleId = :contestantId',
        ExpressionAttributeNames : {
            '#picks' : 'picks',
            '#seasonId' : seasonId,
            '#roundId' : round.id,
            '#roleId' : roleId
        },
        ExpressionAttributeValues : {
            ':contestantId' : contestantId
        }
    };
    _.each(round.availableRoleIds, function(roleId, index) {
        var attributeName = '#roleId' + index;
        updateParams.ConditionExpression += ' AND #picks.#seasonId.#roundId.' + attributeName + ' <> :contestantId';
        updateParams.ExpressionAttributeNames[attributeName] = roleId;
    });
    dynamodbDoc.update(updateParams, function(err, data) {
        if (err) { return callback(null, {
            error : err,
            params : updateParams,
            data : data
        }); }
        callback(null, data);
    });
};

// Your Code
var action = function(userId, seasonId, roundId, contestantId, roleId, done) {
    getRound(roundId, function(err, round) {
        if (err) { return done(err); }
        if (moment.tz(round.startVoteLocalDateTime, TIME_ZONE).diff(new Date()) > 0) {
            return done(new Error('Round not open for voting yet'));
        }
        if (moment.tz(round.endVoteLocalDateTime, TIME_ZONE).diff(new Date()) < 0) {
            return done(new Error('Round now closed for voting'));
        }
        if (!_.contains(round.eligibleContestantIds, contestantId)) {
            return done(new Error('Contestant not eligible for this round'));
        }
        if (!_.contains(round.availableRoleIds, roleId)) {
            return done(new Error('Role not eligible for this round'));
        }
        updatePick(userId, seasonId, round, contestantId, roleId, done);
    });
};
