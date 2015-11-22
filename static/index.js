var apigClientFactory = require('fantasybach-sdk');
/*
 * This expires frequently.
 * I had been asking Tore for new ones here.
 * He says "You can just use the app id and app secret as the access token https://developers.facebook.com/docs/facebook-login/access-tokens"
 */
var fbToken = 'CAAEXlZB7tJc4BAOqebfBOTT0Qa0f5NapzchbGCF1Tg3TrkwVi796p9S0yZASyu47fQbKEROCA2LBbNpmdAaOfUsBEOlCzeValoi0dUU4Kmwza04pN7WIGPC7UwcLLaVJxiQbqbnCV6yAyCQEQXJ9VPdSUF0hBWJbEg8Q4W0QsV0RTJEhDv64UVCBldaVQv2E48ZB2ivt5CiaZCYEwQR7';

var cognitoLoginsParam = {
    Logins : {
        // http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/CognitoIdentity.html#getId-property
        'graph.facebook.com' : fbToken
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
    IdentityPoolId: 'us-east-1:649ddaa6-d62c-4d75-b289-f0a5268f36a4', /* required */
    // https://console.aws.amazon.com/support/home?region=us-west-2#/
    // http://docs.aws.amazon.com/IAM/latest/UserGuide/console_account-alias.html
    AccountId: '977273028392'
};
_.defaults(getIdParams, cognitoLoginsParam);
cognitoidentity.getId(getIdParams, function(err, data) {
    if (err) {
        // We get this when it has expired:
        // 400 (Bad Request)
        // Error: Invalid login token. Token is expired.
        console.log(err, err.stack);
        return;
    } else {
        console.log(data);           // successful response
        var getCredentialsForIdentityParams = _.defaults({}, data, cognitoLoginsParam);
        cognitoidentity.getCredentialsForIdentity(getCredentialsForIdentityParams, function(err, data) {
            if (err) {
                console.log(err, err.stack); // an error occurred
            } else {
                console.log(data);
                var awsCredentials = data.Credentials;
                // Look at apiGateway-js-sdk/README.md for these values
                var apiClientParams = {
                    accessKey: awsCredentials.AccessKeyId,
                    secretKey: awsCredentials.SecretKey,
                    sessionToken: awsCredentials.SessionToken, //OPTIONAL: If you are using temporary credentials you must include the session token
                    region: regionName // OPTIONAL: The region where the API is deployed, by default this parameter is set to us-east-1
                };
                var apigClient = apigClientFactory.newClient(apiClientParams);
                var apigRequestParams = {
                    seasonId : '100905a6-90d7-11e5-8994-feff819cdc9f',
                    ids : '',
                    id : ''
                };
                // Tack on some cache busting to hopefully prevent cached responses.  Not sure if this actually helps.
                var additionalParams = {
                    queryParams: {
                        cacheBuster: new Date().getMilliseconds()
                    }
                };
                // This request doesn't require auth.
                apigClient.getRoles(apigRequestParams, {}, additionalParams).then(function(result){
                    console.log("role GET success");
                    console.log(result);
                }).catch( function(result){
                    console.log("role GET failure");
                    console.log(result);
                });
                // This request requests auth.
                apigClient.seasonSeasonIdContestantGet(apigRequestParams, {}, additionalParams).then(function(result){
                    console.log("contestant GET success");
                    console.log(result);
                }).catch( function(result){
                    console.log("contestant GET failure");
                    console.log(result);
                });
            }
        });
    }
});