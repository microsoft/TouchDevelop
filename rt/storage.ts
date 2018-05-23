///<reference path='refs.ts'/>


// openDatabase("TDev", "1.0", "TouchDevelop database", 5 * 1024 * 1024).transaction(function (tx) { tx.executeSql("DELETE FROM TABLESessions;"); });

module TDev {
    export module Storage {
        function fatalError(e: any, op: string = undefined) {
            Util.navigateInWindow((<any>window).errorUrl + "#storageinit," + encodeURIComponent(op));
        }
        function versionError(e: any) {
            Util.navigateInWindow((<any>window).errorUrl + "#storageversion");
        }
        function tagError(e: any, origin: string, willRetry: boolean = false) {
            e.isDatabaseError = true;
            e.databaseOrigin = origin;
            Util.log("database error" + (willRetry ? " (will retry)" : " (no retry)") + ": " + Util.getErrorInfo(e));
            return e;
        }
        export interface Table {
            getValueAsync(key: string): Promise; // of string
            getItemsAsync(keys: string[]): Promise; // of Object
            getKeysAsync(): Promise; // of string[]
            setItemsAsync(items: any): Promise; // of void
        }

        // indicates if the database initialization failed and the changes are only stored in memory
        // this mode should only be allowed if no database was ever opened in this browser
        export var temporary = false;
        var temporaryRequestedSignin = false;

        // uses an in-memory object or localstorage
        var memoryStorage: StringMap<string> = {};
        class MemoryTable implements Table {
            public getValueAsync(key: string): Promise {
                var v = memoryStorage[this.tableName + "-" + key];
                if (typeof v !== "string") v = undefined;
                return Promise.as(v);
            }
            public getItemsAsync(keys: string[]): Promise {
                var items = {};
                keys.forEach((k) => {
                    var v = memoryStorage[this.tableName + "-" + k];
                    if (typeof v !== "string") v = undefined;
                    items[k] = v;
                });
                return Promise.as(items);
            }
            public getKeysAsync(): Promise {
                var prefix = this.tableName + "-";
                var results = []
                Object.keys(memoryStorage).forEach(k => {
                    if (k.length > prefix.length && k.slice(0, prefix.length) === prefix) results.push(k.slice(prefix.length));
                });
                return Promise.as(results);
            }
            public setItemsAsync(items: any): Promise { // of string
                Object.keys(items).forEach((k) => {
                    var v = items[k];
                    if (typeof v === "string")
                        memoryStorage[this.tableName + "-" + k] = v;
                    else
                        delete memoryStorage[this.tableName + "-" + k];
                });
                return Promise.as();
            }
            constructor(public tableName: string) {
                Storage.temporary = true;
            }
        }

        export function createMemoryTable(tableName: string): Table {
            return new MemoryTable(tableName);
        }

