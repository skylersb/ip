 "use-strict";
var mongoose = require('mongoose');
var Schema = mongoose.Schema;


var User = new Schema({
       userName: {type: String},
       facebookId: {type: String},
       accountCreated: {type: Date},
       email: {type: String},
       admin: {type: Boolean, default:false},
       votedPolls: [ {type: mongoose.Schema.Types.ObjectId, ref: 'Poll'} ],
       myPolls: [ {type: mongoose.Schema.Types.ObjectId, ref: 'Poll'} ]

       
})

//  var User = new Schema({

// 		local            : {
//         email        : String,
//         password     : String,
//     },
//     facebook         : {
//         id           : String,
//         token        : String,
//         email        : String,
//         name         : String
//     },
//     twitter          : {
//         id           : String,
//         token        : String,
//         displayName  : String,
//         username     : String
//     },
//     google           : {
//         id           : String,
//         token        : String,
//         email        : String,
//         name         : String
//     },
//        votedPolls: [ {type: mongoose.Schema.Types.ObjectId, ref: 'Poll'} ],
//        myPolls: [ {type: mongoose.Schema.Types.ObjectId, ref: 'Poll'} ]

       
// });



module.exports = mongoose.model("User", User);