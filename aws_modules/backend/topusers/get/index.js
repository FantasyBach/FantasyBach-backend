/**
 * AWS Module: Action: Modularized Code
 */

// Export For Lambda Handler
module.exports.run = function(event, context, cb) {
  return cb(null, action(event.seasonId, event.numberOfUsers));
};

// Your Code
var action = function(seasonId, numberOfUsers) {
  if (numberOfUsers) {
    return { message : 'You requested the top ' + numberOfUsers + ' users (seasonId: ' + seasonId + ').' }
  }
  return { message : 'You requested the top 10 (default) users (seasonId: ' + seasonId + ').' }
};
