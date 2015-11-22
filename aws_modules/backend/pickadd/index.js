/**
 * AWS Module: Action: Modularized Code
 */

// Export For Lambda Handler
module.exports.run = function(event, context, cb) {
  return cb(null, action(event.seasonId, event.roundId, event.body.contestantId, event.body.roleId));
};

// Your Code
var action = function(seasonId, roundId, contestantId, roleId) {
  return { message: 'Season: ' + seasonId + ' Round: ' + roundId + ' Contestant: ' + contestantId + ' Role: ' + roleId };
};
