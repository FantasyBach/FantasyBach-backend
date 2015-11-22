/**
 * AWS Module: Action: Modularized Code
 */

// Export For Lambda Handler
module.exports.run = function(event, context, cb) {
    return cb(null, action(event));
};

// Your Code
var action = function(event) {
   return event;
};
