
var oktaSignIn = new OktaSignIn({
    baseUrl: "https://dev-421732.oktapreview.com",
    clientId: "0oajcbx0ixBrx2APf0h7",
    authParams: {
        issuer: "https://dev-421732.oktapreview.com/oauth2/default",
        responseType: ['token', 'id_token'],
        scopes: ['openid', 'email', 'groups'],
        display: 'page'
    }
});

var token;

var app = new Vue({
    el: '#app',

    data: {
        ws: null, // Our websocket
        newMsg: '', // Holds new messages to be sent to the server
        chatContent: '', // A running list of chat messages displayed on the screen
        email: null, // Email address used for grabbing an avatar
        username: null, // Our username
        group: null, // Our group
        joined: false, // True if email and username have been filled in
        authenticated: false
    },
    created: function() {
        var self = this;
        console.log('creATED..');
    },
    methods: {
        send: function () {
            if (this.newMsg != '') {
                this.ws.send(
                    JSON.stringify({
                            model: $('<p>').html(this.newMsg).text(),
                        }
                    ));
                this.newMsg = ''; // Reset newMsg
            }
        },
        join: function () {
            if (!this.email) {
                Materialize.toast('You must enter an email', 2000);
                return
            }
            if (!this.username) {
                Materialize.toast('You must choose a username', 2000);
                return
            }
            this.email = $('<p>').html(this.email).text();
            this.username = $('<p>').html(this.username).text();
            this.joined = true;
        },
        gravatarURL: function(email) {
            return 'http://www.gravatar.com/avatar/' + CryptoJS.MD5(email);
        },
        setAuthState: function(authenticated) {
            this.authenticated = authenticated;
            if(authenticated == true){
                var self = this;
                token = getToken();
                if(token){
                    this.username = token.idToken.claims.email;
                    this.group = token.idToken.claims.groups;

                    // set ws connection
                    document.cookie = "token="+token.accessToken.accessToken;

                    // this.ws = new WebSocket('wss://' + window.location.host + '/ws?token=' + token.accessToken.accessToken );
                    this.ws = new WebSocket('wss://' + window.location.host + '/ws');
                    this.ws.addEventListener('message', function(e) {
                        console.log("new event....");
                        console.log(e);
                        var msg = JSON.parse(e.data);

                        self.chatContent += e.data + '<br/>'; // Parse emojis

                        var element = document.getElementById('chat-messages');
                        element.scrollTop = element.scrollHeight; // Auto scroll to the bottom
                    });
                }
            } else {
                this.username = '';
                this.group = '';
            }
        }
    },
    mounted: function(){
        console.log('mounted');
        checkAuth();

    }
});


function checkAuth(){

    var promise1 = new Promise(function(resolve, reject) {
        if (oktaSignIn.token.hasTokensInUrl()) {
            oktaSignIn.token.parseTokensFromUrl(
                function success(res) {
                    // The tokens are returned in the order requested by `responseType` above
                    var accessToken = res[0];
                    var idToken = res[1]

                    // Say hello to the person who just signed in:
                    console.log('Hello, ' + idToken.claims.email);
                    console.log(idToken.claims);

                    // Save the tokens for later use, e.g. if the page gets refreshed:
                    oktaSignIn.tokenManager.add('accessToken', accessToken);
                    oktaSignIn.tokenManager.add('idToken', idToken);

                    // Remove the tokens from the window location hash
                    window.location.hash='';
                    resolve(true);
                },
                function error(err) {
                    // handle errors as needed
                    console.error(err);
                    reject('Error');
                }
            );
        } else {
            oktaSignIn.session.get(function (res) {
                // Session exists, show logged in state.
                if (res.status === 'ACTIVE') {
                    console.log('Welcome back, ' + res.login);
                    resolve(true);
                }
                // No session, show the login form
                oktaSignIn.renderEl(
                    { el: '#okta-login-container' },
                    function success(res) {
                        // Nothing to do in this case, the widget will automatically redirect
                        // the user to Okta for authentication, then back to this page if successful
                    },
                    function error(err) {
                        // handle errors as needed
                        console.error(err);
                        reject('error');
                    }
                );
                resolve(false);
            });
        }

    });
    promise1.then((value) => {
        console.log('is authenticated: ', value);
        app.setAuthState(value);
    }, (error) => {
        console.log('Promise rejected.');
        console.log(error);
    });
}

function getToken() {
    return JSON.parse(localStorage.getItem('okta-token-storage'));
}