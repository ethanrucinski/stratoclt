#!/usr/bin/env node

const axios = require("axios");
const fs = require("fs");
const { spawn } = require("child_process");
const path = require("path");

const { Auth } = require("./auth/auth.js");
const auth = new Auth();

// Function requests a new task and returns task ID
async function newTask(token) {
    const config = {
        method: "post",
        url: "https://api.us-east-1.dev.stratoshell.com/keygen",
        headers: {
            Authorization: `Bearer ${auth.getToken.token}`,
        },
    };
    return await new Promise((resolve, reject) => {
        axios(config)
            .then((response) => {
                resolve(response.data);
            })
            .catch((err) => {
                reject(err);
            });
    });
}

async function waitForTaskStart(token, requestId) {
    const config = {
        method: "post",
        url: "https://api.us-east-1.dev.stratoshell.com/taskStatus",
        headers: {
            Authorization: `Bearer ${auth.getToken.token}`,
            "Content-Type": "application/json",
        },
        data: JSON.stringify({
            requestId: requestId,
        }),
    };

    let failures = 0;
    let result = {};
    let count = 0;
    while (
        result.taskStatus != "RUNNING" &&
        result.taskStatus != "STOPPING" &&
        result.taskStatus != "STOPPED"
    ) {
        console.clear();
        switch (count % 3) {
            case 0:
                console.log("Waiting for task start.");
                break;
            case 1:
                console.log("Waiting for task start..");
                break;
            case 2:
                console.log("Waiting for task start...");
                break;
            default:
                console.log("Waiting for task start....");
                break;
        }
        try {
            result = await new Promise((resolve, reject) => {
                axios(config)
                    .then((response) => {
                        result = response.data;
                        resolve(result);
                    })
                    .catch((err) => {
                        console.log("Couldn't retrieve task status");
                        reject(err);
                    });
            });
        } catch (err) {
            console.log(err);
            console.log(config);
            if (failures > 2) {
                failures++;
                throw err;
            }
        }
        count++;
        await new Promise((resolve) => setTimeout(resolve, 500));
    }
    return result;
}

async function main() {
    console.log("Starting stratoshell command line tool");
    //console.clear();
    console.log("Please login in using browser.");

    let token = await auth.getToken();
    console.log(token);
    // Start up new shell...

    token = await auth.getToken();
    console.log(token);

    let refresh = await auth.refresh();
    console.log(refresh);
    process.exit();
    let requestId;

    try {
        // Prepare to start task
        console.clear();
        console.log("Requesting a new task...");
        let taskDetails = await newTask(accessToken.token.access_token);
        fs.writeFileSync(
            path.join(__dirname + "/key.pem"),
            taskDetails.private
        );
        requestId = taskDetails.requestId;
        await new Promise((resolve, reject) => {
            fs.chmod(path.join(__dirname + "/key.pem"), 0o600, (err) => {
                if (err) reject(err);
                resolve();
            });
        });
        //console.log(`Requested new task: ${requestId}`);

        // Stop here while we wait for the task to start
        let taskStatusDetails = await waitForTaskStart(
            accessToken.token.access_token,
            requestId
        );
        if (taskStatusDetails.taskStatus != "RUNNING") {
            console.log("Task start failed!");
            console.log(taskStatusDetails.taskStatus);
            return;
        }

        // Task successfully started, private IP obtained,
        console.clear();
        console.log("Connecting to new task...");

        await new Promise((resolve, reject) => {
            const ssh = spawn(`ssh`, [
                "-v",
                "-tt",
                `-i ${path.join(__dirname + "/key.pem")}`,
                `-o ProxyCommand="ssh -W %h:%p ssh-user@bastion.us-east-1.dev.stratoshell.com"`,
                `root@${taskStatusDetails.taskPivateIp}`,
            ]);
            ssh.on("error", (error) => {
                console.log(`Encountered an error: ${error}`);
                reject(error);
            });

            ssh.stdout.on("data", function (data) {
                console.log("stdout: " + data);
            });

            ssh.stderr.on("data", function (data) {
                console.log("stderr: " + data);
            });

            ssh.on("close", () => {
                console.log("SSH session closed");
                resolve();
            });
        });
    } catch (err) {
        console.log("Step failed!");
        console.log(err);
        return;
    }
}

main();
