///<reference path='refs.ts'/>
module TDev.RT {
    //? A combination of date and time
    //@ stem("dt") immutable ctx(general,indexkey,cloudfield,json) serializable
    export class DateTime
        extends RTValue
    {
        constructor() {
            super()
        }
        static mkFull(year:number, month:number, day:number, hour:number, minute:number, second:number) : DateTime
        {
            var r = new DateTime();
            r.d = new Date(year, month - 1, day, hour, minute, Math.floor(second));
            var rem = second - Math.floor(second);
            if (rem) {
                r.d = new Date(r.d.getTime() + rem * 1000);
            }
            return r;
        }

        static mkMs(ms:number) : DateTime
        {
            var r = new DateTime();
            r.d = new Date(ms);
            return r;
        }

        static mk(d:Date) : DateTime
        {
            var r = new DateTime();
            r.d = new Date(d.getTime());
            return r;
        }

        static parse(s : string) : DateTime
        {
            if (!s) return undefined;
            var d = Date.parse(s);
            if (!d) return undefined;
            return DateTime.mkMs(d);
        }

        // 0001-01-01 00:00:00 GMT, Monday
        static defaultValue = DateTime.mkMs(-62135596800000);

        public d:Date;

        public isSerializable() { return true; }

        public toJsonKey():any { return this.d.getTime(); }

        //? Converts the value into a json data structure.
        public to_json(): JsonObject {
            return JsonObject.wrap(this.d.getTime());
        }

        public keyCompareTo(o:any):number
        {
            var other:DateTime = o;
            return this.d.getTime() - other.d.getTime();
        }

        public isDefaultValue():boolean
        {
            return this.equals(DateTime.defaultValue);
        }

        //? Returns a date that adds the specified number of days to the value of this instance.
        //@ [days].defl(1)
        public add_days(days:number) : DateTime { return this.add_seconds(days * 24 * 3600); }

        //? Returns a date that adds the specified number of hours to the value of this instance.
        //@ [hours].defl(1)
        public add_hours(hours:number) : DateTime { return this.add_seconds(hours * 3600); }

        //? Returns a date that adds the specified number of minutes to the value of this instance.
        //@ [minutes].defl(1)
        public add_minutes(minutes:number) : DateTime { return this.add_seconds(minutes * 60); }

        //? Returns a date that adds the specified number of seconds to the value of this instance.
        //@ [seconds].defl(1)
        public add_seconds(seconds:number) : DateTime { return DateTime.mkMs(this.d.getTime() + seconds * 1000); }

        //? Returns a date that adds the specified number of milliseconds to the value of this instance.
        //@ [milliseconds].defl(1)
        public add_milliseconds(milliseconds:number) : DateTime { return DateTime.mkMs(this.d.getTime() + milliseconds); }

        //? Computes the difference between date-times in seconds
        public subtract(value:DateTime) : number { return (this.d.getTime() - value.d.getTime()) / 1000; }

        //? Compares dates for equality
        public equals(other:DateTime) : boolean { return this.d.getTime() == other.d.getTime(); }

        //? Compares dates for disequality
        public not_equals(other:DateTime) : boolean { return !this.equals(other); }

        //? Compares dates for less or equal
        public less_or_equals(other:DateTime) : boolean { return this.d.getTime() <= other.d.getTime(); }

        //? Compares dates for less
        public less(other:DateTime) : boolean { return this.d.getTime() < other.d.getTime(); }

        //? Compares dates for greater or equal
        public greater_or_equal(other:DateTime) : boolean { return this.d.getTime() >= other.d.getTime(); }

        //? Compares dates for greater
        public greater(other:DateTime) : boolean { return this.d.getTime() > other.d.getTime(); }

        //? Converts a dates to a string
        public to_string() : string { return this.d.toString(); } // TODO use the same format

        public toString(): string { return this.d.toUTCString(); }

        // ctx is ignored
        public exportJson(ctx: JsonExportCtx): any {
            return this.d.toJSON();
        }

        // ctx is ignored
        static mkFromJson(ctx: JsonImportCtx, json: any): DateTime {
            if (typeof (json) === "string") {
                return DateTime.mk(new Date(<string> json));
            }
            else
                return undefined;
        }

        private clone() : DateTime { return DateTime.mk(this.d); }

        //? Gets the date
        public date() : DateTime
        {
            var r = this.clone();
            (<any> r.d).setHours(0, 0, 0, 0);
            return r;
        }

        //? Gets the milliseconds elapsed since January 1, 1970 UTC; same as getTime() in JavaScript.
        public milliseconds_since_epoch():number {
            return this.d.getTime();
        }

        //? Converts into text that describes the elapsed time in a friendly way.
        public from_now(): string
        {
            return Util.timeSince(this.d.getTime() / 1000);
        }

        //? Gets the day of the month
        public day() : number { return this.d.getDate(); }

        //? Gets the hour
        public hour() : number { return this.d.getHours(); }

        //? Gets the millisecond
        public millisecond() : number { return this.d.getMilliseconds(); }

        //? Gets the minute
        public minute() : number { return this.d.getMinutes(); }

        //? Gets the month
        public month() : number { return this.d.getMonth() + 1; }

        //? Gets the second
        public second() : number { return this.d.getSeconds(); }

        //? Gets the year
        public year() : number { return this.d.getFullYear(); }

        //? Gets the day of the week (sunday = 0, monday = 1, ... saturday = 6)
        public week_day() : number { return this.d.getDay(); }

        //? Gets the day of the year between 1 and 366
        public year_day() : number
        {
            var first = new Date(this.d.getTime());
            (<any> first).setMonth(0, 1);
            return Math.round((this.d.getTime() - first.getTime()) / (24 * 3600 * 1000)) + 1;
        }

        //? Returns a date that adds the specified number of years to the value of this instance.
        //@ stub
        //@ [years].defl(1)
        public add_years(years: number): DateTime
        { return undefined; }

        //? Returns a date that adds the specified number of months to the value of this instance.
        //@ stub
        //@ [months].defl(1)
        public add_months(months:number) : DateTime
        { return undefined; }

        //? Converts coordinated universal time
        public to_universal_time(): DateTime
        {
            return DateTime.mk(new Date(
                this.d.getUTCFullYear(),
                this.d.getUTCMonth(),
                this.d.getUTCDate(),
                this.d.getUTCHours(),
                this.d.getUTCMinutes(),
                this.d.getUTCSeconds())
                );
        }

        //? Converts to the local time
        //@ stub
        public to_local_time(): DateTime
        { return undefined; }

        //? Prints the date to the wall
        public post_to_wall(s: IStackFrame): void { super.post_to_wall(s) }

        public debuggerDisplay(clickHandler: () => any) {
            var tempSpan: HTMLElement;
            tempSpan = span(null, this.toString()).withClick(clickHandler);
            return tempSpan;
        }
    }
}
