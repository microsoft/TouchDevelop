///<reference path='refs.ts'/>

// http://www.w3.org/TR/gamepad/#idl-def-GamepadButton
interface Gamepad {
    id : string;
    index:number;
    connected:boolean;
    timestamp:number;
    mapping:string;
    axes:number[];
    buttons: GamepadButton[];
};

interface GamepadButton {
    pressed:boolean;
    value:number;
}

module TDev.RT {
    //? Camera, location, microphone and other sensors
    export module Senses
    {
        var _rt : Runtime;
        var _camera: Camera = undefined;
        var _frontCamera: Camera = undefined;
        var _onShake : Event_;
        var _onPhoneFaceUp : Event_;
        var _onPhoneFaceDown : Event_;
        var _onPhonePortrait : Event_;
        var _onPhoneLandscapeLeft : Event_;
        var _onPhoneLandscapeRight : Event_;

        function clearData() {
            _camera = undefined;
            _frontCamera = undefined;
            _onShake = undefined;
            _onPhoneFaceUp = undefined;
            _onPhoneFaceDown = undefined;
            _onPhonePortrait = undefined;
            _onPhoneLandscapeLeft = undefined;
            _onPhoneLandscapeRight = undefined;
            _rt = undefined;
        }

        export function rt_start(rt: Runtime): void
        {
            clearData();
            _rt = rt;
            DeviceMotion.rt_start(rt);
            DeviceOrientation.rt_start(rt);
            gamepadsSupported = !!(navigator && (<any>navigator).getGamepads);
        }
        export function rt_stop(rt:Runtime)
        {
            clearData();
            DeviceMotion.stop(rt);
            DeviceOrientation.stop(rt);
        }

        //? Attaches a handler to the `shake` event.
        //@ ignoreReturnValue cap(accelerometer)
        export function on_shake(body : Action) : EventBinding
        {
            if(!_onShake) {
                _onShake = new RT.Event_();
                if(_rt) DeviceMotion.start(_rt);
            }
            return _onShake.addHandler(body);
        }
        export function raiseShakeEvent()
        {
            if (_rt) {
                _rt.queueEvent("shake", null, []);
                if (_onShake && _onShake.handlers)
                    _rt.queueLocalEvent(_onShake, []);
            }
        }

        //? Attaches a handler to the `phone face up` event.
        //@ ignoreReturnValue cap(accelerometer)
        export function on_phone_face_up(body : Action) : EventBinding
        {
            if (!_onPhoneFaceUp) {
                _onPhoneFaceUp = new RT.Event_();
                if(_rt) DeviceOrientation.start(_rt); // make sure we are tracking the position
            }
            return _onPhoneFaceUp.addHandler(body);
        }
        export function raisePhoneFaceUp() { raisePhoneEvent("phone face up", _onPhoneFaceUp); }
        //? Attaches a handler to the `phone face down` event.
        //@ ignoreReturnValue cap(accelerometer)
        export function on_phone_face_down(body : Action) : EventBinding
        {
            if (!_onPhoneFaceDown) {
                _onPhoneFaceDown = new RT.Event_();
                if(_rt) DeviceOrientation.start(_rt); // make sure we are tracking the position
            }
            return _onPhoneFaceDown.addHandler(body);
        }
        export function raisePhoneFaceDown() { raisePhoneEvent("phone face down", _onPhoneFaceDown); }
        //? Attaches a handler to the `phone portrait` event.
        //@ ignoreReturnValue cap(accelerometer)
        export function on_phone_portrait(body : Action) : EventBinding
        {
            if (!_onPhonePortrait) {
                _onPhonePortrait = new RT.Event_();
                if(_rt) DeviceOrientation.start(_rt); // make sure we are tracking the position
            }
            return _onPhonePortrait.addHandler(body);
        }
        export function raisePhonePortrait() { raisePhoneEvent("phone portrait", _onPhonePortrait); }
        //? Attaches a handler to the `phone landscape left` event.
        //@ ignoreReturnValue cap(accelerometer)
        export function on_phone_landscape_left(body : Action) : EventBinding
        {
            if (!_onPhoneLandscapeLeft) {
                _onPhoneLandscapeLeft = new RT.Event_();
                if(_rt) DeviceOrientation.start(_rt); // make sure we are tracking the position
            }
            return _onPhoneLandscapeLeft.addHandler(body);
        }
        export function raisePhoneLandscapeLeft() { raisePhoneEvent("phone landscape left", _onPhoneLandscapeLeft); }
        //? Attaches a handler to the `phone landscape right` event.
        //@ ignoreReturnValue cap(accelerometer)
        export function on_phone_landscape_right(body : Action) : EventBinding
        {
            if (!_onPhoneLandscapeRight) {
                _onPhoneLandscapeRight = new RT.Event_();
                if(_rt) DeviceOrientation.start(_rt); // make sure we are tracking the position
            }
            return _onPhoneLandscapeRight.addHandler(body);
        }
        export function raisePhoneLandscapeRight() { raisePhoneEvent("phone landscape right", _onPhoneLandscapeRight); }

