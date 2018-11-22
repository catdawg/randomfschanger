import { fork, ChildProcess } from "child_process";
import * as pathutils from "path";

import { ISetupMessage, IStartMessage, IStopMessage } from "./messages";

import * as winston from "winston";

winston.addColors({
    debug: "blue",
    error: "red",
    info: "green",
    silly: "magenta",
    verbose: "cyan",
    warn: "yellow",
});

winston.remove(winston.transports.Console);
winston.add(new winston.transports.Console({
    stderrLevels: ["debug", "error", "info", "warn"],
    level: "debug",
    format: winston.format.combine(
        winston.format.splat(),
        winston.format.colorize(),
        winston.format.padLevels(),
        winston.format.timestamp(),
        winston.format.printf((info) => `${info.timestamp} ${info.level}: ${info.message}`),
    ),
    silent: false,
}));

export interface IRandomFSChangerOptions {
    seed?: number; // default 0
    workerCount?: number; // default 4
}

export class RandomFSChanger {

    private stopCb: () => void;

    private childProcess: ChildProcess;

    constructor(path: string, options: IRandomFSChangerOptions = {}) {

        this.childProcess = fork(pathutils.join(__dirname, "..", "dist", "fork.js"));

        this.childProcess.on("message", (msg) => {
            if (msg != null && msg.type != null) {
                
                if (msg.type === "Stopped") {
                    if (this.stopCb != null) {
                        this.stopCb();
                    }
                }

                if (msg.type == "Log") {
                    winston.info("[randomfschanger]%s", msg.msg);
                }
            }
            
        });
        const setupMessage: ISetupMessage = {
            type: "Setup",
            path,
            seed: options.seed,
            workerCount: options.workerCount,
        };

        this.childProcess.send(setupMessage);
    }

    public start() {
        this.childProcess.send({
            type: "Start",
        } as IStartMessage);
    }

    public async stop() {
        this.childProcess.send({
            type: "Stop",
        } as IStopMessage);

        await new Promise((resolve, reject) => {
            this.stopCb = resolve;
        });

        this.childProcess.kill();
    }
}
