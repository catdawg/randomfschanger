import { fork, ChildProcess } from "child_process";
import * as pathutils from "path";

import { ISetupMessage, IStartMessage, IStopMessage } from "./messages";

export interface IRandomFSChangerOptions {
    /**
     * The seed (defaults to 0), use this to reliably repeat changes to the filesystem.
     */
    seed?: number;
    /**
     * The worker count (defaults to 4), use this to increase load.
     */
    workerCount?: number; // default 4

    /**
     * all logging messages go here, default just logs to console.
     */
    log?: (str: string) => void;
}

/**
 * RandomFSChanger functions as an interface to a separate process that changes a directory randomly.
 * Used to test systems that use data from the filesystem, specially those that listen to changes.
 */
export class RandomFSChanger {

    private stopCb: () => void;

    private childProcess: ChildProcess;

    /**
     * Build the random fs changer interface. Options are optional, and filled out with default data.
     * @param path the path to change
     * @param options the options (optional)
     */
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
                    if (options.log != null) {
                        options.log(msg.msg);
                    } else {
                        console.log("[randomfschanger]" + msg.msg);
                    }
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

    /**
     * Start changes, stop needs to be called afterwards.
     */
    public start() {
        this.childProcess.send({
            type: "Start",
        } as IStartMessage);
    }

    /**
     * Stop the changes, needs to wait for the changer to confirm that it finished.
     */
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
