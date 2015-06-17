///<reference path='refs.ts'/>

module TDev.RT.Perf {
    export var timeReporting = false;

    export interface IPerfTimestamp {
        time: number;
        id: string;
        lastPause: number;
        report: boolean; // should report to the cloud?
    }

    export function unit(): number {
        var ret = -1;

        if (Browser.isNodeJS) return ret;

        try {
            ret = parseFloat(localStorage["perfunit"] || -1);
        } catch (e) {
            Util.log("perf: Failed to read from localStorage");
        }
        return ret;
    }

    export function setUnit(value: number) {
        Util.log('perf: unit = ' + value.toFixed(0) + ' ms');
        try {
            localStorage["perfunit"] = value;
        } catch (e) {
            Util.log("perf: Failed to write to localStorage");
        }
    }

    export interface PerfData {
        unitduration: number;    // in ms (unit benchmark duration)
        duration: number;        // ms (for the current measurement)
        id: string;              // unique identifier for this benchmark
        jsduration?: number;     // time taken by optimized javascript if
                                 // available
        compilerflags?: string;  // flags given to the compiler
        compilerversion: string; // some compiler version
        releaseid: string;       // touchdevelop releaseid
        userplatform: string[];  // where it was running
    }

    export function start(id: string, report = false): IPerfTimestamp {
        return { id: id, time: Util.perfNow(), lastPause: -1, report: report };
    }

    export function startPaused(id: string, report = false): IPerfTimestamp {
        var now = Util.perfNow();
        return { id: id, time: now, lastPause: now, report: report };
    }

    var perfEvents: PerfData[] = [];
    var compilerVersion: string;
    var releaseId: string;

    export function init(compversion: string, release: string) {
        compilerVersion = compversion;
        releaseId = release;

        if (Cloud.hasAccessToken() && Cloud.isOnline())
            sendPerfEvents();
    }

    export function saveCurrentAsync(sendToCloud = false): Promise {
        var prevEvents: PerfData[] = [];
        var archived = window.localStorage["archivedPerfData"];

        if (archived != undefined && archived.length > 0)
            prevEvents = JSON.parse(archived);
        prevEvents = prevEvents.concat(perfEvents);
        perfEvents = [];

        if (prevEvents.length > 500)
            prevEvents = prevEvents.slice(prevEvents.length - 500);

        var newVal = JSON.stringify(prevEvents);
        if (newVal.length > 50000)
            newVal = "[]";
        window.localStorage["archivedPerfData"] = newVal;

        if (sendToCloud && Cloud.hasAccessToken() && Cloud.isOnline())
            return sendPerfEvents();
        else
            return Promise.as(undefined);
    }

    function sendPerfEvents(): Promise {
        var rp = new PromiseInv();
        var events: PerfData[];
        var archived = window.localStorage["archivedPerfData"];

        if (archived == undefined || archived.length == 0)
            return Promise.as(undefined);
        events = JSON.parse(archived);

        if (events == undefined || events.length == 0)
            return Promise.as(undefined);

        events.forEach((e: PerfData) => {
            e.userplatform = Browser.platformCaps;
        });

        Cloud.postPrivateApiAsync("benchmarks", events).done(
            json => {
                window.localStorage["archivedPerfData"] = [];
                rp.success(undefined);
                Util.log("perf: Perf data successfully submitted.");
            },
            e => {
                Util.log("perf: Failed to send events.")
                rp.error(undefined);
            }
            );
        return rp;
    }

    export function pushCustomData(data: PerfData): void {
        if(Util.check(!isNaN(data.duration) && data.duration > 0 && data.duration < 1e6, "invalid duration " + JSON.stringify(data)))
            perfEvents.push(data);
    }

    export function purgeSavedEvents(): void {
        perfEvents = [];
    }

    export function stop(ts: IPerfTimestamp): number {
        var end = Util.perfNow();
        var durr = 0;
        if (ts.lastPause == -1)
            durr = end - ts.time;
        else {
            durr = ts.lastPause - ts.time;
        }
        durr = Math.round(durr * 100) / 100;

        var u = unit();
        if (ts.report) {
            if (u > 0 && compilerVersion != undefined && releaseId != undefined) {
                var data: PerfData = {
                    unitduration: u,
                    duration: durr,
                    id: ts.id,
                    compilerversion: compilerVersion,
                    releaseid: releaseId,
                    userplatform: null // fill this when sending to cloud
                };
                if(Util.check(!isNaN(data.duration) && data.duration > 0 && data.duration < 1e6, "invalid duration"))
                    perfEvents.push(data);
            }
        }

        if (timeReporting) {
            if (u > 0)
                Util.log(Util.fmt('perf: {0} - {1} - {2}ms', ts.id, (durr / u).toFixed(2), durr.toFixed(0)));
            else
                Util.log(Util.fmt('perf: {0} - {1}ms', ts.id, durr.toFixed(0)));
        }
        return durr;
    }

    export function ellapsed(ts: IPerfTimestamp): number {
        var end = Util.perfNow();
        var durr = 0;
        if (ts.lastPause == -1)
            durr = end - ts.time;
        else {
            durr = ts.lastPause - ts.time;
        }
        return durr;
    }

    export function pause(ts: IPerfTimestamp): void {
        if (ts.lastPause == -1)
            ts.lastPause = Util.perfNow();
    }

    export function resume(ts: IPerfTimestamp): void {
        if (ts.lastPause != -1) {
            ts.time = Util.perfNow() - (ts.lastPause - ts.time);
            ts.lastPause = -1;
        }
    }
}
