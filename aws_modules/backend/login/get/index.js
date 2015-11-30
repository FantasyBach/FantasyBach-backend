/**
 * AWS Module: Action: Modularized Code
 */

var AWS = require('aws-sdk');
var _ = require('lodash');
var async = require('async');

// Globals
var dynamodbDoc;
var cognitoLoginsParam;
var cognitoInstance;
var cognitoIdentity;
var userId;
var facebookProfile;
var awsCredentials;

// Export For Lambda Handler
module.exports.run = function(event, context, done) {
    return action(event.token, done);
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
    callback(null, {
        id : '123456789',
        email : 'mitchell@loeppky.com',
        picture : 'someurl.com',
        firstname : 'Mitchell',
        lastname : 'Loeppky'
    });
};

var updateUser = function(callback) {
    dynamodbDoc.update({
        TableName : process.env.USERS_TABLE,
        Key : { id : userId },
        AttributeUpdates : {
            facebookId : {
                Action : 'PUT',
                Value : facebookProfile.id
            },
            email : {
                Action : 'PUT',
                Value : facebookProfile.email
            },
            profilePicture : {
                Action : 'PUT',
                Value : facebookProfile.picture
            },
            name : {
                Action : 'PUT',
                Value : facebookProfile.firstname + ' ' + facebookProfile.lastname
            }
        }
    }, callback);
};

// Cognito Code
// We are following the newer 2-step "Enhanced (Simplified) Authflow" here:
// http://docs.aws.amazon.com/cognito/devguide/identity/concepts/authentication-flow/
// http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/CognitoIdentity.html
var action = function(token, done) {
    console.log('running action with token: ' + token);
    cognitoLoginsParam = {
        Logins : {
            // http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/CognitoIdentity.html#getId-property
            'graph.facebook.com' : token
        }
    };

    // http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Config.html#region-property
    var regionName = 'us-east-1';
    AWS.config.update({region: regionName});
    dynamodbDoc = new AWS.DynamoDB.DocumentClient()


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
            profile : getFacebookProfile
        }, function(err, data) {
            if (err) {
                return done(err);
            }
            awsCredentials = data.credentials;
            facebookProfile = data.profile;
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
