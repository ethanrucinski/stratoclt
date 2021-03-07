const chokidar = require("chokidar");

class FileSystem {
    constructor(localRootPath, destinationRootPath, connection) {
        this.localRoot = localRootPath;
        this.destinationRoot = destinationRootPath;
        this.connection = connection;
        this.watcher = chokidar
            .watch("", {
                ignored: [
                    "node_modules",
                    ".git",
                    "stratoclt-*",
                    ".gitignore",
                    "*/node_modules",
                ],
                cwd: this.localRoot,
            })
            .on("all", (event, path) => {
                this.listener(event, path);
            });
    }

    listener(event, path) {
        if (!path || path == "./") {
            return;
        }
        switch (event) {
            case "add":
                this.addFile(path);
                break;
            case "change":
                this.addFile(path);
                break;
            case "addDir":
                this.addDirectory(path);
                break;
            case "unlink":
                this.deleteFile(path);
                break;
            case "unlinkDir":
                this.deleteDirectory(path);
                break;
            default:
                // Unknown option
                break;
        }
    }

    addFile(path) {
        this.connection.fastPut(
            `${this.localRoot}/${path}`,
            `${this.destinationRoot}${path}`,
            (err) => {
                if (err) {
                    //console.log("Couldn't add " + path);
                }
            }
        );
    }

    deleteFile(path) {
        this.connection.unlink(`${this.destinationRoot}${path}`);
    }

    addDirectory(path) {
        this.connection.mkdir(`${this.destinationRoot}${path}`, (err) => {
            if (err && err.code != 4) {
                //console.log("Couldn't add directory " + path);
            }
        });
    }

    deleteDirectory(path) {
        this.connection.rmdir(`${this.destinationRoot}${path}`);
    }

    end() {
        this.watcher.close();
    }
}

exports.FileSystem = FileSystem;
