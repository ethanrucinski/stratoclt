#!/usr/bin/env node

const open = require("open");
const auth = require("./auth/auth.js");

async function main() {
    console.log("Starting stratoshell command line tool");
    console.log("need to authenticate...");

    let tokenResult;
    try {
        let server = {};
        tokenResult = await new Promise(async (resolve, reject) => {
            let authApp = auth.createAuthApp(resolve, reject);
            server = authApp.listen(3000, async (err) => {
                if (err) reject(err);
                open("http://localhost:3000");
            });
        });
        console.log("Got authentication token!");
        console.log(tokenResult);

        server.close();
    } catch (err) {
        console.log("Couldn't get authentication token!");
        process.exit(1);
    }
    console.log("Done!");
    console.log("Trying refresh...");
    try {
        let newToken = await auth.refresh(tokenResult);
        console.log(newToken);
    } catch (err) {
        console.log(err);
    }
    return;
}

main();