        /*
                class StorageTable implements Table {
                    static localStorage = window.localStorage;
                    public getValueAsync(key: string): Promise {
                        var v = localStorage[this.tableName + "-" + key];
                        if (typeof v !== "string") v = undefined;
                        return Promise.as(v);
                    }
                    public getItemsAsync(keys: string[]): Promise {
                        var items = {};
                        keys.forEach((k) => {
                            var v = localStorage[this.tableName + "-" + k];
                            if (typeof v !== "string") v = undefined;
                            items[k] = v;
                        });
                        return Promise.as(items);
                    }
                    public getKeysAsync(): Promise {
                        var len = localStorage.length;
                        var prefix = this.tableName + "-";
                        var results = []
                        for (var i = 0; i < len; ++i) {
                            var k = localStorage.key(i);
                            if (k.length > prefix.length && k.slice(0, prefix.length) === prefix) results.push(k.slice(prefix.length));
                        }
                        return Promise.as(results);
                    }
                    public setItemsAsync(items: any): Promise {
                        Object.keys(items).forEach((k) => {
                            var v = items[k];
                            if (typeof v === "string")
                                localStorage[this.tableName + "-" + k] = v;
                            else
                                localStorage.removeItem(this.tableName + "-" + k);
                        });
                        return Promise.as();
                    }
                    constructor (public tableName: string) {
                    }
                }
        */
        export var tableNames = ["Editor", "Index", "Scripts", "ScriptCache", "Traces", "ApiCache", "ArtCache", "Sessions"];
        var indexedDBDeleting: boolean = false
        var indexedDBPromise: Promise
        var indexedDB: IDBDatabase
        class IndexedDBTable implements Table {
            public getValueAsync(key: string): Promise {
                return this.getItemsAsync([key]).then((items) => items[key]);
            }
            public getItemsAsync(keys: string[]): Promise {
                if (keys.length == 0) return Promise.as({})
                return new Promise((onSuccess: (v: any) => any, onError: (v: any) => any, onProgress: (v: any) => any) => {
                    try {
                        var trans = indexedDB.transaction([this.tableName], <any>'readonly');
                        var store = trans.objectStore(this.tableName);
                        var requests = keys.map((k) => store.get(k));
                        var items = {}
                        var missing = keys.length
                        requests.forEach((r: any, i: number) => {  // TSBUG: remove type annotations and see it crash
                            r.onsuccess = (e: any) => {
                                var result = e.target.result;
                                items[keys[i]] = result === undefined ? undefined : result.value;
                                if (--missing == 0) onSuccess(items);
                            };
                            r.onerror = (e: any) => {
                                if (missing >= 0) { missing = -1; onError(tagError(e, "IndexedDBTable.getItemsAsync/0", false)); };
                            };
                        });
                    } catch (e) {
                        onError(tagError(e, "IndexedDBTable.getItemsAsync/1", false));
                    }
                });
            }
            public getKeysAsync(): Promise {
                return new Promise((onSuccess: (v: any) => any, onError: (v: any) => any, onProgress: (v: any) => any) => {
                    try {
                        var trans = indexedDB.transaction([this.tableName], <any>'readonly');
                        var store = trans.objectStore(this.tableName);
                        var request = store.openCursor();
                        var results = [];
                        request.onsuccess = (e) => {
                            var cursor = <IDBCursor>((<IDBRequest>e.target).result);
                            if (!!cursor) {
                                results.push(cursor.key);
                                cursor["continue"]();
                            }
                            else
                                onSuccess(results);
                        };
                        request.onerror = onError;
                    } catch (e) {
                        onError(tagError(e, "IndexedDBTable.getKeysAsync", false));
                    }
                });
            }
            public setItemsAsync(items: any): Promise {
                var list = []
                Object.keys(items).forEach((k) => { list.push({ key: k, value: items[k] }); });
                if (list.length == 0) return Promise.as();
                return new Promise((onSuccess: (v: any) => any, onError: (v: any) => any, onProgress: (v: any) => any) => {
                    try {
                        var requests = list.map((kvp) => {
                            var trans = indexedDB.transaction([this.tableName], <any>'readwrite');
                            var store = trans.objectStore(this.tableName);
                            if (typeof kvp.value === "string")
                                return store.put(kvp);
                            else
                                return store["delete"](kvp.key);
                        });
                        var missing = requests.length
                        requests.forEach((r: any, i: number) => {
                            r.onsuccess = (e: any) => {
                                if (--missing == 0) onSuccess(undefined);
                            };
                            r.onerror = (e: any) => {
                                if (missing >= 0) { missing = -1; onError(tagError(e, "IndexedDBTable.setItemsAsync/0", false)); };
                            };
                        });
                    } catch (e) {
                        onError(tagError(e, "IndexedDBTable.setItemsAsync/1", false));
                    }
                });
            }
            constructor (public tableName: string) {
            }
        }
        function indexedDBupgrade(indexedDB: IDBDatabase): void {
            try {
                var names = indexedDB.objectStoreNames;
                var exisiting: any = {}
                for (var i = 0; i < names.length; i++) {
                    if (tableNames.indexOf(names[i]) < 0)
                        indexedDB.deleteObjectStore(names[i]);
                    else
                        exisiting[names[i]] = true;
                }
                tableNames.forEach(function (tableName) {
                    if (!exisiting[tableName])
                        indexedDB.createObjectStore(tableName, { keyPath: "key" });
                });
            } catch (e) {
                Util.reportError("indexedDBupgrade", e, true);
            }
        }
        interface WebSqlTransactionResultsRows {
            length: number;
            item(index: number): any;
        }
        interface WebSqlTransactionResults {
            rows: WebSqlTransactionResultsRows;
        }
        interface WebSqlTransaction {
            executeSql(query: string);
            executeSql(query: string, parameters: string[]);
            executeSql(query: string, parameters: string[], callback: (tx: WebSqlTransaction, results: WebSqlTransactionResults) => void );
        }
        interface WebSql {
            transaction(callback: (tx: WebSqlTransaction) => void , onError: (error: any) => void , onSuccess: () => void ): void;
        }
        var webSqlDeleting: boolean = false
        var webSqlPromise: Promise
        var webSql: WebSql
        class WebSqlTable implements Table {
            public getValueAsync(key: string): Promise {
                return this.getItemsAsync([key]).then((items) => items[key]);
            }
            internalGetItemsAsync(items: any, keys: string[], start: number, retries: number = 3): Promise {
                if (start >= keys.length) return Promise.as(items);
                var end = start + 256; // splitting up as WebSQL seems to impose a limit of 1000 items in a single query
                if (end > keys.length) end = keys.length;
                return new Promise((onSuccess: (v: any) => any, onError: (v: any) => any, onProgress: (v: any) => any) => {
                    var propagated = false;
                    var errorHandler = (e, origin) =>
                    {
                        if (!propagated) {
                            propagated = true;
                            tagError(e, "WebSqlTable.internalGetItemsAsync/" + origin, retries > 0);
                            if (retries > 0)
                                delayCreateWebSqlAsync().then(() => this.internalGetItemsAsync(items, keys, start, retries - 3)).done(onSuccess, onError);
                            else
                                onError(e);
                        }
                    };
                    try {
                        webSql.transaction((tx) => {
                            var query = "SELECT * FROM TABLE" + this.tableName + " WHERE ";
                            var values = [];
                            for (var i = start; i < end; i++) {
                                if (i > start) query += " OR ";
                                query += "id=?";
                                values.push(keys[i]);
                            }
                            try {
                                tx.executeSql(query, values, (tx, results) => {
                                    var len = results.rows.length;
                                    for (var i = 0; i < len; i++) {
                                        var item = results.rows.item(i);
                                        items[<string>item.id] = item.text;
                                    }
                                });
                            } catch (e) {
                                errorHandler(e, 0);
                            }
                        }, (e) => errorHandler(e, 1),
                        () => {
                            if (!propagated) {
                                propagated = true;
                                onSuccess(items);
                            }
                        });
                    } catch (e) {
                        errorHandler(e, 2);
                    }
                }).then(() => this.internalGetItemsAsync(items, keys, end));
            }
            public getItemsAsync(keys: string[]): Promise {
                return this.internalGetItemsAsync({}, keys, 0);
            }
            public getKeysAsync(retries: number = 3): Promise {
                return new Promise((onSuccess: (v: any) => any, onError: (v: any) => any, onProgress: (v: any) => any) => {
                    var keys = []
                    var propagated = false;
                    var errorHandler = (e, origin) =>
                    {
                        if (!propagated) {
                            propagated = true;
                            tagError(e, "WebSqlTable.getKeysAsync/" + origin, retries > 0)
                            if (retries > 0)
                                delayCreateWebSqlAsync().then(() => this.getKeysAsync(retries - 1)).done(onSuccess, onError);
                            else
                                onError(e);
                        }
                    }
                    try {
                        webSql.transaction((tx) => {
                            try {
                                tx.executeSql("SELECT id FROM TABLE" + this.tableName, [], (tx, results) => {
                                    var len = results.rows.length
                                    for (var i = 0; i < len; i++) {
                                        var item = results.rows.item(i);
                                        keys.push(item.id);
                                    }
                                });
                            } catch (e) {
                                errorHandler(e, 0);
                            }
                        }, (e) => errorHandler(e, 1),
                        () => {
                            if (!propagated) {
                                propagated = true;
                                onSuccess(keys);
                            }
                        });
                    } catch (e) {
                        errorHandler(e, 2);
                    }
                });
            }
            public setItemsAsync(items: any, retries: number = 3): Promise {
                var list = []
                Object.keys(items).forEach((k) => { list.push({ key: k, value: items[k] }); });
                if (list.length == 0) return Promise.as();
                return new Promise((onSuccess: (v: any) => any, onError: (v: any) => any, onProgress: (v: any) => any) => {
                    var propagated = false;
                    var errorHandler = (e, origin) =>
                    {
                        if (!propagated) {
                            propagated = true;
                            tagError(e, "WebSqlTable.setItemsAsync/" + origin, retries > 0)
                            if (retries > 0)
                                delayCreateWebSqlAsync().then(() => this.setItemsAsync(items, retries - 1)).done(onSuccess, onError);
                            else
                                onError(e);
                        }
                    };
                    try {
                        webSql.transaction((tx) => {
                            list.forEach((kvp) => {
                                try {
                                    if (typeof kvp.value === "string")
                                        tx.executeSql("INSERT OR REPLACE INTO TABLE" + this.tableName + " (id, text) VALUES (?, ?)", [kvp.key, kvp.value]);
                                    else
                                        tx.executeSql("DELETE FROM TABLE" + this.tableName + " WHERE id=?", [kvp.key]);
                                } catch (e) {
                                    errorHandler(e, 0);
                                }
                            });
                        }, (e) => errorHandler(e, 1),
                        () => {
                            if (!propagated) {
                                propagated = true;
                                onSuccess(undefined);
                            }
                        });
                    } catch (e) {
                        errorHandler(e, 2);
                    }
                });
            }
            constructor (public tableName: string) {
            }
        }
        function webSqlInit(webSql: WebSql, onSuccess: (webSql: WebSql) => void , onError: (error: any) => void , retries = 3): void {
            var propagated = false;
            var errorHandler = (e, origin) =>
            {
                if (!propagated) {
                    propagated = true;
                    tagError(e, "WebSqlTable.webSqlInit/" + origin, retries > 0)
                    if (retries > 0)
                        delayCreateWebSqlAsync(retries - 1).done(onSuccess, onError);
                    else
                        onError(e);
                }
            };
            try {
                webSql.transaction(function (tx) {
                    tableNames.forEach(function (tableName) {
                        try {
                            tx.executeSql("CREATE TABLE IF NOT EXISTS TABLE" + tableName + " (id unique, text)");
                        } catch (e) {
                            errorHandler(e, 0);
                        }
                    });
                }, (e) => errorHandler(e, 1),
                () => {
                    if (!propagated) {
                        propagated = true;
                        onSuccess(webSql);
                    }
                });
            } catch (e) {
                errorHandler(e, 2);
            }
        }

