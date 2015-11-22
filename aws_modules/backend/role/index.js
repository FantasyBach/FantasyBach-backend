/**
 * AWS Module: Action: Modularized Code
 */

var _ = require('lodash');

// Export For Lambda Handler
module.exports.run = function(event, context, cb) {
    return cb(null, action(event.seasonId, event.id, event.ids));
};

var ROLES = [
    {
        id : 1,
        name : 'Kisser',
        verbName : 'Kisses',
        description : '+.25 per kissing session. A kissing session is ended by the Bachelor and the contestant having a conversation.'
    },
    {
        id : 2,
        name : 'Bleeper',
        verbName : 'Bleeps',
        description : '+.25 per bleep. A bleep is counted each time the contestant\'s voice is bleeped out.'
    },
    {
        id : 3,
        name : 'Cryer',
        verbName : 'Tears',
        description : '+1 for every time the contestant sheds tears. The contestant must regain composure before she can start crying again.'
    }
];

// Your Code
var action = function(seasonId, id, ids) {
    if (!id && !ids) { return ROLES; }
    if (ids) {
        ids = ids.split(',');
    }
    if (id) {
        ids = [id];
    }
    return _.filter(ROLES, function(role) {
        return _.contains(ids, role.id);
    });
};
