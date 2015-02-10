'use strict';
var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var Session = require('express-session');
var port = process.env.PORT || 3000;	
var mongoose = require('mongoose');
var flash = require('connect-flash');
var path = require('path');
var cookieParser = require('cookie-parser');
var Poll = require('./server-assets/poll/pollModel');
var routes = require('./server-assets/database');
var bodyParser = require('body-parser');
var cors = require('cors');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var FacebookStrategy = require('passport-facebook').Strategy;
var TwitterStrategy = require('passport-twitter').Strategy;
var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
var LinkedInStrategy = require('passport-linkedin').Strategy;
var User = require('./server-assets/user/userModel');

var db = 'mongodb://localhost/incredipoll';
var connection = mongoose.connection;


//express, bodyParser, cors setup
app.use(cookieParser());
app.use(bodyParser.json());

app.use(cors());
app.use(Session({
	secret: "whatevertheheckIwantontuesdayinjuly",
	name: 'DaPolls',
	proxy: true,
	resave: true,
	saveUninitialized: true
}));

app.use(passport.initialize());
app.use(passport.session());

app.use(flash());
//ties in the index.html
app.use(express.static(path.join(__dirname + '/public')));


// var User = {};

 passport.use('local-login', new LocalStrategy({
        // by default, local strategy uses username and password, we will override with email
        usernameField : 'email',
        passwordField : 'password',
        passReqToCallback : true // allows us to pass in the req from our route (lets us check if a user is logged in or not)
    },
    function(req, email, password, done) {
        if (email)
            email = email.toLowerCase(); // Use lower-case e-mails to avoid case-sensitive e-mail matching

        // asynchronous
        process.nextTick(function() {
            User.findOne({ 'local.email' :  email }, function(err, user) {
                // if there are any errors, return the error
                if (err)
                    return done(err);

                // if no user is found, return the message
                if (!user)
                    return done(null, { error: 'No user found. ' });

                if (!user.validPassword(password))
                    return done(null, { error: 'Oops! Wrong password.' });

                // all is well, return user
                else
                    return done(null, user);
            });
        });
    }));

    // =========================================================================
    // LOCAL SIGNUP =============================================================
    // =========================================================================
    passport.use('local-signup', new LocalStrategy({
        // by default, local strategy uses username and password, we will override with email
        usernameField : 'email',
        passwordField : 'password',
        passReqToCallback : true // allows us to pass in the req from our route (lets us check if a user is logged in or not)
    },
    function(req, email, password, done) {
        if (email)
            email = email.toLowerCase(); // Use lower-case e-mails to avoid case-sensitive e-mail matching

        // asynchronous
        process.nextTick(function() {
            // if the user is not already logged in:
            if (!req.user) {
                User.findOne({ 'local.email' :  email }, function(err, user) {
                    // if there are any errors, return the error
                    if (err)
                        return done(err);

                    console.log(user);
                    // check to see if theres already a user with that email
                    if (user) {
                        return done(null, { error: 'That email is already taken.' });
                    } else {

                        // create the user
                        var newUser            = new User();

                        newUser.local.email    = email;
                        newUser.local.password = newUser.generateHash(password);

                        newUser.save(function(err) {
                            if (err)
                                throw err;

                            return done(null, newUser);
                        });
                    }

                });
            // if the user is logged in but has no local account...
            } else if ( !req.user.local.email ) {
                // ...presumably they're trying to connect a local account
                var user            = req.user;
                    user.local.email    = email;
                user.local.password = user.generateHash(password);
                user.save(function(err) {
                    if (err)
                        throw err;
                    return done(null, user);
                });
            } else {
                // user is logged in and already has a local account. Ignore signup. (You should log out before trying to create a new account, user!)
                return done(null, req.user);
            }

        });

    }));


    // =========================================================================
    // FACEBOOK ================================================================
    // =========================================================================
    passport.use(new FacebookStrategy({

     	clientID: process.env.FACEBOOK_APP_ID || '380054328825864',
 	 	clientSecret: process.env.FACEBOOK_SECRET_ID || '348682659a6741a449c30aa77ee8a3aa',
  		callbackURL: '/auth/facebook/callback',
        passReqToCallback : true // allows us to pass in the req from our route (lets us check if a user is logged in or not)

    },
    function(req, token, refreshToken, profile, done) {

        // asynchronous
        process.nextTick(function() {

            // check if the user is already logged in
            if (!req.user) {

                User.findOne({ 'facebook.id' : profile.id }, function(err, user) {
                    if (err)
                        return done(err);

                    if (user) {

                        // if there is a user id already but no token (user was linked at one point and then removed)
                        if (!user.facebook.token) {
                            user.facebook.token = token;
                            user.facebook.name  = profile.name.givenName + ' ' + profile.name.familyName;
                            user.facebook.email = (profile.emails[0].value || '').toLowerCase();

                            user.save(function(err) {
                                if (err)
                                    throw err;
                                return done(null, user);
                            });
                        }

                        return done(null, user); // user found, return that user
                    } else {
                        // if there is no user, create them
                        var newUser            = new User();

                        newUser.facebook.id    = profile.id;
                        newUser.facebook.token = token;
                        newUser.facebook.name  = profile.name.givenName + ' ' + profile.name.familyName;
                        newUser.facebook.email = (profile.emails[0].value || '').toLowerCase();

                        newUser.save(function(err) {
                            if (err)
                                throw err;
                            return done(null, newUser);
                        });
                    }
                });

            } else {
                // user already exists and is logged in, we have to link accounts
                var user            = req.user; // pull the user out of the session

                user.facebook.id    = profile.id;
                user.facebook.token = token;
                user.facebook.name  = profile.name.givenName + ' ' + profile.name.familyName;
                user.facebook.email = (profile.emails[0].value || '').toLowerCase();

                user.save(function(err) {
                    if (err)
                        throw err;
                    return done(null, user);
                });

            }
        });

    }));

    // =========================================================================
    // TWITTER =================================================================
    // =========================================================================
    passport.use(new TwitterStrategy({

        consumerKey: process.env.TWITTER_CONSUMER_KEY || 'ayWV5ayZ8uQpjGGmFYv7mektJ',
	    consumerSecret: process.env.TWITTER_CONSUMER_SECRET || '7h7Iy3k83XF9QKx3urIiQrqHg48zgIpgjIIHkcRKQJ0vJt78Gb',
	    callbackURL: '/auth/twitter/callback',
        passReqToCallback : true // allows us to pass in the req from our route (lets us check if a user is logged in or not)

    },
    function(req, token, tokenSecret, profile, done) {

        // asynchronous
        process.nextTick(function() {

            // check if the user is already logged in
            if (!req.user) {

                User.findOne({ 'twitter.id' : profile.id }, function(err, user) {
                    if (err)
                        return done(err);

                    if (user) {
                        // if there is a user id already but no token (user was linked at one point and then removed)
                        if (!user.twitter.token) {
                            user.twitter.token       = token;
                            user.twitter.username    = profile.username;
                            user.twitter.displayName = profile.displayName;

                            user.save(function(err) {
                                if (err)
                                    throw err;
                                return done(null, user);
                            });
                        }

                        return done(null, user); // user found, return that user
                    } else {
                        // if there is no user, create them
                        var newUser                 = new User();

                        newUser.twitter.id          = profile.id;
                        newUser.twitter.token       = token;
                        newUser.twitter.username    = profile.username;
                        newUser.twitter.displayName = profile.displayName;

                        newUser.save(function(err) {
                            if (err)
                                throw err;
                            return done(null, newUser);
                        });
                    }
                });

            } else {
                // user already exists and is logged in, we have to link accounts
                var user                 = req.user; // pull the user out of the session

                user.twitter.id          = profile.id;
                user.twitter.token       = token;
                user.twitter.username    = profile.username;
                user.twitter.displayName = profile.displayName;

                user.save(function(err) {
                    if (err)
                        throw err;
                    return done(null, user);
                });
            }

        });

    }));

    // =========================================================================
    // GOOGLE ==================================================================
    // =========================================================================
    passport.use(new GoogleStrategy({

        clientID: process.env.GOOGLE_CLIENT_ID || '678792511059-96h105n1i1dqp35a1oaace5qvbg94jpe.apps.googleusercontent.com',
	    clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'gYqg_xHM2VfnPO6ReDQvS8yQ',
	    callbackURL: '/auth/google/callback',
        passReqToCallback : true // allows us to pass in the req from our route (lets us check if a user is logged in or not)

    },
    function(req, token, refreshToken, profile, done) {

        // asynchronous
        process.nextTick(function() {

            // check if the user is already logged in
            if (!req.user) {

                User.findOne({ 'google.id' : profile.id }, function(err, user) {
                    if (err)
                        return done(err);

                    if (user) {

                        // if there is a user id already but no token (user was linked at one point and then removed)
                        if (!user.google.token) {
                            user.google.token = token;
                            user.google.name  = profile.displayName;
                            user.google.email = (profile.emails[0].value || '').toLowerCase(); // pull the first email

                            user.save(function(err) {
                                if (err)
                                    throw err;
                                return done(null, user);
                            });
                        }

                        return done(null, user);
                    } else {
                        var newUser          = new User();

                        newUser.google.id    = profile.id;
                        newUser.google.token = token;
                        newUser.google.name  = profile.displayName;
                        newUser.google.email = (profile.emails[0].value || '').toLowerCase(); // pull the first email

                        newUser.save(function(err) {
                            if (err)
                                throw err;
                            return done(null, newUser);
                        });
                    }
                });

            } else {
                // user already exists and is logged in, we have to link accounts
                var user               = req.user; // pull the user out of the session

                user.google.id    = profile.id;
                user.google.token = token;
                user.google.name  = profile.displayName;
                user.google.email = (profile.emails[0].value || '').toLowerCase(); // pull the first email

                user.save(function(err) {
                    if (err)
                        throw err;
                    return done(null, user);
                });

            }

        });

    }));


