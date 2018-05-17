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
}
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
}
Object.defineProperty(exports, "__esModule", { value: true });
const chance_1 = __importDefault(require("chance"));
const fse = __importStar(require("fs-extra"));
const pathutils = __importStar(require("path"));
const verror_1 = require("verror");
const winston = __importStar(require("winston"));
winston.addColors({
    debug: "blue",
    error: "red",
    info: "green",
    silly: "magenta",
    verbose: "cyan",
    warn: "yellow",
});
winston.remove(winston.transports.Console);
winston.add(winston.transports.Console, {
    colorize: true,
    level: "debug",
    prettyPrint: true,
    silent: false,
    timestamp: false,
});
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
})(RandomChange = exports.RandomChange || (exports.RandomChange = {}));
const weightConfig = new Map();
weightConfig.set(RandomChange.Wait, 70);
weightConfig.set(RandomChange.AddFile, 3);
weightConfig.set(RandomChange.DeleteFile, 3);
weightConfig.set(RandomChange.ChangeFile, 50);
weightConfig.set(RandomChange.AddDirectory, 1);
weightConfig.set(RandomChange.DeleteDirectory, 1);
weightConfig.set(RandomChange.GoIntoDirectory, 40);
weightConfig.set(RandomChange.StepOutDirectory, 5);
const waitTicks = 50000;
const waitTicksWriting = 5000;
function fillOptionsWithDefault(options) {
    if (options == null) {
        options = {};
    }
    if (options.seed == null)
        options.seed = Math.random();
    if (options.workerCount == null)
        options.workerCount = 4;
    return options;
}
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
    _runFromIdle() {
        return __awaiter(this, void 0, void 0, function* () {
            const entries = yield fse.readdir(this._currentPath);
            const directories = [];
            const files = [];
            const workerEntries = entries.filter((e) => e.startsWith(this._name + "_"));
            for (const entry of workerEntries) {
                const stat = yield fse.stat(pathutils.join(this._currentPath, entry));
                if (stat.isDirectory()) {
                    directories.push(entry);
                }
                else {
                    files.push(entry);
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
            if (this._basePath != this._currentPath) {
                actions.push(RandomChange.StepOutDirectory);
                weights.push(weightConfig.get(RandomChange.StepOutDirectory));
            }
            if (directories.length > 0) {
                actions.push(RandomChange.DeleteDirectory);
                weights.push(weightConfig.get(RandomChange.DeleteDirectory));
                actions.push(RandomChange.GoIntoDirectory);
                weights.push(weightConfig.get(RandomChange.GoIntoDirectory));
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
                    const newDirectoryPath = pathutils.join(this._currentPath, this._name + "_" + this._chance.guid());
                    winston.log("info", "%s creating directory %s", this._name, newDirectoryPath.substr(this._basePath.length));
                    yield fse.mkdir(newDirectoryPath);
                    break;
                }
                case RandomChange.AddFile: {
                    const newFilePath = pathutils.join(this._currentPath, this._name + "_" + this._chance.guid());
                    winston.log("info", "%s creating file %s", this._name, newFilePath.substr(this._basePath.length));
                    yield fse.writeFile(newFilePath, this._chance.sentence);
                    break;
                }
                case RandomChange.ChangeFile: {
                    const file = pathutils.join(this._currentPath, files[0]);
                    winston.log("info", "%s changing file %s", this._name, file.substr(this._basePath.length));
                    this._state = WorkerState.ChangingFile;
                    this._fdBeingChanged = yield fse.open(file, "w");
                    this._ticksLeft = waitTicksWriting;
                    break;
                }
                case RandomChange.DeleteDirectory: {
                    const dir = pathutils.join(this._currentPath, directories[0]);
                    winston.log("info", "%s deleting directory %s", this._name, dir.substr(this._basePath.length));
                    yield fse.remove(dir);
                    break;
                }
                case RandomChange.DeleteFile: {
                    const file = pathutils.join(this._currentPath, files[0]);
                    winston.log("info", "%s deleting file %s", this._name, file.substr(this._basePath.length));
                    yield fse.remove(file);
                    break;
                }
                case RandomChange.GoIntoDirectory: {
                    this._currentPath = pathutils.join(this._currentPath, directories[0]);
                    winston.log("info", "%s going into %s", this._name, this._currentPath.substr(this._basePath.length));
                    break;
                }
                case RandomChange.StepOutDirectory: {
                    const tokens = this._currentPath.split(pathutils.sep);
                    tokens.pop();
                    winston.log("info", "%s stepping out of %s", this._name, this._currentPath.substr(this._basePath.length));
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
/**
 * Run randomizer of directory. @see IRandomFSChangerOptions for additional options.
 * @param path the to randomize
 * @param durationInMS the duration
 * @param options the aditional options
 */
function runRandomFSChanger(path, durationInMS, options = null) {
    return __awaiter(this, void 0, void 0, function* () {
        if (path == null) {
            throw new verror_1.VError("path argument can't be null");
        }
        if (durationInMS == null) {
            throw new verror_1.VError("durationInMS argument can't be null");
        }
        options = fillOptionsWithDefault(options);
        const startTime = Date.now();
        const chance = new chance_1.default(options.seed);
        const workers = [];
        for (let i = 0; i < options.workerCount; ++i) {
            workers.push(new Worker("worker" + i, path, chance.integer()));
        }
        while (Date.now() - startTime < durationInMS) {
            yield Promise.all(workers.map((w) => w.tick()));
        }
    });
}
exports.runRandomFSChanger = runRandomFSChanger;
//# sourceMappingURL=index.js.map