        function raisePhoneEvent(name : string, ev : Event_) {
            if (_rt) {
                _rt.queueEvent(name, null, []);
                if (ev && ev.handlers) _rt.queueLocalEvent(ev, []);
            }
        }

        //? Takes a picture and returns it. This picture does not contain the gps location.
        //@ flow(SourceCamera) returns(Picture) uiAsync
        //@ import("cordova", "org.apache.cordova.camera")
        export function take_camera_picture(r: ResumeCtx) // : Picture
        {
            var cam = (<any>navigator).camera;
            if (cam) {
                cam.getPicture((url) => {
                    r.resumeVal(Picture.fromUrlSync(url, false, false));
                }, (msg) => {
                        TDev.RT.App.logEvent(App.DEBUG, "senses", "take camera picture failed: " + msg, undefined);
                        r.resumeVal(undefined);
                }, {
                    quality: 85,
                    mediaType: (<any>window).Camera.MediaType.JPEG,
                    sourceType: (<any>window).Camera.PictureSourceType.CAMERA,
                    destinationType: (<any>window).Camera.DestinationType.FILE_URI
                });
                return;
            }
            UserMediaManager
                .getCameraUrlAsync()
                .done(url => {
                    if (!url) {
                        Media.choosePictureAsync('take or choose a picture', 'The app wants to take a picture but it could not launch the camera. Try opening the picture chooser to access the camera.')
                            .done(pic => r.resumeVal(pic));
                    }
                    else {
                        var m = new ModalDialog();
                        m.add(div('wall-dialog-header', 'take a picture'));
                        var v = <HTMLVideoElement>createElement('video');
                        v.src = url;
                        v.controls = false;
                        v.autoplay = true;
                        m.add(div('wall-dialog-body', v));
                        m.add(div('wall-dialog-buttons', [
                            HTML.mkButton(lf("cancel"), () => {
                                v.pause();
                                m.dismiss();
                                r.resumeVal(undefined);
                            }),
                            HTML.mkButton(lf("take picture"), () => {
                                Picture.fromUrl(UserMediaManager.previewVideo(v))
                                    .done((p) => {
                                        v.pause();
                                        m.dismiss();
                                        r.resumeVal(p);
                                    });
                            }),
                        ]));
                        m.show();
                    }
                });
        }

        //? Records audio using the microphone
        //@ uiAsync cap(microphone) flow(SourceMicrophone) returns(Sound)
        export function record_microphone(r : ResumeCtx) //: Sound
        {
            AudioContextManager.recordMicrophoneAsync()
                .then((url : string) => url ? Sound.fromArtUrl(url) : undefined)
                .done((snd : Sound) => r.resumeVal(snd));
        }

        //? Indicates whether the device is 'stable' (no movement for about 0.5 seconds)
        //@ cap(accelerometer) returns(boolean) quickAsync
        //@ tandre
        export function is_device_stable(r : ResumeCtx) // : boolean
        {
            DeviceMotion.isDeviceStable(r);
        }

        //? Indicates if an accelerometer is available.
        export function has_accelerometer(): boolean { return DeviceMotion.isMotionSupported(); }

        //? Gets filtered and temporally averaged accelerometer data using an arithmetic mean of the last 25 'optimally filtered' samples, so over 500ms at 50Hz on each axis, to virtually eliminate most sensor noise. This provides a very stable reading but it has also a very high latency and cannot be used for rapidly reacting UI.
        //@ cap(accelerometer) returns(Vector3) quickAsync
        //@ tandre
        export function acceleration_stable(r: ResumeCtx) {

            DeviceMotion.accelerationStable(r);
        }

        //? Gets filtered accelerometer data using a 1 Hz first-order low-pass on each axis to eliminate the main sensor noise while providing a medium latency. This can be used for moderately reacting UI updates requiring a very smooth signal.
        //@ cap(accelerometer) returns(Vector3) quickAsync
        //@ tandre
        export function acceleration_smooth(r: ResumeCtx) {

            DeviceMotion.accelerationSmooth(r);
        }

