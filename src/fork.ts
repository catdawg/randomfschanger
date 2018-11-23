import Chance from "chance";

import * as fse from "fs-extra";
import { Stats } from "fs-extra";
import * as pathutils from "path";
import * as util from "util";
import { ISetupMessage } from "./messages";

function log(msg: string, ...args: any[]) {
    const formattedMsg = util.format.apply(null, [msg, ...args]);
    process.send({type: "Log", msg: formattedMsg});
}

enum RandomChange {
    Wait = "Wait",
    AddFile = "AddFile",
    DeleteFile = "DeleteFile",
    ChangeFile = "ChangeFile",
    AddDirectory = "AddDirectory",
    DeleteDirectory = "RemoveDirectory",
    GoIntoDirectory = "GoIntoDirectory",
    StepOutDirectory = "StepOutDirectory",
}

const weightConfig: Map<RandomChange, number> = new Map();

weightConfig.set(RandomChange.Wait,              20);
weightConfig.set(RandomChange.AddFile,           4);
weightConfig.set(RandomChange.DeleteFile,        5);
weightConfig.set(RandomChange.ChangeFile,        20);
weightConfig.set(RandomChange.AddDirectory,      3);
weightConfig.set(RandomChange.DeleteDirectory,   4);
weightConfig.set(RandomChange.GoIntoDirectory,   20);
weightConfig.set(RandomChange.StepOutDirectory,  15);

const waitTicks = 500;
const waitTicksWriting = 50;

enum WorkerState {
    Idle = "Idle",
    ChangingFile = "ChangingFile",
    Waiting = "Waiting",
}

class Worker {
    private _name: string;
    private _chance: Chance.Chance;
    private _state: WorkerState;

    private _fdBeingChanged: number;
    private _ticksLeft: number;

    private _basePath: string;
    private _currentPath: string;

    constructor(name: string, path: string, seed: number) {
        this._chance = new Chance(seed);
        this._state = WorkerState.Idle;
        this._basePath = path;
        this._currentPath = this._basePath;
        this._name = name;
    }

    public async tick() {
        switch (this._state) {
            case WorkerState.Idle:
                await this._runFromIdle();
                break;
            case WorkerState.ChangingFile:
                const sentence = new Buffer(this._chance.word() + " ");
                await fse.write(this._fdBeingChanged, sentence, 0, sentence.length);

                this._ticksLeft -= 1;
                if (this._ticksLeft < 0) {
                    await fse.close(this._fdBeingChanged);
                    this._state = WorkerState.Idle;
                }
                break;
            case WorkerState.Waiting:
                this._ticksLeft -= 1;
                if (this._ticksLeft < 0) {
                    this._state = WorkerState.Idle;
                }
                break;
        }
    }

    public async forceIdle() {
        this._ticksLeft = 0;

        switch (this._state) {
            case WorkerState.Idle:
                break;
            case WorkerState.ChangingFile:
                await fse.close(this._fdBeingChanged);
                break;
            case WorkerState.Waiting:
                break;
        }

        this._state = WorkerState.Idle;
    }

