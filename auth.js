"use strict";
const express = require("express");
const open = require("open");
const path = require("path");
const keytar = require("keytar");
const jwt = require("jsonwebtoken");

const callbackUrl = "http://localhost:3000/callback";
const scope = "https://api.us-east-1.dev.stratoshell.com/stratoshell.taskApi";

const tokenHost = "https://auth.us-east-1.dev.stratoshell.com";

const { AuthorizationCode } = require("simple-oauth2");

class Auth {
    constructor() {
        this.client_id = "135kjdaolqrcnaodj0mk4ln9qc";
        this.client_secret =
            "1vtuu2r4548dnst9mb3qh19ubicmpuv5b43phofta6a66b71l0n5";
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
    createAuthApp = async function (tokenCallback, errorCallback) {
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
                    res.writeHead(200, { "Content-Type": "text/html" });
                    res.write(`<html>
                    <head>
                        <link
                            href="https://d3oia8etllorh5.cloudfront.net/20201215211355/css/bootstrap.min.css"
                            rel="stylesheet"
                            media="screen"
                        />
                        <link
                            href="https://d3oia8etllorh5.cloudfront.net/20201215211355/css/cognito-login.css"
                            rel="stylesheet"
                            media="screen"
                        />
                    </head>
                    <body>
                        <div class="container">
                            <div class="modal-dialog">
                                <div class="modal-content background-customizable">
                                    <div>
                                        <div>
                                            <div class="banner-customizable">
                                                <center>Login Complete</center>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </body>
                </html>`);
                    res.end(() => {
                        tokenCallback(aT);
                        resolve();
                    });
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

        return new Promise((resolve) => {
            this.accessToken
                .refresh(refreshParams)
                .then((data) => {
                    let refreshTokenData = JSON.parse(JSON.stringify(data));
                    refreshTokenData.refresh_token = this.accessToken.token.refresh_token;
                    this.accessToken = this.client.createToken(
                        refreshTokenData
                    );
                    resolve(this.accessToken);
                })
                .catch((err) => {
                    console.log("Couldn't use saved credentials!");
                    console.log(err.message);
                    resolve(null);
                });
        });
    };

    saveToken = async function () {
        // Saves token to credential store as needed
        const decoded = jwt.decode(this.accessToken.token.access_token);
        try {
            await keytar.setPassword(
                "stratoclt",
                decoded.username,
                JSON.stringify(this.accessToken)
            );
            return;
        } catch (err) {
            console.log("Couldn't save credentials!");
            console.log(err);
            return;
        }
    };

    loadSavedToken = async function () {
        try {
            let cred = await keytar.findCredentials("stratoclt");
            if (cred && cred.length > 0) {
                this.accessToken = this.client.createToken(
                    JSON.parse(cred[0].password)
                );
                return this.accessToken;
            } else {
                return null;
            }
        } catch (err) {
            console.log("Couldn't load credentials");
            console.log(err);
            return null;
        }
    };

    deleteSavedToken = async function () {
        // Deletes a saved token
        try {
            let cred = await keytar.findCredentials("stratoclt");
            if (cred && cred.length > 0) {
                return await keytar.deletePassword(
                    "stratoclt",
                    cred[0].account
                );
            } else {
                return null;
            }
        } catch (err) {
            console.log("Couldn't delete credentials");
            console.log(err);
            return null;
        }
    };

    getToken = async function () {
        if (!this.accessToken) {
            // Look for token in keychain
            let loadResult = await this.loadSavedToken();
            if (loadResult) {
                let refreshResult = await this.refresh();
                if (refreshResult) {
                    return this.accessToken;
                }
            }
            // Need to get a completely new token all together
            console.log("Please login using browser...");
            try {
                let server = {};
                const sockets = new Set();
                this.accessToken = await new Promise(
                    async (resolve, reject) => {
                        let authApp = await this.createAuthApp(resolve, reject);
                        server = authApp.listen(3000, async (err) => {
                            if (err) reject(err);
                            open("http://localhost:3000");
                        });

                        server.on("connection", (socket) => {
                            sockets.add(socket);

                            server.once("close", () => {
                                sockets.delete(socket);
                            });
                        });
                    }
                );
                for (const socket of sockets) {
                    socket.destroy();

                    sockets.delete(socket);
                }
                server.close();
                await this.saveToken();
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
