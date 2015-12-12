///<reference path='labs-1.0.4.d.ts'/>
// full docs: https://labsjs.blob.core.windows.net/sdk/LabsJS-1.0.4/labs.html
// use http://labsjs.blob.core.windows.net/sdk/LabsJS-1.0.4/labshost.html for testing
/*
This host acts as a proxy between the labs APIs and 2 TouchDevelop web apps: the editor web app and the view web app.

# Editor App

The editor app provides a way to pick the web app to execute. This app is provided by TouchDevelop.

    * script selected, IScriptMessage

            { kind : 'script',
              data : IScript
              releaseid?: ... }

Optionaly, the releaseid can be specified as a field

# View App

Each request, and optional response, has the following shape,

      { kind : string, data : any }

The view app may be any TouchDevelop app. Additionally some apps may also decide to store state.

    * 'connect' : returns 'mode' as 'edit' or 'view'.

    * 'labGetState' : request state stored in current lab

            { kind : 'labGetState' }

    Upon receiving this message, the state (IStateMessage) is sent to the web app.

            { kind : 'labGetState', data : state }

    * 'labSetState' : app wants state to be saved (IStateMessage)

            { kind : 'setState', data : state }

*/
module TDev {
    var _origin = 'https://www.touchdevelop.com';
    export var _storeUrl = 'https://www.touchdevelop.com/users/TouchDevelopSamples/touchdevelopedu/';
    var _webAppRootUrl = 'https://www.touchdevelop.com/';
    export var _dbg = false;
    export var _standAloneApp = false;

    var _editor: Labs.LabEditor;
    var _lab: Labs.LabInstance;
    var _currentApp: IScriptMessage;
    var _isPreviewMode: boolean = false;

    var _leaderboardIndex: number = 1;
    var _tutorialIndex: number = 2;

    var _indexMap: Map[] = [{ value: 0, mapped: 0 }];
    var _isStore = false;
    var _onDeactivate: number = 0;

    export interface Map {
        value: number;
        mapped: number;
    }

    export interface IMessage {
        kind: string;
        data?: any;
    }

    export interface IScript {
        id: string;
        name: string;
        userid: string;
        releaseId?: string;
    }

    export interface IStateMessage extends IMessage {
        data: any;
    }

    export interface IScriptMessage extends IMessage {
        data: IScript;
        releaseid?: string;
    }

    export interface IMessageToApp {
        kind: string;
        code: string;
        data?: any;
    }

    // data that gets serialized in a component
    export interface IComponentData {
        auto: boolean;
        userData: any;
        indexMap?: Map[];
    }

    export interface IHints {
        [type: string]: Labs.Core.IValue[];
    }

    export interface IConfigData {
        name: string;
        index: number;
        data: IComponentData;
        values?: IHints;
        maxScore?: number;
        hasAnswer?: boolean;
        answer?: any;
        choices?: Labs.Components.IChoice[];
    }
    export interface IActivityConfigData extends IConfigData { }
    export interface IInputConfigData extends IConfigData {
        hasAnswer: boolean;
        answer: string;
        maxScore: number;
    }
    export interface IChoiceConfigData extends IConfigData {
        choices: Labs.Components.IChoice[];
        hasAnswer: boolean;
        answer: any;
        maxScore: number;
    }

    export interface IAttemptData {
        index: number;
        score: number;
        answer: any;
        isComplete: boolean;
        hintIndex?: number;
    }

    export interface IActivityAttemptData {
        index: number;
        hintIndex?: number;
    }
    export interface IInputAttemptData extends IAttemptData{
        answer: string;
    }
    export interface IChoiceAttemptData extends IAttemptData {
        answer: string[];
    }
    export interface IChoiceAttemptDataNumAns extends IAttemptData {
        answer: number[];
    }

    interface IAttemptCallback<T1,T2> {
        (attempt: T1, data: T2): void;
    }

    export function handleError(err: any) {
        log('error: ' + err);
        return err;
    }

    function getAppUrl(data: IScriptMessage) {
        var url = _webAppRootUrl + "users/@" + data.data.userid + "-/@" + data.data.id + "-";
        if (data.releaseid) url += "?releaseid=" + data.releaseid;
        log("td: AppUrl - " + url);
        return url;
    }
    function getTutorialUrl(data: IScriptMessage) {
        var url = _webAppRootUrl + "app/beta?temporaryStorage=1#hub:follow:" + data.data.id + ":officemix";
        log("td: TutUrl - " + url);
        return url;
    }

