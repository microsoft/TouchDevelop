///<reference path='refs.ts'/>
module TDev.RT.Wab {
    export class WabBluetoothDevice
        extends BluetoothDevice
    {
        private errorHandler: (err:any) => any;

        static isBluetoothError(err:any)
        {
            return (typeof err.message === "string" && /HRESULT: 0x/.test(err.message));
        }

        constructor() {
            super()
            // do not put anything here; it will not run
        }

        public initFrom(j:BluetoothDeviceFriendlyName) {
            this.errorHandler = (err) => {
                if (WabBluetoothDevice.isBluetoothError(err)) {
                    this._isConnected = false;
                    return undefined;
                } else throw err;
            };
            this._displayName = j.displayName;
            this._hostName = j.hostName;
            this._serviceName = j.serviceName;
			this._isConnected = false;
        }

        private mkReq(act:string)
        {
            var r:BluetoothConnectRequest = {
                action: act,
                hostName: this._hostName,
                serviceName: this._serviceName,
            };
            return r;
        }

        public connect(r:ResumeCtx)
        {
            sendRequestAsync(this.mkReq(Action.BLUETOOTH_CONNECT))
                .done((response:BluetoothConnectResponse) => {
                    this._isConnected = !!response.connected;
                    r.resume()
                }, this.errorHandler)
        }

        public disconnect(r:ResumeCtx)
        {
            sendRequestAsync(this.mkReq(Action.BLUETOOTH_DISCONNECT))
                .done((response:BluetoothConnectResponse) => {
                    this._isConnected = !!response.connected;
                    r.resume()
                }, this.errorHandler)
        }

        public readAsync(max_length:number)
        {
            if (!this._isConnected) Util.userError(lf("bluetooth device {0}", this.toString()))
            var req = <BluetoothReadRequest>this.mkReq(Action.BLUETOOTH_READ);
            req.length = max_length;
            Util.assert(!!this.errorHandler)
            return sendRequestAsync(req)
                .then((response:BluetoothReadResponse) => {
                    this._isConnected = !!response.connected;
                    if (response.connected)
                        return Buffer.fromString(response.data, "base64");
                    else
                        return undefined;
                }, this.errorHandler)
        }

        public write_buffer(buffer:Buffer, r:ResumeCtx)
        {
            if (!this._isConnected) Util.userError(lf("bluetooth device {0}", this.toString()))
            var req = <BluetoothWriteRequest>this.mkReq(Action.BLUETOOTH_WRITE);
            req.data = buffer.to_string("base64");
            sendRequestAsync(req)
                .done((response:BluetoothWriteResponse) => {
                    this._isConnected = !!response.connected;
                    r.resume()
                }, this.errorHandler)
        }

        static getDevices()
        {
            return sendRequestAsync(<BluetoothDevicesRequest>{ action: Action.BLUETOOTH_DEVICES })
                .then((response: BluetoothDevicesResponse) => {
                    if (response.devices)
                        return response.devices.map(d => {
                            var b = new BluetoothDevice();
                            (<WabBluetoothDevice>b).initFrom(d);
                            return b;
                        });
                    else
                        return undefined;
                }, (err) => {
                    if (WabBluetoothDevice.isBluetoothError(err)) return undefined;
                    else throw err;
                });
        }
    }

    export function BluetoothInit()
    {
        if (isSupportedAction(Action.BLUETOOTH_DEVICES)) {
            Util.log('wab: boosting BLUETOOTH_DEVICES');
            BluetoothDevice.getDevicesAsync = WabBluetoothDevice.getDevices;
        }
    }
}
