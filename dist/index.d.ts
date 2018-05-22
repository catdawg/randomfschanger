export declare enum RandomChange {
    Wait = "Wait",
    AddFile = "AddFile",
    DeleteFile = "DeleteFile",
    ChangeFile = "ChangeFile",
    AddDirectory = "AddDirectory",
    DeleteDirectory = "RemoveDirectory",
    GoIntoDirectory = "GoIntoDirectory",
    StepOutDirectory = "StepOutDirectory",
}
/**
 * Additional options for the randomizer
 */
export interface IRandomFSChangerOptions {
    /**
     * Specify a seed so you can reproduce a test.
     */
    seed?: number;
    /**
     * Specify a worker count - more means more changes
     */
    workerCount?: number;
}
/**
 * Run randomizer of directory. @see IRandomFSChangerOptions for additional options.
 * @param path the to randomize
 * @param durationInMS the duration
 * @param options the aditional options
 * @throws VError if path or duration are not specified, or if path doesn't exist
 */
export declare function runRandomFSChanger(path: string, durationInMS: number, options?: IRandomFSChangerOptions): Promise<void>;