    export function setUrl(url: string) {
        if (url == _storeUrl) _isStore = true;
        else _isStore = false;
        var frame = <HTMLIFrameElement>document.getElementById("tdFrame");
        frame.src = url;
        log(" td: new src= " + frame.src);
    }

    function loadApp(data: IScriptMessage, mode: Labs.Core.LabMode) {
        log("td: data recieved in load app = " + JSON.stringify(data));
        if(!_standAloneApp) show("another");
        _currentApp = data;
        if ((!data.data.userid) || data.data.userid == "") setUrl(getTutorialUrl(data));
        else setUrl(getAppUrl(data));
        document.getElementById("AppStatus").innerText = data.data.name;
        updateChrome();
    }

    function loadTutorial(data: IScriptMessage, mode: Labs.Core.LabMode) {
        log("td: setting up tutorial metadata");
        if(!_standAloneApp) show("another");
        _currentApp = data;
        document.getElementById("AppStatus").innerText = "Selected " + data.data.name;
        updateChrome();
    }

    function loadStore() {
        _currentApp = undefined;
        setUrl(_storeUrl);
        elt("AppStatus").innerText = "Select an App";
        updateChrome();
    }

    function setHeight(id: string, htPercent: number, htPixel: number) {
        elt(id).style.height = "calc(" + htPercent + "% - " + htPixel + "px)";
        elt(id).style.height = "-moz-calc(" + htPercent + "% - " + htPixel + "px)";
        elt(id).style.height = "-webkit-calc(" + htPercent + "% - " + htPixel + "px)";
    }

    export function updateChrome() {
        log("td: updating chrome");
        if (_editor) {
            show("preview");
            hide("edit");
            show("chrome");
            setHeight("mainContent", 100, 50);
        }
        else {
            hide("preview");
            show("edit");
        if (_isPreviewMode) {
            show("chrome");
            setHeight("mainContent", 100, 50);
        }
        else {
            hide("chrome");
            setHeight("mainContent", 100, 10);
        }
        }

        log("td: disablling preview mode");
        _isPreviewMode = false;
    }

    function currentMode(): Labs.Core.LabMode {
        if (_editor) {
            return Labs.Core.LabMode.Edit;
        }
        return Labs.Core.LabMode.View;
    }

    function createHints(values: string[]): IHints {
    return  {
        hints: values.map(v => <Labs.Core.IValue>{
                isHint: true,
                value: v
        })
    }
    }

    function addHints(index: number, hints: string[]): void {
        _editor.getConfiguration((err, config) => {
            if (err) return postError("addHints", err);
            if (config.components[index]) {
                config.components[index].values = createHints(hints);
                _editor.setConfiguration(config, (err,unused) => {
                    if (err) postError("addHints", err);
                    else postSuccess("addHints");
                });
            }
            else postError("addHints", "invalid config index");
        });
    }

    function createActivityComponent(data: IActivityConfigData): Labs.Components.IActivityComponent {
        var comp : Labs.Components.IActivityComponent = {
            name: data.name,
            type: Labs.Components.ActivityComponentType,
            secure: false,
            values: data.values,
            data: data.data
        };
        return comp;
    }

    function createChoiceComponent(data: IChoiceConfigData): Labs.Components.IChoiceComponent {
        var comp: Labs.Components.IChoiceComponent = {
            name: data.name,
            type: Labs.Components.ChoiceComponentType,
            secure: false,
            choices: data.choices,
            maxAttempts: 0,
            values: data.values,
            maxScore: data.maxScore,
            hasAnswer: data.hasAnswer,
            answer: data.answer,
            timeLimit: 0,
            data: data.data
        };
        return comp;
    }

    function createInputComponent(data: IInputConfigData): Labs.Components.IInputComponent {
        var comp: Labs.Components.IInputComponent = {
            name: data.name,
            type: Labs.Components.InputComponentType,
            secure: false,
            values: data.values,
            maxScore: data.maxScore,
            hasAnswer: data.hasAnswer,
            answer: data.answer,
            timeLimit : 0,
            data: data.data
        };
        return comp;
    }

    function getAppComponentData(componentNumber: number) {
            var comp = (<Labs.Components.ActivityComponentInstance>_lab.components[componentNumber]);
            if (comp && comp.component && comp.component.data) {
                var cdata = <IComponentData>comp.component.data;
                if (cdata.userData) return postData('labGetComponentConfig', cdata.userData );
            }
        postError("labGetComponentConfig", "invalid component number");
    }


