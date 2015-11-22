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
    return { message : 'You requested the following users (seasonId: ' + seasonId + '): ' + ids.split(',') }
  }
  if (id) {
    return { message : 'You requested the following user (seasonId: ' + seasonId + '): ' + id }
  }
  return { message : 'You requested the current user (seasonId: ' + seasonId + ')' };
};
