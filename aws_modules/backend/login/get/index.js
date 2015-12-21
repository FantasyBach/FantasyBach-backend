/**
 * AWS Module: Action: Modularized Code
 */

var AWS = require('aws-sdk');
var _ = require('lodash');
var async = require('async');
var fbgraph = require('fbgraphapi');

// Globals
var dynamodbDoc;
var cognitoLoginsParam;
var cognitoInstance;
var cognitoIdentity;
var userId;
var facebookProfile;
var awsCredentials;
var picks;
var fb;

// Export For Lambda Handler
module.exports.run = function(event, context, done) {
    return action(event.token, done);
};

var getRounds = function(callback) {
    dynamodbDoc.scan({
        TableName : process.env.ROUNDS_TABLE
    }, function(err, data) {
        if (err) { return callback(err); }
        callback(null, data.Items);
    });
};

var getCognitoId = function(callback) {
    cognitoInstance = new AWS.CognitoIdentity();
    var getIdParams = {
        // https://console.aws.amazon.com/cognito/pool/edit/?region=us-east-1&id=us-east-1:649ddaa6-d62c-4d75-b289-f0a5268f36a4
        // FantasyBach
        IdentityPoolId: process.env.COGNITO_IDENTITY_POOL_ID, /* required */
        // https://console.aws.amazon.com/support/home?region=us-west-2#/
        // http://docs.aws.amazon.com/IAM/latest/UserGuide/console_account-alias.html
        AccountId: process.env.AWS_ACCOUNT_ID
    };
    _.defaults(getIdParams, cognitoLoginsParam);
    cognitoInstance.getId(getIdParams, function(err, data) {
        if (err) { return callback(err); }
        callback(null, {
            userId : data.IdentityId,
            cognitoIdentity : data
        });
    });
};

var getCredentials = function(callback) {
    var getCredentialsForIdentityParams = _.defaults({}, cognitoLoginsParam, cognitoIdentity);
    cognitoInstance.getCredentialsForIdentity(getCredentialsForIdentityParams, function(err, data) {
        if (err) { return callback(err); }
        callback(null, data.Credentials);
    });
};

var getFacebookProfile = function(callback) {
    fb.me(function(err, profile) {
        if (err) { return callback(err); }
        callback(null, {
            id : profile.id,
            email : profile.email,
            picture : profile.picture && profile.picture.data && profile.picture.data.url,
            name : profile.name
        });
    }, 'id,name,birthday,email,picture.type(large)');
};

var updateUser = function(callback) {
    dynamodbDoc.update({
        TableName : process.env.USERS_TABLE,
        Key : { id : userId },
        UpdateExpression : 'SET #facebookId=:facebookId, #email=:email, #profilePicture=:profilePicture, #name=:username, #picks=if_not_exists(#picks, :picks), #isAdmin=if_not_exists(#isAdmin, :isAdmin)',
        ExpressionAttributeNames : {
            '#facebookId' : 'facebookId',
            '#email' : 'email',
            '#profilePicture' : 'profilePicture',
            '#name' : 'name',
            '#picks' : 'picks',
            '#isAdmin' : 'isAdmin'
        },
        ExpressionAttributeValues : {
            ':facebookId' : facebookProfile.id,
            ':email' : facebookProfile.email,
            ':profilePicture' : facebookProfile.picture,
            ':username' : facebookProfile.name,
            ':picks' : picks,
            ':isAdmin' : false
        }
    }, callback);
};

// Cognito Code
// We are following the newer 2-step "Enhanced (Simplified) Authflow" here:
// http://docs.aws.amazon.com/cognito/devguide/identity/concepts/authentication-flow/
// http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/CognitoIdentity.html
var action = function(token, done) {
    fb = new fbgraph.Facebook(token, 'v2.4');
    cognitoLoginsParam = {
        Logins : {
            // http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/CognitoIdentity.html#getId-property
            'graph.facebook.com' : token
        }
    };

    // http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Config.html#region-property
    var regionName = 'us-east-1';
    AWS.config.update({region: regionName});
    dynamodbDoc = new AWS.DynamoDB.DocumentClient();


    getCognitoId(function(err, data) {
        if (err) {
            // We get this when the token has expired:
            // 400 (Bad Request)
            // Error: Invalid login token. Token is expired.
            return done(err);
        }
        userId = data.userId;
        cognitoIdentity = data.cognitoIdentity;
        async.parallel({
            credentials : getCredentials,
            profile : getFacebookProfile,
            rounds : getRounds
        }, function(err, data) {
            if (err) {
                return done(err);
            }
            awsCredentials = data.credentials;
            facebookProfile = data.profile;
            picks = {};
            _.each(data.rounds, function(round) {
                if (!picks[round.seasonId]) { picks[round.seasonId] = {}; }
                picks[round.seasonId][round.id] = {};
            });
            updateUser(function(err) {
                if (err) {
                    return done(err);
                }
                done(null, {
                    userId: userId,
                    accessKey: awsCredentials.AccessKeyId,
                    secretKey: awsCredentials.SecretKey,
                    sessionToken: awsCredentials.SessionToken
                });
            });
        });
    });
};
