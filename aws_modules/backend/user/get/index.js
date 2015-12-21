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
    var projectionParams = {
        ProjectionExpression : '#id, #nickname, #profilePicture, #picks.#seasonId, #scores.#seasonId',
        ExpressionAttributeNames : {
            '#id' : 'id',
            '#nickname' : 'nickname',
            '#profilePicture' : 'profilePicture',
            '#picks' : 'picks',
            '#scores' : 'scores',
            '#seasonId' : seasonId
        }
    };
    if (!ids && !id) {
        projectionParams.ProjectionExpression += ', #email, #name, #facebookId';
        _.extend(projectionParams.ExpressionAttributeNames, {
            '#email' : 'email',
            '#name' : 'name',
            '#facebookId' : 'facebookId'
        });
    }

    if (ids) {
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
                if (!user.picks || !user.scores) { return; }
                user.picks = user.picks[seasonId];
                user.scores = user.scores[seasonId];
            });
            done(null, users);
        });
    }
    if (!id) {
        id = userId;
    }
    return dynamodbDoc.get(_.assign(projectionParams, {
        TableName : process.env.USERS_TABLE,
        Key : {
            id : id
        }
    }), function(err, data) {
        if (err) { return done(err); }
        if (data.Item.picks) {
            data.Item.picks = data.Item.picks[seasonId];
        }
        if (data.Item.scores) {
            data.Item.scores = data.Item.scores[seasonId];
        }
        done(null, data.Item);
    });
};