        //? Gets filtered accelerometer data using a combination of a low-pass and threshold triggered high-pass on each axis to eliminate the majority of the sensor low amplitude noise while trending very quickly to large offsets (not perfectly smooth signal in that case), providing a very low latency. This is ideal for quickly reacting UI updates.
        //@ cap(accelerometer) returns(Vector3) quickAsync
        //@ tandre
        export function acceleration_quick(r: ResumeCtx) {

            DeviceMotion.accelerationQuick(r);
        }

        function askLocationAccessAsync(r : ResumeCtx): Promise {
            if (!RuntimeSettings.location()) {
                HTML.showProgressNotification(lf("denied access to location (global setting)"));
                return Promise.as(false);
            }
            return r.rt.host.askSourceAccessAsync("location", "your current geo location, based on your GPS, WiFi or IP address.", false)
        }

        //? Gets the current approximate phone location. The phone optimizes the accuracy for power, performance, and other cost considerations.
        //@ async cap(location) flow(SourceGeoLocation) returns(Location_)
        //@ tandre
        export function current_location(r: ResumeCtx) {
            askLocationAccessAsync(r)
                .then((allow) => {
                    if (allow)
                        GeoLocation.currentLocation(r);
                    else
                        r.resumeVal(undefined);
                })
                .done();
        }

        //? Gets the current phone location with the most accuracy. This includes using services that might charge money, or consuming higher levels of battery power or connection bandwidth.
        //@ async cap(location) flow(SourceGeoLocation) returns(Location_)
        //@ tandre
        export function current_location_accurate(r: ResumeCtx) {
            askLocationAccessAsync(r)
                .then((allow) => {
                    if (allow)
                        GeoLocation.currentLocationAccurate(r);
                    else
                        r.resumeVal(undefined);
                })
                .done();
        }

        //? Gets the primary camera if available
        //@ cap(camera) returns(Camera) quickAsync
        export function camera(r : ResumeCtx)
        {
            if (!_camera && UserMediaManager.isSupported()) {
                _camera = new Camera();
            }
            r.resumeVal(_camera);
        }

        //? Gets the front facing camera if available
        //@ cap(camera) returns(Camera) quickAsync
        export function front_camera(r : ResumeCtx)
        {
            if (!_frontCamera && UserMediaManager.isSupported()) {
                _frontCamera = new Camera();
                _frontCamera.set_is_front(true);
            }
            r.resumeVal(_frontCamera);
        }

        //? Test if the senses→front camera is invalid instead
        //@ obsolete cap(camera) returns(boolean) quickAsync
        export function has_front_camera(r: ResumeCtx)
        {
            r.resumeVal(true);
        }

        //? Test if the senses→motion is invalid instead.
        //@ obsolete stub cap(motion)
        export function has_motion() : boolean
        { return false; }

        //? Gets the current motion that combines data from the accelerometer, compass and gyroscope if available.
        //@ stub cap(motion)
        //@ tandre
        export function motion() : Motion
        { return undefined; }

        //? Gets the current orientation in degrees if available. (x,y,z) is also called (pitch, roll, yaw) or (alpha, beta, gamma).
        //@ cap(orientation) returns(Vector3) quickAsync
        export function orientation(r : ResumeCtx)
        {

            DeviceOrientation.orientation(r);
        }

        //? Test if the senses→heading is invalid instead
        //@ obsolete cap(compass)
        export function has_compass() : boolean { return DeviceOrientation.isHeadingSupported(); }

        //? Gets the compass heading, in degrees, measured clockwise from the Earth’s geographic north.
        //@ cap(compass) returns(number) quickAsync
        //@ tandre
        export function heading(r: ResumeCtx) {

            DeviceOrientation.heading(r);
        }

        //? Indicates if the gyroscope is available on the device
        //@ hidden cap(gyroscope)
        export function has_gyroscope() : boolean { return DeviceMotion.isSupported(); }

        //? Gets the gyroscope rotational velocity around each axis of the device, in degrees per second.
        //@ cap(gyroscope) returns(Vector3) quickAsync
        //@ tandre
        export function rotation_speed(r: ResumeCtx) {

            DeviceMotion.rotationRate(r);
        }

