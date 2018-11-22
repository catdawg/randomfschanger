export interface ISetupMessage {
    type: "Setup";
    path: string;
    seed?: number;
    workerCount?: number;
}
export interface IStartMessage {
    type: "Start";
}
export interface IStopMessage {
    type: "Stop";
}
export interface IStoppedMessage {
    type: "Stopped";
}
export interface ILogMessage {
    type: "Log";
    msg: string;
}
