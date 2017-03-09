const {BrowserWindow} = require('electron').remote;

var fs = require('fs');
var readline = require('readline');
var google = require('googleapis');
var googleAuth = require('google-auth-library');
var oauth2Client;
//var apiFunction;

// If modifying these scopes, delete your previously saved credentials
// at ~/.credentials/script-nodejs-quickstart.json
var SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
var TOKEN_DIR = (process.env.HOME || process.env.HOMEPATH ||
    process.env.USERPROFILE) + '/.credentials/';
var TOKEN_PATH = TOKEN_DIR + 'script-nodejs-quickstart.json';

// Load client secrets from a local file.
fs.readFile('client_secret.json', function processClientSecrets(err, content) {
  if (err) {
    console.log('Error loading client secret file: ' + err);
    return;
  }
  // Authorize a client with the loaded credentials, then call the
  // Google Apps Script Execution API.
  authorize(JSON.parse(content));
});

function checkAuth() {
  var token = fs.readFileSync(TOKEN_PATH);
  if (token == undefined) {
    return false;
  } else {
    return true;
  }
}

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 *
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials) {
  var clientSecret = credentials.installed.client_secret;
  var clientId = credentials.installed.client_id;
  var redirectUrl = credentials.installed.redirect_uris[0];
  var auth = new googleAuth();
  oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl);

  // Check if we have previously stored a token.
  var token;
  try {
    token = fs.readFileSync(TOKEN_PATH);
  } catch(err) {

  }

  if (token == undefined) {
    getNewToken(oauth2Client);
  } else {
    oauth2Client.credentials = JSON.parse(token);
    //if (callback != undefined) callback(oauth2Client);
  }
  return oauth2Client;
  /*fs.readFile(TOKEN_PATH, function(err, token) {
    if (err) {
      getNewToken(oauth2Client);
    } else {
      oauth2Client.credentials = JSON.parse(token);
      //localStorage.setItem("oauth2Client", oauth2Client);
      if (callback != undefined) callback(oauth2Client);
    }
  });//*/
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 *
 * @param {google.auth.OAuth2} oauth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback to call with the authorized
 *     client.
 */
function getNewToken(oauth2Client) {
  var authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES
  });
  console.log('Authorize this app by visiting this url: ', authUrl);
  let authWindow = new BrowserWindow({width: 600, height: 600})
  authWindow.once('ready-to-show', () => {
    authWindow.show();
  })
  authWindow.loadURL(authUrl);
  var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  rl.question('Enter the code from that page here: ', function(code) {
    rl.close();
    oauth2Client.getToken(code, function(err, token) {
      if (err) {
        console.log('Error while trying to retrieve access token', err);
        return;
      }
      oauth2Client.credentials = token;
      //localStorage.setItem("oauth2Client", oauth2Client);
      storeToken(token);
      //callback(oauth2Client);
    });
  });
}

/**
 * Store token to disk be used in later program executions.
 *
 * @param {Object} token The token to store to disk.
 */
function tokenise(code) {
  oauth2Client.getToken(code, function(err, token) {
    if (err) {
      console.log('Error while trying to retrieve access token', err);
      return;
    }
    oauth2Client.credentials = token;
    storeToken(token);
    //callback(oauth2Client);
  });
}

function storeToken(token) {
  try {
    fs.mkdirSync(TOKEN_DIR);
  } catch (err) {
    if (err.code != 'EEXIST') {
      throw err;
    }
  }
  fs.writeFile(TOKEN_PATH, JSON.stringify(token));
  console.log('Token stored to ' + TOKEN_PATH);
  //callAppsScript(oauth2Client);
}

function getData(apiFunction, params, retFunc) {
  //apiFunction = script;
  var content = fs.readFileSync('client_secret.json');
  var oauth2Client = authorize(JSON.parse(content));
  callAppsScript(oauth2Client, apiFunction, params, function(data) {
    retFunc(JSON.parse(data));
  });
}

/**
 * Call an Apps Script function to list the folders in the user's root
 * Drive folder.
 *
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
function callAppsScript(auth, apiFunction, params, dataFunc) {
  params == undefined ? params = '' : params = params;
  var scriptId = '1etRbe7WfshAkZjawXidiCHpSlUUSXg7QgTI9eSVOWZC1cSpiCDNm9RGa';
  var script = google.script('v1');

  // Make the API request. The request object is included here as 'resource'.
  script.scripts.run({
    auth: auth,
    resource: {
      function: apiFunction,
      parameters: params,
      devMode: true
    },
    scriptId: scriptId
  }, function(err, resp) {
    if (err) {
      // The API encountered a problem before the script started executing.
      console.log('The API returned an error: ' + err);
      return;
    }
    if (resp.error) {
      // The API executed, but the script returned an error.

      // Extract the first (and only) set of error details. The values of this
      // object are the script's 'errorMessage' and 'errorType', and an array
      // of stack trace elements.
      var error = resp.error.details[0];
      console.log('Script error message: ' + error.errorMessage);
      console.log('Script error stacktrace:');

      if (error.scriptStackTraceElements) {
        // There may not be a stacktrace if the script didn't start executing.
        for (var i = 0; i < error.scriptStackTraceElements.length; i++) {
          var trace = error.scriptStackTraceElements[i];
          console.log('\t%s: %s', trace.function, trace.lineNumber);
        }
      }
    } else {
      data = resp.response.result;
      //console.log(data);
      dataFunc(data);
    }

  });
}
