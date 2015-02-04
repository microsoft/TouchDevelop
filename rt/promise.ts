module TDev {
    export enum PromiseState {
        Pending,
        Success,
        Error,
    }
    export class Promise {
        static errorHandler: (ctx:string, err:any) => void = (ctx, err) => { throw err };
        static checkHandler: (message:string) => void = (msg) => { Promise.errorHandler("promise-check", new Error(msg)) };

        public _listeners: Promise[] = [];
        public _value: any;
        public _state: PromiseState = PromiseState.Pending;
        public _notify(l: Promise) : void {            
            if (this._value instanceof Promise) {
                var p = <Promise>this._value;
                if (!!p._state)
                    p._notify(l);
                else
                    p._listeners.push(l);
            }
            else 
                l._onNotify(this);
        }
        public isPending() { return this._state == PromiseState.Pending }
        constructor(init: (onSuccess: (v: any) => any, onError: (v: any) => any, onProgress: (v: any) => any) => void, public _onNotify: (p: Promise) => void = undefined) {
            if (!!init) {
                var promise = this;
                try {
                    init(
                        function (v) { 
                            if (promise._state != PromiseState.Pending) {
                                Promise.checkHandler("trying to resolve promise more than once")
                                return; 
                            }
                            promise._value = v;
                            promise._state = PromiseState.Success;
                            promise._notifyListeners(); 
                        },
                        function (v) {
                            if (promise._state == PromiseState.Error) {
                                Promise.checkHandler("trying to resolve (error) promise more than once")
                                return;
                            }
                            promise._value = v || new Error("An error occured");
                            promise._state = PromiseState.Error;
                            promise._notifyListeners(); 
                        },
                        undefined); // TODO: progress
                } catch (err) {
                    //debugger
                    Promise.errorHandler("promiseCtor", err);
                }
            }
        }
        public _notifyListeners() : void { this._listeners.forEach((p) => this._notify(p)); }
        static propagate(s: PromiseState, v: any, onSuccess: (v: any) => any, onError: (v: any) => any) : void {
            if (s === PromiseState.Success && v instanceof Promise) {
                var q = <Promise>v;
                if (!!q._state) {
                    v = q._value;
                    if (q._state == PromiseState.Error) s = PromiseState.Error;
                }
                else {
                    q._listeners.push(new Promise(undefined, () => {
                        Promise.propagate(q._state, q._value, onSuccess, onError);
                    }));
                    return;
                }
            }
            if (s === PromiseState.Error)
                onError(v);
            else
                onSuccess(v);
        }
        public then(onSuccess: (v: any) => any, onError: (v: any) => any = undefined, onProgress: (v: any) => any = undefined) : Promise {
            var onSuccess3: (v: any) => any
            var onError3: (v: any) => any
            var r = new Promise((onSuccess2: (v: any) => any, onError2: (v: any) => any, onProgress2: (v: any) => any) => {                
                onSuccess3 = onSuccess2;
                onError3 = onError2;
            }, function(p: Promise) {
                var v = p._value;
                var s = p._state;
                if (s === PromiseState.Error) {
                    if (!!onError) 
                    try {                        
                        v = onError(v);
                        s = PromiseState.Success;
                    } catch (e) {
                        v = e;
                        s = PromiseState.Error;
                    }
                } else {
                    if (!!onSuccess)
                    try {
                        v = onSuccess(v);
                        s = PromiseState.Success;
                    } catch(e) {
                        v = e;
                        s = PromiseState.Error;
                    }
                }
                Promise.propagate(s, v, onSuccess3, onError3);
            });
            if (!!this._state) 
                this._notify(r);
            else
                this._listeners.push(r);
            return r;
        }
        public done(onSuccess: (v: any) => any = undefined, onError: (v: any) => any = undefined, onProgress: (v: any) => any = undefined) : void {
            this.then(onSuccess, onError, onProgress).then(undefined, function(e) {
                Promise.errorHandler("promiseDone", e);
            });
        }
        public thenalways(onSuccessOrError: (v: any) => any, onProgress: (v: any) => any = undefined): Promise {
            return this.then(onSuccessOrError, onSuccessOrError, onProgress);
        }
        static is(v: any) : boolean {
            return v instanceof Promise;
        }
        static as(v: any = undefined) : Promise {
            return v instanceof Promise ? v : Promise.wrap(v);
        }
        static wrap(v: any = undefined) : Promise {
            return new Promise((onSuccess: (v: any) => any, onError: (v: any) => any, onProgress: (v: any) => any) => {                    
                onSuccess(v);
            });
        }
        static wrapError(v: any = undefined) : Promise {
            return new Promise((onSuccess: (v: any) => any, onError: (v: any) => any, onProgress: (v: any) => any) => {                    
                onError(v);
            });
        }
        static delay(ms:number, f: () => Promise = null) : Promise 
        {
            return new Promise((onSuccess: (v: any) => any, onError: (v: any) => any, onProgress: (v: any) => any) => {
                window.setTimeout(() => f ? f().then(v => onSuccess(v), e => onError(e), v => onProgress(v)) : onSuccess(undefined), ms);
            });
        }
        static join(values: any) : Promise {
            return new Promise((onSuccess: (v: any) => any, onError: (v: any) => any, onProgress: (v: any) => any) => {
                var keys = Object.keys(values);
                var errors = Array.isArray(values) ? <any>new Array(values.length) : {};
                var results = Array.isArray(values) ? <any>new Array(values.length) : {};
                if (keys.length == 0) { onSuccess(results); return; }
                var missing = keys.length;
                var next = function() { 
                    if (--missing == 0) 
                        if (Object.keys(errors).length == 0)
                            onSuccess(results);
                        else
                            onError(errors);
                };
                keys.forEach(function (key) { Promise.as(values[key]).then(
                            function(v) { results[key] = v; next(); }, 
                            function (v) { errors[key] = v; next(); }); });
            });           
        }
        static thenEach(values: any, onSuccess: (v: any) => any = undefined, onError: (v: any) => any = undefined, onProgress: (v: any) => any = undefined) : Promise {
            var result = Array.isArray(values) ? <any>new Array(values.length) : {};
            Object.keys(values).forEach(function (key) {
                result[key] = Promise.as(values[key]).then(onSuccess, onError, onProgress);
            });
            return Promise.join(result);
        }
        // Execute f on each element of values, waiting for each result before starting on the next one.
        // E.g. Promise.join(arr.map(f)) and Promise.sequentialMap(arr, f) will run the same code,
        // but join/map may interleave execution of promises returned by f, whereas sequentialMap will not.
        // f will usually returns a promise, whereas values may be an object consisting of promises or not
        static sequentialMap(values:any, f:(v:any, key:any, results:any)=>any) : Promise {
            return new Promise((onSuccess: (v: any) => any, onError: (v: any) => any, onProgress: (v: any) => any) => {
                var keys = Object.keys(values)
                var results = Array.isArray(values) ? <any>new Array(values.length) : {};
                function next(i:number) { 
                    if (i >= keys.length) {
                        onSuccess(results);
                    } else {
                        var key = keys[i];
                        try {
                            Promise.as(values[key]).done(function (x) {
                                Promise.as(f(x, key, results)).done(
                                    function (v) { results[key] = v; next(i+1); }, 
                                    onError);
                            });
                        } catch (e) {
                            onError(e);
                        }
                    }
                }
                next(0);
            });           

        }
    }

    // promise with the control inverted
    export class PromiseInv extends Promise
    {
        public success: (v:any)=>void;
        public error: (v:any)=>void;

        constructor()
        {
            super((onSuccess: (v: any) => any, onError: (v: any) => any) => {
                this.success = onSuccess;
                this.error = onError;
            })
        }

        static as(v:any = undefined)
        {
            var r = new PromiseInv();
            r.success(v);
            return r;
        }
    }

}