    function completeGetAppConfigurationAsync(comp: Labs.Core.IComponent)   {
        if (!comp) return postError("editorGetConfig","invalid component");
        log("td: sending config: ");
        postData('editorGetConfig',(<IComponentData>comp.data).userData);
        }

    function getAppConfigurationAsync(configNumber: number): void {
        var cn = configNumber;
        log('td: get config ' + configNumber);
        _editor.getConfiguration((err, config) => {
            if (err) return postError("editorGetConfig",err);
            log("td: component size: " + config.components.length);
            if (config.components[cn]) {
                log("td: " + JSON.stringify(config.components[cn]));
                completeGetAppConfigurationAsync(config.components[cn]);
                return;
            }
            postError("editorGetConfig","invalid config number");
        });
    }

    function saveAppConfiguration(data: IConfigData, type: string) {
        if (!_editor) return postError("editorSetConfig","while trying to save configuration, editor not opened");

        log("td: saving app config: " + JSON.stringify(data));

        var newComp: Labs.Core.IComponent = undefined;
        var configNumber: number = data.index;
        switch (type) {
            case "activity":
                newComp = createActivityComponent(<IActivityConfigData>data);
                break;
            case "input":
                newComp = createInputComponent(<IInputConfigData>data);
                break;
            case "choice":
                newComp = createChoiceComponent(<IChoiceConfigData>data);
                break;
            default:
                return postError("editorSetConfig","invalid component type");
        }

        _editor.getConfiguration((err, config) => {
            if (err) return postError("editorSetConfig",err);
            log("td: component size: " + config.components.length);
            config.components[configNumber] = newComp;
            config.components[0].data.indexMap = _indexMap;
            _editor.setConfiguration(config, (err, unused) => {
                if (err) return postError("editorSetConfig",err);
                log("td: configuration modified at level " + configNumber);
                postSuccess("editorSetConfig");
            });
        });
    }

    function saveEditorConfiguration(data: IScriptMessage, leaderboard: IInputConfigData, tutorial: IActivityConfigData) {
        if (!_editor) {
            log("td: error while trying to save configuration, editor not opened");
            return;
        }

        if (!data) {
            log("td: clearing config");
            var comp = createActivityComponent(<IActivityConfigData>{ name: undefined, data: undefined });
            _editor.setConfiguration({
                appVersion: { major: 1, minor: 0 },
                components: [comp],
                analytics: undefined,
                timeline: undefined,
                name: undefined
            }, (err, unused) => {
                    if (err) return handleError(err);
                    log("td: configuration cleared");
            });
            return;
        }

        log("td: saving configuration");
        log("td: datakind " + data.kind + "  id:" + data.data.id + "  name:" + data.data.name + "   userid:" + data.data.userid);

        var name = undefined;
        if (data.data.name) name = data.data.name;

        var editComp = createActivityComponent(<IActivityConfigData>{
            name: name,
            data: <IComponentData>{ auto: false, userData: data, indexMap: _indexMap }
        });
        var leadComp = createInputComponent(leaderboard);
        var components: Labs.Core.IComponent[] = [editComp, leadComp];
        if (tutorial) {
            var tutComp = createActivityComponent(tutorial);
            components.push(tutComp);
        }

        _editor.setConfiguration({
            appVersion: { major: 1, minor: 0 },
            components: components,
            analytics: undefined,
            timeline: undefined,
            name : name
        }, (err, unused) => {
            if (err) return handleError(err);
            log("td: configuration saved");
        });
    }


    //Sample URL for standalone app: officemix.html?standAloneApp&id=lhvra&userid=pboj&name=rachit Optional:[&isTutorial][&releaseid=123]
    //For tutorial userid not required
    function queryUrl(param: string) : string{
        var params: string[] = window.location.search.substring(1).split("&");
        while (Array.isArray(params) && params.length) {
            var pairs : string[] = params.shift().split("=");
            if (pairs[0] === param) return pairs[1];
        }
        return undefined;
    }

    function loadStandAloneAppConfig() {
        var data: IScriptMessage = {
            kind: "scriptSelected",
            data: {
                id: queryUrl("id"),
                name: queryUrl("name"),
                userid: queryUrl("userid")
            },
            releaseid: queryUrl("releaseid")
        };
        log("td: data: " + JSON.stringify(data));
        if (/isTutorial/.test(window.location.href)) receiveTutorialSelected(data);
        else    receiveScriptSelected(data);
    }

