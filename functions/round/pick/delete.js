'use strict';

var _includes = require('lodash/includes');
var moment = require('moment');
var AWS = require('aws-sdk');
var dynamodbDoc = new AWS.DynamoDB.DocumentClient();

// Export For Lambda Handler
module.exports.handler = function(userId, pathParams, queryParams, body, done) {
    return action(userId, pathParams.seasonId, pathParams.roundId, body.contestantId, body.roleId, done);
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

var updatePick = function(userId, seasonId, roundId, contestantId, roleId, callback) {
    dynamodbDoc.update({
        TableName : process.env.USERS_TABLE,
        Key : { id : userId },
        ConditionExpression: '#picks.#seasonId.#roundId.#roleId = :contestantId',
        UpdateExpression : 'REMOVE #picks.#seasonId.#roundId.#roleId',
        ExpressionAttributeNames : {
            '#picks' : 'picks',
            '#seasonId' : seasonId,
            '#roundId' : roundId,
            '#roleId' : roleId
        },
        ExpressionAttributeValues : {
            ':contestantId' : contestantId
        }
    }, callback);
};

// Your Code
var action = function(userId, seasonId, roundId, contestantId, roleId, done) {
    getRound(roundId, function(err, round) {
        if (err) { return done(err); }
        if (moment(round.startVoteDateTime).diff(new Date()) > 0) {
            return done(new Error('Round not open for voting yet'));
        }
        if (moment(round.endVoteDateTime).diff(new Date()) < 0) {
            return done(new Error('Round now closed for voting'));
        }
        if (!_includes(round.eligibleContestantIds, contestantId)) {
            return done(new Error('Contestant not eligible for this round'));
        }
        if (!_includes(round.availableRoleIds, roleId)) {
            return done(new Error('Role not eligible for this round'));
        }
        updatePick(userId, seasonId, roundId, contestantId, roleId, done);
    });
};