// passport.use('facebook', new FacebookStrategy({
//  clientID: process.env.FACEBOOK_APP_ID || '380054328825864',
//  clientSecret: process.env.FACEBOOK_SECRET_ID || '348682659a6741a449c30aa77ee8a3aa',
//  callbackURL: '/auth/facebook/callback'
// }, function(accessToken, refreshToken, profile, done) {
// 		process.nextTick(function(){
// 			User.findOne({facebookId: profile.id}, function(err, user){
// 			if(err) {console.log(err)}
// 			if(!err && user != null){
// 					done(null, user);
// 				} else {
// 					var newUser = new User();
// 					newUser.userName = profile._json.name;
// 			    newUser.facebookId = profile.id;
// 			    newUser.accountCreated = profile._json.updated_time;
// 			    newUser.save(function (err) {
// 			    	if(err){
// 			    	  console.log(err);
// 			    	} else {
// 			    		done(null, newUser);
// 			    	}
// 			    });
// 				}
// 			}); 
// 		});
// 	}
// ));

// passport.use('twitter', new TwitterStrategy({
// 	  consumerKey: process.env.TWITTER_CONSUMER_KEY || 'ayWV5ayZ8uQpjGGmFYv7mektJ',
//     consumerSecret: process.env.TWITTER_CONSUMER_SECRET || '7h7Iy3k83XF9QKx3urIiQrqHg48zgIpgjIIHkcRKQJ0vJt78Gb',
//     callbackURL: '/auth/twitter/callback'
//   }, function(token, tokenSecret, profile, done) {
//   	process.nextTick(function(){
// 	    User.findOne({twitterId: profile.id}, function(err, user) {
// 	      if (err) { console.log(err)}
// 	      if(!err && user != null){
// 	      	done(null, user);
// 	      } else {
// 	      	var newUser = new User();
// 						newUser.userName = profile._json.name;
// 				    newUser.twitterId = profile.id;
// 				    newUser.accountCreated = profile._json.updated_time;
// 				    newUser.save(function (err) {
// 				    	if(err){
// 				    	  console.log(err);
// 				    	} else {
// 				    		done(null, newUser);
// 				    	}
// 				    });
// 	      	}
// 	      });
//     });
// 	}
// ));