        function getWebSqlAsync(retries: number = 3): Promise // of WebSql
        {
            if (webSql) return Promise.as(webSql);
            if (!webSqlPromise) {
                if (webSqlDeleting) return Promise.delay(1000, () => getWebSqlAsync(retries));
                webSqlPromise = internalGetWebSqlAsync(retries);
            }
            return webSqlPromise;
        }

        function internalGetWebSqlAsync(retries: number = 3): Promise {
            return new Promise((onSuccess: (v: any) => any, onError: (v: any) => any, onProgress: (v: any) => any) => {
                var propagated = false;
                var errorHandler = (e, origin) => {
                    if (!propagated) {
                        propagated = true;
                        tagError(e, "WebSqlTable.internalGetWebSqlAsync/" + origin, retries > 0)
                        if (retries > 0)
                            Promise.delay(2000, () => internalGetWebSqlAsync(retries - 1)).done(onSuccess, onError);
                        else {
                            Util.log("error during openDatabase " + Util.getErrorInfo(e));
                            if (Browser.canMemoryTable) onSuccess(undefined);
                            else fatalError(e, "during openDatabase: " + Util.getErrorInfo(e));
                        }
                    }
                };
                try {
                    webSqlInit((<any>window).openDatabase("TDev", "1.0", "TouchDevelop database", 5 * 1024 * 1024),
                        function (webSqlInitialized) {
                            webSql = webSqlInitialized;
                            onSuccess(webSql);
                        }, e => errorHandler(e, 0),
                        retries);
                } catch (e) {
                    errorHandler(e, 1);
                }
            });
        }

