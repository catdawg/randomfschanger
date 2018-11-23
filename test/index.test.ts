// tslint:disable:no-unused-expression
import * as chai from "chai";
const expect = chai.expect;

import * as pathutils from "path";
import * as tmp from "tmp";
import * as fse from "fs-extra";
import { RandomFSChanger } from "../src";


describe("randomFSChanger", () => {

    let tmpDir: tmp.SynchrounousResult = null;
    beforeAll(() => {
        tmpDir = tmp.dirSync();
    });

    afterEach(async () => {
        const files = await fse.readdir(tmpDir.name);
        for (const file of files) {
            const fullPath = pathutils.join(tmpDir.name, file);
            await fse.remove(fullPath);
        }
    });

    afterAll( async () => {
        await fse.remove(tmpDir.name);
    });

    it("test", async () => {
        const randomfschanger = new RandomFSChanger(tmpDir.name);
        
        randomfschanger.start();

        await new Promise((resolve, reject) => {
            setTimeout(resolve, 50000)
        });

        await randomfschanger.stop();
    }, 6000000);

    it("test with seed", async () => {
        const randomfschanger = new RandomFSChanger(tmpDir.name, {seed:9999});
        
        randomfschanger.start();

        await new Promise((resolve, reject) => {
            setTimeout(resolve, 50000)
        });

        await randomfschanger.stop();
    }, 600000);

    it("test with worker count", async () => {
        const randomfschanger = new RandomFSChanger(tmpDir.name, {workerCount: 4});
        
        randomfschanger.start();

        await new Promise((resolve, reject) => {
            setTimeout(resolve, 50000)
        });

        await randomfschanger.stop();
    }, 600000);

    it("test with log", async () => {
        const randomfschanger = new RandomFSChanger(tmpDir.name, {log: (msg) => console.log("[prefix]" + msg)});
        
        randomfschanger.start();

        await new Promise((resolve, reject) => {
            setTimeout(resolve, 50000)
        });

        await randomfschanger.stop();
    }, 600000);
});
