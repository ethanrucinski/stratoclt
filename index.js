#!/usr/bin/env node

const { Auth } = require("./auth.js");
const { Task } = require("./task.js");
const { Connection } = require("./connection.js");
const auth = new Auth();

async function main() {
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
