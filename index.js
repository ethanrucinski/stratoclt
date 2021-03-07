#!/usr/bin/env node

const commandLineUsage = require("command-line-usage");

const { Auth } = require("./auth.js");
const { Task } = require("./task.js");
const { Connection } = require("./connection.js");
const { Config } = require("./config.js");
const auth = new Auth();

const argv = require("minimist")(process.argv.slice(2));
const sections = [
    {
        header: "Stratoshell command line tool",
        content: "Client CLI utility for using Stratoshell",
    },
    {
        content: "Usage: stratoclt [OPTIONS]",
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
            {
                name: "config-file",
                alias: "f",
                description:
                    'Task configuration filename (default "strato.yaml" or "strato.yml")',
                type: String,
            },
        ],
    },
];

// Parameters
let configFilePath = null;

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

    // Check for config file override
    if (argv["config-file"] || argv["f"]) {
        configFilePath = argv["config-file"] || argv["f"];
    }
}

async function main() {
    await handleCLIInputs();

    // Otherwise start tool
    console.log("Starting stratoshell command line tool...");

    // Deal with config
    let config;
    try {
        config = new Config(configFilePath);
    } catch (err) {
        console.log(err);
        process.exit(1);
    }

    // Create a new task and request remote instance
    let task = new Task(auth, config);
    await task.requestNewTask();

    // Wait for task to start
    await task.waitTaskStart();

    const conn = new Connection(task, config);

    try {
        await conn.connect();
    } catch (err) {
        console.log(err);
        process.exit(1);
    }

    process.exit(0);
}

main();
