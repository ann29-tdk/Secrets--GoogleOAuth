//jshint esversion:6
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require("mongoose-findorcreate");
// const mongooseEncryption = require("mongoose-encryption");
// const md5 = require("md5");
// const bcrypt = require("bcrypt");
// const saltRounds = 10;


const app = express();


app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({
  extended: true
}));

/*                  PASSPORT WORK                            */
app.use(session({
  secret: "House of the rising sun.",
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

/*                 END OF  PASSPORT WORK                            */



/*           MONGODB WORK             */
main().catch(err => console.log(err));
async function main() {
  await mongoose.connect("mongodb+srv://test-anurag:Society2020@cluster0.g2tqnwo.mongodb.net/userDB", {
    useNewUrlParser: true
  });
}
/*                User schema                */
const {Schema} = mongoose;
const userSchema = new Schema({
  email: String,
  password: String,
  googleId: String,
  secret: String
});

/*     USING PASSPORT PLUGIN              */
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

// userSchema.plugin(mongooseEncryption, {secret:process.env.SECRET, encryptedFields:["password"] });

const User = mongoose.model("User", userSchema);







/*       USING PASSPORT serializeUser and deserializeUser            */
passport.use(User.createStrategy());
passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function (err, user) {
    done(err, user);
  });
});
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    User.findOrCreate({username: profile.emails[0].value, googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

/*                end of User schema                */

/*           END OF MONGODB WORK             */






app.get("/", function(req, res) {
  res.render("home");
});



// LOCAL REGISTRATION
app.route("/register")
.get(function(req, res) {
  res.render("register");
})
.post(function(req, res) {
  User.register({username: req.body.username}, req.body.password, function(err, user)
    {
    if (err)
    {
    console.log(err);
     res.redirect("/register");
   }
    else
     {
      passport.authenticate("local")(req, res, function()
      {
        res.redirect("/secrets");
      });
    }
  });
});
// END OF LOCAL REGISTRATION
//LOCAL LOGIN
app.route("/login")
.get(function(req, res) {
  res.render("login");
})
.post(function(req, res) {
  const user = new User({
    username: req.body.username,
    password: req.body.password
  });
  req.login(user, function(err) {
    if (err) {
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, function() {
        res.redirect("/secrets");
      });
    }
  });
});
//END OF LOCAL LOGIN


// GOOGLE OAUTH
app.get('/auth/google', passport.authenticate('google', {scope: ['openid', 'email','profile'] }));

app.get('/auth/google/secrets',
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect secrets page.
    res.redirect('/secrets');
  });


app.get("/secrets", function(req, res) {
  User.find({"secret":{$ne:null}}, function(err, foundUsers){
    if(err) console.log(err);
    else {
      if(foundUsers)
      {
        res.render("secrets", {usersWithSecrets: foundUsers});
      }
    }
  });
});
// END OF GOOGLE OAUTH

// SUBMIT POST
app.route("/submit")
.get(function(req ,res)
{
  if (req.isAuthenticated()) {
    res.render("submit");
  } else {
    res.redirect("/login");
  }
})
.post(function(req, res)
{
  const submittedSecret = req.body.secret;
  User.findById(req.user.id, function(err, foundUser)
{
  if(err){console.log(err);}
  else {
    if(foundUser)
    {
      foundUser.secret = submittedSecret;
      foundUser.save(function(err)
    {
      if(err)
      {
        console.log(err);
      }
      else
      {
        res.redirect("/secrets");
      }
    });
    }
  }
});
});






app.get('/logout', function(req, res, next) {
  req.logout(function(err) {
    if (err) { return next(err); }
    res.redirect('/');
  });
});


app.listen(3000, function() {
  console.log("Server started on port 3000.")
});
