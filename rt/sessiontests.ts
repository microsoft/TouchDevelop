
///<reference path='refs.ts'/>


module TDev {

    export module Revisions {

        export class SessionTests {

            constructor(public rt: Runtime) { }

            public runtest(which: string): void {
                if (typeof this[which] === "function") {
                    this.print("running test \"" + which + "\"");
                    this[which]();
                }
                else
                    this.print("no such test: \"" + which + "\"");
            }

            private print(s: string) {
                this.rt.postBoxedText(s, "");
            }
            public fail(msg: string) {
                this.print("FAILED: " + msg);
            }
            public assert(cond: boolean) {
                if (!cond) this.print("FAILED");
            }

            // common

            private randomsuffix(): string {
                var d = new Date();
                var ms = d.getMilliseconds();
                return String.fromCharCode("a".charCodeAt(0) + ms % 26) + String.fromCharCode("a".charCodeAt(0) + Math.floor(ms / 26) % 26);
            }
            /*

            // collab tests
            public collabAdd() {
                var p = Promise.as();
                p = p.then(() => this.print("initially----------------------------"));
                p = p.then(() => {
                    this.print("list invitations for group:");
                    return TDev.Collab.getCollaborationsAsync("coepuxlg").then(
                        (inv) => this.print("ok: " + JSON.stringify(inv)),
                        (e) => this.print("error: " + JSON.stringify(e)))
                    });
                p = p.then(() => {
                    this.print("get collab for script:");
                    return TDev.Collab.getCollaborationAsync("bqsl", "c1809ad4-3dd0-4289-4642-cc8282c31f3f").then(
                        (inv) => this.print("ok: " + JSON.stringify(inv)),
                        (e) => this.print("error: " + JSON.stringify(e)))
                    });
                p = p.then(() =>  this.print("put----------------------------"));
                p = p.then(() => {
                    this.print("put collab for script:");
                    return TDev.Collab.startCollaborationAsync("c1809ad4-3dd0-4289-4642-cc8282c31f3f", "xxx", "coepuxlg").then(
                        (inv) => this.print("ok: " + JSON.stringify(inv)),
                        (e) => this.print("error: " + JSON.stringify(e)))
                    });
                p = p.then(() => {
                    this.print("list invitations for group:");
                    return TDev.Collab.getCollaborationsAsync("coepuxlg").then(
                        (inv) => this.print("ok: " + JSON.stringify(inv)),
                        (e) => this.print("error: " + JSON.stringify(e)))
                    });
                p = p.then(() => {
                    this.print("get collab for script:");
                    return TDev.Collab.getCollaborationAsync("bqsl", "c1809ad4-3dd0-4289-4642-cc8282c31f3f").then(
                        (inv) => this.print("ok: " + JSON.stringify(inv)),
                        (e) => this.print("error: " + JSON.stringify(e)))
                    });
                p = p.then(() => this.print("clear----------------------------"));
                p = p.then(() => {
                    this.print("put collab for script:");
                    return TDev.Collab.stopCollaborationAsync("c1809ad4-3dd0-4289-4642-cc8282c31f3f").then(
                        (inv) => this.print("ok: " + JSON.stringify(inv)),
                        (e) => this.print("error: " + JSON.stringify(e)))
                    });
                p = p.then(() => {
                    this.print("list invitations for group:");
                    return TDev.Collab.getCollaborationsAsync("coepuxlg").then(
                        (inv) => this.print("ok: " + JSON.stringify(inv)),
                        (e) => this.print("error: " + JSON.stringify(e)))
                    });
                p = p.then(() => {
                    this.print("get collab for script:");
                    return TDev.Collab.getCollaborationAsync("bqsl", "c1809ad4-3dd0-4289-4642-cc8282c31f3f").then(
                        (inv) => this.print("ok: " + JSON.stringify(inv)),
                        (e) => this.print("error: " + JSON.stringify(e)))
                    });
            }

     
       */

            // session tests

            public refreshtoken(): void {
                Revisions.getRevisionServiceTokenAsync().then(
                     (token:any) => {
                         this.print("success:");
                         this.print("token=" + token);
                        
                     },
                     (e) => {
                         this.fail("error: " + e);
                     });
            }

