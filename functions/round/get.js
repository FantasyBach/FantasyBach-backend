'use strict';

var _map = require('lodash/map');
var _sortBy = require('lodash/sortBy');
var AWS = require('aws-sdk');
var dynamodbDoc = new AWS.DynamoDB.DocumentClient();

// Export For Lambda Handler
module.exports.handler = function(userId, pathParams, queryParams, body, done) {
    return action(pathParams.seasonId, queryParams.id, queryParams.ids, done);
};

var action = function(seasonId, id, ids, done) {
    if (!id && !ids) {
        return dynamodbDoc.query({
            TableName : process.env.ROUNDS_TABLE,
            IndexName: 'seasonId-id-index',
            KeyConditionExpression: 'seasonId = :seasonId',
            ExpressionAttributeValues: {
                ':seasonId': seasonId
            }
        }, function(err, data) {
            if (err) { return done(err); }
            done(null, _sortBy(data.Items, 'index'));
        });
    }
    ids = ids ? ids.split(',') : [id];

    var params = {
        RequestItems : {}
    };
    params.RequestItems[process.env.ROUNDS_TABLE] = {
        Keys : _map(ids, function(id) {
            return {
                id : id
            }
        })
    };
    return dynamodbDoc.batchGet(params, function(err, data) {
        if (err) { return done(err); }
        done(null, data.Responses[process.env.ROUNDS_TABLE]);
    });
};