    function loadStoreOrApp() {
        if (_editor) {
            log("td: found editor");
            _editor.getConfiguration((err, config) => {
                log("td: erditor config found");
                if (err) return handleError(err);
                if (config && config.components[0] && config.components[0].data) {
                    log("td: lab-data found!");
                    _indexMap = ((<IComponentData>config.components[0].data).indexMap);
                    loadApp((<IScriptMessage>(<IComponentData>config.components[0].data).userData), currentMode());
                    return;
                }
                else {
                    if (_standAloneApp) {
                        log("td: Stand Alone app detected.");
                        loadStandAloneAppConfig();
                    }
                    else {
                        log("td: no lab data found. Restoring the store.");
                        loadStore();
                    }
                }

            });
        }
        else if (_lab) {
            log("td: lab found");
            var comp = (<Labs.Components.ActivityComponentInstance>_lab.components[0]);
            if (comp && comp.component && <IComponentData>comp.component.data && (<IComponentData>comp.component.data).userData) {
                var appConfig = <IScriptMessage>((<IComponentData>comp.component.data).userData);
                log("td: app-config: " + JSON.stringify(appConfig));
                _indexMap = ((<IComponentData>comp.component.data).indexMap);
                loadApp(<IScriptMessage>appConfig, currentMode());
                return;
            }
            else {
                if (_standAloneApp) {
                    log("td: Stand Alone app detected.");
                    loadStandAloneAppConfig();
                }
                else {
                    log("td: Select app to load from the store before starting lab. Restoring the store");
                    loadStore();
                    return;
                }
            }
        }
        else {
            log("td: no lab/editor found.");
        }
    }

    function saveState(state: any, callback: Labs.Core.ILabCallback<void>) {
        if (!_lab) {
            log("td: error while trying to save state, lab not opened");
            return;
        }

        _lab.setState(state, (err, unused) => {
            log("td: state saved");
            callback(err, unused);
        });
    }


    function createAttempt(index : number): void {
        var compA = (<Labs.ComponentInstance<Labs.Components.ActivityComponentAttempt>>_lab.components[index]);
        if (!compA) return postError("attemptComplete","invalid component index");
        compA.createAttempt((err, attempt) => {
            if (err) return postError("attemptComplete", err);
            else postSuccess("attemptComplete");
        });
    }

    function completeActivityAttempt(attempt: Labs.Components.ActivityComponentAttempt) {
           attempt.complete((err, dummy) => {
               if (err) return postError("attemptComplete", err);
               else postSuccess("attemptComplete");
            });
    }

    function handleActivityAttempt(data: IActivityAttemptData, callback: IAttemptCallback<Labs.Components.ActivityComponentAttempt, IActivityAttemptData>) {
        var compA = (<Labs.Components.ActivityComponentInstance>_lab.components[data.index]);
        if (!compA) return postError("attemptComplete","invalid component index "+data.index);
        //if (compA.component.type != Labs.Components.ActivityComponentInstanceType) return attemptCompleteFail("component type mismatch");
        compA.getAttempts((attempts: Labs.Components.ActivityComponentAttempt[]) => {
            if (attempts && attempts.length) {
                attempts[attempts.length - 1].resume(() => {
                    callback(attempts[attempts.length - 1], data);
                });
            }
            else {
                compA.createAttempt((err, attempt) => {
                    if (err) return postError("attemptComplete",err);
                    attempt.resume(() => {
                        callback(attempt, data);
                    });
                });
            }
        });
    }

    function completeInputAttempt(attempt: Labs.Components.InputComponentAttempt, data: IInputAttemptData) {
        log("td: complete input attempt");
        attempt.submit(
                new Labs.Components.InputComponentAnswer(data.answer),
                new Labs.Components.InputComponentResult(data.score, data.isComplete),
                (err, submission) => {
                    if (err) return postError("attemptComplete",err);
                    postSuccess("attemptComplete");
                });
    }

    function handleInputAttempt(data: IInputAttemptData, callback: IAttemptCallback<Labs.Components.InputComponentAttempt,IInputAttemptData>) {
        var compI = < Labs.Components.InputComponentInstance>_lab.components[data.index];
        if (!compI) return postError("attemptComplete","invalid component index");
        if (compI.component.type != Labs.Components.InputComponentInstanceType) return postError("attemptComplete","component type mismatch");
        compI.getAttempts((attempts: Labs.Components.InputComponentAttempt[]) => {
            log("td: checking for incomplete attempts");
            if (attempts && attempts.length) {
                attempts[attempts.length - 1].resume((err) => {
                    if (err) return postError("attemptComplete",err);
                    callback(attempts[attempts.length - 1], data);
                });
            }
            else {
                compI.createAttempt((err, attempt) => {
                    if (err) return postError("attemptComplete",err);
                    attempt.resume(() => {
                        callback(attempt, data);
                    });
                });
            }
        });

    }