            public list(): void {
                var user = Cloud.getUserId();
                this.print("issuing get request for sessions by user " + user + "...");


                Revisions.queryMySessionsOnRevisionServerAsync(this.rt).then(
                    (s) => {
                        this.print("success:");
                        (<RT.CloudSession[]>s).forEach(si => {
                            this.print("");
                            this.print("id=" + si._id);
                            this.print("d=" + si._title);
                            
                        });
                    },
                    (e) => {
                        this.fail("error: " + e);
                    });

            }

            
            public deletetests(): void {
                var user = Cloud.getUserId();
                this.print("issuing get request for sessions by user " + user + "...");

                Revisions.queryMySessionsOnRevisionServerAsync(this.rt).then(
                    (s) => {
                        this.print("success:");
                        (<RT.CloudSession[]>s).forEach(si => {
                            if (si._title.indexOf("test session for") == 0) {
                                this.print("deleting " + si._id);
                                Revisions.deleteSessionAsync(this.rt.sessions.getCloudSessionDescriptor(s._id, s._title, s._permissions), this.rt).then(
                                  (ack) => {
                                      this.print("successfully deleted " + si._id);
                                  },
                                  (err) => {
                                      this.fail("error deleting " + si._id + ": " + err);
                                  }
                                ).done();
                            }
                        });
                    },
                    (e) => {
                        this.fail("error: " + e);
                    });
            }

            public connect1(): void {

                this.print("connecting...");
                var sfx = this.randomsuffix();
                var testname = "connectone" + sfx;
                var s = new TDev.Revisions.ClientSession(Cloud.getUserId() + "0" + testname, "a" + sfx, Cloud.getUserId());
                s.connect(this.rt.sessions.url_ws(), Revisions.getRevisionServiceTokenAsync);

                this.print("create elt...");

                var dcustomer = "customer()";
                var alice = s.user_create_item(dcustomer, [], []);

                var items = s.user_get_items_in_domain(dcustomer);
                this.assert(items.length == 1);
                this.assert(items[0] === alice);

                this.print("issuing fence 1...");

                s.user_issue_fence(() =>
                {
                    this.print("fence 1 completed.");

                    var items = s.user_get_items_in_domain(dcustomer);
                    this.assert(items.length == 1);
                    this.assert(items[0] === alice);

                    this.print("delete elt...");

                    s.user_delete_item(alice);

                    var items = s.user_get_items_in_domain(dcustomer);
                    this.assert(items.length == 0);

                    this.print("issuing fence 2...");

                    s.user_issue_fence(() =>
                    {
                        this.print("fence 2 completed.");

                        var items = s.user_get_items_in_domain(dcustomer);
                        this.assert(items.length == 0);

                        this.print("DATA:");
                        var lines = s.user_dump_stable_data(b => this.assert(b));
                        lines.forEach((l) => this.print(l));

                        this.print("test completed.");

                    }, true);
                }, true);

            }

            public connect2(): void {

                this.print("connecting...");
                var testname = Cloud.getUserId() + "0" + "connecttwo" + this.randomsuffix();
                var s = new TDev.Revisions.ClientSession(testname, testname, Cloud.getUserId());
                s.connect(this.rt.sessions.url_ws(), Revisions.getRevisionServiceTokenAsync);

                var st = s.user_get_value(s.user_get_lval("mystring,string[void[]]", [], []));
                var db = s.user_get_value(s.user_get_lval("mydouble,double[void[]]", [], []));
                this.assert(st === "");
                this.assert(db === 0.0);

                this.print("writing data...");

                s.user_modify_lval(s.user_get_lval("mystring,string[void[]]", [], []), "");
                s.user_modify_lval(s.user_get_lval("mydouble,double[void[]]", [], []), 3.14);

                var st = s.user_get_value(s.user_get_lval("mystring,string[void[]]", [], []));
                var db = s.user_get_value(s.user_get_lval("mydouble,double[void[]]", [], []));
                this.assert(st === "");
                this.assert(db === 3.14);

                this.print("yielding...");
                s.user_yield(); // send off first chg to server

                s.user_modify_lval(s.user_get_lval("mystring,string[void[]]", [], []), "new");
                s.user_modify_lval(s.user_get_lval("mydouble,double[void[]]", [], []), "A-3");
                var st = s.user_get_value(s.user_get_lval("mystring,string[void[]]", [], []));
                var db = s.user_get_value(s.user_get_lval("mydouble,double[void[]]", [], []));
                this.assert(st === "new");
                this.assert(db - 0.14 < 0.000000001);

                this.print("issuing fence 1...");

                s.user_issue_fence(() =>
                {
                    this.print("fence 1 completed.");

                    var st = s.user_get_value(s.user_get_lval("mystring,string[void[]]", [], []));
                    var db = s.user_get_value(s.user_get_lval("mydouble,double[void[]]", [], []));
                    this.assert(st === "new");
                    this.assert(db - 0.14 < 0.000000001);

                    this.print("DATA:");
                    var lines = s.user_dump_stable_data(b => this.assert(b));
                    lines.forEach((l) => this.print(l));

                    this.print("test completed.");


                }, true);

            }

