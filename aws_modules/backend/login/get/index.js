/**
 * AWS Module: Action: Modularized Code
 */

var AWS = require('aws-sdk');
var _ = require('lodash');

// Export For Lambda Handler
module.exports.run = function(event, context, done) {
    return action(event.token, done);
};

// Your Code
var action = function(token, done) {
    console.log('running action with token: ' + token);
    var cognitoLoginsParam = {
        Logins : {
            // http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/CognitoIdentity.html#getId-property
            'graph.facebook.com' : token
        }
    };

    // http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Config.html#region-property
    var regionName = 'us-east-1';
    AWS.config.update({region: regionName});

    // Cognito Code
    // We are following the newer 2-step "Enhanced (Simplified) Authflow" here:
    // http://docs.aws.amazon.com/cognito/devguide/identity/concepts/authentication-flow/
    // http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/CognitoIdentity.html
    var cognitoidentity = new AWS.CognitoIdentity();
    var getIdParams = {
        // https://console.aws.amazon.com/cognito/pool/edit/?region=us-east-1&id=us-east-1:649ddaa6-d62c-4d75-b289-f0a5268f36a4
        // FantasyBach
        IdentityPoolId: process.env.COGNITO_IDENTITY_POOL_ID, /* required */
        // https://console.aws.amazon.com/support/home?region=us-west-2#/
        // http://docs.aws.amazon.com/IAM/latest/UserGuide/console_account-alias.html
        AccountId: process.env.AWS_ACCOUNT_ID
    };
    _.defaults(getIdParams, cognitoLoginsParam);
    cognitoidentity.getId(getIdParams, function(err, data) {
        if (err) {
            // We get this when it has expired:
            // 400 (Bad Request)
            // Error: Invalid login token. Token is expired.
            return done(err);
        }
        var getCredentialsForIdentityParams = _.defaults({}, data, cognitoLoginsParam);
        cognitoidentity.getCredentialsForIdentity(getCredentialsForIdentityParams, function(err, data) {
            if (err) {
                return done(err);
            }
            var awsCredentials = data.Credentials;
            done(null, {
                accessKey: awsCredentials.AccessKeyId,
                secretKey: awsCredentials.SecretKey,
                sessionToken: awsCredentials.SessionToken
            });
        });
    });
};
