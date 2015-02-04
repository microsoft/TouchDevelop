///<reference path='refs.ts'/>
module TDev.RT {
    //? Describes the motion of the device
    //@ ctx(general,walltap) cap(motion)
    export class Motion
        extends RTValue
    {
        private _acceleration: Vector3;
        private _rotation_speed: Vector3;
        private _gravity: Vector3;
        private _time: DateTime;
        private _yaw: number;
        private _pitch: number;
        private _roll: number;

        constructor() {
            super()
        }


        //? Gets the linear acceleration of the device, in gravitational units.
        //@ tandre
        public acceleration(): Vector3 {
            return this._acceleration;
        }

        //? Gets the device rotation speed in degrees per sec.
        //@ tandre
        public rotation_speed(): Vector3 {
            return this._rotation_speed;
        }

        //? Gets the gravity vector associated with this reading.
        //@ tandre
        public gravity(): Vector3 {
            return this._gravity;
        }

        //? Gets a timestamp indicating the time at which the reading was calculated.
        //@ tandre
        public time(): DateTime {
            return this._time;
        }

        //? Gets the yaw of the attitude in degrees
        //@ tandre
        public yaw(): number {
            return this._yaw;
        }

        //? Gets the pitch of the attitude in degrees
        //@ tandre
        public pitch(): number {
            return this._pitch;
        }

        //? Gets the roll of the attitude in degrees
        //@ tandre
        public roll(): number {
            return this._roll;
        }

        //? Displays the motion reading to the wall.
        public post_to_wall(s : IStackFrame): void {
            var rt = s.rt;
            if (this.acceleration())
                rt.postBoxedText('acc: ' + this.acceleration.toString(), s.pc);
            if (this.rotation_speed())
                rt.postBoxedText('rot: ' + this.rotation_speed.toString(), s.pc);
            if (this.gravity())
                rt.postBoxedText('g: ' + this.gravity().toString(), s.pc);
            if (this.yaw())
                rt.postBoxedText('yaw: ' + this.yaw.toString(), s.pc);
            if (this.pitch())
                rt.postBoxedText('pitch: ' + this.pitch.toString(), s.pc);
            if (this.roll())
                rt.postBoxedText('roll: ' + this.roll.toString(), s.pc);
        }
    }
}