        //? Gets the charge level of the battery between 0 (discharged) and 1 (fully charged). Returns invalid if this information is not available.
        //@ quickAsync returns(number)
        export function battery_level(r: ResumeCtx) { //: number {
            //TODO: Cordova not supported
            var battery = (<any>navigator).battery ||  (<any>navigator).webkitBattery || (<any>navigator).mozBattery;
            r.resumeVal(battery ? battery.level : undefined);
        }

        //? Get the list of Bluetooth widgets paired with your device.
        //@ async returns(Collection<BluetoothDevice>) cap(bluetooth)
        export function bluetooth_devices(r:ResumeCtx)
        {
            BluetoothDevice.getDevicesAsync().done(v => {
                r.resumeVal(Collection.fromArray(v, BluetoothDevice));
            })
        }

        //? Indicates if the specified key is pressed.
        //@ [key].deflStrings('space', 'a', 'w', 's', 'd', 'enter', 'left', 'right', 'up', 'down')
        export function is_key_pressed(key: string, s : IStackFrame): boolean {
            return s.rt.host.keyboard.isPressed(key);
        }

        //? Attaches an event that triggers while the key is pressed. This event repeats while the key is down.
        //@ [key].deflStrings('space', 'a', 'w', 's', 'd', 'enter', 'left', 'right', 'up', 'down')
        //@ ignoreReturnValue
        export function on_key_pressed(key: string, body : Action, s : IStackFrame): EventBinding {
            return s.rt.host.keyboard.registerDown(key, body);
        }

        var gamepadsSupported = false;
        var _lastGamepadsTimestamp = 0;
        var _lastGamepads: Collection<Gamepad_> = undefined;
        var _emptyGamepads: Collection<Gamepad_> = undefined;
        //? Gets a snapshot of the gamepad states (if any connected to the browser). Empty if unsupported or no gamepad connected.
        export function gamepads(): Collection<Gamepad_> {
            // best practice would be to poll this value in requestAnimationFrame - once per frame
            if (gamepadsSupported) {
                var ts = Util.perfNow();
                if (!_lastGamepads || ts - _lastGamepadsTimestamp > 0.02) {
                    _lastGamepadsTimestamp = ts; // record current timestamp
                    if (gamepadsSupported) {
                        _lastGamepads = new Collection<Gamepad_>(Gamepad_);
                        var gs = (<any>navigator).getGamepads();
                        for (var i = 0; i < gs.length; ++i)
                            if (!!gs[i])
                                _lastGamepads.add(new Gamepad_(gs[i]));
                    } else {
                        _lastGamepads = _emptyGamepads;
                    }
                }
            }
            // TODO: make this collection readonly
            if (!_emptyGamepads) _emptyGamepads = new Collection<Gamepad_>(Gamepad_);
            return _lastGamepads || _emptyGamepads;
        }

        //? Gets the first connected gamepad available
        export function first_gamepad() : Gamepad_ {
            var gs = gamepads();
            for (var i = 0; i < gs.count(); ++i)
                if (gs.at(i).is_connected()) return gs.at(i);
            return undefined;
        }
    }

    //? A snapshot of the gamepad state
    //@ immutable icon('fa-gamepad')
    //@ robust
    export class Gamepad_ extends RTValue {
        constructor(private gp: Gamepad) {
            super();
        }

        static buttonNames = {
            "a": 0,
            "b": 1,
            "x": 2,
            "y": 3,
            "left bumper": 4,
            "right bumper": 5,
            "left trigger": 6,
            "right trigger": 7,
            "back": 8,
            "start": 9,
            "left stick": 10,
            "right stick": 11,
            "up": 12,
            "down": 13,
            "left": 14,
            "right": 15,
            "home": 16
        };

        public toString() {
            return JSON.stringify(this.gp);
        }

        //? Indicates if the gamepad data are identical
        public equals(other: Gamepad_): boolean {
            var op = other.gp;
            return this.gp.timestamp == op.timestamp &&
                this.gp.index == op.index &&
                this.gp.buttons.length == op.buttons.length &&
                this.gp.buttons.every((v, index) => op.buttons[index].pressed == v.pressed && op.buttons[index].value == v.value) &&
                this.gp.axes.length == op.axes.length &&
                this.gp.axes.every((v, index) => op.axes[index] == v)
        }

        //? Displays the state of the gamepad on the wall
        public post_to_wall(s: IStackFrame) {
            s.rt.postText(JSON.stringify(this.gp), s.pc);
        }

        //? Gets the gamepad identifier
        public id(): string {
            return this.gp.id;
        }

        //? Gets the player index
        public index(): number {
            return this.gp.index;
        }

