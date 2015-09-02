///<reference path='refs.ts'/>
module TDev.RT {
    export module EditorServices {
        export function getTokenAsync(aud: string): Promise {
            if (!Cloud.hasAccessToken()) return Promise.as(undefined);

            var tokens: TDev.StringMap<string>;
            try {
                tokens = JSON.parse(localStorage["touchDevelopTokens"]);
            } catch (e) { tokens = {}; }
            var token = tokens[aud];
            if (token) return Promise.as(token);

            var url = "https://touchdevelopuserauth.azurewebsites.net/api/sign_token?aud="
                + encodeURIComponent(aud) + "&access_token=" + Cloud.getAccessToken();
            return Util.httpPostJsonAsync(url, {})
                .then(resp => {
                    if (!resp.jwt) Util.oops(resp ? resp.status : "bad")
                    return resp.jwt
                })
                .then(token => {
                    if (token) {
                        tokens[aud] = token;
                        localStorage["touchDevelopTokens"] = JSON.stringify(tokens);
                    }
                return token;
                }, e => undefined)
        }
    }

    //? An interface to TouchDevelop editor
    //@ stem("editor") ctx(general,gckey)
    export class Editor
        extends RTValue
    {
        public allAnnotations:AstAnnotation[] = [];

        constructor(rt:Runtime, headless:boolean)
        {
            super()
            rt.headlessPluginMode = headless;
            rt.editorObj = this;
        }

        //? Replace standard 'running plugin' message with something else
        public progress(message:string, s:IStackFrame) : void
        {
            ProgressOverlay.setProgress(message)
        }

        //? Place a message on an AST node
        //@ [category].deflStrings("warning", "info", "error")
        public annotate_ast(id:string, category:string, message:string) : void
        {
            this.allAnnotations.push({ id: id, category: category, message: message })
        }
        
        //? Place a message on the first caller in the top-level script in the editor
        //@ [category].deflStrings("warning", "info", "error")
        //@ betaOnly
        public annotate_caller(category:string, message:string, s:IStackFrame) : void
        {            
            var ed = (<any>TDev).TheEditor
            if (ed) ed.injectCallerAnnotation(category, message, s)
        }        

        //? The id of the script currently in the editor
        public current_script_id(s:IStackFrame) : string
        {
            return s.rt.runningPluginOn
        }

        //? Returns the AST of the script currently in the editor
        //@ returns(JsonObject) uiAsync
        public current_script_ast(r:ResumeCtx)
        {
            Bazaar.ast_of(this.current_script_id(r.stackframe), r)
        }

        //? Signal that the current tutorial step is done.
        public tutorial_step_completed(s:IStackFrame)
        {
            Tutorial.step_completed(s)
        }

        //? Get (Azure) web site deployment settings.
        //@ returns(JsonObject) async
        public deployment_settings(r:ResumeCtx)
        {
            r.rt.host.deploymentSettingsAsync(r.rt.runningPluginOn)
                .done(ds => r.resumeVal(ds ? JsonObject.wrap(ds) : undefined))
        }

        //? Authenticates the user for the given app name and returns the token if successful. The identity of the token is contructed with ``{app name} - {user id}``.
        //@ async returns(string) cap(editoronly)
        public user_token(app_name : string, r: ResumeCtx) {
            if (Cloud.anonMode(lf("user token"))) {
                r.resumeVal("");
                return;
            }
            if (!app_name || app_name.length < 4)
                Util.userError(lf("app name must be at least 4 character long"));

            var userid = Cloud.getUserId();
            var pluginid = lf("{0} - {1}", app_name, userid);

            if (!r.rt.host.askSourceAccessAsync("a user token for " + pluginid, "an authentication token for the `" + pluginid + "` application. The token allows this script to authenticate you in their services. The script does not have access to any other personal information.", true)) {
                r.resumeVal("");
                return;
            }

            EditorServices
                .getTokenAsync(pluginid)
                .done(token => r.resumeVal(token));
        }

        //? Compiles and packages the current script.
        //@ async returns(JsonObject) cap(editoronly) dbgOnly
        public package_current_script(options: JsonObject, r: ResumeCtx) {
            var id = this.current_script_id(r.stackframe);
            if (!id) {
                r.resumeVal(undefined);
                return;
            }
            HTML.showProgressNotification(lf("packaging script..."), true);
            r.rt.host.packageScriptAsync(id, options.value())
                .done(
                    instr => r.resumeVal(JsonObject.wrap(instr)),
                    err => r.resumeVal(JsonObject.wrap({ error: err.message || "an error occured" }))
                );
        }
    }

    export interface AstAnnotationOp {
        opid: string;
        header: string;
        description: string;
    }

    export interface AstAnnotation {
        id:string; // of the node
        category:string;
        message:string;
        ops?:AstAnnotationOp[];
        pluginRef?:string;
    }
}
