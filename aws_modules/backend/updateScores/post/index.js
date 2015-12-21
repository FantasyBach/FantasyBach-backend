/**
 * AWS Module: Action: Modularized Code
 */

var _ = require('lodash');
var async = require('async');
var AWS = require('aws-sdk');
var dynamodbDoc = new AWS.DynamoDB.DocumentClient();

var seasonId;
var userId;

// Export For Lambda Handler
module.exports.run = function(event, context, done) {
    seasonId = event.seasonId;
    userId = event.userId;
    action(done);
};

var getUser = function(callback) {
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

var getRoles = function(callback) {
    return dynamodbDoc.query({
        TableName : process.env.ROLES_TABLE,
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

var getRounds = function(callback) {
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

var getContestants = function(callback) {
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

var scanUsers = function(callback) {
    return _scanUsers(null, callback);
};

var _scanUsers = function(startKey, callback) {
    console.log('Scanning with key: ' + startKey);
    var params = startKey ? { ExclusiveStartKey : startKey } : {};
    return dynamodbDoc.scan(_.assign(params, {
        TableName : process.env.USERS_TABLE,
        ProjectionExpression : '#id, #picks.#seasonId',
        ExpressionAttributeNames : {
            '#id' : 'id',
            '#picks' : 'picks',
            '#seasonId' : seasonId
        }
    }), function(err, data) {
        if (err) { callback(err); }
        console.log('Last Evaluated Key: ' + data.LastEvaluatedKey);
        if (data.LastEvaluatedKey) {
            _scanUsers(data.LastEvaluatedKey, callback);
            return callback(null, data.Items, false);
        }
        callback(null, data.Items, true);
    });
};

var calculateScore = function(user, rounds, rolesById, contestantsById) {
    var scores = { score : 0 };
    var roundMultipliers = {};
    _.each(rounds, function(round) {
        var nextRoundMultipliers = {};
        scores[round.id] = 0;
        var roundPicks = user.picks && user.picks[seasonId] && user.picks[seasonId][round.id];
        _.each(roundPicks, function(contestantId, roleId) {
            var role = rolesById[roleId];
            var contestant = contestantsById[contestantId];
            var occurrences = contestant.roundResults && contestant.roundResults[round.id] && contestant.roundResults[round.id][role.id] && contestant.roundResults[round.id][role.id].occurrences;
            if (occurrences) {
                var roleScore = role.pointsPerOccurrence * occurrences;
                scores.score += roleScore;
                scores[round.id] += roleScore;
            }

            var multiplier = (roundMultipliers[roleId] && roundMultipliers[roleId][contestantId]) || 1;
            multiplier = Math.min(multiplier, round.maximumMultiplier);
            nextRoundMultipliers[roleId] = {};
            nextRoundMultipliers[roleId][contestantId] = multiplier + 1;

            var roses = contestant.roses && contestant.roses[round.id];
            if (roses) {
                var roseScore = multiplier * roses;
                scores.score += roseScore;
                scores[round.id] += roseScore;
            }
        });

        roundMultipliers = nextRoundMultipliers;
    });
    return scores;
};

var updateUser = function(userId, scores, callback) {
    dynamodbDoc.update({
        TableName : process.env.USERS_TABLE,
        Key : { id : userId },
        UpdateExpression : 'SET #scores.#seasonId=:scores',
        ExpressionAttributeNames : {
            '#scores' : 'scores',
            '#seasonId' : seasonId
        },
        ExpressionAttributeValues : {
            ':scores' : scores
        }
    }, callback);
};

// Your Code
var action = function(done) {
    async.parallel({
        user : getUser,
        rounds : getRounds,
        contestants : getContestants,
        roles : getRoles
    }, function(err, data) {
        if (err) { return done(err); }

        var user = data.user;
        var rounds = _.sortBy(data.rounds, 'index');
        var roles = data.roles;
        var contestants = data.contestants;

        var rolesById = _.object(_.map(roles, function(role) {
            return [role.id, role]
        }));

        var contestantsById = _.object(_.map(contestants, function(contestant) {
            return [contestant.id, contestant]
        }));

        if (!user.isAdmin) {
            return done(new Error('User is not authorized'));
        }

        var queue = async.queue(function(task, callback) {
            updateUser(task.id, task.scores, callback);
        }, 8);

        scanUsers(function(err, users, lastGroup) {
            if (err) { return done(err); }

            _.each(users, function(user) {
                var newScores = calculateScore(user, rounds, rolesById, contestantsById);
                if (_.isEqual(newScores, user.scores)) { return; }
                queue.push({
                    id : user.id,
                    scores : newScores
                });
            });
            if (lastGroup) {
                if (queue.idle()) { return done(null, null); }
                queue.drain = function() {
                    return done(null, null);
                };
            }
        });
    });
};
