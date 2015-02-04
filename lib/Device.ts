///<reference path='refs.ts'/>
module TDev { export module RT {
    //? A device on the home network
    //@ stem("dev") immutable walltap cap(home) obsolete
    export class Device
        extends RTValue
    {
        private _name : string = undefined;

        constructor() {
            super()
        }

        //? Gets the friendly name of the device
        //@ obsolete
        public name() : string { return this._name; }

        //? Sets the friendly name of the device
        //@ obsolete
        public set_name(name:string) : void { this._name = name; }

        //? Gets the manfacturer name
        //@ stub obsolete
        public manufacturer() : string
        { return undefined; }

        //? Browses to the device control panel
        //@ stub obsolete
        public browse() : void
        { }

        //? Display the device to the wall
        //@ stub obsolete
        public post_to_wall() : void
        { }

        //? Checks if the device is connected
        //@ stub obsolete
        //@ tandre
        public is_connected() : boolean
        { return undefined; }

    }
} }
