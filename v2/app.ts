import * as fs from 'node:fs'
import * as path from 'node:path'
import { spawn } from 'child_process'

const additional_path = `${__dirname}/`
const source2 = `${additional_path}source-2.txt`

var storage: { [a: string]: any } = {}

var latest_name : (string | undefined)  = undefined

function get_data_from_source(): string[] {
    return (fs.readFileSync(source2, 'utf-8')).split('\r\n')
}

function is_valid_url(this_url: string): boolean {
    var res = this_url.match(/(http(s)?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/g)
    return (res !== null)
}

function is_int(str: string): boolean {
    var num = Number(str)
    if (isNaN(num)) {
        return false
    } else {
        return num == Math.trunc(num)
    }
}

function deepFreeze(object: any) {
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
    check_for_comment(str: string): boolean {
        return str.slice(0, 3) == "// "
    },
    check_for_name(str: string): boolean {
        return str.slice(0, 2) == "n/"
    },
    check_for_number_and_url(str: string): boolean {
        var splitted = str.split(' ')
        if (splitted.length != 2) {
            return false
        } else {
            for (var i of splitted) {
                if (i == "") return false
            }
            return (is_int(splitted[0]) && is_valid_url(splitted[1]))
        }
    }
}
deepFreeze(validator)

function downloader(path: string, episode_name: string, url: string) {
    const action = spawn("yt-dlp", ["-P", path, "-o", episode_name, url])
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
    console.log(`\npath: ${path}\nepisode_name: ${episode_name}\nurl: ${url}\n`)
}*/

for (var i of get_data_from_source()) {
    if (!validator.check_for_comment(i)) {
        if (validator.check_for_name(i)) {
            latest_name = i.replace("n/", "")
            storage[latest_name] = {}
        } else if (validator.check_for_number_and_url(i)) {
            var splitted = i.split(' ')
            if (!latest_name) continue
            storage[latest_name][splitted[0]] = splitted[1]
        } else {
            latest_name = undefined
        }
    }
}

for (var i of Object.keys(storage)) {
    if (!Object.keys(storage[i]).length) delete storage[i]
}

//console.log(storage)
//fs.writeFileSync("out.json", JSON.stringify(storage))

for (var series_name of Object.keys(storage)){
    for (var episode_number of Object.keys(storage[series_name])) {
        //dwn(`${additional_path}${series_name}`, `${series_name}-${episode_number}.mp4`, storage[series_name][episode_number])
        downloader(`${additional_path}${series_name}`, `${series_name}-${episode_number}.mp4`, storage[series_name][episode_number])
    }
}