    function completeChoiceAttempt(attempt: Labs.Components.ChoiceComponentAttempt, data: IChoiceAttemptDataNumAns) {
        log("td: complete input attempt");
        attempt.submit(
            new Labs.Components.InputComponentAnswer(data.answer),
            new Labs.Components.InputComponentResult(data.score, data.isComplete),
            (err, submission) => {
                if (err) return handleError(err);
                postSuccess("attemptComplete");
            });
    }

    function handleChoiceAttempt(data: IChoiceAttemptData, callback: IAttemptCallback<Labs.Components.ChoiceComponentAttempt,IChoiceAttemptDataNumAns>) {
        var answer: string[] = data.answer;
        var answerID: number[] = [];
        var compC = < Labs.Components.ChoiceComponentInstance>_lab.components[data.index];

        if (!compC) return postError("attemptComplete","invalid component index");
        if (compC.component.type != Labs.Components.ChoiceComponentInstanceType) return postError("attemptComplete","component type mismatch");

        if (compC && compC.component && compC.component.choices && answer.length) {
            for (var it in answer) {
                var choices: Labs.Components.IChoice[] = compC.component.choices;
                for (var it2 in choices) {
                    if (answer[it] == choices[it2].name) {
                        answerID.push(parseInt(choices[it2].id));
                        break;
                    }
                }
            }
            var dataNumAns: IChoiceAttemptDataNumAns = { index: data.index, score: data.score, answer: answerID, isComplete: data.isComplete };
            if (data.hintIndex) dataNumAns.hintIndex = data.hintIndex;
            if (answer.length == answerID.length) {
                compC.getAttempts((attempts: Labs.Components.ChoiceComponentAttempt[]) => {
                    log("td: checking for incomplete attempts");
                    if (attempts && attempts.length) {
                        attempts[attempts.length - 1].resume((err) => {
                            if (err) return postError("attemptComplete",err);
                            callback(attempts[attempts.length - 1], dataNumAns);
                        });
                    }
                    else {
                        compC.createAttempt((err, attempt) => {
                            if (err) postError("attemptComplete",err);
                            attempt.resume(() => {
                                callback(attempt, dataNumAns);
                            });
                        });
                    }
                });

            }
        }
        return handleError("invalid component");
    }

    function handleTutorialComplete() : void{
        var comp = <Labs.Components.ActivityComponentInstance>_lab.components[1];
        if (comp.component && comp.component.data && (<IComponentData>comp.component.data).auto) {
            var data: IActivityAttemptData = { index: _tutorialIndex };
            handleActivityAttempt(data, completeActivityAttempt);
        }
        else {
            log("td: User config already set. Ignoring leaderboard message");
        }
    }
    function handleLeaderboardComplete(score: number) : void{
        var comp = <Labs.Components.ActivityComponentInstance>_lab.components[1];
        if (comp.component && comp.component.data && (<IComponentData>comp.component.data).auto) {
            var leaderboardAttemptData: IInputAttemptData = {
                index: _leaderboardIndex,
                score: score,
                answer: score.toString(),
                isComplete: true
            };
            handleInputAttempt(<IInputAttemptData>leaderboardAttemptData, completeInputAttempt);
        }
        else {
            log("td: User config already set. Ignoring leaderboard message");
        }
    }

    function postError(kind: string, err: string) {
        handleError(err);
        postMessageToApp({ kind: kind, code: "failed" });
    }
    function postSuccess(kind: string) {
        postMessageToApp({ kind: kind, code: "success" });
    }
    function postData(kind: string, data: any) {
        postMessageToApp({ kind: kind, code: "success", data: data });
    }

    function postMessageToApp(msg: IMessageToApp) {
        log('td: post message to app: ' + JSON.stringify(msg));
        var frame = <HTMLIFrameElement>document.getElementById("tdFrame");
        frame.contentWindow.postMessage(msg, _origin);
        log("posted to app")
    }