// passport.use('google', new GoogleStrategy({
// 	  clientID: process.env.GOOGLE_CLIENT_ID || '678792511059-96h105n1i1dqp35a1oaace5qvbg94jpe.apps.googleusercontent.com',
//     clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'gYqg_xHM2VfnPO6ReDQvS8yQ',
//     callbackURL: '/auth/google/callback'
//   }, function(accessToken, refreshToken, profile, done) {
//   	process.nextTick(function(){
// 	    User.findOne({googleId: profile.id}, function(err, user) {
// 	      if (err) { console.log(err)}
// 	      if(!err && user != null){
// 	      	done(null, user);
// 	      } else {
// 	      	var newUser = new User();
// 						newUser.userName = profile.displayName;
// 				    newUser.googleId = profile.id;
// 				    newUser.accountCreated = profile.time;
// 				    newUser.save(function (err) {
// 				    	if(err){
// 				    	  console.log(err);
// 				    	} else {
// 				    		done(null, newUser);
// 				    	}
// 				    });
// 	      	}
// 	      });
//     });
// 	}
// ));

// passport.use('linkedin', new LinkedInStrategy({
// 	  consumerKey: process.env.LINKEDIN_CONSUMER_KEY || '75nliyrnqlnjw4',
//     consumerSecret: process.env.LINKEDIN_CONSUMER_SECRET || 'NbU9IGA4wOn4clDY',
//     callbackURL: '/auth/linkedin/callback'
//   }, function(token, tokenSecret, profile, done) {
//   	process.nextTick(function(){
// 	    User.findOne({linkedinId: profile.id}, function(err, user) {
// 	      if (err) { console.log(err)}
// 	      if(!err && user != null){
// 	      	done(null, user);
// 	      } else {
// 	      	var newUser = new User();
// 						newUser.userName = profile._json.name;
// 				    newUser.linkedinId = profile.id;
// 				    newUser.accountCreated = profile._json.updated_time;
// 				    newUser.save(function (err) {
// 				    	if(err){
// 				    	  console.log(err);
// 				    	} else {
// 				    		done(null, newUser);
// 				    	}
// 				    });
// 	      	}
// 	      });
//     });
// 	}
// ));




