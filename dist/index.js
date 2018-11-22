"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const pathutils = __importStar(require("path"));
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
winston.add(new winston.transports.Console({
    stderrLevels: ["debug", "error", "info", "warn"],
    level: "debug",
    format: winston.format.combine(winston.format.splat(), winston.format.colorize(), winston.format.padLevels(), winston.format.timestamp(), winston.format.printf((info) => `${info.timestamp} ${info.level}: ${info.message}`)),
    silent: false,
}));
class RandomFSChanger {
    constructor(path, options = {}) {
        this.childProcess = child_process_1.fork(pathutils.join(__dirname, "..", "dist", "fork.js"));
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
        const setupMessage = {
            type: "Setup",
            path,
            seed: options.seed,
            workerCount: options.workerCount,
        };
        this.childProcess.send(setupMessage);
    }
    start() {
        this.childProcess.send({
            type: "Start",
        });
    }
    stop() {
        return __awaiter(this, void 0, void 0, function* () {
            this.childProcess.send({
                type: "Stop",
            });
            yield new Promise((resolve, reject) => {
                this.stopCb = resolve;
            });
            this.childProcess.kill();
        });
    }
}
exports.RandomFSChanger = RandomFSChanger;
//# sourceMappingURL=index.js.map