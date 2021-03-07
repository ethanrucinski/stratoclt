const YAML = require("yaml");
const fs = require("fs");

class Config {
    constructor(fileName) {
        // Handle default file names
        let configFileContent;
        if (!fileName) {
            try {
                this.configFilePath = "strato.yaml";
                configFileContent = fs.readFileSync(`./strato.yaml`, "utf8");
            } catch {
                // Try yml extension
                try {
                    this.configFilePath = "strato.yml";
                    configFileContent = fs.readFileSync(`./strato.yml`, "utf8");
                } catch {
                    throw "Couldn't find task configuration file!";
                }
            }
        } else {
            this.configFilePath = fileName;
            configFileContent = fs.readFileSync(`./${fileName}`, "utf8");
        }
        // Get the config options
        this.configOptions = YAML.parse(configFileContent);
    }

    getTaskConfig() {
        return this.configOptions.Stratoshell.Task;
    }

    getPortMappings() {
        return this.configOptions.Stratoshell.Connection.Ports;
    }

    getPreSyncCommands() {
        return this.configOptions.Stratoshell.PreSyncCommands;
    }

    getPostSyncCommands() {
        return this.configOptions.Stratoshell.PostSyncCommands;
    }
}

exports.Config = Config;