passport.serializeUser(function(user, done) {
console.log('serializing', user)
done(null, user.id);
});

passport.deserializeUser(function(id, done) {
	User.findById(id).exec(function(err, user){
		done(err, user);
	})
//console.log('deserializing ', user)
// done(null, user);
});

// passport.serializeUser(function(user, done) {
//  console.log('serializeUser: ' + user._id)
//  done(null, user._id);
// });
// passport.deserializeUser(function(id, done) {
//  User.findById(id, function(err, user){
//      console.log(user)
//      if(!err) done(null, user);
//      else done(err, null)
//  })
// });

// //Facebook redirect
// app.get('/auth/facebook', passport.authenticate('facebook'));

// app.get('/auth/facebook/callback', passport.authenticate('facebook', {
//  failureRedirect: '/#/login',
//  successRedirect: '/#/polls'
// }));

// //Twiter redirect
// app.get('/auth/twitter', passport.authenticate('twitter'));

// app.get('/auth/twitter/callback', passport.authenticate('twitter', {
// 	failureRedirect: '/#/login',
// 	successRedirect: '/#/polls'
// }));

// //Google Redirect
// app.get('/auth/google', passport.authenticate('google', 
// 	{ scope: ['https://www.googleapis.com/auth/userinfo.profile', 'https://www.googleapis.com/auth/userinfo.email']
// }));

// app.get('/auth/google/callback', passport.authenticate('google', {
// 	failureRedirect: '/#/login',
// 	successRedirect: '/#/polls'
// }));

// //LinkedIn Redirect
// app.get('/auth/linkedin', passport.authenticate('linkedin'));

// app.get('/auth/linkedin/callback', passport.authenticate('linkedin', {
// 	failureRedirect: '/#/login',
// 	successRedirect: '/#/polls'
// }));

