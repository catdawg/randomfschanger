export interface IRandomFSChangerOptions {
    /**
     * The seed (defaults to 0), use this to reliably repeat changes to the filesystem.
     */
    seed?: number;
    /**
     * The worker count (defaults to 4), use this to increase load.
     */
    workerCount?: number;
}
/**
 * RandomFSChanger functions as an interface to a separate process that changes a directory randomly.
 * Used to test systems that use data from the filesystem, specially those that listen to changes.
 */
export declare class RandomFSChanger {
    private stopCb;
    private childProcess;
    /**
     * Build the random fs changer interface. Options are optional, and filled out with default data.
     * @param path the path to change
     * @param options the options (optional)
     */
    constructor(path: string, options?: IRandomFSChangerOptions);
    /**
     * Start changes, stop needs to be called afterwards.
     */
    start(): void;
    /**
     * Stop the changes, needs to wait for the changer to confirm that it finished.
     */
    stop(): Promise<void>;
}