        function delayCreateWebSqlAsync(retries: number = 3): Promise // of WebSql
        {
            webSql = undefined;
            webSqlPromise = undefined;
            return Promise.delay(2000, () => getWebSqlAsync(retries));
        }

        function getIndexedDBFactory(): IDBFactory {
            var w = <any>window;
            return w.indexedDB || w.mozIndexedDB || w.msIndexedDB; // w.webkitIndexedDB
        }
        function getIndexedDBAsync(): Promise // of IDBDatabase
        {
            if (temporary) return Promise.as(undefined);
            if (indexedDB) return Promise.as(indexedDB);
            if (!indexedDBPromise) {
                if (indexedDBDeleting) return Promise.delay(1000, () => getIndexedDBAsync());
                indexedDBPromise = new Promise((onSuccess: (v: any) => any, onError: (v: any) => any, onProgress: (v: any) => any) => {
                    var version = 26;
                    try {
                        var request = getIndexedDBFactory().open("TDev", version);
                        request.onupgradeneeded = function (e) { indexedDBupgrade(request.result); };
                        request.onsuccess = function (e) { indexedDB = request.result; onSuccess(indexedDB); };
                        request.onblocked = function (e) { fatalError(e, "blocked during open " + Util.getErrorInfo(request.error)); }
                        request.onerror = function (e) {
                            if (request.error && request.error.name == "VersionError")
                                versionError(e);
                            else {
                                Util.log("error during openDatabase " + Util.getErrorInfo(request.error));
                                if (Browser.canMemoryTable) onSuccess(undefined);
                                else fatalError(e, "error during openDatabase " + Util.getErrorInfo(request.error));
                            }
                        }
                    } catch (e) {
                        Util.log("error during openDatabase " + Util.getErrorInfo(request.error));
                        if (Browser.canMemoryTable) onSuccess(undefined);
                        else fatalError(e, "during openDatabase " + Util.getErrorInfo(e));
                    }
                });
            }
            return indexedDBPromise;
        }
        export var getTableAsync = (tableName: string): Promise => // of Table
        {
            if (!temporary && Browser.webAppImplicit) {
                Util.log('implicit web app: disable database storage');
                temporary = true;
                Browser.canMemoryTable = true;
            }
            if (!temporary) {
                if (Browser.canWebSql)
                    return getWebSqlAsync().then((myWebSql) => {
                        if (!myWebSql) {
                            Util.log('webSql openDatabase failed');
                            temporary = true;
                            return Storage.getTableAsync(tableName);
                        } else {
                            Browser.supportMemoryTable(false); // remember that a resilient database is available
                            return Promise.as(new WebSqlTable(tableName));
                        }
                    });
                if (Browser.canIndexedDB) {
                    return getIndexedDBAsync().then((database) => {
                        if (!database) {
                            Util.log('indexedDB openDatabase failed');
                            temporary = true;
                            return Storage.getTableAsync(tableName);
                        }
                        else {
                            Browser.supportMemoryTable(false); // remember that a resilient database is available
                            return Promise.as(new IndexedDBTable(tableName));
                        }
                });
                }
            }

            if (Browser.canMemoryTable) {
                Util.log('storage: opening in-memory table ' + tableName);
                return Promise.as(new MemoryTable(tableName));
           }
           else
                throw tagError(new Error("no database available"), "getTableAsync", false);
        }
        function webSqlClearAsync(retries: number = 3): Promise // of void
        {
            return getWebSqlAsync().then(myWebSql =>
            {
                webSql = undefined;
                webSqlPromise = undefined;

                webSqlDeleting = true;
                return new Promise((onSuccess: (v: any) => any, onError: (v: any) => any, onProgress: (v: any) => any) => {
                    var propagated = false;
                    var errorHandler = (e, origin) =>
                    {
                        webSql = undefined;
                        if (!propagated) {
                            propagated = true;
                            webSqlDeleting = false;
                            tagError(e, origin, retries > 0);
                            if (retries > 0)
                                delayCreateWebSqlAsync().then(() => webSqlClearAsync(retries - 1)).done(onSuccess, onError);
                            else
                                fatalError(e, "during drop " + Util.getErrorInfo(e));
                        }
                    };
                    try {
                        myWebSql.transaction(function (tx) {
                            tableNames.forEach(function (tableName) {
                                try {
                                    tx.executeSql("DROP TABLE TABLE" + tableName);
                                } catch (e) {
                                    errorHandler(e, "0");
                                }
                            });
                        }, (e) => errorHandler(e, 1),
                        () => {
                            webSql = undefined;
                            if (!propagated) {
                                propagated = true;
                                webSqlDeleting = false;
                                onSuccess(undefined);
                            }
                        });
                    } catch (e) {
                        errorHandler(e, 2);
                    }
                });
            });
        }
        function indexedDBClearAsync() {
            if (indexedDB) {
                try {
                    indexedDB.close();
                } catch (e) { }
                indexedDB = null;
            }
            indexedDBPromise = undefined;

            indexedDBDeleting = true;
            return new Promise((onSuccess: (v: any) => any, onError: (v: any) => any, onProgress: (v: any) => any) => {
                try {
                    var request = getIndexedDBFactory().deleteDatabase("TDev");
                    request.onsuccess = function (e) {
                        if (!indexedDBDeleting) return
                        indexedDBDeleting = false;
                        onSuccess(undefined);
                    };
                    request.onblocked = request.onerror = function (e) {
                        if (!indexedDBDeleting) return
                        indexedDBDeleting = false;
                        onError(e);
                    }
                } catch (e) {
                    indexedDBDeleting = false;
                    onError(e);
                }
            });
        }

