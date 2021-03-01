"use strict";
const express = require("express");
const callbackUrl = "http://localhost:3000/callback";
const scope = "https://api.us-east-1.dev.stratoshell.com/stratoshell.taskApi";
const client_id = "7g72seg6ahnhb4o0hg7ojkd02h";
const client_secret = "1b490938tnh2k9k5d1g9mp2fcducc42t9a1fmc3h72brcfc6pst8";
const tokenHost = "https://auth.us-east-1.dev.stratoshell.com";
const path = require("path");


const { AuthorizationCode } = require("simple-oauth2");
const client = new AuthorizationCode({
    client: {
        id: client_id,
        secret: client_secret,
    },
    auth: {
        tokenHost: tokenHost,
        tokenPath: "/oauth2/token",
        authorizePath: "/login",
    },
});

// Authorization uri definition
const authorizationUri = client.authorizeURL({
    redirect_uri: callbackUrl,
    scope: scope,
});

exports.createAuthApp = function (tokenCallback, errorCallback) {
    let app = express();
    // Initial page redirecting to Github
    app.get("/", (_, res) => {
        console.log(authorizationUri);
        res.redirect(authorizationUri);
    });

    // Callback service parsing the authorization token and asking for the access token
    app.get("/callback", async (req, res) => {
        const { code } = req.query;
        const options = {
            code,
            scope: scope,
            redirect_uri: callbackUrl,
        };

        try {
            const accessToken = await client.getToken(options);
            //console.log("The resulting token: ", accessToken.token);
            tokenCallback(accessToken);
            res.status(200).sendFile(path.join(__dirname + "/success.html"));
        } catch (error) {
            console.log(error);
            console.error("Access Token Error", error.message);
            errorCallback(error);
            res.status(500).json("Authentication failed");
        }
    });
    return app;
};

exports.refresh = function (accessToken) {
    //if (accessToken.expired()) {
        const refreshParams = {
            scope: scope,
        };

        return new Promise((resolve, reject) => {
            accessToken
                .refresh(refreshParams)
                .then((data) => {
                    console.log(data)
                    resolve(data);
                })
                .catch((err) => {
                    console.log("Couldn't refresh token!");
                    console.log(err.message);
                    reject(err);
                });
        });
    //}
};
