import * as http from "http";
import { AtCoderProblem } from "../atcoder";
import { t } from "./i18n";

export interface CphTestCase {
    input: string;
    output: string;
    id: number;
}

export interface CphProblem {
    name: string;
    url: string;
    interactive: boolean;
    memoryLimit: number;
    timeLimit: number;
    group: string;
    tests: CphTestCase[];
    srcPath: string;
    local: boolean;
}

export class CphNotRunningError extends Error {
    constructor() {
        super(t("cph.notRunning"));
        this.name = "CphNotRunningError";
    }
}

export function buildCphProblem(problem: AtCoderProblem): CphProblem {
    const tests = problem.samples.map((sample, index) => ({
        input: sample.input,
        output: sample.output,
        id: index + 1,
    }));
    return {
        name: problem.title,
        url: problem.url,
        interactive: false,
        memoryLimit: (problem.memoryLimit ?? 1024) * 1024 * 1024,
        timeLimit: problem.timeLimit ?? 2000,
        group: `AtCoder - ${problem.contest}`,
        tests,
        srcPath: "",
        local: false,
    };
}

export function sendToCph(problem: CphProblem): Promise<void> {
    const body = JSON.stringify(problem);
    return new Promise<void>((resolve, reject) => {
        const req = http.request(
            "http://localhost:27121",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Content-Length": Buffer.byteLength(body),
                },
            },
            (res) => {
                res.resume();
                res.on("end", () => {
                    if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                        resolve();
                    } else {
                        reject(new Error(t("cph.httpError", { status: res.statusCode })));
                    }
                });
            }
        );
        req.on("error", (err) => {
            if ((err as NodeJS.ErrnoException).code === "ECONNREFUSED") {
                reject(new CphNotRunningError());
            } else {
                reject(new Error(t("cph.connectionFailed", { msg: err.message })));
            }
        });
        req.write(body);
        req.end();
    });
}
