///<reference path='refs.ts'/>
module TDev.RT {
    //? A web socket message
    //@ stem("msg") ctx(general) dbgOnly
    export class WebSocketMessage
        extends RTValue {
        private stringData:string;
        private binaryData:any;
        private err: string;

        constructor() {
            super()
        }

        static mk(data: any) {
            var msg = new WebSocketMessage();
            if (typeof data == "string")
                msg.stringData = data
            else
                msg.binaryData = data
            return msg;
        }

        static mkError(err: string) {
            var msg = new WebSocketMessage();
            msg.err = err;
            return msg;
        }

        //? Indicates if this message is an error
        public is_error(): boolean {
            return !!this.err;
        }

        //? Gets the error if any.
        public error(): string {
            return this.err;
        }

        //? Gets the message as a string
        public string(): string {
            return this.stringData;
        }

        private _json: JsonObject;
        //? Gets the message as a Json payload
        public json(): JsonObject {
            if (!this.stringData) return undefined
            if (!this._json) this._json = JsonObject.mk(this.stringData);
            return this._json;
        }

        //? Gets the message as a Buffer
        public buffer(): Buffer {
            if (this.binaryData instanceof Buffer) return this.binaryData
            if (this.binaryData instanceof ArrayBuffer) {
                this.binaryData = Buffer.fromTypedArray(new Uint8Array(this.binaryData))
                return this.binaryData
            }
            return undefined
        }

        public toString(): string {
            if (this.err) return "error: " + this.err;
            if (this.binaryData && this.binaryData.toString)
                return this.binaryData.toString()
            return JSON.stringify(this.stringData)
        }

        //? Displays the message on the wall
        public post_to_wall(s: IStackFrame): void {
            super.post_to_wall(s);
        }
    }

    //? A web socket
    //@ stem("ws") ctx(general) dbgOnly
    export class WebSocket_
        extends RTDisposableValue {

        private msgs = [];

        constructor (private ws: WebSocket, rt : Runtime) {
            super(rt)
        }

        public dispose() {
            this.close();
            super.dispose();
        }

        static mk(ws: WebSocket, rt : Runtime) {
            var w = new WebSocket_(ws, rt);
            w.attachEvents()
            return w;
        }

        private attachEvents() {
            this.ws.addEventListener("error", ev => {
                App.logEvent(App.DEBUG, "ws", "error: " + ev.message, undefined);
                this.receiveMessage(WebSocketMessage.mkError(ev.message));
            }, false);
            this.ws.addEventListener("message", ev => {
                this.receiveMessage(WebSocketMessage.mk(ev.data));
            }, false);
            this.ws.addEventListener("close", ev => {
                this.gotClose()
            }, false);
        }

        public gotClose()
        {
            var closeMsg = WebSocketMessage.mkError("closed")
            while (this.msgs[0] && !(this.msgs[0] instanceof WebSocketMessage)) {
                this.receiveMessage(closeMsg)
            }
        }

        public receiveMessage(msg: WebSocketMessage) {
            // if the last element is not a message, it must be a consumer
            var r = this.msgs[0];
            if (r && !(r instanceof WebSocketMessage)) {
                this.msgs.shift()(msg);
            }
            else
                this.msgs.push(msg);
        }

        //? Closes the socket
        public close() {
            this.ws.close();
        }

        //? Gets the ready state of the web socket, "connection", "closed", "closing", "open"
        public ready_state(): string {
            var rs = this.ws.readyState;
            // WebSocket constants may not be available in node
            switch (rs) {
                case 0: return "connecting";
                case 1: return "open";
                case 2: return "closing";
                case 3: return "closed";
                default: return rs.toString();
            }
        }

        //? The number of bytes of data that have been queued using calls to send() but not yet transmitted to the network. This value does not reset to zero when the connection is closed; if you keep calling send(), this will continue to climb.
        public buffered_amount(): number {
            return this.ws.bufferedAmount;
        }

        //? Receives a message
        //@ returns(WebSocketMessage) async
        public receive(r: ResumeCtx) { // : WebSocketMessage
            var d = this.msgs[0];
            if (d && d instanceof WebSocketMessage)
                r.resumeVal(this.msgs.shift());
            else if (this.ready_state() == "closed")
                r.resumeVal(WebSocketMessage.mkError("closed"))
            else
                this.msgs.push((msg : WebSocketMessage) => r.resumeVal(msg));
        }

        private sendPacket(d: any) {
            try {
                this.ws.send(d);
            }
            catch (e) {
                App.logEvent(App.DEBUG, "ws", "error: send" + e.message, undefined);
                this.receiveMessage(WebSocketMessage.mkError(e));
            }
        }

        //? Transmits string data to the server
        public send(msg: string) {
            this.sendPacket(msg);
        }

        //? Transmits JSON data to the server
        public send_json(json: JsonObject) {
            this.send(JSON.stringify(json ? json.value() : null));
        }

        //? Sends buffer data to the server
        public send_buffer(buf: Buffer) {
            this.sendPacket(buf.buffer);
        }

        public toString() {
            return this.ready_state() + " " + this.ws.url;
        }

        //? Displays the request to the wall
        public post_to_wall(s: IStackFrame): void {
            super.post_to_wall(s);
        }
   }
}
