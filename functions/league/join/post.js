'use strict';

var _includes = require('lodash/includes');
var AWS = require('aws-sdk');
var dynamodbDoc = new AWS.DynamoDB.DocumentClient();

// Export For Lambda Handler
module.exports.handler = function(userId, pathParams, queryParams, body, done) {
    return action(userId, pathParams.seasonId, pathParams.leagueId, done);
};

var getLeague = function(seasonId, leagueId, callback) {
    return dynamodbDoc.get({
        TableName : process.env.LEAGUES_TABLE,
        Key : {
            id : leagueId,
            seasonId : seasonId
        },
        ProjectionExpression : '#id, #memberIds',
        ExpressionAttributeNames : {
            '#id' : 'id',
            '#memberIds' : 'memberIds'
        }
    }, function(err, data) {
        if (err) { return callback(err); }
        callback(null, data.Item);
    });
};

var updateUser = function(userId, seasonId, leagueId, callback) {
    dynamodbDoc.update({
        TableName : process.env.USERS_TABLE,
        Key : { id : userId },
        UpdateExpression : 'SET #leagues.#seasonId = list_append(#leagues.#seasonId, :leagueId)',
        ExpressionAttributeNames : {
            '#leagues' : 'leagues',
            '#seasonId' : seasonId
        },
        ExpressionAttributeValues : {
            ':leagueId' : [leagueId]
        }
    }, callback);
};

var updateLeague = function(userId, seasonId, leagueId, callback) {
    dynamodbDoc.update({
        TableName : process.env.LEAGUES_TABLE,
        Key : {
            id : leagueId,
            seasonId : seasonId
        },
        UpdateExpression : 'SET #mebmerIds = list_append(#mebmerIds, :userId)',
        ExpressionAttributeNames : {
            '#mebmerIds' : 'memberIds'
        },
        ExpressionAttributeValues : {
            ':userId' : [userId]
        }
    }, callback);
};

var action = function(userId, seasonId, leagueId, done) {
    getLeague(seasonId, leagueId, function(err, league) {
        if (err) { return done(err); }
        if (_includes(league.memberIds, userId)) { return done('User already in league: ' + leagueId)}
        league.memberIds.push(userId);
        updateLeague(userId, seasonId, leagueId, function(err) {
            if (err) { return done(err); }
            updateUser(userId, seasonId, leagueId, function(err) {
                if (err) { return done(err); }
                done(null, league);
            });
        });
    });
};

