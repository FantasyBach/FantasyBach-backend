/*
 * Copyright 2010-2015 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * You may not use this file except in compliance with the License.
 * A copy of the License is located at
 *
 *  http://aws.amazon.com/apache2.0
 *
 * or in the "license" file accompanying this file. This file is distributed
 * on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
 * express or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */

var apigClientFactory = {};
apigClientFactory.newClient = function (config) {
    var apigClient = { };
    if(config === undefined) {
        config = {
            accessKey: '',
            secretKey: '',
            sessionToken: '',
            region: '',
            apiKey: undefined,
            defaultContentType: 'application/json',
            defaultAcceptType: 'application/json'
        };
    }
    if(config.accessKey === undefined) {
        config.accessKey = '';
    }
    if(config.secretKey === undefined) {
        config.secretKey = '';
    }
    if(config.apiKey === undefined) {
        config.apiKey = '';
    }
    if(config.sessionToken === undefined) {
        config.sessionToken = '';
    }
    if(config.region === undefined) {
        config.region = 'us-east-1';
    }
    //If defaultContentType is not defined then default to application/json
    if(config.defaultContentType === undefined) {
        config.defaultContentType = 'application/json';
    }
    //If defaultAcceptType is not defined then default to application/json
    if(config.defaultAcceptType === undefined) {
        config.defaultAcceptType = 'application/json';
    }

    
    var endpoint = 'https://kku30n0xzl.execute-api.us-east-1.amazonaws.com/dev';
    var parser = document.createElement('a');
    parser.href = endpoint;

    //Use the protocol and host components to build the canonical endpoint
    endpoint = parser.protocol + parser.host;

    //Store any path components that were present in the endpoint to append to API calls
    var pathComponenent = parser.pathname;

    var sigV4ClientConfig = {
        accessKey: config.accessKey,
        secretKey: config.secretKey,
        sessionToken: config.sessionToken,
        serviceName: 'execute-api',
        region: config.region,
        endpoint: endpoint,
        defaultContentType: config.defaultContentType,
        defaultAcceptType: config.defaultAcceptType
    };

    var authType = 'NONE';
    if (sigV4ClientConfig.accessKey !== undefined && sigV4ClientConfig.accessKey !== '' && sigV4ClientConfig.secretKey !== undefined && sigV4ClientConfig.secretKey !== '') {
        authType = 'AWS_IAM';
    }

    var simpleHttpClientConfig = {
        endpoint: endpoint,
        defaultContentType: config.defaultContentType,
        defaultAcceptType: config.defaultAcceptType
    };

    var apiGatewayClient = apiGateway.core.apiGatewayClientFactory.newClient(simpleHttpClientConfig, sigV4ClientConfig);
    
    
    
    apigClient.loginGet = function (params, body, additionalParams) {
        if(additionalParams === undefined) { additionalParams = {}; }
        
        apiGateway.core.utils.assertParametersDefined(params, ['token'], ['body']);
        
        var loginGetRequest = {
            verb: 'get'.toUpperCase(),
            path: pathComponenent + uritemplate('/login').expand(apiGateway.core.utils.parseParametersToObject(params, [])),
            headers: apiGateway.core.utils.parseParametersToObject(params, []),
            queryParams: apiGateway.core.utils.parseParametersToObject(params, ['token']),
            body: body
        };
        
        
        return apiGatewayClient.makeRequest(loginGetRequest, authType, additionalParams, config.apiKey);
    };
    
    
    apigClient.seasonSeasonIdContestantGet = function (params, body, additionalParams) {
        if(additionalParams === undefined) { additionalParams = {}; }
        
        apiGateway.core.utils.assertParametersDefined(params, ['seasonId', 'ids', 'id'], ['body']);
        
        var seasonSeasonIdContestantGetRequest = {
            verb: 'get'.toUpperCase(),
            path: pathComponenent + uritemplate('/season/{seasonId}/contestant').expand(apiGateway.core.utils.parseParametersToObject(params, ['seasonId', ])),
            headers: apiGateway.core.utils.parseParametersToObject(params, []),
            queryParams: apiGateway.core.utils.parseParametersToObject(params, ['ids', 'id']),
            body: body
        };
        
        
        return apiGatewayClient.makeRequest(seasonSeasonIdContestantGetRequest, authType, additionalParams, config.apiKey);
    };
    
    
    apigClient.seasonSeasonIdLeagueGet = function (params, body, additionalParams) {
        if(additionalParams === undefined) { additionalParams = {}; }
        
        apiGateway.core.utils.assertParametersDefined(params, ['seasonId', 'ids', 'id'], ['body']);
        
        var seasonSeasonIdLeagueGetRequest = {
            verb: 'get'.toUpperCase(),
            path: pathComponenent + uritemplate('/season/{seasonId}/league').expand(apiGateway.core.utils.parseParametersToObject(params, ['seasonId', ])),
            headers: apiGateway.core.utils.parseParametersToObject(params, []),
            queryParams: apiGateway.core.utils.parseParametersToObject(params, ['ids', 'id']),
            body: body
        };
        
        
        return apiGatewayClient.makeRequest(seasonSeasonIdLeagueGetRequest, authType, additionalParams, config.apiKey);
    };
    
    
    apigClient.seasonSeasonIdLeagueOptions = function (params, body, additionalParams) {
        if(additionalParams === undefined) { additionalParams = {}; }
        
        apiGateway.core.utils.assertParametersDefined(params, [], ['body']);
        
        var seasonSeasonIdLeagueOptionsRequest = {
            verb: 'options'.toUpperCase(),
            path: pathComponenent + uritemplate('/season/{seasonId}/league').expand(apiGateway.core.utils.parseParametersToObject(params, [])),
            headers: apiGateway.core.utils.parseParametersToObject(params, []),
            queryParams: apiGateway.core.utils.parseParametersToObject(params, []),
            body: body
        };
        
        
        return apiGatewayClient.makeRequest(seasonSeasonIdLeagueOptionsRequest, authType, additionalParams, config.apiKey);
    };
    
    
    apigClient.seasonSeasonIdRoleGet = function (params, body, additionalParams) {
        if(additionalParams === undefined) { additionalParams = {}; }
        
        apiGateway.core.utils.assertParametersDefined(params, ['seasonId', 'ids', 'id'], ['body']);
        
        var seasonSeasonIdRoleGetRequest = {
            verb: 'get'.toUpperCase(),
            path: pathComponenent + uritemplate('/season/{seasonId}/role').expand(apiGateway.core.utils.parseParametersToObject(params, ['seasonId', ])),
            headers: apiGateway.core.utils.parseParametersToObject(params, []),
            queryParams: apiGateway.core.utils.parseParametersToObject(params, ['ids', 'id']),
            body: body
        };
        
        
        return apiGatewayClient.makeRequest(seasonSeasonIdRoleGetRequest, authType, additionalParams, config.apiKey);
    };
    
    
    apigClient.seasonSeasonIdRoundRoundIdPickPost = function (params, body, additionalParams) {
        if(additionalParams === undefined) { additionalParams = {}; }
        
        apiGateway.core.utils.assertParametersDefined(params, ['seasonId', 'roundId'], ['body']);
        
        var seasonSeasonIdRoundRoundIdPickPostRequest = {
            verb: 'post'.toUpperCase(),
            path: pathComponenent + uritemplate('/season/{seasonId}/round/{roundId}/pick').expand(apiGateway.core.utils.parseParametersToObject(params, ['seasonId', 'roundId'])),
            headers: apiGateway.core.utils.parseParametersToObject(params, []),
            queryParams: apiGateway.core.utils.parseParametersToObject(params, []),
            body: body
        };
        
        
        return apiGatewayClient.makeRequest(seasonSeasonIdRoundRoundIdPickPostRequest, authType, additionalParams, config.apiKey);
    };
    
    
    apigClient.seasonSeasonIdRoundRoundIdPickDelete = function (params, body, additionalParams) {
        if(additionalParams === undefined) { additionalParams = {}; }
        
        apiGateway.core.utils.assertParametersDefined(params, ['seasonId', 'roundId'], ['body']);
        
        var seasonSeasonIdRoundRoundIdPickDeleteRequest = {
            verb: 'delete'.toUpperCase(),
            path: pathComponenent + uritemplate('/season/{seasonId}/round/{roundId}/pick').expand(apiGateway.core.utils.parseParametersToObject(params, ['seasonId', 'roundId'])),
            headers: apiGateway.core.utils.parseParametersToObject(params, []),
            queryParams: apiGateway.core.utils.parseParametersToObject(params, []),
            body: body
        };
        
        
        return apiGatewayClient.makeRequest(seasonSeasonIdRoundRoundIdPickDeleteRequest, authType, additionalParams, config.apiKey);
    };
    
    
    apigClient.seasonSeasonIdTopUsersGet = function (params, body, additionalParams) {
        if(additionalParams === undefined) { additionalParams = {}; }
        
        apiGateway.core.utils.assertParametersDefined(params, ['seasonId', 'numberOfUsers'], ['body']);
        
        var seasonSeasonIdTopUsersGetRequest = {
            verb: 'get'.toUpperCase(),
            path: pathComponenent + uritemplate('/season/{seasonId}/topUsers').expand(apiGateway.core.utils.parseParametersToObject(params, ['seasonId', ])),
            headers: apiGateway.core.utils.parseParametersToObject(params, []),
            queryParams: apiGateway.core.utils.parseParametersToObject(params, ['numberOfUsers']),
            body: body
        };
        
        
        return apiGatewayClient.makeRequest(seasonSeasonIdTopUsersGetRequest, authType, additionalParams, config.apiKey);
    };
    
    
    apigClient.seasonSeasonIdUserGet = function (params, body, additionalParams) {
        if(additionalParams === undefined) { additionalParams = {}; }
        
        apiGateway.core.utils.assertParametersDefined(params, ['seasonId', 'ids', 'id'], ['body']);
        
        var seasonSeasonIdUserGetRequest = {
            verb: 'get'.toUpperCase(),
            path: pathComponenent + uritemplate('/season/{seasonId}/user').expand(apiGateway.core.utils.parseParametersToObject(params, ['seasonId', ])),
            headers: apiGateway.core.utils.parseParametersToObject(params, []),
            queryParams: apiGateway.core.utils.parseParametersToObject(params, ['ids', 'id']),
            body: body
        };
        
        
        return apiGatewayClient.makeRequest(seasonSeasonIdUserGetRequest, authType, additionalParams, config.apiKey);
    };
    

    return apigClient;
};
