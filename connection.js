const Client = require("ssh2").Client;

const { FileSystem } = require("./fileSystem.js");

class Connection {
    constructor(task) {
        this.task = task;
        this.bastionConn = new Client();
        this.taskConn = new Client();
        this.fileSystem = null;
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
                    console.log(
                        "Connection to stratoshell bastion failed: " + err
                    );
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
                    this.taskConn.shell(process.env.TERM, {}, (err, stream) => {
                        if (err) throw err;
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
                    console.log(
                        "Connection to stratoshell task failed: " + err
                    );
                    reject(err);
                    return;
                });
        });
        return;
    }
}

exports.Connection = Connection;