        export var clearPreAsync = () => Promise.as();

        export function clearAsync(): Promise // of void
        {
            // TODO: race --- Promises that are still ongoing will probably result in errors
            var p = clearPreAsync();
            if (Browser.canWebSql)
                p = p.then(() => {
                    Util.log("clearing WebSql");
                    return getWebSqlAsync();
                }).then((wsql) => {
                    if (!wsql) return Promise.as(undefined);
                    return webSqlClearAsync().then(() => getWebSqlAsync(), () => { });
                });
            if (Browser.canIndexedDB)
                p = p.then(() => {
                    Util.log("clearing IndexedDB");
                    return indexedDBClearAsync();
                }).then(_ => _, _ => { }); // swallow errors
            p = p.then(() => {
                Util.log("clearing localStorage");
                var oauth_states = window.localStorage["oauth_states"];
                window.localStorage.clear();
                if (oauth_states) window.localStorage["oauth_states"] = oauth_states;
                Browser.supportMemoryTable(true);
            });
            return p;
        }

        export function logContentsAsync(details: boolean): Promise {
            var formatBytes = n =>
                n < 1024 ? (n + " B") : n < 1024 * 1024 ? (Math.floor(n / 1024) + " KB") : (Math.floor(n / 1024 / 1024) + " MB");
            return Promise.sequentialMap(tableNames, tableName =>
                getTableAsync(tableName).then(table =>
                    table.getKeysAsync().then(keys =>
                        Promise.sequentialMap(keys, key =>
                            table.getValueAsync(key).then(value => {
                                if (details) {
                                    var escapedKey = (key + '').replace(/[\\"']/g, '\\$&').replace(/\u0000/g, '\\0');
                                    Util.log("DB table " +tableName + '["' +escapedKey + '"].length=' +formatBytes(value.length));
                                }
                                return keys.length + value.length;
            })).then(lengths => {
                                var sum = lengths.reduce((a, b) => a + b, 0);
                                                    Util.log("DB table " + tableName + " size: " + formatBytes(sum));
                                return sum;
            })))).then(lengths =>
            {
                var sum = lengths.reduce((a, b) => a + b, 0);
                Util.log("DB total size: " + formatBytes(sum));
            });
        }
    }
}
