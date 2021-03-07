const Client = require("ssh2").Client;
const net = require("net");
const { FileSystem } = require("./fileSystem.js");

class Connection {
    constructor(task, config) {
        this.task = task;
        this.bastionConn = new Client();
        this.taskConn = new Client();
        this.fileSystem = null;
        this.config = config;
        this.portForwardingServers = [];
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
                    // Start port forwarding
                    this.config.getPortMappings().forEach((pm) => {
                        // Add one port mapping
                        let server = net.createServer((socket) => {
                            this.taskConn.forwardOut(
                                "127.0.0.1",
                                pm.Port,
                                "127.0.0.1",
                                pm.TargetPort,
                                (err, stream) => {
                                    if (err) {
                                        return reject(err);
                                    }
                                    socket.pipe(stream);
                                    stream.pipe(socket);
                                }
                            );
                        });
                        server.listen(pm.Port, "127.0.0.1", () => {
                            console.log(`Listening on port ${pm.Port}`);
                        });
                        this.portForwardingServers.push(server);
                    });

                    // Start shell
                    this.taskConn.shell(process.env.TERM, {}, (err, stream) => {
                        if (err) throw err;

                        // First send these commands
                        this.config
                            .getPreSyncCommands()
                            .forEach(async (cmd) => {
                                try {
                                    await new Promise((resolve, reject) => {
                                        stream.write(
                                            `${cmd} \n`,
                                            "utf-8",
                                            (err) => {
                                                if (err) reject(err);
                                                resolve();
                                            }
                                        );
                                    });
                                } catch (err) {
                                    console.log(`Couldn't write: ${cmd}`);
                                    console.log(err);
                                }
                            });

                        // Next execute post sync commands
                        const postSync = async () => {
                            // First send these commands
                            this.config
                                .getPostSyncCommands()
                                .forEach(async (cmd) => {
                                    try {
                                        await new Promise((resolve, reject) => {
                                            stream.write(
                                                `${cmd} \n`,
                                                "utf-8",
                                                (err) => {
                                                    if (err) reject(err);
                                                    resolve();
                                                }
                                            );
                                        });
                                    } catch (err) {
                                        console.log(`Couldn't write: ${cmd}`);
                                        console.log(err);
                                    }
                                });
                        };

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
                                sftp,
                                postSync
                            );
                        });

                        stream
                            .on("close", () => {
                                console.log("Exited from task.");
                                this.portForwardingServers.forEach((pfs) => {
                                    pfs.close();
                                });
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
