const express = require('express');
const app = express();
const cookieSession = require('cookie-session');
const PORT = 8080; // default port 8080
const morgan = require('morgan');
const helpers = require('./functions');
const bcrypt = require('bcrypt');

const urlDatabase = {
  'b2xVn2': {longURL: 'http://www.lighthouselabs.ca', userID: 'userRandomID'},
  '9sm5xK': {longURL: 'http://www.google.com', userID: 'userRandomID'}
};

const testPass1 = bcrypt.hashSync('1', 10);
const testPass2 = bcrypt.hashSync('2', 10);

const users = {
  'userRandomID': {
    id: 'userRandomID',
    email: 'user@example.com',
    password: testPass1
  },
 'user2RandomID': {
    id: 'user2RandomID',
    email: 'user2@example.com',
    password: testPass2
  }
};

const bodyParser = require('body-parser');

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));
app.use(cookieSession({
  keys: ['user_id']
}));
app.use(morgan('dev'));

app.get('/', (req, res) => {
  res.redirect('/urls');
});

app.get('/u/:shortURL', (req, res) => {
  const longURL = urlDatabase[req.params.shortURL].longURL;
  res.redirect(longURL);
});

app.get('/urls', (req, res) => {
  let currentUser = req.session.user_id;
  let userURLs = helpers.urlsForUser(urlDatabase, currentUser);
  let templateVars = {
    user: users[currentUser],
    urls: userURLs };
  res.render('urls_index', templateVars);
});

app.post('/urls/new', (req, res) => {
  if(req.session.user_id) {
    if(req.body.longURL) {                    //make sure user is logged in and received input
      let newShortURL = helpers.generateStr();
      if(urlDatabase[newShortURL]) {          //make sure there isnt an existing short URL with the same random string
        newShortURL = helpers.generateStr();
      } else {
        urlDatabase[newShortURL] = {
          longURL: req.body.longURL,
          userID: req.session.user_id}
      }
      res.redirect(`/urls/${newShortURL}`);
    } else {
      let currentUser = req.session.user_id;
      let templateVars = {
        user: users[currentUser],
        urls: urlDatabase };
      res.render("urls_new", templateVars);
    }
  } else {
    res.status(403).send('Please register or login before trying to add a new URL');
  }
});

app.get('/register', (req, res) => {
  let currentUser = req.session.user_id;
  let templateVars = {
    user: users[currentUser],
    urls: urlDatabase };
  res.render('urls_registration', templateVars);
});

app.post('/register', (req, res) => {
  let currentUser = req.session.user_id;
  let templateVars = {
    user: users[currentUser] };
  let newId = helpers.generateStr();
  let newEmail = req.body.email;
  let newPassword = bcrypt.hashSync(req.body.password, 10);
  if(!newEmail || !newPassword) {
    res.render('urls_empty_fields', templateVars);
  } else if(helpers.emailCheck(users, newEmail)) {
    res.render('urls_email', templateVars);
  } else {
    if(users[newId]) {
      newId = helpers.generateStr();
    } else {
      users[newId] = {
        id: newId,
        email: newEmail,
        password: newPassword

      }
      req.session.user_id = newId;
    }
  }
  res.redirect('/urls');
});

app.get('/login', (req, res) => {
  let currentUser = req.session.user_id;
  let templateVars = {
    user: users[currentUser],
    urls: urlDatabase };
  res.render('urls_login', templateVars);
});

app.post('/login', (req, res) => {
  let currentUser = req.session.user_id;
  let loginEmail = req.body.email;
  let loginPassword = req.body.password;
  let templateVars = {
      user: users[currentUser] };
  let userID = helpers.getUserID(users, loginEmail);
  if(!userID) {
    res.render('urls_no_account', templateVars);
  } else if (!bcrypt.compareSync(loginPassword, users[userID].password)) {
    res.render('urls_input_error', templateVars);
  } else {
    req.session.user_id = userID;
    res.redirect('/urls');
  }
});

app.post('/logout', (req, res) => {
  res.clearCookie('express:sess');
  res.clearCookie('express:sess.sig');
  res.redirect('/urls');
});

app.post('/urls/:shortURL/delete', (req, res) => {
  console.log(urlDatabase[req.params.shortURL]);
  if(urlDatabase[req.params.shortURL].getUserID === req.session.user_id) {
    delete urlDatabase[req.params.shortURL];
    res.redirect('/urls');
  } else {
    res.status(403).send("You do not own this shortURL");
  }
});

app.get('/urls/new', (req, res) => {
  if(req.session.user_id) {
    let currentUser = req.session.user_id;
    let templateVars = {
      user: users[currentUser],
      urls: urlDatabase };
    res.render("urls_new", templateVars);
  } else {
    res.redirect('/login');
  }

});

app.get('/urls/:shortURL', (req, res) => {
  if(urlDatabase[req.params.shortURL]) {
    let currentUser = req.session.user_id;
    let templateVars = {
      user: users[currentUser],
      shortURL: req.params.shortURL,
      longURL: urlDatabase[req.params.shortURL].longURL,
      userID: urlDatabase[req.params.shortURL].userID };
    res.render("urls_show", templateVars);
  } else {
    let currentUser = req.session.user_id;
    let templateVars = {
        user: users[currentUser]
    };
    res.render("urls_not_found", templateVars);
  }

});

app.post('/urls/:shortURL', (req, res) => {
  if(req.params.shortURL) {
    let currentUser = req.session.user_id;
    if(currentUser === urlDatabase[req.params.shortURL].userID) {
      urlDatabase[req.params.shortURL].longURL = req.body.longURL;
      let templateVars = {
        user: users[currentUser],
        shortURL: req.params.shortURL,
        longURL: urlDatabase[req.params.shortURL].longURL,
        userID: urlDatabase[req.params.shortURL].userID };
      res.render("urls_show", templateVars);
    } else {
      res.status(403).send('You are not the owner of the short URL');
    }
  } else {
    let currentUser = req.session.user_id;
    let templateVars = {
        user: users[currentUser]
    };
    res.render("urls_not_found", templateVars);
  }
});

app.get('/urls.json', (req, res) => {
  res.json(urlDatabase);
});

app.listen(PORT,'0.0.0.0', () => {
  console.log(`Tinyapp server listening on port ${PORT}!`);
});