const { spawn }=require("child_process");
const fs = require('fs');

function isValidURL(string) {
    var res = string.match(/(http(s)?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/g);
    return (res !== null)
};

function links_from_source(){
    var out=(fs.readFileSync('source.txt','utf-8',function(err,data){
        if (err) return;
        return data
    })).split('\r\n')
    return out
}

function downloader(path, series_name, url){
    const action=spawn("yt-dlp", ["-P", path, "-o", series_name, url])
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
var name;
var series_number;

// main
var data=links_from_source()
for (const string of data) {
    //console.log(string)
    if (isValidURL(string)){
        //console.log(`URL: ${string}`)
        //console.log(`${name}-${series_number}.mp4`)
        downloader(name,`${name}-${series_number}.mp4`,string)
        series_number++
    } else {
        //console.log(`Name: ${string}`)
        name=string
        series_number=1
        if (!fs.existsSync(string)){
            fs.mkdirSync(string);
        }
    }
}