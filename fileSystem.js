const chokidar = require("chokidar");

class FileSystem {
    constructor(localRootPath, destinationRootPath, connection, readyCallback) {
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
        this.startup = true;
        this.readyCallback = readyCallback;
        this.changeCount = 0;
    }

    listener(event, path) {
        if (!path || path == "./") {
            return;
        }
        switch (event) {
            case "add":
                this.addChange();
                this.addFile(path);
                break;
            case "change":
                this.addFile(path);
                break;
            case "addDir":
                this.addChange();
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

    addChange() {
        if (this.startup) {
            this.changeCount++;
        }
    }

    removeChange() {
        if (this.startup) {
            this.changeCount--;
            if (this.changeCount == 0) {
                this.startup = false;
                this.readyCallback();
            }
        }
    }

    addFile(path) {
        this.connection.fastPut(
            `${this.localRoot}/${path}`,
            `${this.destinationRoot}${path}`,
            () => {
                this.removeChange();
            }
        );
    }

    deleteFile(path) {
        this.connection.unlink(`${this.destinationRoot}${path}`);
    }

    addDirectory(path) {
        this.connection.mkdir(`${this.destinationRoot}${path}`, () => {
            this.removeChange();
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
