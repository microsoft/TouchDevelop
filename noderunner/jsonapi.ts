module TDev {
    // POST /api/deps
    export interface DepsRequest {
        script: string;   // script to compute dependencies on
    }

    export interface DepsResponse {
        libraryIds: string[];   // list of script ids and/or guids the script depends on
    }

    export interface ScriptWithId {
        id: string;
        script: string;
    }

    export interface ParseRequestBase {
        id?: string;                   // included in crash reports
        script: string;                // the top-level script
        libraries: ScriptWithId[];     // list of dependencies; does not have to include the top-level script
    }

    // POST /api/parse
    export interface ParseRequest extends ParseRequestBase {
        requiredPlatformCaps?: number; // if set, will compute platform caps, errors etc.
        prettyScript?: number;         // 0/undefined - none, 1 - entire script with embedded errors,
        // 2 - like 1 and also decls with errors from libraries
        prettyDocs?: boolean;             // pretty-print script as documentation
        prettyText?: boolean;             // pretty-print script as text (for serialization)
        compile?: boolean;
        compilerOptions?: any;
        optimize?: boolean;               // collect optimization statistics
        userId?: string;
        testAstSerialization?: boolean;   // only used in test runs
        testIds?: boolean;                // ditto
        features?: boolean;
    }

    export interface ParseResponse {
        numErrors: number;             // number of parse/type errors
        numLibErrors: number;          // number of errors in libraries (implies numErrors > 0)
        status: string;                // the general reason for numErrors > 0
        meta: any;                     // contains 'name', 'isLibrary', etc.
        artIds: string[];              // ids of art resources
        prettyScript?: string;         // set when req.prettyScript
        prettyDocs?: string;           // set when req.prettyDocs
        prettyText?: string;           // set when req.prettyText
        platformCaps?: number;         // the required capabilities; only set when req.requiredPlatformCaps is set
        platformAllCaps?: number;     // the required capabilities in all actions, even unreachable ones; only set when req.requiredPlatformCaps is set
        platformErrors?: string;       // if non empty, capabilities not in requiredPlatformCaps are in fact required
        compiledScript?: string;       // set only when req.compile and numErrors == 0
        packageResources?: any[];      // likewise
        numInlinedCalls?: number;     // set only when req.optimize and numErrors == 0
        numInlinedFunctions?: number; // likewise
        numOkEliminations?: number;   // likewise
        numActions?: number;          // likewise
        numStatements?: number;       // likewise
        termsReused?: number;         // likewise
        constantsPropagated?: number; // likewise
        reachingDefsTime?: number;    // likewise
        inlineAnalysisTime?: number;  // likewise
        usedAnalysisTime?: number;    // likewise
        availableExprsTime?: number;  // likewise
        constantPropagationTime?: number;
        compileTime?: number;         // likewise
        features?: any;                // set only when req.features; featureName=>count map
    }

    // POST /api/query
    export interface QueryRequest extends ParseRequestBase {
        path: string;                  // for GET http://www.touchdevelop.com/api/abcd/foo?bar=baz is requested this should be "foo?bar=baz"
    }

    // POST /api/language
    export interface LanguageRequest {
        path: string;                  // for GET http://www.touchdevelop.com/api/language/foo?bar=baz is requested this should be "foo?bar=baz"
    }

    // POST /api/addids
    export interface AddIdsRequest {
        id?: string;            // for debugging only
        baseScript?: string;    // with IDs already assigned
        script: string;         // script to add ids to
    }

    export interface AddIdsResponse {
        withIds: string;
    }

    // POST /api/css
    export interface CssRequest { }
    export interface CssResponse { css: string; }

    // POST /api/docs
    export interface DocsRequest {
        topic: string;
    }
    export interface DocsResponse {
        prettyDocs: string;
        title: string;
        description: string;
        scriptId: string;
        icon: string;
        iconbackground: string;
    }

    // GET /api/doctopics
    export interface DocTopicsRequest { }
    export interface DocTopicsResponse {
        topics: string[];
        topicsExt: any[];
        /*
    export interface HelpTopicJson
    {
        name: string;
        id: string;
        rootid?: string;
        description: string;
        icon:string;
        iconbackground:string;
        iconArtId?:string;
		userid?:string;
        time?:number;
        text: string;
        priority:number;
        platforms?:string[];
        parentTopic?:string;
        screenshot?:string;
    }

        */
    }

    // POST /api/stats
    export interface StatsRequest { }
    export interface StatsResponse {
        memory: any;
        uptime: number;
        jsFile: string;
        nodeVersion: string;
        argv: string[];
        numRequests: number;
    }


    // POST /<key>/deploy
    export interface DeployRequest {
        path: string;
        compiled: string;
    }
}