// facebook -------------------------------

		// send to facebook to do the authentication
		app.get('/auth/facebook', passport.authenticate('facebook', { scope : 'email' }));

		// handle the callback after facebook has authenticated the user
		app.get('/auth/facebook/callback',
			passport.authenticate('facebook', {
				successRedirect : '/#/profile',
				failureRedirect : '/#/login'
			}));

	// twitter --------------------------------

		// send to twitter to do the authentication
		app.get('/auth/twitter', passport.authenticate('twitter', { scope : 'email' }));

		// handle the callback after twitter has authenticated the user
		app.get('/auth/twitter/callback',
			passport.authenticate('twitter', {
				successRedirect : '/#/profile',
				failureRedirect : '/#/login'
			}));


	// google ---------------------------------

		// send to google to do the authentication
		app.get('/auth/google', passport.authenticate('google', { scope : ['profile', 'email'] }));

		// the callback after google has authenticated the user
		app.get('/auth/google/callback',
			passport.authenticate('google', {
				successRedirect : '/#/profile',
				failureRedirect : '/#/login'
			}));


// =============================================================================
// AUTHORIZE (ALREADY LOGGED IN / CONNECTING OTHER SOCIAL ACCOUNT) =============
// =============================================================================

	// locally --------------------------------
		app.post('/connect/local', function(req, res, next) {
		    if (!req.body.email || !req.body.password) {
		        return res.json({ error: 'Email and Password required' });
		    }
		    passport.authenticate('local-signup', function(err, user, info) {
		        if (err) { 
		            return res.json(err);
		        }
		        if (user.error) {
		            return res.json({ error: user.error });
		        }
		        req.logIn(user, function(err) {
		            if (err) {
		                return res.json(err);
		            }
		            return res.json({ redirect: '/#/profile' });
		        });
		    })(req, res);
		});

	// facebook -------------------------------

		// send to facebook to do the authentication
		app.get('/connect/facebook', passport.authorize('facebook', { scope : 'email' }));

		// handle the callback after facebook has authorized the user
		app.get('/connect/facebook/callback',
			passport.authorize('facebook', {
				successRedirect : '/#/profile',
				failureRedirect : '/#/login'
			}));

	// twitter --------------------------------

		// send to twitter to do the authentication
		app.get('/connect/twitter', passport.authorize('twitter', { scope : 'email' }));

		// handle the callback after twitter has authorized the user
		app.get('/connect/twitter/callback',
			passport.authorize('twitter', {
				successRedirect : '/#/profile',
				failureRedirect : '/#/login'
			}));


	// google ---------------------------------

		// send to google to do the authentication
		app.get('/connect/google', passport.authorize('google', { scope : ['profile', 'email'] }));

		// the callback after google has authorized the user
		app.get('/connect/google/callback',
			passport.authorize('google', {
				successRedirect : '/#/profile',
				failureRedirect : '/#/login'
			}));

// =============================================================================
// UNLINK ACCOUNTS =============================================================
// =============================================================================
// used to unlink accounts. for social accounts, just remove the token
// for local account, remove email and password
// user account will stay active in case they want to reconnect in the future

	// local -----------------------------------
	app.get('/unlink/local', function(req, res) {
		var user            = req.user;
		user.local.email    = undefined;
		user.local.password = undefined;
		user.save(function(err) {
			res.redirect('/#/profile');
		});
	});

	// facebook -------------------------------
	app.get('/unlink/facebook', function(req, res) {
		var user            = req.user;
		user.facebook.token = undefined;
		user.save(function(err) {
			res.redirect('/#/profile');
		});
	});

	// twitter --------------------------------
	app.get('/unlink/twitter', function(req, res) {
		var user           = req.user;
		user.twitter.token = undefined;
		user.save(function(err) {
			res.redirect('/#/profile');
		});
	});

	// google ---------------------------------
	app.get('/unlink/google', function(req, res) {
		var user          = req.user;
		user.google.token = undefined;
		user.save(function(err) {
			res.redirect('/#/profile');
		});
	});

    app.get('/api/userData', isLoggedInAjax, function(req, res) {
        return res.json(req.user);
    });

	



