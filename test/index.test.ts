// tslint:disable:no-unused-expression
import * as chai from "chai";
const expect = chai.expect;

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
    });

    afterAll(async () => {
        await fse.remove(tmpDir.name);
    });

    it("test parameters", () => {
        runRandomFSChanger();
    });
});