    function setDefaultConfigs(data: IScriptMessage, isTutortial: boolean) {
        log("td: setting default configs");
        _indexMap = [{ value: 0, mapped: 0 }];
        if (currentMode() == Labs.Core.LabMode.Edit) {
            var leaderboardData: IInputConfigData = {
                name: "Leaderboard",
                data: {
                    auto: true,
                    userData: ""
                },
                hasAnswer: false,
                answer: "",
                maxScore: 1,
                index: _leaderboardIndex
            };
            _indexMap.push({value: _leaderboardIndex, mapped:_leaderboardIndex});
            var tutorialData: IActivityConfigData = {
                name: "Tutorial",
                data: {
                    auto: true,
                    userData: ""
                },
                index: _tutorialIndex
            };
            if (isTutortial) _indexMap.push({ value: _tutorialIndex, mapped: _tutorialIndex });
            else tutorialData = undefined;
            saveEditorConfiguration(data, leaderboardData, tutorialData);
        }
    }

    function receiveScriptSelected(data: IScriptMessage) {
        log("selected app " + data.data.name);
        setDefaultConfigs(data, false);
        loadApp(data, currentMode());
    }

    function receiveTutorialSelected(data: IScriptMessage) {
        log("selected tut " + data.data.name);
        setDefaultConfigs(data, true);
        loadTutorial(data, currentMode());
    }

    function serializeData(data: any, type: string): IConfigData {
        var hints : IHints= {};
        if (data.values) {
            hints = createHints(data.values);
        }

        var config = <IConfigData>  {
            name: data.name,
            index: data.index,
            data: {
                auto: false,
                userData: data.data
            },
            values: hints
        }



        switch (type) {
            case "activity":
                break;
            case "input":
                config.maxScore= data.maxScore;
                config.hasAnswer= data.hasAnswer;
                config.answer= data.answer;
                break;
            case "choice":
                config.maxScore= data.maxScore;
                config.hasAnswer= data.hasAnswer;
                config.answer = data.answer;
                config.choices = [];
                for (var it in data.choices) {
                    var choice: Labs.Components.IChoice = { id: data.choices[it].id, name: data.choices[it].name, value: data.choices[it].value };
                    config.choices.push(choice);
                }
                break;
            default:
                log("td: invalid config type");
                break;
        }
        log("td returning " + JSON.stringify(config));
        return config;
    }

    function fillEmptyIndices(index: number, toInsert: boolean): number {
        if (index == 0 || index == 1 || index == 2) return 0;
        var ret: Map[] = _indexMap.filter(v => {
            if (v.value == index) return true;
            return false;
        });
        if (ret.length > 0) {
            return ret[0].mapped;
        }
        if (!toInsert) return 0;
        var maxElem = Math.max.apply(null, _indexMap.map(v=> { return v.mapped; }));
        _indexMap.push({ value: index, mapped:  maxElem+1});
        return maxElem + 1;
    }

    function normalizeIndex(index: number, toInsert: boolean): number {
        if (index == undefined || isNaN(Math.floor(index))) return 0;
        index = Math.floor(index);
        var newin = fillEmptyIndices(index + 3, toInsert);
        log("td new index: " + newin);
        return newin;
    }

    function receiveEditorMessage(event) {
        log("td: recieving edit message");
        if (event.origin !== _origin) return;
        var data = <IMessage>event.data;
        data.kind = data.kind.split("__")[0];
        switch (data.kind) {
            case "scriptSelected":
                receiveScriptSelected(<IScriptMessage>data);
                break
            case "tutorialSelected":
                receiveTutorialSelected(<IScriptMessage>data);
                break;
            case "connect":
                log("td: sending connection accept message. to edit mode");
                postData('connect',{ mode: 'edit' });
                break;
            case "editorSetConfig":
                log("td: recieved: " + JSON.stringify(data));
                data.data.index = normalizeIndex(data.data.index, true);
                if (data.data.index == 0) postError("editorSetConfig","config number starts from 0");
                else {
                    var appConfig: IConfigData = undefined;
                    switch (data.data.type) {
                        case "activity":
                            appConfig = <IActivityConfigData>serializeData(<IActivityConfigData>data.data, "activity");
                            break;
                        case "input":
                            appConfig = <IInputConfigData>serializeData(<IInputConfigData>(data.data), "input");
                        case "choice":
                            appConfig = <IChoiceConfigData>serializeData(<IChoiceConfigData>(data.data), "choice");
                            break;
                        default:
                            postError("editorSetConfig","invalid component type");
                            break;
                    }
                    if (appConfig) {
                        log("td: serialized app config: " + JSON.stringify(appConfig));
                        saveAppConfiguration(appConfig, data.data.type);
                    }
                }
                break;
            case "editorGetConfig":
                log("td: recieved get config: " + JSON.stringify(data));
                data.data.index = normalizeIndex(data.data.index, false);
                if (data.data.index == 0) postError("editorGetConfig","config number starts from 0");
                else {
                    _editor.getConfiguration((err, config) => {
                        if (err) postError("editorGetConfig",err);
                        else    getAppConfigurationAsync(data.data.index);
                        });
                }
                break;
            case "addHints":
                log("td: recieved addHint: "+JSON.stringify(data));
                data.data.index = normalizeIndex(data.data.index, false);
                if (data.data.index == 0) postError("addHints", "config number starts from 0");
                else {
                    addHints(data.data.index, data.data.hints);
                }
                break;
            default:
                postError(data.kind, "unknown message type");
                break;
        }
    }

