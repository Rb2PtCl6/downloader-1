const { spawn }=require("child_process");
const fs = require('fs');

function links_from_source(){
    var out=(fs.readFileSync(additional_path+'source-2.txt','utf-8',function(err,data){
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

// main
var additional_path=""; // "path/to/file/"
var name;

var data=links_from_source()
for (const string of data) {
    //console.log(string)
    var separated=string.split(' ')
    //console.log(separated)
    if (separated[0]/separated[0]==1){
        //console.log(`number with link: ${string}`)
        downloader(additional_path+name,`${name}-${separated[0]}.mp4`,separated[1])
        //console.log(separated[0])
        //console.log(separated[1])
    } else if (separated[0]!="//") {
        //console.log(`name: ${string}`)
        name=string
        if (!fs.existsSync(additional_path+string)){
            fs.mkdirSync(additional_path+string);
        }
    }
}