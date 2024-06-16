"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("node:fs"));
const child_process_1 = require("child_process");
const worker_threads_1 = require("worker_threads");
const additional_path = `${__dirname}/`;
const source2 = `${additional_path}source-2.txt`;
let storage = [];
function get_data_from_source() {
    return fs.readFileSync(source2, 'utf-8').split('\r\n');
}
function is_valid_url(this_url) {
    const res = this_url.match(/(http(s)?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/g);
    return res !== null;
}
function is_int(str) {
    const num = Number(str);
    if (str === "")
        return false;
    return !isNaN(num) && num === Math.trunc(num);
}
function deepFreeze(object) {
    const propNames = Reflect.ownKeys(object);
    for (const name of propNames) {
        const value = object[name];
        if ((value && typeof value === "object") || typeof value === "function") {
            deepFreeze(value);
        }
    }
    return Object.freeze(object);
}
const validator = {
    check_for_comment(str) {
        return str.slice(0, 3) === "// ";
    },
    check_for_name(str) {
        return str.slice(0, 2) === "n/";
    },
    check_for_number_and_url(str) {
        const splitted = str.split(' ');
        if (splitted.length !== 2) {
            return false;
        }
        else {
            return is_int(splitted[0]) && is_valid_url(splitted[1]);
        }
    }
};
deepFreeze(validator);
/*const validator2 = {
    check_for_comment(str) {
        var regex = new RegExp(/\/\/ .{1,}/g);
        return regex.test(str);
    },
    check_for_name(str) {
        var regex = new RegExp(/n\/.{1,}/g);
        return regex.test(str);
    },
    check_for_number_and_url(str) {
        var regex = new RegExp(/[0-9]{1,} (http(s)?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/g);
        return regex.test(str);
    }
};*/
function downloader(path, episode_name, url) {
    if (!fs.existsSync(path)) {
        fs.mkdirSync(path, { recursive: true });
    }
    const action = (0, child_process_1.spawn)("yt-dlp", ["-P", path, "-o", episode_name, url]);
    action.stdout.on("data", data => {
        console.log(`stdout: ${data}`);
    });
    action.stderr.on("data", data => {
        console.log(`stderr: ${data}`);
    });
    action.on('error', (error) => {
        console.log(`error: ${error.message}`);
    });
    action.on("close", code => {
        console.log(`child process exited with code ${code}`);
        worker_threads_1.parentPort === null || worker_threads_1.parentPort === void 0 ? void 0 : worker_threads_1.parentPort.postMessage('done');
    });
}
function downloader2(path, episode_name, url) {
    if (!fs.existsSync(path)) {
        fs.mkdirSync(path, { recursive: true });
    }
    console.log(`yt-dlp -P ${path} -o ${episode_name} ${url}`);
    setTimeout(() => { worker_threads_1.parentPort === null || worker_threads_1.parentPort === void 0 ? void 0 : worker_threads_1.parentPort.postMessage('done'); }, 3000);
}
var can_work = false;
for (const i of get_data_from_source()) {
    if (!validator.check_for_comment(i)) {
        if (validator.check_for_name(i)) {
            storage.push({ name: i.replace("n/", ""), episodes: [] });
            if (storage.length !== 0)
                can_work = true;
        }
        else if (validator.check_for_number_and_url(i)) {
            const splitted = i.split(' ');
            if (!can_work || storage.length === 0)
                continue;
            storage[storage.length - 1].episodes.push({ number: splitted[0], url: splitted[1] });
        }
        else {
            can_work = false;
        }
    }
}
storage = storage.filter(series => series.episodes.length > 0);
const taskStack = [];
for (const series of storage) {
    for (const episode of series.episodes) {
        taskStack.push({ path: `${additional_path}${series.name}`, episode_name: `${series.name}-${episode.number}.mp4`, url: episode.url });
    }
}
function workerFunction() {
    worker_threads_1.parentPort === null || worker_threads_1.parentPort === void 0 ? void 0 : worker_threads_1.parentPort.on('message', (task) => {
        if (task) {
            downloader(task.path, task.episode_name, task.url);
            //parentPort?.postMessage('done');
        }
    });
}
if (worker_threads_1.isMainThread) {
    const threadCount = 3;
    const threads = [];
    for (let i = 0; i < threadCount; i++) {
        const worker = new worker_threads_1.Worker(__filename);
        worker.on('message', (message) => {
            if (message === 'done') {
                const task = taskStack.pop();
                if (task) {
                    worker.postMessage(task);
                }
                else {
                    worker.terminate();
                }
            }
        });
        threads.push(worker);
    }
    for (const worker of threads) {
        const task = taskStack.pop();
        if (task) {
            worker.postMessage(task);
        }
    }
}
else {
    workerFunction();
}
//# sourceMappingURL=app.js.map