    function receiveViewMessage(event) {
        if (event.origin !== _origin) return;
        var data = <IMessage>event.data;
        data.kind = data.kind.split("__")[0];
        log("td: receiving view message - " + data.kind);
        switch (data.kind) {
            case "connect":
                log("td: sending connection accept message. to view mode");
                postData("connect", { mode: 'view' });
                break;
            case "labGetState":
                _lab.getState((err, state) => {
                    if (err) postError("labGetState", err);
                    else {
                        log("td: sending state: " + JSON.stringify(state));
                        postData("labGetState", state);
                    }
                });
                break;
            case "labSetState":
                var state = (<IStateMessage>data).data;
                saveState(state, (err, unused) => {
                    if (err) postError("labSetState", err);
                    else postSuccess("labSetState");
                });
                break;
            case "tutorialComplete":
                log("td: recieved tutorial complete");
                handleTutorialComplete();
                break;
            case "leaderboardScore":
                log("td: recieved leadervoard complete");
                handleLeaderboardComplete(<number>data.data.score);
                break;
            case "attemptStart":
                log("td attempt starting - data recieved : " + JSON.stringify(data.data));
                data.data.index = normalizeIndex(data.data.index, false);
                if (data.data.index == 0) postError("attemptStart","index starts from 0");
                else    createAttempt(data.data.index);
                break;
            case "attemptComplete":
                log("td attempt complete - data recieved : " + JSON.stringify(data.data));
                data.data.index = normalizeIndex(data.data.index, false);
                if (data.data.index == 0) postError("attemptComplete","index starts from 0");
                else {
                    switch (data.data.type) {
                        case "activity":
                            handleActivityAttempt(<IActivityAttemptData>data.data, completeActivityAttempt);
                            break;
                        case "input":
                            handleInputAttempt(<IInputAttemptData>data.data, completeInputAttempt);
                            break;
                        case "choice":
                            handleChoiceAttempt(<IChoiceAttemptData>data.data, completeChoiceAttempt);
                            break;
                        default:
                            postError("attemptComplete","invalid activity type");
                    }
                }
                break;
            case "timelineNext":
                Labs.getTimeline().next({}, (err, unused) => {
                    postSuccess("timelineNext");
                });
                break;
            case "getHint":
                log("td: sending hint for: " + JSON.stringify(data.data));
                data.data.index = normalizeIndex(data.data.index, false);
                if (data.data.index == 0) postError("getHint", "index starts from 0");
                else {
                    handleActivityAttempt(data.data, (attempt, data) => {
                        var hints = attempt.getValues("hints");
                        hints[data.hintIndex].getValue((err, hint) => {
                            if (err) postError("getHint", err);
                            else postData("getHint", { hint: hint });
                            });
                    });
                }
                break;
            case "labGetComponentConfig":
                data.data.index = normalizeIndex(data.data.index, false);
                if (data.data.index == 0) postError("labGetComponentConfig", "index starts from 0");
                else getAppComponentData(data.data.index);
                break;
            case "onDeactivate":
                _onDeactivate = 1;
                postSuccess("onDeactivate");
                break;
            case "deactivateDone":
                _onDeactivate = 0;
                break;
            default:
                postError(data.kind, "unknown message type");
                break;
        }
    }

