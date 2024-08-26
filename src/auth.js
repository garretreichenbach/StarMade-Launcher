/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
'use strict';

let playerName;
const REGISTRY_TOKEN_URL = 'https://registry.star-made.org/oauth/token';
const REGISTRY_REGISTER_URL = 'https://registry.star-made.org/api/v1/users.json';

const electron = require('electron');
const request  = require('request');

const ipc    = electron.ipcRenderer;
const {
  remote
} = electron;

const util    = require('./util');
const log     = require('./log-helpers');


const close = document.getElementById('close');

const uplinkLink = document.getElementById('uplinkLink');
const guestLink = document.getElementById('guestLink');

const uplinkForm = document.getElementById('uplink');
const uplinkSubmit = document.getElementById('uplinkSubmit');
const status = document.getElementById('status');
const statusGuest = document.getElementById('statusGuest');
let rememberMe = false;
const rememberMeLabel = document.getElementById('rememberMeLabel');
const rememberMeBox = document.getElementById('rememberMe');
const registerLink = document.getElementById('registerLink');

const guestForm = document.getElementById('guest');

const registerForm = document.getElementById('register');
const registerBack = document.getElementById('registerBack');
const registerSubmit = document.getElementById('registerSubmit');
const registerSubmitBg = document.getElementById('registerSubmitBg');
const registerStatus = document.getElementById('registerStatus');
let subscribe = true;
const subscribeLabel = document.getElementById('subscribeLabel');
const subscribeBox = document.getElementById('subscribe');

const licensesLink = document.getElementById('licensesLink');

const originalWidth = window.innerWidth;
const originalHeight = window.innerHeight;

util.setupExternalLinks();

close.addEventListener('click', () => remote.app.quit());

if (localStorage.getItem('playerName') != null) {
  // Set username and player name to last used player name
  playerName = localStorage.getItem('playerName');
  document.getElementById('username').value = playerName;
  document.getElementById('playerName').value = playerName;
}

const showGuest = function() {
  uplinkForm.style.display = 'none';
  return guestForm.style.display = 'block';
};

const showRegister = function() {
  close.style.display = 'none';
  uplinkForm.style.display = 'none';
  guestForm.style.display = 'none';
  registerForm.style.display = 'block';

  // TODO: May need to account the height offset used in OS X
  remote.getCurrentWindow().setSize(window.innerWidth, 508);
  return remote.getCurrentWindow().center();
};

const exitRegister = function() {
  close.style.display = 'inline';
  uplinkForm.style.display = 'block';
  guestForm.style.display = 'none';
  registerForm.style.display = 'none';

  remote.getCurrentWindow().setSize(originalWidth, originalHeight);
  return remote.getCurrentWindow().center();
};

switch (localStorage.getItem('authGoto')) {
  case 'guest':
    showGuest();
    break;
  case 'register':
    showRegister();
    break;
}
localStorage.removeItem('authGoto');

rememberMe = util.parseBoolean(localStorage.getItem('rememberMe'));
if (rememberMe) { rememberMeBox.innerHTML = '&#x2713;'; }

uplinkLink.addEventListener('click', function(event) {
  event.preventDefault();

  uplinkForm.style.display = 'block';
  return guestForm.style.display = 'none';
});

guestLink.addEventListener('click', function(event) {
  event.preventDefault();

  return showGuest();
});

const doLogin = function(event) {
  event.preventDefault();

  if (!navigator.onLine) {
    status.innerHTML = 'You are not connected to the Internet.';
    return;
  }

  status.innerHTML = 'Logging in...';

  return request.post(REGISTRY_TOKEN_URL, {
    form: {
      grant_type: 'password',
      username: document.getElementById('username').value.trim(),
      password: document.getElementById('password').value,
      scope: 'public read_citizen_info client'
    }
  },
    function(err, res, body) {
      body = JSON.parse(body);
      if (!err && (res.statusCode === 200)) {
        log.entry(`Logged in as ${document.getElementById('username').value.trim()}`);
        return ipc.send('finish-auth', body);
      } else if (res.statusCode === 401) {
        log.entry("Invalid login credentials");
        return status.innerHTML = 'Invalid credentials.';
      } else {
        log.entry(`Unable to log in (${res.statusCode})`);
        return status.innerHTML = 'Unable to login, please try later.';
      }
  });
};

uplinkForm.addEventListener('submit', doLogin);
uplinkSubmit.addEventListener('click', doLogin);

const toggleRememberMe = function() {
  rememberMe = !rememberMe;
  localStorage.setItem('rememberMe', rememberMe);
  if (rememberMe) {
    return rememberMeBox.innerHTML = '&#10003;';
  } else {
    return rememberMeBox.innerHTML = '&nbsp;';
  }
};

rememberMeLabel.addEventListener('click', toggleRememberMe);
rememberMeBox.addEventListener('click', toggleRememberMe);
registerLink.addEventListener('click', showRegister);

const doGuest = function(event) {
  event.preventDefault();

  playerName = document.getElementById('playerName').value.trim();
  if (!!!playerName || !(playerName.length >= 3)) {
    statusGuest.innerHTML = "Invalid username";
    return;
  }

  log.entry(`Guest login: ${playerName}`);
  return ipc.send('finish-auth',
    {playerName});
};

guestForm.addEventListener('submit', doGuest);
guestSubmit.addEventListener('click', doGuest);

const doRegister = function(event) {
  event.preventDefault();

  registerStatus.innerHTML = 'Registering...';

  const username = document.getElementById('registerUsername').value;

  return request.post(REGISTRY_REGISTER_URL, {
    form: {
      user: {
        username: document.getElementById('registerUsername').value,
        email: document.getElementById('registerEmail').value,
        password: document.getElementById('registerPassword').value,
        password_confirmation: document.getElementById('registerPassword').value,
        subscribe_to_newsletter: subscribe ? '1' : '0'
      }
    }
  },
    function(err, res, body) {
      body = JSON.parse(body);
      if (!err && ((res.statusCode === 200) || (res.statusCode === 201))) {
        registerStatus.innerHTML = '';
        log.entry("Registered new account");
        status.innerHTML = 'Registered! Please confirm your email.';
        document.getElementById('username').value = username;
        return exitRegister();
      } else if (res.statusCode === 422) {
        let field = Object.keys(body.errors)[0];
        const error = body.errors[field][0];
        field = field.substring(0, 1).toUpperCase() + field.substring(1, field.length);

        log.error("Error registering account");
        log.indent.entry(`${field} ${error}`);
        return registerStatus.innerHTML = `${field} ${error}`;
      } else {
        log.warning(`Unable to register account (${res.statusCode})`);
        return registerStatus.innerHTML = 'Unable to register, please try later.';
      }
  });
};

registerForm.addEventListener('submit', doRegister);
registerSubmit.addEventListener('click', doRegister);

registerBack.addEventListener('click', function(event) {
  event.preventDefault();

  return exitRegister();
});

registerSubmit.addEventListener('mouseenter', () => registerSubmitBg.className = 'hover');

registerSubmit.addEventListener('mouseleave', () => registerSubmitBg.className = '');

const toggleSubscribe = function() {
  subscribe = !subscribe;
  if (subscribe) {
    return subscribeBox.innerHTML = '&#10003;';
  } else {
    return subscribeBox.innerHTML = '&nbsp;';
  }
};

subscribeLabel.addEventListener('click', toggleSubscribe);
subscribeBox.addEventListener('click', toggleSubscribe);

licensesLink.addEventListener('click', function(event) {
  event.preventDefault();

  return ipc.send('open-licenses');
});
