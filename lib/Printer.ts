///<reference path='refs.ts'/>
module TDev { export module RT {
    //? A printer on the home network
    //@ walltap cap(home) obsolete
    export class Printer
        extends RTValue
    {
        constructor() {
            super()
        }
        // public jsonFields() => [];

        //? Gets the detailled information about this device
        //@ stub obsolete
        public device() : Device
        { return undefined; }

        //? Gets the name of the printer
        //@ stub obsolete
        public name() : string
        { return undefined; }

        //? Display the printer to the wall
        //@ stub obsolete
        public post_to_wall() : void
        { }

        //? Queues a job to print the text.
        //@ stub obsolete
        public print_text(text:string) : void
        { }

        // Queues a job to print the picture.
        // public print_picture(picture:Picture) : void

        //? Indicates if new jobs can start processing immediately without waiting.
        //@ stub obsolete
        //@ tandre
        public is_idle() : boolean
        { return undefined; }

        //? Indicates if jobs are processing; new jobs will wait before processing, i.e., are said to be pending.
        //@ stub obsolete
        //@ tandre
        public is_processing() : boolean
        { return undefined; }

        //? Indicates if no jobs can be processed and intervention is needed.
        //@ stub obsolete
        //@ tandre
        public is_stopped() : boolean
        { return undefined; }

        //? Indicates additional information about why the Printer is in its current state.
        //@ stub obsolete
        //@ tandre
        public state_reason() : string
        { return undefined; }

    }
} }
