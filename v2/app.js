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
const additional_path = `${__dirname}/`;
const source2 = `${additional_path}source-2.txt`;
var storage = {};
var latest_name = undefined;
function get_data_from_source() {
    return (fs.readFileSync(source2, 'utf-8')).split('\r\n');
}
function is_valid_url(this_url) {
    var res = this_url.match(/(http(s)?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/g);
    return (res !== null);
}
function is_int(str) {
    var num = Number(str);
    if (isNaN(num)) {
        return false;
    }
    else {
        var integrer = Math.trunc(num);
        if (num == integrer) {
            return true;
        }
        else {
            return false;
        }
    }
}
function deepFreeze(object) {
    // Retrieve the property names defined on object
    const propNames = Reflect.ownKeys(object);
    // Freeze properties before freezing self
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
        return str.slice(0, 3) == "// ";
    },
    check_for_name(str) {
        return str.slice(0, 2) == "n/";
    },
    check_for_number_and_url(str) {
        var splitted = str.split(' ');
        if (splitted.length != 2) {
            return false;
        }
        else {
            return (is_int(splitted[0]) && is_valid_url(splitted[1]));
        }
    }
};
deepFreeze(validator);
function downloader(path, episode_name, url) {
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
    });
}
/*function dwn(path: string, episode_name: string, url: string) {
    console.log()
    console.log(`path: ${path}`)
    console.log(`episode_name: ${episode_name}`)
    console.log(`url: ${url}`)
    console.log()
}*/
for (var i of get_data_from_source()) {
    if (!validator.check_for_comment(i)) {
        if (validator.check_for_name(i)) {
            latest_name = i.replace("n/", "");
            storage[latest_name] = {};
        }
        else if (validator.check_for_number_and_url(i)) {
            var splitted = i.split(' ');
            if (!latest_name)
                continue;
            storage[latest_name][splitted[0]] = splitted[1];
        }
        else {
            latest_name = undefined;
        }
    }
}
//console.log(storage)
//fs.writeFileSync("out.json", JSON.stringify(storage))
for (var series_name of Object.keys(storage)) {
    for (var episode_number of Object.keys(storage[series_name])) {
        // dwn(path: string, series_name: string, url: string)
        // downloader(additional_path+name,`${name}-${separated[0]}.mp4`,separated[1])
        // dwn(`${additional_path}${series_name}`, `${series_name}-${episode_number}.mp4`, storage[series_name][episode_number])
        downloader(`${additional_path}${series_name}`, `${series_name}-${episode_number}.mp4`, storage[series_name][episode_number]);
    }
}
//# sourceMappingURL=app.js.map