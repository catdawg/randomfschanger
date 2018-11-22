"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const chance_1 = __importDefault(require("chance"));
const fse = __importStar(require("fs-extra"));
const pathutils = __importStar(require("path"));
const util = __importStar(require("util"));
function log(msg, ...args) {
    const formattedMsg = util.format.apply(null, [msg, ...args]);
    process.send({ type: "Log", msg: formattedMsg });
}
var RandomChange;
(function (RandomChange) {
    RandomChange["Wait"] = "Wait";
    RandomChange["AddFile"] = "AddFile";
    RandomChange["DeleteFile"] = "DeleteFile";
    RandomChange["ChangeFile"] = "ChangeFile";
    RandomChange["AddDirectory"] = "AddDirectory";
    RandomChange["DeleteDirectory"] = "RemoveDirectory";
    RandomChange["GoIntoDirectory"] = "GoIntoDirectory";
    RandomChange["StepOutDirectory"] = "StepOutDirectory";
})(RandomChange || (RandomChange = {}));
const weightConfig = new Map();
weightConfig.set(RandomChange.Wait, 20);
weightConfig.set(RandomChange.AddFile, 4);
weightConfig.set(RandomChange.DeleteFile, 5);
weightConfig.set(RandomChange.ChangeFile, 20);
weightConfig.set(RandomChange.AddDirectory, 3);
weightConfig.set(RandomChange.DeleteDirectory, 4);
weightConfig.set(RandomChange.GoIntoDirectory, 20);
weightConfig.set(RandomChange.StepOutDirectory, 15);
const waitTicks = 500;
const waitTicksWriting = 50;
var WorkerState;
(function (WorkerState) {
    WorkerState["Idle"] = "Idle";
    WorkerState["ChangingFile"] = "ChangingFile";
    WorkerState["Waiting"] = "Waiting";
})(WorkerState || (WorkerState = {}));
class Worker {
    constructor(name, path, seed) {
        this._chance = new chance_1.default(seed);
        this._state = WorkerState.Idle;
        this._basePath = path;
        this._currentPath = this._basePath;
        this._name = name;
    }
    tick() {
        return __awaiter(this, void 0, void 0, function* () {
            switch (this._state) {
                case WorkerState.Idle:
                    yield this._runFromIdle();
                    break;
                case WorkerState.ChangingFile:
                    const sentence = new Buffer(this._chance.word() + " ");
                    yield fse.write(this._fdBeingChanged, sentence, 0, sentence.length);
                    this._ticksLeft -= 1;
                    if (this._ticksLeft < 0) {
                        yield fse.close(this._fdBeingChanged);
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
        });
    }
    forceIdle() {
        return __awaiter(this, void 0, void 0, function* () {
            this._ticksLeft = 0;
            switch (this._state) {
                case WorkerState.Idle:
                    break;
                case WorkerState.ChangingFile:
                    yield fse.close(this._fdBeingChanged);
                    break;
                case WorkerState.Waiting:
                    break;
            }
            this._state = WorkerState.Idle;
        });
    }
    _runFromIdle() {
        return __awaiter(this, void 0, void 0, function* () {
            const entries = yield fse.readdir(this._currentPath);
            const directories = [];
            const files = [];
            const workerEntries = entries.filter((e) => e.startsWith(this._name + "_"));
            for (const entry of workerEntries) {
                try {
                    const stat = yield fse.stat(pathutils.join(this._currentPath, entry));
                    if (stat.isDirectory()) {
                        directories.push(entry);
                    }
                    else {
                        files.push(entry);
                    }
                }
                catch (e) {
                    // Sometimes a file can be deleted and still returned on the next readdir due to a caching issue.
                    // We can safely ignore that.
                }
            }
            const actions = [];
            const weights = [];
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
            if (directories.length > 0) {
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
                            yield fse.access(newDirectoryPath);
                        }
                        catch (e) {
                            break; // it's not there.
                        }
                        newDirectoryPath += "" + this._chance.d8();
                    }
                    log("%s creating directory %s", this._name, newDirectoryPath.substr(this._basePath.length));
                    yield fse.mkdir(newDirectoryPath);
                    break;
                }
                case RandomChange.AddFile: {
                    let newFilePath = pathutils.join(this._currentPath, this._name + "_" + this._chance.d8());
                    while (true) {
                        try {
                            yield fse.access(newFilePath);
                        }
                        catch (e) {
                            break; // it's not there.
                        }
                        newFilePath += "" + this._chance.d8();
                    }
                    log("%s creating file %s", this._name, newFilePath.substr(this._basePath.length));
                    yield fse.writeFile(newFilePath, this._chance.sentence);
                    break;
                }
                case RandomChange.ChangeFile: {
                    const file = pathutils.join(this._currentPath, files[0]);
                    log("%s changing file %s", this._name, file.substr(this._basePath.length));
                    this._state = WorkerState.ChangingFile;
                    this._fdBeingChanged = yield fse.open(file, "w");
                    this._ticksLeft = waitTicksWriting;
                    break;
                }
                case RandomChange.DeleteDirectory: {
                    const dir = pathutils.join(this._currentPath, directories[0]);
                    log("%s deleting directory %s", this._name, dir.substr(this._basePath.length));
                    yield fse.remove(dir);
                    break;
                }
                case RandomChange.DeleteFile: {
                    const file = pathutils.join(this._currentPath, files[0]);
                    log("%s deleting file %s", this._name, file.substr(this._basePath.length));
                    yield fse.remove(file);
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
                    log("%s stepping out of %s", this._name, this._currentPath.substr(this._basePath.length));
                    this._currentPath = tokens.join(pathutils.sep);
                    break;
                }
                case RandomChange.Wait: {
                    this._ticksLeft = waitTicks;
                    this._state = WorkerState.Waiting;
                    break;
                }
            }
        });
    }
}
let setupMessage = null;
let stop = false;
let running = false;
function runRandomFSChanger() {
    return __awaiter(this, void 0, void 0, function* () {
        running = true;
        let pathStat = null;
        try {
            pathStat = yield fse.stat(setupMessage.path);
        }
        catch (e) {
            running = false;
            log("Error: %s - could not find path", e);
            return;
        }
        if (!pathStat.isDirectory()) {
            running = false;
            log("Error: path isn't a directory");
            return;
        }
        const workers = [];
        for (let i = 0; i < setupMessage.workerCount; ++i) {
            workers.push(new Worker("worker" + i, setupMessage.path, setupMessage.seed + i));
        }
        while (!stop) {
            yield Promise.all(workers.map((w) => w.tick()));
            yield new Promise((resolve) => {
                setTimeout(resolve, 1);
            });
        }
        for (const worker of workers) {
            yield worker.forceIdle();
        }
        running = false;
        process.send({ type: "Stopped" });
    });
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
//# sourceMappingURL=fork.js.map