/**
 * AWS Module: Action: Modularized Code
 */

var _ = require('lodash');
var AWS = require('aws-sdk');
var dynamodbDoc = new AWS.DynamoDB.DocumentClient();

// Export For Lambda Handler
module.exports.run = function(event, context, done) {
    action(event.seasonId, event.id, event.ids, done);
};

// Your Code
var action = function(seasonId, id, ids, done) {
    if (!id && !ids) {
        return dynamodbDoc.query({
            TableName : process.env.CONTESTANTS_TABLE,
            IndexName: 'seasonId-id-index',
            KeyConditionExpression: 'seasonId = :seasonId',
            ExpressionAttributeValues: {
                ':seasonId': seasonId
            }
        }, function(err, data) {
            if (err) { return done(err); }
            done(null, data.Items);
        });
    }
    ids = ids ? ids.split(',') : [id];

    var params = {
        RequestItems : {}
    };
    params.RequestItems[process.env.CONTESTANTS_TABLE] = {
        Keys : _.map(ids, function(id) {
            return {
                id : id
            }
        })
    };
    return dynamodbDoc.batchGet(params, function(err, data) {
        if (err) { return done(err); }
        done(null, data.Responses[process.env.CONTESTANTS_TABLE]);
    })
};