    export function switchMode(mode: Labs.Core.LabMode) {
        log("td: on " + mode);
        window.removeEventListener("message", receiveEditorMessage, false);
        window.removeEventListener("message", receiveViewMessage, false);
        switch (mode) {
            case Labs.Core.LabMode.Edit:
                if (_lab) {
                    log("td: lab done");
                    _lab.done((err, unused) => {
                        _lab = undefined;
                        switchMode(mode);
                    });
                }
                else {
                    Labs.editLab((err, labEditor) => {
                        if (err) return handleError(err);
                        _editor = labEditor;
                        log("td: editor opened");
                        window.addEventListener("message", receiveEditorMessage, false);
                        loadStoreOrApp();
                        updateChrome();
                    });
                }

                break;
            case Labs.Core.LabMode.View:
                if (_editor) {
                    log("td: editor done");
                    _editor.done((err, unused) => {
                        _editor = undefined;
                        switchMode(mode);
                    });
                }
                else if (_lab) {
                        log("td: restarting lab.");
                        _lab.done((err, unused) => {
                            _lab = undefined;
                            switchMode(mode);
                        });
                }
                else {
                    Labs.takeLab((err, lab) => {
                        if (err) return handleError(err);
                        _lab = lab;
                        log('td: lab loaded');
                        window.addEventListener("message", receiveViewMessage, false);
                        loadStoreOrApp();
                    });
                }
                break;
            default:
                log("unknown mode: " + mode);
        }
    }

    export function activate() {
        log("td: activate");
        _isPreviewMode = false;
        updateChrome();
        return;


        if (_lab) {
            var comp = <Labs.Components.ActivityComponentInstance>_lab.components[0];
            if (comp && comp.component.data) {
                var data = <TDev.IScriptMessage>comp.component.data;
                log("td: starting " + data.data.id);
                window.addEventListener("message", receiveViewMessage, false);
                var url = getAppUrl(data);
                setUrl(url);
            }
            else {
                log('td: no lab information');
                setUrl("");
            }
        }
        else {
            log('td: trying to activate lab, but lab not opened');
            return;
        }
    }

    export function deactivate() {
        log("td: deactivate. Calling destroy");
        if (_onDeactivate == 0) {
            setUrl("");
            log("td: Destroy successful");
        }
        switch (_onDeactivate)    {
            case 0:
                setUrl("");
                log("td: Destroy successful");
                break;
            case 1:
                _onDeactivate = 2;
                postSuccess("deactivate");
                break;
        }

    }

    export function log(msg: string) {
        if (console.log) console.log(msg);
    }

    export function elt(name: string): HTMLElement {
        return document.getElementById(name);
    }
    export function hide(name: string) {
        var el: HTMLElement = elt(name);
        el.style.display = 'none';
    }
    export function show(name: string) {
        var el: HTMLElement = elt(name);
        el.style.display = '';
    }


    export function init() {
        hide("edit");
        hide("preview");
        hide("another");

        TDev.elt("edit").onclick = function () {
            switchMode(Labs.Core.LabMode.Edit);
        }
        TDev.elt("preview").onclick = function () {
            _isPreviewMode = true;
            switchMode(Labs.Core.LabMode.View);
        }
        TDev.elt("another").onclick = function () { destroy(); }

        log("td: onload");
        if (/dbg=1/.test(window.location.href)) {
            _dbg = true;
            log("td: dbg mode");
        }
        if(/standAloneApp/.test(window.location.href)) {
            _standAloneApp = true;
            log("td: stand alone app mode");
        }
        Labs.DefaultHostBuilder = function () {
            if (_dbg) {
                log("td: labs dbg mode");
                return <Labs.Core.ILabHost>new Labs.PostMessageLabHost("test", parent, "*");
            } else {
                return <Labs.Core.ILabHost>new Labs.OfficeJSLabHost();
            }
        };

        log("td: connecting");
        Labs.connect((err, response) => {
            if (err) return handleError(err);

            log("td: connected: " + response.mode);
            switchMode(response.mode);
            Labs.on(Labs.Core.EventTypes.ModeChanged, (modeChangedEvent) => {
                switchMode(<Labs.Core.LabMode>(<any>Labs.Core.LabMode)[modeChangedEvent.mode]);
            });
            Labs.on(Labs.Core.EventTypes.Activate, () => activate());
            Labs.on(Labs.Core.EventTypes.Deactivate, () => deactivate());
        });
    }

    export function destroy() {
        _isPreviewMode = false;
        hide("edit");
        hide("preview");
        hide("another");
        if (currentMode() === Labs.Core.LabMode.View) switchMode(Labs.Core.LabMode.Edit);
        saveEditorConfiguration(undefined, undefined, undefined);
        loadStoreOrApp();
        updateChrome();
    }

}

window.onload = () => {
    TDev.init();
};
