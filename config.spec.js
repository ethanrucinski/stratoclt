const { Config } = require("./config.js");

describe("Test configuration reading", () => {
    it("Test image configuration", () => {
        let config = new Config();

        expect(config.getTaskConfig().Cpu).toEqual(256);
        let ports = config.getPortMappings();
        expect(ports.length).toEqual(1);
        expect(config.getPostSyncCommands().length).toEqual(1);
    });
});
