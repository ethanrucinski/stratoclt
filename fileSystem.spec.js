const { FileSystem } = require("./fileSystem.js");

describe("Test files finished syncing", () => {
    it("Finish sync", async () => {
        jest.setTimeout(10000);
        let fs;
        let result = await new Promise((resolve) => {
            const callback = () => {
                console.log("Sync done!");
                resolve(true);
            };

            const connection = {
                fastPut: (_, __, callback) => {
                    if (callback) callback();
                },
                unlink: (_, callback) => {
                    if (callback) callback();
                },
                mkdir: (_, callback) => {
                    if (callback) callback();
                },
                rmdir: (_, callback) => {
                    if (callback) callback();
                },
            };

            fs = new FileSystem("./", "./", connection, callback);
        });
        fs.end();
        expect(result).toEqual(true);
    });
});