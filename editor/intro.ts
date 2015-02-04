///<reference path='refs.ts'/>
module TDev.Intro
{
    // TSBUG remove :void annotation from this and next function
    export function insertVideo(d:HTMLDivElement, name:string)
    {
        if (/^https?:\/\//.test(name)) {
            Browser.setInnerHTML(d,
                Util.fmt("<video autoplay controls>" +
                           "<source src='{0}' type='video/mp4'>" +
                           "This video is not supported in this browser." +
                         "</video>", name));
        } else {
            var videoPath = Cloud.getServiceUrl() + "/doc/videos/webtutorials/"
            Browser.setInnerHTML(d,
                Util.fmt("<video autoplay controls>" +
                           "<source src='{0}.mp4' type='video/mp4'>" +
                           "<source src='{1}.webm' type='video/webm'>" +
                           "This video is not supported in this browser." +
                         "</video>", videoPath + name, videoPath + name));
        }
        // note that iPad requires explicit width and height
        var vid = <HTMLVideoElement>d.firstChild;
        function updateSize() {
            vid.width = d.offsetWidth;
            vid.height = d.offsetWidth*9/16;
        }
        (<any>vid).updateSize = updateSize;
        return vid;
    }
}
