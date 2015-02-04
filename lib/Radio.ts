///<reference path='refs.ts'/>
module TDev { export module RT {
    //? Access to the radio
    export module Radio
    {
        //? Indicates if the radio is on
        //@ cap(radio) returns(boolean)
        //@ readsMutable quickAsync
        export function is_playing(r : ResumeCtx) // : boolean
        {
            r.resumeVal(false);
        }

        //? Turns on the radio
        //@ cap(radio)
        //@ writesMutable quickAsync
        export function start(r : ResumeCtx)
        {
            r.resume();
        }

        //? Turns off the radio
        //@ cap(radio)
        //@ writesMutable quickAsync
        export function stop(r : ResumeCtx)
        {
            r.resume();
        }

        //? Gets the signal strength
        //@ cap(radio) returns(number)
        //@ readsMutable quickAsync
        export function signal_strength(r : ResumeCtx) // : number
        {
            r.resumeVal(0.0);
        }

        //? Gets the frequency
        //@ cap(radio) returns(number)
        //@ readsMutable quickAsync
        export function frequency(r : ResumeCtx) //: number
        {
            r.resumeVal(0.0);
        }

        //? Sets the frequency
        //@ cap(radio)
        //@ writesMutable quickAsync
        export function set_frequency(frequency:number, r : ResumeCtx) : void
        {
            r.resume();
        }

        //? Creates a link to a radio frequency
        //@ cap(radio)
        //@ [result].writesMutable
        export function link_frequency(name:string, frequency:number) : Link
        {
            var lnk = Link.mk("radio:" + frequency, LinkKind.radio);
            lnk.set_name(name);
            return lnk;
        }
    }
} }
