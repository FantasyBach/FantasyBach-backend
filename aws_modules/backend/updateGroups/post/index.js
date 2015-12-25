/**
 * AWS Module: Action: Modularized Code
 */

var _ = require('lodash');
var async = require('async');
var fbgraph = require('fbgraphapi');
var AWS = require('aws-sdk');
var dynamodbDoc = new AWS.DynamoDB.DocumentClient();

var appId = process.env.FB_APP_ID;
var appSecret = process.env.FB_APP_SECRET;
var fb;

// Export For Lambda Handler
module.exports.run = function(event, context, done) {
    console.log('New event:');
    console.log(event);
    action(done);
};

var getGroups = function(callback, _index, _limit) {
    if (_index === undefined) { _index = 0; }
    if (_limit === undefined) { _limit = 100; }
    console.log('index: ' + _index + ' limit: ' + _limit);
    fb.post('/' + appId + '/groups', {
        method : 'GET',
        limit : _limit,
        offset : _index * _limit
    }, function(err, data) {
        if (err) { return callback(err); }
        var groupIds = _.map(data.data, 'id');
        var lastBatch = groupIds.length < _limit;
        callback(null, groupIds, lastBatch);
        if (lastBatch) { return; }
        getGroups(callback, _index + 1, _limit);
    })
};

var getMembers = function(groups, callback, _index, _limit) {
    if (_index === undefined) { _index = 0; }
    if (_limit === undefined) { _limit = 100; }
    fb.post('/members', {
        method : 'GET',
        ids : groups.join(','),
        limit : _limit,
        offset : _index * _limit
    }, function(err, data) {
        if (err) { return callback(err); }
        var membersByGroupId = data;
        var lastBatch = true;
        _.each(membersByGroupId, function(members) {
            if (members.data.length > 0) {
                lastBatch = false;
                return false;
            }
        });
        callback(null, membersByGroupId, lastBatch);
        if (lastBatch) { return; }
        getMembers(groups, callback, _index + 1, _limit);
    })
};

var scanGroups = function(callback) {
    return _scanGroups(null, callback);
};

var _scanGroups = function(startKey, callback) {
    var params = startKey ? { ExclusiveStartKey : startKey } : {};
    return dynamodbDoc.scan(_.assign(params, {
        TableName : process.env.GROUPS_TABLE,
        ProjectionExpression : '#facebookId, #seasonId, #memberFacebookIds',
        ExpressionAttributeNames : {
            '#facebookId' : 'facebookId',
            '#seasonId' : 'seasonId',
            '#memberFacebookIds' : 'memberFacebookIds'
        }
    }), function(err, data) {
        if (err) { callback(err); }
        if (data.LastEvaluatedKey) {
            _scanGroups(data.LastEvaluatedKey, callback);
            return callback(null, data.Items, false);
        }
        callback(null, data.Items, true);
    });
};

var scanUsers = function(callback) {
    return _scanUsers(null, callback);
};

var _scanUsers = function(startKey, callback) {
    var params = startKey ? { ExclusiveStartKey : startKey } : {};
    return dynamodbDoc.scan(_.assign(params, {
        TableName : process.env.USERS_TABLE,
        ProjectionExpression : '#id, #groups, #facebookId',
        ExpressionAttributeNames : {
            '#id' : 'id',
            '#facebookId' : 'facebookId',
            '#groups' : 'groups'
        }
    }), function(err, data) {
        if (err) { callback(err); }
        if (data.LastEvaluatedKey) {
            _scanUsers(data.LastEvaluatedKey, callback);
            return callback(null, data.Items, false);
        }
        callback(null, data.Items, true);
    });
};

var updateUser = function(userId, groupIdsBySeasonId, callback) {
    dynamodbDoc.update({
        TableName : process.env.USERS_TABLE,
        Key : { id : userId },
        UpdateExpression : 'SET #groups=:groups',
        ExpressionAttributeNames : {
            '#groups' : 'groups'
        },
        ExpressionAttributeValues : {
            ':groups' : groupIdsBySeasonId
        }
    }, callback);
};

