/**
 * AWS Module: Action: Modularized Code
 */

// Export For Lambda Handler
module.exports.run = function(event, context, cb) {
    return cb(null, action(event.seasonId, event.id, event.ids));
};

// Your Code
var action = function(seasonId, id, ids) {
    if (ids) {
        return { message : 'You requested the following contestants (seasonId: ' + seasonId + '): ' + ids.split(',') }
    }
    if (id) {
        return { message : 'You requested the following contestant (seasonId: ' + seasonId + '): ' + id }
    }
    return { message : 'You requested all the contestants (seasonId: ' + seasonId + ')' };
};
