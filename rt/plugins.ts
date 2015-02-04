///<reference path='refs.ts'/>

module TDev.Plugins {
    class PluginHost
        extends HeadlessHost
    {
        public slotId:string;

        public exceptionHandler(e:any)
        {
            super.exceptionHandler(e);

            (<any>self).postMessage({
                tdSlotId: this.slotId,
                id: Random.uniqueId(),
                op: "plugin_crashed",
                message: this.lastError,
            })
        }

        constructor() {
            super()
            this.currentRt = new Runtime();
            this.currentRt.runtimeKind = () => "plugin"
        }

    }

    var hosts:StringMap<PluginHost> = {};

    function uninstallPlugin(d:any)
    {
        var h = hosts[d.slotId]
        if (h) {
            Util.log("shutting down plugin, id:"+ d.slotId)
            h.currentRt.stopAsync().done();
            delete hosts[d.slotId]
        }
    }

    function installPlugin(d:any)
    {
        Util.log("installing plugin, id:" + d.slotId)

        var host = new PluginHost()
        hosts[d.slotId] = host
        host.slotId = d.slotId

        Promise.errorHandler = (ctx, err) => host.exceptionHandler(err);

        eval(d.precompiled.replace(/^var TDev;/, ""))

        Random.strongEntropySource = (buf) => {
            for (var i = 0; i < buf.length; ++i)
                buf[i] = d.entropy.charAt(i)
        }

        host.initFromPrecompiled()
        var rt = host.currentRt
        Runtime.theRuntime = rt
        rt.pluginSlotId = d.slotId
        rt.initDataAsync().then(() => {
            var cs = rt.compiled
            var fn = cs.actionsByName[cs.mainActionName];
            rt.run(fn, null);
        }).done()
    }

    function processMessage(e:MessageEvent)
    {
        //console.log("in worker: " + e.data)
        var d = e.data
        if (!d) return
        if (!d.tdOperation) {
            var send = h => {
                if (h && !h.currentRt.isStopped())
                    RT.Web.receiveWorkerMessage(h.currentRt, e.data)
            }
            if (d.tdSlotId) {
                send(hosts[d.tdSlotId])
            } else {
                Util.values(hosts).forEach(send)
            }
        } else {
            switch (d.tdOperation) {
                case "install":
                    installPlugin(d)
                    break;
                case "uninstall":
                    uninstallPlugin(d)
                    break
                default:
                    Util.log("operation unknown: " + d.tdOperation)
                    break
            }
        }
    }

    export function initWebWorker()
    {
        var w = <any>window
        w.setTimeout = (a, b) => self.setTimeout(a, b);

        var ls = <any>{};
        w.localStorage = ls;
        ls.getItem = (s) => ls[s]
        ls.setItem = (s, v) => ls[s] = v + ""
        ls.removeItem = (s) => delete ls[s]

        Cloud.authenticateAsync = () => Promise.as(false);

        Browser.detect()
        Util.log("initilize web worker for plugins")
        self.onmessage = Util.catchErrors("worker-msg", processMessage)

        Util.initGenericExtensions();
        Ticker.disable()

        self.postMessage({ tdStatus: "ready" }, null)
    }


    var worker;
    export function startWorker()
    {
        worker = new Worker("worker.js");
        worker.postMessage({
            op: "load",
            url: "browser.js"
        })
        worker.postMessage({
            op: "load",
            url: "main.js"
        })
    }


}
