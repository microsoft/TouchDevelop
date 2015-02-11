///<reference path='refs.ts'/>
module TDev.RT {
    //? A device connected via Bluetooth
    //@ stem("gadget") icon("chip") cap(bluetooth)
    export class BluetoothDevice
        extends RTValue
    {
        public _displayName:string;
        public _hostName:string;
        public _serviceName:string;
        public _isConnected:boolean = false;

        //? Get the user-friendly name of the device
        public name():string
        {
            return this._displayName;
        }

        //? Get the internal address of the device
        public address():string
        {
            return this._hostName + ":" + this._serviceName;
        }

        //? Check if we're currently connected to device
        public connected():boolean
        {
            return this._isConnected;
        }

        //? Try to connect to the device; use `->connected` to check if it succeeded.
        //@ async
        public connect(r:ResumeCtx)
        {
        }

        //? Close connection to the device.
        //@ async
        public disconnect(r:ResumeCtx)
        {
        }

        public readAsync(max_length:number):Promise
        {
            return Promise.as(undefined)
        }

        //? Read at most `max_length` bytes from the device
        //@ async returns(Buffer)
        public read_buffer_at_most(max_length:number, r:ResumeCtx)
        {
            this.readAsync(max_length).done(buf => {
                r.resumeVal(buf)
            })
        }

        //? Read exactly `length` bytes from the device
        //@ async returns(Buffer)
        public read_buffer(length:number, r:ResumeCtx)
        {
            var res = Buffer.mk(length)
            var readMore = (off:number) => {
                this.readAsync(length - off).done(buf => {
                    if (!buf) r.resumeVal(undefined);
                    else {
                        res.copy_from(off, buf)
                        off += buf.count()
                        if (off < length)
                            readMore(off)
                        else
                            r.resumeVal(res)
                    }
                });
            }
            readMore(0)
        }

        //? Send the `buffer` to the device
        //@ async
        public write_buffer(buffer:Buffer, r:ResumeCtx)
        {
        }

        public toString()
        {
            return this.name() + " (" + this.address() + ") - " + (this.connected() ? "connected" : "not connected");
        }

        //? Display the name of the device
        public post_to_wall(s: IStackFrame): void {
            s.rt.postBoxedText(this.toString(), s.pc);
        }

        static getDevicesAsync = () => Promise.as(undefined);
    }
}
