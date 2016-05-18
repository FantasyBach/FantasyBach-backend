'use strict';

var postHandler = require('./post').handler;

module.exports.handler = function(event, context, callback) {
    if (event.keepWarm) { return console.log('keeping warm'); }
    var userId = event.userId;
    var body = event.body;
    var pathParams = event.pathParams;
    var queryParams = event.queryParams;
    switch (event.method) {
        case "POST" : return postHandler(userId, pathParams, queryParams, body, callback);
        default : return callback(null, 'Unsupported method: ' + event.method);
    }
};
