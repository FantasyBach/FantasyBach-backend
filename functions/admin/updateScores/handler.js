'use strict';

var _ = require('lodash');
var async = require('async');
var AWS = require('aws-sdk');
var dynamodbDoc = new AWS.DynamoDB.DocumentClient();

var NUM_TOP_USERS = 10;

var seasonId = process.env.CURRENT_SEASON;

module.exports.handler = function(event, context, callback) {
    action(callback);
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

var getTopUsers = function(callback) {
    return dynamodbDoc.query({
        TableName : process.env.TOP_USERS_TABLE,
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

            var multiplier = roundMultipliers[contestantId] || 1;
            multiplier = Math.min(multiplier, round.maximumMultiplier);
            nextRoundMultipliers[contestantId] = multiplier + 1;

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

var updateTopUsers = function(toAdd, toRemove, callback) {
    console.log('toAdd: ' + JSON.stringify(toAdd));
    console.log('toRemove: ' + JSON.stringify(toRemove));
    if (toAdd.length == 0 && toRemove.length == 0) { return callback(null, null); }
    var topUsersTable = process.env.TOP_USERS_TABLE;
    var params = {
        RequestItems : {}
    };
    params.RequestItems[topUsersTable] = [];
    _.each(toAdd, function(userToAdd) {
        params.RequestItems[topUsersTable].push({
            PutRequest : {
                Item : {
                    id : userToAdd.id,
                    seasonId : seasonId
                }
            }
        })
    });
    _.each(toRemove, function(userToRemove) {
        params.RequestItems[topUsersTable].push({
            DeleteRequest : {
                Key : {
                    id : userToRemove.id,
                    seasonId : seasonId
                }
            }
        })
    });
    console.log('Params: ' + JSON.stringify(params));
    dynamodbDoc.batchWrite(params, callback);
};

var action = function(done) {
    async.parallel({
        rounds : getRounds,
        contestants : getContestants,
        roles : getRoles
    }, function(err, data) {
        if (err) { return done(err); }
        console.log('Got data');

        var rounds = _.sortBy(data.rounds, 'index');
        var roles = data.roles;
        var contestants = data.contestants;

        var rolesById = _.keyBy(roles, 'id');

        var contestantsById = _.keyBy(contestants, 'id');

        var queue = async.queue(function(task, callback) {
            updateUser(task.id, task.scores, callback);
        }, 8);

        var topUsers = [];
        scanUsers(function(err, users, lastGroup) {
            if (err) { return done(err); }
            console.log('Got ' + users.length + ' users');

            _.each(users, function(user) {
                var newScores = calculateScore(user, rounds, rolesById, contestantsById);
                if (topUsers.length < NUM_TOP_USERS || (topUsers.length > 0 && _.last(topUsers).score < newScores.score)) {
                    topUsers.push({
                        id : user.id,
                        score : newScores.score
                    });
                    topUsers = _.orderBy(topUsers, 'score', 'desc');
                    topUsers = _.take(topUsers, NUM_TOP_USERS);
                }
                if (_.isEqual(newScores, user.scores)) { return; }
                queue.push({
                    id : user.id,
                    scores : newScores
                });
            });
            if (lastGroup) {
                console.log('That was the last group');
                getTopUsers(function(err, oldTopUsers) {
                    if (err) { return done(err); }
                    console.log('Got ' + oldTopUsers.length + ' top users');
                    console.log('Top users: ' + JSON.stringify(topUsers));

                    var usersToRemove = _.filter(oldTopUsers, function(oldTopUser) {
                        return !_.find(topUsers, 'id', oldTopUser.id);
                    });
                    var usersToAdd = _.filter(topUsers, function(topUser) {
                        return !_.find(oldTopUsers, 'id', topUser.id);
                    });

                    updateTopUsers(usersToAdd, usersToRemove, function(err) {
                        if (err) { return done(err); }
                        console.log('Updated top users');

                        if (queue.idle()) { return done(null, null); }
                        queue.drain = function() {
                            return done(null, null);
                        };
                    });
                });
            }
        });
    });
};