// route middleware to ensure user is logged in - ajax get
function isLoggedInAjax(req, res, next) {
    if (!req.isAuthenticated()) {
        return res.json( { redirect: '/login' } );
    } else {
        next();
    }
}

// route middleware to ensure user is logged in
function isLoggedIn(req, res, next) {
	if (req.isAuthenticated())
		return next();

	res.redirect('/#/profile');
}



app.get('/me', function (req, res) {

	// if(req.user){
	// 	res.json(req.user);
	// 	res.redirect('/#/polls');
	// } else {
	// 	res.redirect('/#/login');
	// }
	return res.json(req.user);
})

// app.get('/me', function(req, res){
// 	console.log(user.id);
//    User.findOne({'facebookId': user.id}).exec(function(err, user){
//       console.log(err, "There was an Error?");
//       console.log(user, "A user was returned?")
//       if(err){
//       	res.send(err);
//       } else {
//       	if(user){
//       		res.status(200).send(user);
//       	} else {
//    				new User({
// 		       userName: req.user._json.name,
// 		       facebookId: req.user.id,
// 		       accountCreated: req.user._json.updated_time
// 		     }).save(function(err){
// 		       if(err){
// 		         console.log("couldn't save newFB user", err);
// 		       } else {
// 		         res.status(200).send(user); 
// 		         //this should be sending back the data after it is saved- test late	        
// 	      	 }  
//    			});
// 		  }
// 		}
// 	});
// });



app.post('/logout', function(req, res){
 req.logout();
 req.session.destroy();
 res.json({redirect: '/'});
});

var requireAuth = function(req, res, next) {
  if (!req.isAuthenticated()) {
    return res.status(401).end();
  }
  next();
};

//requests

// app.get('/login', routes.login);
// app.post('/login', routes.login);

// app.get('/signup', routes.signup);
// app.post('/signup', routes.signup);


// process the login form
		app.post('/login', function(req, res, next) {
		    if (!req.body.email || !req.body.password) {
		        return res.json({ error: 'Email and Password required' });
		    }
		    passport.authenticate('local-login', function(err, user, info) {
		        if (err) { 
		            return res.json(err);
		        }
		        if (user.error) {
		            return res.json({ error: user.error });
		        }
		        req.logIn(user, function(err) {
		            if (err) {
		                return res.json(err);
		            }
		            return res.json({ redirect: '/#/profile' });
		        });
		    })(req, res);
		});

		// SIGNUP =================================

		// process the signup form
		app.post('/signup', function(req, res, next) {
		    if (!req.body.email || !req.body.password) {
		        return res.json({ error: 'Email and Password required' });
		    }
		    passport.authenticate('local-signup', function(err, user, info) {
		        if (err) { 
		            return res.json(err);
		        }
		        if (user.error) {
		            return res.json({ error: user.error });
		        }
		        req.logIn(user, function(err) {
		            if (err) {
		                return res.json(err);
		            }
		            return res.json({ redirect: '/#/profile' });
		        });
		    })(req, res);
		});


app.get('/profile', requireAuth, routes.profile);
app.get('/polls', requireAuth, routes.list);
app.get('/polls/:id', requireAuth, routes.poll);
app.post('/polls', requireAuth, routes.create);
app.put('/vote/:id', requireAuth, routes.vote);
app.get('/vote/:id', requireAuth,routes.vote);

app.get('*', routes.index);

io.on('connection', function(socket){
	console.log('Connection made!')

	socket.emit('connection')

	socket.on('joinRoom', function(room){
		socket.join(room);
	});

	socket.on('pollCreated', function(){
		io.to('mainRoom').emit('pollCreated');
	});

socket.on('joinRoom', function(room){
		socket.join(room);
	

socket.on('voted', function(room){
	io.to(room).emit('voted')
	// socket.join('joinRoom', function(err, room){
	// 		io.sockets.to(room).emit('voted')
	// 	})
})
});

})

mongoose.connect(db);
	connection.once('open', function () {
		console.log('Actually connected to our DB');

	
	server.listen(process.env.EXPRESS_PORT || 3000, function(){
		console.log('Connection Success on mongoDB & ' + 3000)
	});
})
