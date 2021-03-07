const Client = require("ssh2").Client;

const { FileSystem } = require("./fileSystem.js");

class Connection {
    constructor(task, config) {
        this.task = task;
        this.bastionConn = new Client();
        this.taskConn = new Client();
        this.fileSystem = null;
        this.config = config;
    }

    async connect() {
        await new Promise((resolve, reject) => {
            this.bastionConn
                .on("ready", () => {
                    // Connected to bastion host
                    this.bastionConn.forwardOut(
                        "127.0.0.1",
                        12345,
                        this.task.ip,
                        22,
                        (err, stream) => {
                            if (err) {
                                console.log(
                                    "Connection to stratoshell bastion failed: " +
                                        err
                                );
                                this.bastionConn.end();
                                reject(err);
                                return;
                            }
                            this.taskConn.connect({
                                sock: stream,
                                username: "root",
                                privateKey: this.task.key,
                            });
                        }
                    );
                })
                .on("error", () => {
                    console.log("Connection to stratoshell bastion failed");
                    reject(err);
                    return;
                })
                .connect({
                    host: "bastion.us-east-1.dev.stratoshell.com",
                    username: "ssh-user",
                    privateKey: this.task.key,
                });

            this.taskConn
                .on("ready", () => {
                    // Set up port forwarding if required
                    // if (this.config.getPortMappings()) {
                    //     this.config.getPortMappings().forEach((pFC) => {
                    //         this.taskConn.forwardOut(
                    //             this.task.ip,
                    //             pFC.TargetPort,
                    //             "127.0.0.1",
                    //             pFC.Port,
                    //             (err) => {
                    //                 console.log(
                    //                     `Couldn't start port forwarding: ${JSON.stringify(
                    //                         pFC
                    //                     )}`
                    //                 );
                    //                 console.log(err);
                    //             }
                    //         );
                    //     });
                    // }

                    // Start SFTP
                    this.taskConn.sftp((err, sftp) => {
                        if (err) {
                            console.log("Couldn't start SFTP");
                            console.log(err);
                            throw err;
                        }
                        this.fileSystem = new FileSystem(
                            process.cwd(),
                            "/root/",
                            sftp
                        );
                    });

                    // Start shell
                    this.taskConn.shell(process.env.TERM, {}, (err, stream) => {
                        if (err) throw err;
                        stream
                            .on("close", () => {
                                console.log("Exited from task.");
                                this.fileSystem.end();
                                this.taskConn.end();
                                this.bastionConn.end();
                                resolve();
                            })
                            .on("data", function (data) {
                                // Data flowing by pipe
                            })
                            .stderr.on("data", function (data) {
                                process.stderr.write(data);
                            });
                        stream.stdout.pipe(process.stdout);
                        process.stdin.pipe(stream.stdin);
                        process.stdin.setRawMode(true);
                    });
                })
                .on("error", () => {
                    console.log("Connection to stratoshell task failed");
                    reject(err);
                    return;
                });
        });
        return;
    }
}

exports.Connection = Connection;
