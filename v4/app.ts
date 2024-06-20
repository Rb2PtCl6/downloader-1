import * as fs from 'node:fs';
import { spawn } from 'child_process';
import { Worker, isMainThread, parentPort } from 'worker_threads';

const additional_path = `${__dirname}/`;
const source2 = `${additional_path}source-2.txt`;

interface Episode {
    number: string;
    url: string;
}

interface Series {
    name: string;
    episodes: Episode[];
}

let storage: Series[] = [];

function get_data_from_source(): string[] {
    return fs.readFileSync(source2, 'utf-8').split('\r\n');
}

function is_valid_url(this_url: string): boolean {
    const res = this_url.match(/(http(s)?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/g);
    return res !== null;
}

function is_int(str: string): boolean {
    const num = Number(str);
    return !(str === "") && !isNaN(num) && num === Math.trunc(num);
}

const validator = {
    is_comment(str: string): boolean {
        return str.slice(0, 3) === "// ";
    },
    is_name(str: string): boolean {
        return str.slice(0, 2) === "n/";
    },
    is_number_and_url(str: string): boolean {
        const splitted = str.split(' ');
        return (splitted.length === 2) && is_int(splitted[0]) && is_valid_url(splitted[1]);
    }
};

function downloader(path: string, episode_name: string, url: string): void {
    if (!fs.existsSync(path)) {
        fs.mkdirSync(path)
    }
    const action = spawn("yt-dlp", ["-P", path, "-o", episode_name, url]);
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
        parentPort?.postMessage('done');
    });
}
function downloader2(path: string, episode_name: string, url: string): void {
    if (!fs.existsSync(path)) {
        fs.mkdirSync(path)
    }
    console.log(`yt-dlp -P ${path} -o ${episode_name} ${url}`)
    setTimeout(() => { parentPort?.postMessage('done'); }, 3000)
}

var can_work: boolean = false

for (const i of get_data_from_source()) {
    if (!validator.is_comment(i)) {
        if (validator.is_name(i)) {
            storage.push({ name: i.replace("n/", ""), episodes: [] });
            if (storage.length !== 0) can_work = true
        } else if (validator.is_number_and_url(i)) {
            const splitted = i.split(' ');
            if (!can_work || storage.length === 0) continue;
            storage[storage.length - 1].episodes.push({ number: splitted[0], url: splitted[1] });
        } else {
            can_work = false
        }
    }
}

storage = storage.filter(series => series.episodes.length > 0);

type taskStackType = { path: string, episode_name: string, url: string }

const taskStack: taskStackType[] = [];

for (const series of storage) {
    for (const episode of series.episodes) {
        taskStack.push({ path: `${additional_path}${series.name}`, episode_name: `${series.name}-${episode.number}.mp4`, url: episode.url });
    }
}

function workerFunction() {
    parentPort?.on('message', (task: taskStackType) => {
        if (task) {
            downloader(task.path, task.episode_name, task.url);
        }
    });
}

if (isMainThread) {
    const threadCount = 3;
    const threads: Worker[] = [];

    for (let i = 0; i < threadCount; i++) {
        const worker = new Worker(__filename);
        worker.on('message', (message) => {
            if (message === 'done') {
                const task = taskStack.shift();
                if (task) {
                    worker.postMessage(task);
                } else {
                    worker.terminate();
                }
            }
        });
        threads.push(worker);
    }

    for (const worker of threads) {
        const task = taskStack.shift();
        if (task) {
            worker.postMessage(task);
        } else {
            worker.terminate();
        }
    }
} else {
    workerFunction();
}