var deleteGroup = function(groupFacebookId, seasonId, callback) {
    dynamodbDoc.delete({
        TableName : process.env.GROUPS_TABLE,
        Key : {
            facebookId : groupFacebookId,
            seasonId : seasonId
        }
    }, callback);
};

var putGroup = function(groupFacebookId, seasonId, memberFacebookIds, callback) {
    dynamodbDoc.put({
        TableName : process.env.GROUPS_TABLE,
        Item : {
            facebookId : groupFacebookId,
            seasonId : seasonId,
            memberFacebookIds : memberFacebookIds
        }
    }, callback);
};

var isUnorderedEqual = function(array1, array2) {
    return _.isEmpty(_.difference(array1, array2)) && _.isEmpty(_.difference(array2, array1));
};

// Your Code
var action = function(done) {
    fb = new fbgraph.Facebook(appId + '|' + appSecret, 'v2.5');
    var groupMembers = {};
    var memberGroups = {};
    var defaultGroups = {};

    var groupsQueue = async.queue(function(groupsWrapper, callback) {
        var groups = groupsWrapper.groups;
        if (groups.length == 0) { return callback(); }
        getMembers(groups, function(err, membersByGroupId, lastBatch) {
            if (err) { return callback(err); }
            _.each(membersByGroupId, function(members, groupId) {
                var memberIds = _.map(members.data, 'id');
                if (!groupMembers[groupId]) { groupMembers[groupId] = []; }
                groupMembers[groupId] = groupMembers[groupId].concat(memberIds);
            });
            if (!lastBatch) { return; }
            callback();
        });
    }, 8);

    var groupsScanQueue = async.queue(function(group, callback) {
        console.log('group: ' + JSON.stringify(group));
        var newMemberIds = groupMembers[group.facebookId];

        _.each(newMemberIds, function(memberId) {
            if (!memberGroups[memberId]) { memberGroups[memberId] = {}; }
            if (!memberGroups[memberId][group.seasonId]) { memberGroups[memberId][group.seasonId] = []; }
            memberGroups[memberId][group.seasonId].push(group.facebookId);
            memberGroups[memberId][group.seasonId] = _.sortBy(memberGroups[memberId][group.seasonId]);
            defaultGroups[group.seasonId] = {};
        });

        if (!_.has(groupMembers, group.facebookId)) {
            return deleteGroup(group.facebookId, group.seasonId, callback);
        }

        if (isUnorderedEqual(group.memberFacebookIds, newMemberIds)) {
            console.log('skipping group update');
            return callback();
        }

        putGroup(group.facebookId, group.seasonId, newMemberIds, callback);
    }, 8);

    var usersScanQueue = async.queue(function(user, callback) {
        console.log('user: ' + JSON.stringify(user));
        var newGroups = memberGroups[user.facebookId] || defaultGroups;

        if (_.isEqual(user.groups, newGroups)) {
            console.log('skipping user update');
            return callback();
        }

        updateUser(user.id, newGroups, callback);
    }, 8);

    getGroups(function(err, groups, lastBatch) {
        if (err) { return done(err); }
        groupsQueue.push({ groups : groups }, function(err) {
            if (err) { done(err); }
        });
        if (lastBatch) {
            groupsQueue.drain = function() {
                console.log(groupMembers);
                scanGroups(function(err, groups, lastBatch) {
                    console.log('groups: ' + JSON.stringify(groups));
                    groupsScanQueue.push(groups, function(err) {
                        if (err) { done(err); }
                    });
                    if (lastBatch) {
                        groupsScanQueue.drain = function() {
                            scanUsers(function(err, users, lastBatch) {
                                usersScanQueue.push(users, function(err) {
                                    if (err) { done(err); }
                                });
                                if (lastBatch) {
                                    usersScanQueue.drain = function() {
                                        return done(err, 'Yay!!!');
                                    };
                                    if (usersScanQueue.idle()) { usersScanQueue.drain() }
                                }
                            });
                        };
                        if (groupsScanQueue.idle()) { groupsScanQueue.drain() }
                    }
                });
            };
            if (groupsQueue.idle()) { groupsQueue.drain() }
        }
    });
};