        //? Gets the timestamp of this snapshot
        public timestamp() : number {
            return this.gp.timestamp;
        }

        //? Indicates if the gamepad is still connected.
        public is_connected(): boolean {
            return this.gp.connected;
        }

        //? Indicates if a button is pressed. Returns false if button missing.
        //@ [name].deflStrings("a", "b", "x", "y", "left bumper", "right bumper", "left trigger", "right trigger", "back", "start", "left stick", "right stick", "up", "down", "left", "right", "home")
        public is_button_pressed(name: string): boolean {
            var index = Gamepad_.buttonNames[name.trim().toLowerCase()];
            if (index == undefined) return false;
            else {
                var b = this.gp.buttons[index];
                return b && b.pressed;
            }
        }

        //? Gets the pressed value of a button. Returns 0 if button missing.
        //@ [name].deflStrings("a", "b", "x", "y", "left bumper", "right bumper", "left trigger", "right trigger", "back", "start", "left stick", "right stick", "up", "down", "left", "right", "home")
        public button_value(name: string): number {
            var index = Gamepad_.buttonNames[name.trim().toLowerCase()];
            if (index == undefined) return 0;
            else {
                var b = this.gp.buttons[index];
                return b ? b.value : 0;
            }
        }

        //? Gets the `x` and `y` value of the selected axes.
        //@ [name].deflStrings('left stick', 'right stick')
        public axes(name: string): Vector3 {
            switch (name.trim().toLowerCase()) {
                case "left stick": return Vector3.mk(this.gp.axes[0], this.gp.axes[1],0);
                case "right stick": return Vector3.mk(this.gp.axes[2], this.gp.axes[3],0);
                default: return Vector3.zero;
            }
        }

        public debuggerDisplay(clickHandler) {
            return JsonObject.wrap(this.gp).debuggerDisplay(clickHandler);
        }
        public debuggerChildren(): any {
            return JsonObject.wrap(this.gp).debuggerChildren();
        }
    }

    interface KeyState {
        timeStamp: number;
        downTimeStamp: number;
        repeating: boolean;
        down?: Event_;
        up?: Event_;
    }

    export class RuntimeKeyboard {
        private keys: any = {};
        private repeatDelay = 200;
        private repeatInterval = 50;


        constructor(private _rt: Runtime)
        {
        }

        private keyState(keyCode: string, create : boolean): KeyState {
            var kc = keyCode.toUpperCase();
            var state = <KeyState>this.keys[kc];
            if (!state && create)
                this.keys[kc] = state = { timeStamp: 0, downTimeStamp:0, repeating : false };
            return state;
        }

        public keyDown(evt: KeyboardEvent) : boolean {
            Util.normalizeKeyEvent(evt);
            if (!evt.keyName || evt.fromTextBox || evt.fromTextArea) return false;
            var state = this.keyState(evt.keyName, false);
            if (!state) return false;

            var now = evt.timeStamp || Util.perfNow();
            if (state.timeStamp == 0) {
                state.timeStamp = now;
                state.downTimeStamp = 0;
            }

            if (this._rt && state.down && state.down.handlers && (now - state.downTimeStamp) > (state.repeating ? this.repeatInterval : this.repeatDelay)) {
                Util.log("key down " + evt.keyName);
                this._rt.queueLocalEvent(state.down, [], false);
                state.downTimeStamp =  now;
                state.repeating = true;
            }

            return true;
        }

        public keyUp(evt: KeyboardEvent) : boolean{
            Util.normalizeKeyEvent(evt);
            if (!evt.keyName || evt.fromTextBox || evt.fromTextArea) return false;
            var state = this.keyState(evt.keyName, false);
            if (!state) return false;
            if (this._rt && state.timeStamp > 0 && state.up && state.up.handlers)
                this._rt.queueLocalEvent(state.up, [], false);
            state.timeStamp = 0;
            state.repeating = false;
            return true;
        }

        private toKeyCode(key: string, modifier: string) {
            var k = key;
            if (modifier) k = modifier + "-" + key;
            return k;
        }

        public isPressed(key: string): boolean {
            return this.keyState(key, true).timeStamp > 0;
        }

        public registerDown(key: string, body: Action): EventBinding {
            var state = this.keyState(key, true);
            if (!state.down) state.down = new Event_();
            return state.down.addHandler(body);
        }

        public registerUp(key: string, body: Action): EventBinding {
            var state = this.keyState(key, true);
            if (!state.up) state.up = new Event_();
            return state.up.addHandler(body);
        }
    }
}
