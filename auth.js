"use strict";
const express = require("express");
const open = require("open");
const path = require("path");

const callbackUrl = "http://localhost:3000/callback";
const scope = "https://api.us-east-1.dev.stratoshell.com/stratoshell.taskApi";

const tokenHost = "https://auth.us-east-1.dev.stratoshell.com";

const { AuthorizationCode } = require("simple-oauth2");

class Auth {
    constructor() {
        this.client_id = "7g72seg6ahnhb4o0hg7ojkd02h";
        this.client_secret =
            "1b490938tnh2k9k5d1g9mp2fcducc42t9a1fmc3h72brcfc6pst8";
        this.client = new AuthorizationCode({
            client: {
                id: this.client_id,
                secret: this.client_secret,
            },
            auth: {
                tokenHost: tokenHost,
                tokenPath: "/oauth2/token",
                authorizePath: "/login",
            },
        });
        this.authorizationUri = this.client.authorizeURL({
            redirect_uri: callbackUrl,
            scope: scope,
        });
        this.accessToken = null;
    }

    // This creates a new authentication app with a webpage to get a new token with user interraction
    createAuthApp = async (tokenCallback, errorCallback) => {
        let app = express();

        app.get("/", (_, res) => {
            res.redirect(this.authorizationUri);
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
                const aT = await this.client.getToken(options);
                this.accessToken = aT;
                await new Promise((resolve) => {
                    res.status(200).sendFile(
                        path.join(__dirname + "/static/success.html"),
                        (err) => {
                            if (err) console.log(err);
                            tokenCallback(aT);
                            resolve();
                        }
                    );
                });
            } catch (error) {
                console.log(error);
                console.error("Access Token Error", error.message);
                this.accessToken = null;
                errorCallback(error);
                res.status(500).json("Authentication failed");
            }
        });
        return app;
    };

    refresh = function () {
        const refreshParams = {
            scope: scope,
        };

        return new Promise((resolve, reject) => {
            this.accessToken
                .refresh(refreshParams)
                .then((data) => {
                    this.accessToken.token = data.token;
                    resolve(data);
                })
                .catch((err) => {
                    console.log("Couldn't refresh token!");
                    console.log(err.message);
                    reject(err);
                });
        });
    };

    getToken = async function () {
        if (!this.accessToken) {
            // Need to get a completely new token all together
            console.log("Please login using browser...");
            try {
                let server = {};
                this.accessToken = await new Promise(
                    async (resolve, reject) => {
                        let authApp = await this.createAuthApp(resolve, reject);
                        server = authApp.listen(3000, async (err) => {
                            if (err) reject(err);
                            open("http://localhost:3000");
                        });
                    }
                );
                server.close();
                return this.accessToken;
            } catch (err) {
                console.log("Couldn't get authentication token!");
                return null;
            }
        } else if (this.accessToken.expired()) {
            try {
                await this.refresh();
                return this.accessToken;
            } catch (err) {
                return null;
            }
        } else {
            return this.accessToken;
        }
    };
}

exports.Auth = Auth;
