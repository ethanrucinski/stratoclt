const axios = require("axios");

class Task {
    constructor(auth, config) {
        this.requestId = null;
        this.key = null;
        this.ip = null;
        this.auth = auth;
        this.status = null;
        this.config = config;
    }

    async requestNewTask() {
    
        let token = await this.auth.getToken();
        console.log("Requesting a new task...");

        // Handle task config
        const taskConfig = this.config.getTaskConfig();

        const config = {
            method: "post",
            url: "https://api.us-east-1.dev.stratoshell.com/keygen",
            headers: {
                Authorization: `Bearer ${token.token.access_token}`,
                "Content-Type": "application/json",
            },
            data: JSON.stringify({
                image: taskConfig.Image,
                cpu: parseInt(taskConfig.Cpu),
                ram: parseFloat(taskConfig.Ram),
            }),
        };
        try {
            let taskRequestDetails = await new Promise((resolve, reject) => {
                axios(config)
                    .then((response) => {
                        resolve(response.data);
                    })
                    .catch((err) => {
                        reject(err);
                    });
            });
            this.requestId = taskRequestDetails.requestId;
            this.key = taskRequestDetails.private;
            return true;
        } catch (err) {
            console.log("Failed to request new task!");
            console.log(err);
            throw err;
        }
    }

    async getTaskStatus() {
        let token = await this.auth.getToken();
        const config = {
            method: "post",
            url: "https://api.us-east-1.dev.stratoshell.com/taskStatus",
            headers: {
                Authorization: `Bearer ${token.token.access_token}`,
                "Content-Type": "application/json",
            },
            data: JSON.stringify({
                requestId: this.requestId,
            }),
        };
        try {
            await new Promise((resolve, reject) => {
                axios(config)
                    .then((response) => {
                        this.status = response.data.taskStatus;
                        this.ip = response.data.taskPrivateIp;
                        resolve(this.status);
                    })
                    .catch((err) => {
                        console.log("Couldn't retrieve task status");
                        reject(err);
                    });
            });

            return this.status;
        } catch (err) {
            console.log("Couldn't get status of task!");
            return null;
        }
    }

    async waitTaskStart() {
        let dots = [".", "..", "...", "...."];
        await new Promise(async (resolve) => {
            let failures = 0;
            let cycles = 0;
            while (
                this.status != "RUNNING" &&
                this.status != "STOPPING" &&
                this.status != "STOPPED" &&
                failures < 5
            ) {
                console.clear();
                console.log(`Waiting for task to start${dots[cycles % 4]}`);
                await this.getTaskStatus();
                try {
                    await new Promise((resolve) => setTimeout(resolve, 500));
                } catch {
                    failures++;
                }
                cycles++;
            }
            resolve();
        });
        return this.status;
    }
}

exports.Task = Task;