            public serverpersistence1(): void {

                this.print("connecting first session...");
                var sfx = this.randomsuffix();
                var testname = Cloud.getUserId() + "0serverpersistenceone" + sfx;
                var s = new TDev.Revisions.ClientSession(testname, "a", Cloud.getUserId());
                s.connect(this.rt.sessions.url_ws(), Revisions.getRevisionServiceTokenAsync);

                this.print("data...");

                var alice = s.user_create_item("customer()", [], []);
                var bob = s.user_create_item("customer()", [], []);
                var charlie = s.user_create_item("customer()", [], []);
                var delta = s.user_create_item("customer()", [], []);
                s.user_modify_lval(s.user_get_lval("name,string[customertable[customer()]]", [alice.uid], []), "Alice");
                s.user_modify_lval(s.user_get_lval("name,string[customertable[customer()]]", [bob.uid], []), "Bob");
                s.user_modify_lval(s.user_get_lval("name,string[customertable[customer()]]", [charlie.uid], []), "Charlie");
                s.user_modify_lval(s.user_get_lval("name,string[customertable[customer()]]", [delta.uid], []), "");

                var is = s.user_get_items_in_domain("customer()").map(e => e.target()).sort();
                var ref = [alice.uid, bob.uid, charlie.uid, delta.uid].sort();
                this.assert(is.length == ref.length);
                for (var i = 0; i < is.length; i++)
                    this.assert(is[i] === ref[i]);

                var ks = s.user_get_entries_in_indexdomain("customertable[customer()]").map(e => e.target()).sort();
                var ref = [s.user_get_entry("customertable[customer()]", [alice.uid], []),
                           s.user_get_entry("customertable[customer()]", [bob.uid], []),
                           s.user_get_entry("customertable[customer()]", [charlie.uid], [])].map(e => e.target()).sort();
                this.assert(ks.length == ref.length);
                for (var i = 0; i < ks.length; i++)
                    this.assert(ks[i] === ref[i]);

                this.print("saving...");

                s.user_issue_fence(() =>
                {
                    this.print("save completed.");

                    this.print("connecting second session...");
                    s = new TDev.Revisions.ClientSession(testname, "b", Cloud.getUserId());
                    s.connect(this.rt.sessions.url_ws(), Revisions.getRevisionServiceTokenAsync);

                    this.print("loading...");

                    s.user_issue_fence(() =>
                    {
                        this.print("load completed.");

                        this.print("checking data...");


                        var is = s.user_get_items_in_domain("customer()");
                        this.assert(is.length == 4);

                        
                        var es = s.user_get_entries_in_indexdomain("customertable[customer()]");
                        this.assert(es.length == 3);

                        this.print("DATA:");
                        var lines = s.user_dump_stable_data(b => this.assert(b));
                        var ref = ["new|customer()|1.1",
                                   "new|customer()|1.2",
                                   "new|customer()|1.3",
                                   "new|customer()|1.4",
                                   "mod|name,string[customertable[customer()]]|1.1|+Alice",
                                   "mod|name,string[customertable[customer()]]|1.2|+Bob",
                                   "mod|name,string[customertable[customer()]]|1.3|+Charlie"];
                        this.assert(lines.length == ref.length);
                        for (var i = 0; i < lines.length; i++) {
                            this.assert(lines[i] === ref[i]);
                            this.print(lines[i]);
                        }

                        this.print("test completed.");

                    }, true);




                },true);


            }
        }


    }
}