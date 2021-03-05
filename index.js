#!/usr/bin/env node

const commandLineUsage = require("command-line-usage");

const { Auth } = require("./auth.js");
const { Task } = require("./task.js");
const { Connection } = require("./connection.js");
const auth = new Auth();

const argv = require("minimist")(process.argv.slice(2));
const sections = [
    {
        header: "Stratoshell command line tool",
        content: "Client CLI utility for using Stratoshell",
    },
    {
        header: "Options",
        optionList: [
            {
                name: "help",
                description: "Print this help guide",
                alias: "h",
                type: Boolean,
            },
            {
                name: "clear-credentials",
                description: "Delete stored stratoshell credentials",
                type: Boolean,
            },
        ],
    },
];

async function handleCLIInputs() {
    // Check for help option requested
    if (argv.h) {
        console.log(commandLineUsage(sections));
        process.exit(0);
    }

    // Check for clear credentials requested
    if (argv["clear-credentials"]) {
        await auth.deleteSavedToken();
        console.log("Login credentials cleared!");
        process.exit(0);
    }
}

async function main() {
    await handleCLIInputs();

    // Otherwise start tool
    console.log("Starting stratoshell command line tool...");

    // Create a new task and request remote instance
    let task = new Task(auth);
    await task.requestNewTask();

    // Wait for task to start
    await task.waitTaskStart();

    const conn = new Connection(task);
    await conn.connect();

    process.exit(0);
}

main();
