var express = require('express');
var moment = require('moment');
var cookieParser = require('cookie-parser')
var bodyParser = require('body-parser')
var cookieSession = require('cookie-session')
var passport = require('passport')
var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
var util = require('util');
var gcal = require('google-calendar');

var app = express();

app.set('port', (process.env.PORT || 5000));
app.use(cookieParser());
app.use(bodyParser());
app.use(cookieSession({ secret: 'blah cat' }));
app.use(passport.initialize());

app.use(express.static(__dirname + '/public'));

var config = require('./config');
var callbackURL;

if (config.node_env == "PRODUCTION") {
  callbackURL = "https://caladvisor.herokuapp.com/auth/callback";
} else {
  callbackURL = "http://localhost:5000/auth/callback";
}

passport.use(new GoogleStrategy({
    clientID: config.consumer_key,
    clientSecret: config.consumer_secret,
    callbackURL: callbackURL,
    scope: ['openid', 'email', 'https://www.googleapis.com/auth/calendar']
  },
  function(accessToken, refreshToken, profile, done) {
    profile.accessToken = accessToken;
    return done(null, profile);
  }
));

app.get('/auth',
  passport.authenticate('google', { session: false }));

app.get('/auth/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/login' }),
  function(req, res) {
    req.session.access_token = req.user.accessToken;
    res.redirect('/');
  });

app.all('/welcome', function(req, res){
  // show a welcome screen, and get the user to authorize
  return res.redirect('/auth');
});

app.all('/', function(req, res){

  if(!req.session.access_token) {
    return res.redirect('/welcome');
  }

  // We're logged in.  We show the calendar list and ask them to pick one
  // Actually, for now we'll just look at the 'primary calendar'

  //Create an instance from accessToken
  var accessToken = req.session.access_token;

  gcal(accessToken).events.list('primary',
    {'timeMax': moment().format(),
     'timeMin': moment().subtract('1', 'week').format()
    }, function(err, data) {
    if(err) return res.send(500,err);
    res.setHeader('Content-Type', 'application/json');
    return res.send(data);
  });

  // gcal(accessToken).calendarList.list(function(err, data) {
  //   if(err) return res.send(500,err);
  //   return res.send(data);
  // });
});

app.all('/:calendarId', function(req, res){

  if(!req.session.access_token) return res.redirect('/auth');

  //Create an instance from accessToken
  var accessToken     = req.session.access_token;
  var calendarId      = req.params.calendarId;

  gcal(accessToken).events.list(calendarId, {maxResults:1}, function(err, data) {
    if(err) return res.send(500,err);

    console.log(data)
    if(data.nextPageToken){
      gcal(accessToken).events.list(calendarId, {maxResults:1, pageToken:data.nextPageToken}, function(err, data) {
        console.log(data.items)
      })
    }


    return res.send(data);
  });
});


app.all('/:calendarId/:eventId', function(req, res){

  if(!req.session.access_token) return res.redirect('/auth');

  //Create an instance from accessToken
  var accessToken     = req.session.access_token;
  var calendarId      = req.params.calendarId;
  var eventId         = req.params.eventId;

  gcal(accessToken).events.get(calendarId, eventId, function(err, data) {
    if(err) return res.send(500,err);
    return res.send(data);
  });
});

// views is directory for all template files
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

// app.get('/', function(request, response) {
//   response.render('pages/index');
// });

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});
