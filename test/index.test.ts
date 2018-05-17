// tslint:disable:no-unused-expression
import * as chai from "chai";
const expect = chai.expect;

import * as pathutils from "path";
import * as tmp from "tmp";
import { VError } from "verror";
import * as fse from "fs-extra";

import { runRandomFSChanger } from "../src/index";

describe("randomFSChanger", () => {

    let tmpDir = null;
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
        await runRandomFSChanger(tmpDir.name, 50000);
    }, 600000);

    it("test with seed", async () => {
        await runRandomFSChanger(tmpDir.name, 50000, {seed: 9999});
    }, 600000);

    it("test with worker count", async () => {
        await runRandomFSChanger(tmpDir.name, 50000, {workerCount: 10});
    }, 600000);

    it("test args", async () => {
        let except = null;
        try {
            await runRandomFSChanger(null, null);
        } catch (e) {
            except = e;
        }

        expect(except).to.be.instanceof(VError);
        
        except = null;
        try {
            await runRandomFSChanger("something", null);
        } catch (e) {
            except = e;
        }

        expect(except).to.be.instanceof(VError);
        
        except = null;
        try {
            await runRandomFSChanger(tmpDir.name, null);
        } catch (e) {
            except = e;
        }

        expect(except).to.be.instanceof(VError);
        
        except = null;
        try {
            await runRandomFSChanger("something", 1000);
        } catch (e) {
            except = e;
        }

        expect(except).to.be.instanceof(VError);
        
        const file = pathutils.join(tmpDir.name, "afile");
        await fse.writeFile(file, "someting");
        except = null;
        try {
            await runRandomFSChanger(file, 1000);
        } catch (e) {
            except = e;
        }

        expect(except).to.be.instanceof(VError);
        
        except = null;
        try {
            await runRandomFSChanger(null, 1000);
        } catch (e) {
            except = e;
        }

        expect(except).to.be.instanceof(VError);
    }, 600000);
});
