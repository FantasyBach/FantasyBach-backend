/**
 * AWS Module: Action: Modularized Code
 */

var _ = require('lodash');
var AWS = require('aws-sdk');
var dynamodbDoc = new AWS.DynamoDB.DocumentClient();

// Export For Lambda Handler
module.exports.run = function(event, context, done) {
    return action(event.seasonId, event.userId, event.id, event.ids, done);
};

// Your Code
var action = function(seasonId, userId, id, ids, done) {
    if (id) {
        ids = [ id ];
    }
    var projectionParams = {
        ProjectionExpression : '#id, #nickname, #profilePicture, #picks.#seasonId',
        ExpressionAttributeNames : {
            '#id' : 'id',
            '#nickname' : 'nickname',
            '#profilePicture' : 'profilePicture',
            '#picks' : 'picks',
            '#seasonId' : seasonId
        }
    };
    if (!ids) {
        ids = [ userId ];
        projectionParams.ProjectionExpression += ', #email, #name, #facebookId';
        _.extend(projectionParams.ExpressionAttributeNames, {
            '#email' : 'email',
            '#name' : 'name',
            '#facebookId' : 'facebookId'
        })
    }
    var params = {
        RequestItems : {}
    };
    params.RequestItems[process.env.USERS_TABLE] = _.assign(projectionParams, {
        Keys : _.map(ids, function(id) {
            return {
                id : id
            }
        })
    });
    return dynamodbDoc.batchGet(params, function(err, data) {
        if (err) { return done(err); }
        var users = data.Responses[process.env.USERS_TABLE];
        _.each(users, function(user) {
            if (!user.picks) { return; }
            user.picks = user.picks[seasonId];
        });
        done(null, users);
    })
};