    private async _runFromIdle() {

        const entries = await fse.readdir(this._currentPath);
        const directories = [];
        const files = [];

        const workerEntries = entries.filter((e) => e.startsWith(this._name + "_"));

        for (const entry of workerEntries) {
            try {
                const stat = await fse.stat(pathutils.join(this._currentPath, entry));
                if (stat.isDirectory()) {
                    directories.push(entry);
                } else {
                    files.push(entry);
                }
            } catch (e) {
                // Sometimes a file can be deleted and still returned on the next readdir due to a caching issue.
                // We can safely ignore that.
            }
        }

        const actions: RandomChange[] = [];
        const weights: number[] = [];

        actions.push(RandomChange.Wait);
        weights.push(weightConfig.get(RandomChange.Wait));

        actions.push(RandomChange.AddFile);
        weights.push(weightConfig.get(RandomChange.AddFile));
        actions.push(RandomChange.AddDirectory);
        weights.push(weightConfig.get(RandomChange.AddDirectory));

        if (this._basePath !== this._currentPath) {
            actions.push(RandomChange.StepOutDirectory);
            weights.push(weightConfig.get(RandomChange.StepOutDirectory));
        }

        if (directories.length > 0 ) {
            actions.push(RandomChange.DeleteDirectory);
            weights.push(weightConfig.get(RandomChange.DeleteDirectory));

            if (files.length > 0) {
                actions.push(RandomChange.GoIntoDirectory);
                weights.push(weightConfig.get(RandomChange.GoIntoDirectory));
            }
        }

        if (files.length > 0) {
            actions.push(RandomChange.ChangeFile);
            weights.push(weightConfig.get(RandomChange.ChangeFile));
            actions.push(RandomChange.DeleteFile);
            weights.push(weightConfig.get(RandomChange.DeleteFile));
        }

        const nextAction = this._chance.weighted(actions, weights);

        switch (nextAction) {
            case RandomChange.AddDirectory: {
                let newDirectoryPath = pathutils.join(this._currentPath, this._name + "_" + this._chance.d8());
                while (true) {

                    try {
                        await fse.access(newDirectoryPath);
                    } catch (e) {
                        break; // it's not there.
                    }
                    newDirectoryPath += "" + this._chance.d8();
                }
                log("%s creating directory %s",
                    this._name,
                    newDirectoryPath.substr(this._basePath.length));
                await fse.mkdir(newDirectoryPath);
                break;
            }
            case RandomChange.AddFile: {
                let newFilePath = pathutils.join(this._currentPath, this._name + "_" + this._chance.d8());
                while (true) {

                    try {
                        await fse.access(newFilePath);
                    } catch (e) {
                        break; // it's not there.
                    }
                    newFilePath += "" + this._chance.d8();
                }
                log("%s creating file %s", this._name, newFilePath.substr(this._basePath.length));
                await fse.writeFile(newFilePath, this._chance.sentence);
                break;
            }
            case RandomChange.ChangeFile: {
                const file = pathutils.join(this._currentPath, files[0]);
                log("%s changing file %s", this._name, file.substr(this._basePath.length));
                this._state = WorkerState.ChangingFile;
                this._fdBeingChanged = await fse.open(file, "w");
                this._ticksLeft = waitTicksWriting;
                break;
            }
            case RandomChange.DeleteDirectory: {
                const dir = pathutils.join(this._currentPath, directories[0]);
                log("%s deleting directory %s", this._name, dir.substr(this._basePath.length));
                await fse.remove(dir);
                break;
            }
            case RandomChange.DeleteFile: {
                const file = pathutils.join(this._currentPath, files[0]);
                log("%s deleting file %s", this._name, file.substr(this._basePath.length));
                await fse.remove(file);
                break;
            }
            case RandomChange.GoIntoDirectory: {
                this._currentPath = pathutils.join(this._currentPath, directories[0]);
                log("%s going into %s", this._name, this._currentPath.substr(this._basePath.length));
                break;
            }
            case RandomChange.StepOutDirectory: {
                const tokens = this._currentPath.split(pathutils.sep);
                tokens.pop();
                log("%s stepping out of %s",
                    this._name, this._currentPath.substr(this._basePath.length));
                this._currentPath = tokens.join(pathutils.sep);
                break;
            }
            case RandomChange.Wait: {
                this._ticksLeft = waitTicks;
                this._state = WorkerState.Waiting;
                break;
            }
        }
    }
}

let setupMessage: ISetupMessage = null;
let stop: boolean = false;
let running: boolean = false;
async function runRandomFSChanger() {
    running = true;
    let pathStat: Stats = null;
    try {
        pathStat = await fse.stat(setupMessage.path);
    } catch (e) {
        running = false;
        log("Error: %s - could not find path", e);
        return;
    }

    if (!pathStat.isDirectory()) {
        running = false;
        log("Error: path isn't a directory");
        return;
    }

    const workers: Worker[] = [];
    for (let i = 0; i < setupMessage.workerCount; ++i) {
        workers.push(new Worker("worker" + i, setupMessage.path, setupMessage.seed + i));
    }
    while (!stop) {
        await Promise.all(workers.map((w) => w.tick()));

        await new Promise((resolve) => {
            setTimeout(resolve, 1);
        });
    }

    for (const worker of workers) {
        await worker.forceIdle();
    }

    running = false;
    process.send({type: "Stopped"});
}

process.on("message", (msg) => {
    if (msg.type == null) {
        return;
    }

    log("received message %s", msg.type);
    if (msg.type === "Setup") {
        if (running) {
            return;
        }

        if (msg.seed == null) {
            msg.seed = Math.random();
        }

        if (msg.workerCount == null) {
            msg.workerCount = 4;
        }

        setupMessage = msg;

        return;
    }

    if (msg.type === "Stop") {
        stop = true;
        return;
    }

    if (msg.type === "Start") {
        if (setupMessage == null) {
            return;
        }

        if (running) {
            return;
        }

        stop = false;
        runRandomFSChanger();
    }
});
