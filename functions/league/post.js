'use strict';

var shortid = require('shortid');
var AWS = require('aws-sdk');
var dynamodbDoc = new AWS.DynamoDB.DocumentClient();

// Export For Lambda Handler
module.exports.handler = function(userId, pathParams, queryParams, body, done) {
    if (!body.leagueName) { return done('No leagueName parameter provided'); }
    return action(userId, pathParams.seasonId, body.leagueName, done);
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

var putLeague = function(leagueId, name, seasonId, memberIds, adminId, callback) {
    dynamodbDoc.put({
        TableName : process.env.LEAGUES_TABLE,
        Item : {
            id : leagueId,
            name : name,
            seasonId : seasonId,
            memberIds : memberIds,
            adminId : adminId
        }
    }, callback);
};

var action = function(userId, seasonId, leagueName, done) {
    var leagueId = 'league:' + shortid.generate();
    putLeague(leagueId, leagueName, seasonId, [userId], userId, function(err) {
        if (err) { return done(err); }
        updateUser(userId, seasonId, leagueId, function(err) {
            if (err) { return done(err); }
            done(null, leagueId);
        });
    });
};

