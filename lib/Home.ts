///<reference path='refs.ts'/>
module TDev { export module RT {
    //? Interact with devices in the home network. Devices must be UPnP™ compatible.
    //@ cap(home) obsolete
    export module Home
    {

        //? Gets the printers on the current wireless network
        //@ stub flow(SourceHome)
        //@ cap(home) obsolete
        export function printers() : Collection<Printer>
        { return undefined; }

        //? Gets the media players on the current wireless network
        //@ stub flow(SourceHome)
        //@ cap(home) obsolete
        export function players() : Collection<MediaPlayer>
        { return undefined; }

        //? Gets the media servers on the home network
        //@ stub flow(SourceHome)
        //@ cap(home) obsolete
        export function servers() : Collection<MediaServer>
        { return undefined; }

        //? Choose a printer on the current wireless network
        //@ stub flow(SourceHome) returns(Printer)
        //@ cap(home) obsolete
        export function choose_printer(r:ResumeCtx)
        { }

        //? Choose a media player on the current wireless network
        //@ stub flow(SourceHome) returns(MediaPlayer)
        //@ cap(home) obsolete
        export function choose_player(r:ResumeCtx)
        { }

        //? Choose a media server on the current wireless network
        //@ stub flow(SourceHome) returns(MediaServer)
        //@ cap(home) obsolete
        export function choose_server(r:ResumeCtx)
        { }

    }
} }
