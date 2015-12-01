///<reference path='refs.ts'/>

module TDev
{
    export interface KindBoxModel
    {
        getKind() : Kind;
        setKind(k:Kind) : void;
        getContexts() : KindContext;
        immutableReason():string;
        kindBoxHeader():string;
    }

    export class VariableProperties
        extends CodeView
        implements KindBoxModel
    {
        private theVariable:AST.GlobalDef;
        constructor() {
            super()
            this.kindContainer = VariableProperties.mkKindContainer(this);
        }
        private variableName = HTML.mkTextInputWithOk("text", lf("variable name"));
        private kindContainer:HTMLElement;
        private formRoot = div("varProps");
        private varRender = div("");
        private description = HTML.mkTextArea("description");
        private artEditor:ArtEditor = null;
        private persistentCheckbox:HTMLElement;
        private renderer = new TDev.EditorRenderer();
        private persistanceRadio:HTML.RadioGroup;

        public getTick() { return Ticks.viewVariableInit; }

        public nodeType() { return "globalDef"; }
        public editedStmt():AST.Stmt { return this.theVariable ? this.theVariable : null; }

        public kindBoxHeader()
        {
            return this.theVariable.isResource ? lf("art resource") : lf("global variable")
        }

        public init(e:Editor)
        {
            super.init(e);
            this.variableName.id = "renameBox2";
            this.variableName.addEventListener("change", () => this.nameUpdated())
            this.description.className = "variableDesc";
        }

        static kindSelectorVisible = false;
        static mkKindContainer(model:KindBoxModel) : HTMLElement
        {
            function selectKind() {
                var reason = model.immutableReason();
                if (!!reason) {
                    HTML.showErrorNotification(reason);
                    return;
                }
                function doKind(hd:string, ctx, f:(k:Kind)=>void)
                {
                    var m = new ModalDialog();
                    var kindList = DeclRender.mkKindList(ctx, model.getKind(),
                                                         (k:Kind) => {
                                                            m.dismiss();
                                                            if (k.getParameterCount() == 0 || k.getRoot() != k) f(k);
                                                            else {
                                                                Util.assert(k.getParameterCount() == 1)
                                                                var hd0 = k.getName() + " of ..."
                                                                if (/ of \.\.\.$/.test(hd))
                                                                    hd0 = hd.replace(/\.\.\.$/, hd0)
                                                                doKind(hd0, KindContext.Parameter, (kk) => {
                                                                    f((<ParametricKind>k).createInstance([kk]))
                                                                })
                                                            }
                                                         });
                    m.onDismiss = () => { VariableProperties.kindSelectorVisible = false; TheEditor.updateTutorial() }
                    m.choose(kindList, { header: hd });
                    VariableProperties.kindSelectorVisible = true
                    if (TheEditor.stepTutorial)
                        TheEditor.stepTutorial.notifyKindList(kindList)
                }

                doKind(lf("select type of this {0}", model.kindBoxHeader()), model.getContexts(), k => model.setKind(k))
            }

            var d = div("kindContainer");
            HTML.setTickCallback(d, Ticks.btnChangeKind, selectKind);
            (<any>d).refresh = () => {
                d.setChildren([DeclRender.mkKindBox(model.getKind())]);
            };
            return d;
        }

        private isActive() { return !!this.theVariable; }

        public getContexts() {
            return this.theVariable.isResource ? KindContext.ArtResource
                 : this.theVariable.getRecordPersistence() == AST.RecordPersistence.Temporary ? KindContext.GlobalVar
                 : KindContext.CloudField;
        }
        public getKind() { return this.theVariable.getKind(); }
        public immutableReason():string { return null; }

        public newNameHint(newName:string, defl:string = null)
        {
            if (!newName) return;
            newName = newName.slice(0, 30);

            var n = this.theVariable.getName()
            var k = this.theVariable.getKind()
            var defls = ["v", k.getStemName(), newName]
            if (defl) defls.push(defl);

            if (defls.some(s => Script.namesMatch(n, s))) {
                this.commit();
                this.theVariable.setName(Script.freshName(newName))
                this.syncAll();
            }
        }

        public setKind(k:Kind)
        {
            var k0 = this.theVariable.getKind() || api.core.Unknown;

            this.theVariable.setKind(k);
            Script.resetStableName(this.theVariable);
            this.commit();

            var n = this.theVariable.getName()
            if (k != k0 && (Script.namesMatch(n, "v") || Script.namesMatch(n, k0.getStemName())))
                this.theVariable.setName(Script.freshName(k.getStemName()))

            if (this.theVariable.isResource)
                this.load(this.theVariable); // need to get new art editor
            else
                this.syncAll();
        }

        private syncAll(tc = true)
        {
            AST.TypeChecker.tcApp(Script);
            this.variableName.value = this.theVariable.getName();
            if (!!this.artEditor) this.artEditor.set(this.theVariable.url);
            this.description.value = this.theVariable.comment;
            (<any>this.kindContainer).refresh();

            this.varRender.setChildren([this.renderer.declDiv(this.theVariable)]);
            this.renderer.attachHandlers();
            this.persistanceRadio.change(this.theVariable.getRecordPersistence());

            TheEditor.updateTutorial()
        }

        private persistanceChanged()
        {
            if (this.theVariable.getRecordPersistence() == this.persistanceRadio.current) return;
            var cloud = this.persistanceRadio.current
            this.theVariable.cloudEnabled = cloud == AST.RecordPersistence.Cloud;
            this.theVariable.isTransient = !(cloud == AST.RecordPersistence.Local || cloud == AST.RecordPersistence.Cloud);
            this.theVariable.notifyChange();
            this.syncAll();
        }

        public renderCore(a:AST.Decl) { return this.load(<AST.GlobalDef>a); }

        public editFullScreen()
        {
            if (this.artEditor instanceof StringEditor) {
                (<StringEditor>this.artEditor).editFullScreenAsync().done()
            }
        }

        private load(a:AST.GlobalDef) :void
        {
            this.theVariable = null;
            TheEditor.dismissSidePane();
            this.theVariable = a;
            if (a.isResource) {
                this.artEditor = ArtEditor.lookup(a.getKind());
                if (this.artEditor) {
                    this.artEditor.newNameHint = (s) => this.newNameHint(s);
                    this.artEditor.varName = () => this.variableName.value;
                }
            } else
                this.artEditor = null;

            this.persistanceRadio = HTML.mkRadioButtons(
                Script.isCloud ? (Script.isLibrary ? RecordDefProperties.cloudlibraryVarPersistenceLabels : RecordDefProperties.servicePersistenceLabels)
                : RecordDefProperties.cloudstatePersistenceLabels);

            this.persistanceRadio.onchange = () => this.persistanceChanged();

            var saveBox = div(null,
                  Editor.mkHelpLink("persistent data"),
                  this.persistanceRadio.elt)

            var renderedEditor = null;

            if (this.theVariable.isResource)
                saveBox.style.display = "none";

            this.formRoot.setChildren([
                                  Editor.mkHelpLink(a.isResource ? "art" : "data"),
                                  div("varLabel", a.isResource ? lf("art resource") : lf("global variable")),
                                  this.variableName,
                                  // div("varLabel", lf("of type")),
                                  this.kindContainer,
                                  this.varRender,
                                  TheEditor.widgetEnabled("persistanceRadio") ? saveBox : undefined,
                                  //div("formHint", lf("You can read the colon symbol (':') as 'of type' everywhere in TouchDevelop.")),
                                  ActionProperties.copyCutRefs("the current variable", this.theVariable),
                                  !this.artEditor ? null : (renderedEditor = this.artEditor.render()),
                                  div("varLabel", lf("description")),
                                  this.description,
                                  ]);
            this.editor.displayLeft([this.formRoot]);
            this.syncAll();

            if (this.theVariable.getKind() == api.core.Unknown)
                KeyboardMgr.triggerClick(this.kindContainer);
            else if (this.theVariable.isResource && !this.theVariable.url && renderedEditor && renderedEditor.blinkSection) {
                Util.ensureVisible(renderedEditor.blinkSection);
                Util.coreAnim("blinkLocation", 4000, renderedEditor.blinkSection);
            }
        }

        private nameUpdated()
        {
            if (this.theVariable.getName() != this.variableName.value) {
                this.theVariable.setName(Script.freshName(this.variableName.value));
                this.syncAll()
            }
        }

        public commit()
        {
            if(!this.theVariable) return;
            if (this.theVariable.getName() != this.variableName.value)
                this.theVariable.setName(Script.freshName(this.variableName.value));
            if (!!this.artEditor) {
                var newUrl = this.artEditor.get();
                if (newUrl != this.theVariable.url) {
                    // force reload
                    Script.resetStableName(this.theVariable);
                    this.theVariable.url = newUrl;
                }
            }
            this.theVariable.comment = this.description.value;
            this.theVariable.notifyChange();
            TheEditor.queueNavRefresh();
        }
    }

    export class ArtEditor
    {
        public set(url:string) { return Util.abstract() }
        public get() : string { return Util.abstract() }
        public render() : HTMLElement { return Util.abstract() }
        public init(k: Kind) { }
        public varName: () => string;
        public newNameHint:(s:string)=>void;

        static editors:any;

        static lookup(k:Kind)
        {
            var fn = ArtEditor.editors[k.getName()];
            if (!fn) fn = UrlEditor;
            var obj = <ArtEditor> new fn();
            obj.init(k);
            return obj;
        }

        static initEditors()
        {
            ArtEditor.editors =
                {
                    Picture: ImgEditor,
                    Sound: SoundEditor,
                    Color: ColorEditor,
                    Number : NumberEditor,
                    String: StringEditor,
                    Document: DocumentEditor,
                    "Json Object": JsonObjectEditor,
                };
            Object.keys(ArtEditor.editors).forEach((kn:string) => {
                var k = api.getKind(kn);
                k._contexts |= KindContext.ArtResource;
            });
        }
    }

    export class ImgEditor
        extends ArtEditor
    {
        private url = HTML.mkTextInput("text", lf("picture url"));
        private img = <HTMLImageElement>createElement("img", "varImg checker");
        private imgInfo = div("varImgInfo", lf("no picture loaded yet"));
        private progressBar = HTML.mkProgressBar();
        private uploadButton : HTMLElement;
        private searchOnlineButton : HTMLElement;

        private uploadHandler() {
            ArtUtil.uploadPictureDialogAsync().done((a: TDev.JsonArt) => {
                if(!!a) {
                    this.set(a.pictureurl);
                    this.newNameHint(a.name);
                }
            });
        }

        private searchOnlineHandler() {
            var m = new ModalDialog();

            var converter = (s: Browser.ArtInfo) => {
                return s.mkSmallBoxNoClick().withClick(() => {
                    m.dismiss();
                    s.getJsonAsync().done(() => {
                        if (s.art.pictureurl) {
                            this.set(s.art.pictureurl);
                            this.newNameHint(s.name)
                        }
                    });
                });
            };

            var queryAsync = (terms: string) => Meta.searchArtAsync(terms, "picture")
                    .then((itms: Browser.ArtInfo[]) => itms.map(itm => converter(itm)).filter(itm => itm != null));
            m.choose([], { queryAsync: queryAsync,
                           searchHint: lf("Type to search..."),
                           initialEmptyQuery: true });
        }

        constructor() {
            super()
            this.url.style.width = '60%';
            this.url.onchange = (ev: Event) => {
                this.img.src = this.url.value;
            };
            this.img.onloadstart = () => {
                this.progressBar.start();
                this.imgInfo.innerHTML = "loading...";
            };
            this.img.onerror = () => {
                this.progressBar.stop();
                if (this.url.value)
                    this.imgInfo.setChildren([lf("Ooops, there was an error loading the picture.")]);
                else
                    this.imgInfo.setChildren([lf("no picture loaded yet")]);
            };
            this.img.onload = () => {
                this.progressBar.stop();
                this.imgInfo.innerHTML = '';
            };
            this.uploadButton = HTML.mkButton(lf("upload"), () => {
                this.uploadHandler();
            });
            this.searchOnlineButton = HTML.mkButton(lf("search art pictures"), () => {
                this.searchOnlineHandler();
            });
        }

        public set(v: string) {
            this.url.value = v;
            this.img.src = v;
        }
        public get() { return this.url.value; }

        public render()
        {
            var durl = div('', [this.searchOnlineButton,this.uploadButton]);
            var r = div("artEditor",
                  durl,
                  div("varLabel", lf("url")),
                  div('', this.url),
                  div("varLabel", lf("preview")),
                  div('', [<HTMLElement>this.progressBar, this.img, this.imgInfo])
                  );
            (<any>r).blinkSection = durl
            return r
        }
    }

    export class DocumentEditor
        extends ArtEditor {
        private url: HTMLInputElement;
        private uploadButton: HTMLElement;
        private searchOnlineButton: HTMLElement;
        constructor() {
            super()
            this.url = HTML.mkTextInput("text", "The document url");
            this.url.readOnly = true;
            this.uploadButton = HTML.mkButton(lf("upload"),() => {
                this.uploadHandler();
            });
            this.searchOnlineButton = HTML.mkButton(lf("search documents"),() => {
                this.searchOnlineHandler();
            });
        }

        public set(v: string) { this.url.value = v; }
        public get() { return this.url.value; }

        private uploadHandler() {
            ArtUtil.uploadDocumentDialogAsync().done((a: TDev.JsonArt) => {
                if (!!a) {
                    this.set(a.bloburl);
                    this.newNameHint(a.name);
                }
            });
        }

        private searchOnlineHandler() {
            var m = new ModalDialog();
            var converter = (s: Browser.ArtInfo) => {
                return s.mkSmallBoxNoClick().withClick(() => {
                    m.dismiss();
                    s.getJsonAsync().done(() => {
                        if (s.art.bloburl) {
                            this.set(s.art.bloburl);
                            this.newNameHint(s.name)
                        }
                    });
                });
            };

            var queryAsync = (terms: string) => Meta.searchArtAsync(terms, "document")
                .then((itms: Browser.ArtInfo[]) => itms.map(itm => converter(itm)).filter(itm => itm != null));
            m.choose([], {
                queryAsync: queryAsync,
                searchHint: lf("Type to search..."),
                initialEmptyQuery: true
            });
        }

        public render() {
            var durl = div('', [this.searchOnlineButton, this.uploadButton]);
            var r = div("artEditor",
                durl,
                div("varLabel", lf("url")),
                div('', this.url)
                );
            (<any>r).blinkSection = durl
            return r;
        }
    }

    export class UrlEditor
        extends ArtEditor
    {
        private url: HTMLInputElement;
        constructor(inputType : string = "text") {
            super()
            this.url = HTML.mkTextInput("text", lf("url"));
        }

        public set(v:string) { this.url.value = v; }
        public get() { return this.url.value; }

        public render()
        {
            return div("artEditor",
                  div("varLabel", lf("value")),
                  this.url
                  );
        }
    }

    export class NumberEditor
        extends UrlEditor
    {
        constructor () {
            super("number")
        }
    }

    export class StringEditor
        extends ArtEditor
    {
        private url: HTMLInputElement;
        private value: HTMLTextAreaElement;
        constructor() {
            super()
            this.value = HTML.mkTextArea("variableDesc");
            this.url = HTML.mkTextInput("text", lf("url"));
        }

        public set(v: string) {
            var value = TDev.RT.String_.valueFromArtUrl(v);
            if (value) {
                // TODO: limit size of value
                this.value.value = value;
                this.url.value = "";
            } else {
                this.value.value = "";
                this.url.value = v;
            }
        }
        public get() {
            var v = this.value.value;
            if (v) return TDev.RT.String_.valueToArtUrl(v);

            return this.url.value;
        }

        public editFullScreenAsync(): Promise {
            return EditorHost.editFullScreenAsync(this.varName(), this.value.value)
                .then(value => this.value.value = value);
        }

        public render()
        {
            var labelDiv: HTMLElement;
            var d = div("artEditor",
                div('', span("varLabel", lf("value")), HTML.mkButton(lf("full screen"),() => this.editFullScreenAsync().done())),
                this.value,
                labelDiv = div("varLabel", lf("url")),
                this.url);
            return d;
        }
    }

    export class JsonObjectEditor
        extends ArtEditor {
        private value: HTMLTextAreaElement;
        constructor() {
            super()
            this.value = HTML.mkTextArea("variableDesc");
        }

        public set(v: string) {
            var value = TDev.RT.String_.valueFromArtUrl(v);
            this.value.value = value;
        }
        public get() {
            return TDev.RT.String_.valueToArtUrl(this.value.value);
        }

        public editFullScreenAsync(): Promise {
            return EditorHost.editFullScreenAsync(this.varName(), this.value.value, "json")
                .then(value => this.value.value = value);
        }

        public render() {
            var labelDiv: HTMLElement;
            var d = div("artEditor",
                div('', span("varLabel", lf("value")), HTML.mkButton(lf("full screen"),() => this.editFullScreenAsync().done())),
                this.value);
            return d;
        }
    }

    export class SoundEditor
        extends ArtEditor
    {
        private url = HTML.mkTextInput("text", lf("sound url"));
        private audioDiv = div("");
        private progressBar = HTML.mkProgressBar();
        private uploadButton: HTMLElement;
        private searchOnlineButton: HTMLElement;

        private searchOnlineHandler() {
            var m = new ModalDialog();

            var converter = (s: Browser.ArtInfo) => {
                return s.mkSmallBoxNoClick().withClick(() => {
                    m.dismiss();
                    s.getJsonAsync().done(() => {
                        if (s.art.wavurl) {
                            this.set(s.art.wavurl);
                            this.newNameHint(s.art.name);
                        }
                    });
                });
            };

            var queryAsync = (terms: string) => Meta.searchArtAsync(terms, "sound")
                    .then((itms: Browser.ArtInfo[]) => itms.map(itm => converter(itm)).filter(itm => itm != null));
            m.choose([], { queryAsync: queryAsync, searchHint: lf("Type to search..."), initialEmptyQuery: true });
        }

        private uploadHandler() {
            ArtUtil.uploadSoundDialogAsync().done((a: TDev.JsonArt) => {
                if (!!a) {
                    this.set(a.wavurl);
                    this.newNameHint(a.name);
                }
            });
        }

        constructor () {
            super()

            this.uploadButton = HTML.mkButton(lf("upload"), () => {
                this.uploadHandler();
            });
            this.searchOnlineButton = HTML.mkButton(lf("search online art sounds"), () => {
                this.searchOnlineHandler();
            });
            this.url.onchange = (ev: Event) => {
                this.set(this.url.value);
            };
        }

        public set(v: string) {
            this.url.value = v;
            if (v) {
                var audio = HTML.mkAudio(this.url.value, HTML.patchWavToMp4Url(this.url.value), null, true);
                HTML.audioLoadAsync(audio).done();
                this.audioDiv.setChildren([audio]);
            } else {
                this.audioDiv.setChildren([]);
            }
        }

        public get() { return this.url.value; }

        public render() {
            var durl = div('', [this.searchOnlineButton, this.uploadButton])
            var r = div("artEditor",
                  div("varLabel", lf("i want to find sounds")),
                  durl,
                  div("varLabel", lf("url")),
                  this.url,
                  this.audioDiv
                  );
            (<any>r).blinkSection = durl;
            return r
        }
    }

    export class ColorEditor
        extends UrlEditor
    {
        private labels = ["alpha", "red", "green", "blue"];
        private inputs:HTMLElement[] = [];
        private sliders:HTMLInputElement[];
        constructor() {
            super()
        }
        private currentHex = div("wallText", "");
        private backgrounds = [div("colorSample whiteText", lf("white")), div("colorSample blackText", lf("black"))];
        private foregrounds = [div("colorSample whiteBackground", lf("on white")), div("colorSample blackBackground", lf("on black"))];

        public init(k:Kind)
        {
            var mkSlider = (l:string):HTMLInputElement => {
                var r = HTML.mkTextInput("range", lf("color range"));
                r.className = "colorSlider";
                r.min = "0";
                r.max = "255";
                r.step = "1";
                r.onchange = Util.catchErrors("colorEditorSlider", () => { this.sliderUpdate() });
                this.inputs.push(div("sliderWithLabel", r, l));
                return r;
            }

            this.sliders = this.labels.map(mkSlider);
        }

        private sliderUpdate()
        {
            this.currentHex.innerHTML = this.get();
            var htmlColor = "rgba(" + [1, 2, 3, 0].map((i) => i == 0 ? parseInt(this.sliders[i].value)/255 + "" : this.sliders[i].value).join(", ") + ")";
            this.backgrounds.forEach((e:HTMLElement) => { e.style.backgroundColor = htmlColor });
            this.foregrounds.forEach((e:HTMLElement) => { e.style.color = htmlColor });
        }

        public set(v:string)
        {
            v = v.slice(1); // strip #
            for (var i = 0; i < 4; ++i)
                this.sliders[i].value = parseInt(v.slice(i*2, i*2+2), 16) + "";
            this.sliderUpdate();
        }

        public get()
        {
            var r = "#";
            for (var i = 0; i < 4; ++i)
                r += (parseInt(this.sliders[i].value) | 0x100).toString(16).slice(1, 3);
            return r;
        }

        public render()
        {
            return div("artEditor",
                  div("varLabel", lf("color")),
                  this.inputs,
                  this.currentHex,
                  this.backgrounds,
                  this.foregrounds);
        }
    }

    export module ArtUtil {
        export function artImg(id: string, thumb = false): HTMLElement {
            var d = div('iconThumb');
            d.style.backgroundImage = Cloud.artCssImg(id, true);
            return d;
        }
       
        export function importFileDialog() {
            var m = new ModalDialog();
            var input = HTML.mkTextInput("file", lf("choose .hex or .jsz files"));
            input.multiple = true;
            input.accept = ".hex,.json,.jsz";
            
            m.add(div('wall-dialog-header', lf("import code")));
            m.add(div('wall-dialog-body', lf("Imports the code from .hex files created for the BBC micro:bit or saved .jsz files. Hint: you can also drag and drop the files in the editor to import them!")));
            if (Browser.isMobileSafari || Browser.isMobileSafariOld) {
                m.add(div('wall-dialog-body',
                    lf("To import files to your iPhone or iPad, you need to have the latest software installed. Files can only be imported from a cloud storage app.")));
            }
            m.add(div('wall-dialog-body', input));
            m.add(div('wall-dialog-buttons',
                HTML.mkButton(lf("import"), () => {
                    m.dismiss();
                    handleImportFilesAsync(Util.toArray(input.files))
                        .done();
                }),
                HTML.mkButton(lf("cancel"), () => m.dismiss())
            ));
            m.show();            
        }

        export function handleImportFilesAsync(files: File[]) {
            if (!files || !files.length) return Promise.as([]);
            
            var guids: string[] = [];
            var index = 0;
            return ProgressOverlay.lockAndShowAsync(lf("importing files..."))
                .then(() => Promise.sequentialMap(files, (file,i) => {
                    ProgressOverlay.setProgress(++index + "/" + files.length);
                    return installFileAsync(file);   
                }))
                .then((gs:string[]) => {
                    gs.filter(g => !!g).forEach(g => guids = guids.concat(g));
                    return Browser.TheHost.clearAsync(false);
                }).then(() => {
                    ProgressOverlay.hide();
                    if (guids.length > 0) {
                        HTML.showProgressNotification(lf("{0} file{0:s} imported", guids.length));
                        Util.setHash("#list:installed-scripts:script:" + guids[0] + ":overview");
                    }
                    return guids;
                }, e => ProgressOverlay.hide());
        }
        
        function installFileAsync(file: File): Promise {
            return installHexFileAsync(file)
                .then(res => res ? res : installJsonFileAsync(file));
        }
        
        function installJsonFileAsync(file: File): Promise { // string[] (guids)
            if (!file) return Promise.as(undefined);
            
            var guid: string = "";
            var buf: Uint8Array;
            var str: string;
            return HTML.fileReadAsArrayBufferAsync(file)
                .then((dat: ArrayBuffer) => {
                    buf = new Uint8Array(dat);
                    return lzmaDecompressAsync(buf);
                }).then((strc: string) => {        
                    var f: Cloud.Workspace;
                    try {
                        str = strc || Util.fromUTF8Bytes(buf);
                        f = <Cloud.Workspace>JSON.parse(str);
                        f.scripts = (f.scripts || []).filter(f => !!f);
                    }
                    catch (e) {                        
                        return Promise.as(undefined);
                    }
                    
                    if (!f.scripts || !f.scripts.length) return Promise.as([]);

                    return Promise.sequentialMap(f.scripts, script => {
                        var src = script.source;
                        var header = script.header;
                        if (!src) {
                            HTML.showErrorNotification(lf("This script is missing the source."))
                            return Promise.as(undefined);                            
                        }
                        if (!header) {
                            HTML.showErrorNotification(lf("This script is missing the header."))
                            return Promise.as(undefined);                            
                        }
                        return World.installFromSaveAsync(script.header, script.source)
                            .then(h => h.guid, e => {
                                HTML.showErrorNotification("Sorry, this script file is invalid.");
                                return undefined;
                            })
                    })
                });
        }
        
        function installHexFileAsync(file: File): Promise { // string[] (guid)
            if (!file) return Promise.as(undefined);
            
            var guid: string = "";
            return HTML.fileReadAsArrayBufferAsync(file)
                .then((dat) => {
                    var str = Util.fromUTF8Bytes(new Uint8Array(dat));
                    var tmp = AST.Bytecode.Binary.extractSource(str || "")
                    if (!tmp) return Promise.as(undefined);
                    
                    if (!tmp.meta || !tmp.text) {
                        HTML.showErrorNotification(lf("This .hex file doesn't contain source."))
                        return Promise.as(undefined);
                    }
                    var hd: any = JSON.parse(tmp.meta)
                    if (!hd) {
                            HTML.showErrorNotification(lf("This .hex file is not valid."))
                            return Promise.as()                        
                    }
                    else if (hd.compression == "LZMA") {
                        return lzmaDecompressAsync(tmp.text)
                            .then(res => {
                                if (!res) return null;
                                var meta = res.slice(0, hd.headerSize || hd.metaSize);
                                var text = res.slice(meta.length);
                                return [JSON.parse(meta), text]
                            })
                    } else if (hd.compression) {
                        HTML.showErrorNotification(lf("Compression type {0} not supported.", hd.compression))
                        return Promise.as()
                    } else {
                        return Promise.as([hd, Util.fromUTF8Bytes(tmp.text)])
                    }
                })
                .then(dat => {
                    if (!dat) return Promise.as();

                    var hd:Cloud.Header = dat[0]
                    var text:string = dat[1]
                    return World.installFromSaveAsync(hd, text).then(h => [h.guid]);
                }, err => Promise.as(undefined));
        }
        
        function uploadFile(file: File) {
            if (!file) return;
                    
            handleImportFilesAsync([file])
                .then(guids => {
                    if (guids.length > 0) return;
                    if (Cloud.anonMode(lf("uploading art"))) return;
                    var isDoc = HTML.documentMimeTypes.hasOwnProperty(file.type)
                    var sizeLimit = 1
                    if (isDoc) sizeLimit = 8
                    if (file.size > sizeLimit * 1024 * 1024) {
                        ModalDialog.info(lf("file too big"), lf("sorry, the file is too big (max {0}Mb)", sizeLimit));
                    } else {
                        var name = file.name;
                        var m = /^([\w ]+)(\.[a-z0-9]+)$/i.exec(file.name);
                        if (m) name = m[1];
                        if (/^image\/(png|jpeg)$/i.test(file.type)) {
                            ArtUtil.uploadPictureDialogAsync({
                                removeWhite: Cloud.isRestricted() ? false : /^image\/png$/i.test(file.type),
                                input: HTML.mkFileInput(file, 1),
                                initialName: name,
                                finalDialog: !Script
                            })
                                .done((art: JsonArt) => {
                                    if (art && Script) {
                                        var n = TheEditor.freshPictureResource(art.name, art.pictureurl);
                                        TheEditor.addNode(n);
                                    }
                                });
                        } else if (/^audio\/(wav|x-wav)$/i.test(file.type)) {
                            ArtUtil.uploadSoundDialogAsync(HTML.mkFileInput(file, 1), name).done((art: JsonArt) => {
                                if (art && Script) {
                                    var n = TheEditor.freshSoundResource(art.name, art.wavurl);
                                    TheEditor.addNode(n);
                                }
                            });
                        } else if (Cloud.lite && isDoc) {
                            ArtUtil.uploadDocumentDialogAsync(HTML.mkFileInput(file, 1), name).done((art: JsonArt) => {
                                if (art && Script) {
                                    var n = TheEditor.freshDocumentResource(art.name, art.bloburl);
                                    TheEditor.addNode(n);
                                }
                            });
                        } else {
                            ModalDialog.info(lf("unsupported file type"), lf("sorry, you can only upload pictures (PNG and JPEG) or sounds (WAV)"));
                        }
                    }
                })
        }
        
        function uploadFiles(files: File[]) {
            handleImportFilesAsync(files)
                .then(guids => {
                    if (guids.length > 0) return;

                    if (!Cloud.hasPermission("batch-post-art") && !TDev.dbg) return;

                    var m = new ModalDialog();
                    var template = HTML.mkTextArea("wall-input");
                    template.placeholder = lf("Art name template");
                    template.value = "{name}"
                    var descr = HTML.mkTextArea("wall-input");
                    descr.placeholder = lf("Enter the description");
                    m.add(div('wall-dialog-header', lf("uploading art {0} resources", files.length)));
                    m.add(template);
                    m.add(descr);
                    m.add(div("wall-dialog-body", lf("Everyone will be able to access those art resources. ")));
                    m.add(Cloud.mkLegalDiv());
                    m.addOk(lf("upload"), () => {
                        var d = descr.value || "";
                        var t = template.value; if (t.indexOf("{name}") < 0) t += "{name}";
                        var ps = files.map(file =>
                            HTML.fileReadAsDataURLAsync(file)
                                .then(uri => {
                                    if (!uri) return Promise.as();
                                    else {
                                        var name = file.name.substr(0, RT.String_.last_index_of(file.name, '.', file.name.length));
                                        name = t.replace("{name}", name);
                                        Util.log('uploading ' + file.name + '->' + name)
                                        return uploadArtAsync(name, d, uri);
                                    }
                                })
                        );
                        Promise.join(ps)
                            .done(() => m.dismiss());
                    });
                    m.show();
                })
        }
        
        export function setupDragAndDrop(r: HTMLElement) {

            if (!Browser.dragAndDrop) return;

            r.addEventListener('paste', function(e: any /*: ClipboardEvent*/) {
                Util.log('clipboard paste');
                if (e.clipboardData) {
                    // has file?
                    var files = Util.toArray<File>(e.clipboardData.files).filter((file: File) => /^(image|sound)/.test(file.type));
                    if (files.length > 1) {
                        e.stopPropagation(); // Stops some browsers from redirecting.
                        e.preventDefault();
                        uploadFiles(files);
                    }                    
                    else if (files.length > 0) {
                        e.stopPropagation(); // Stops some browsers from redirecting.
                        e.preventDefault();
                        uploadFile(e.clipboardData.files[0])
                    }
                    // has item?
                    else if (e.clipboardData.items && e.clipboardData.items.length > 0) {
                        var f = e.clipboardData.items[0].getAsFile()
                        if (f) {
                            e.stopPropagation(); // Stops some browsers from redirecting.
                            e.preventDefault();
                            uploadFile(f)
                        }
                    }
                }
            })            
            r.addEventListener('dragover', function(e) {
                var types = e.dataTransfer.types;
                var found = false;
                for (var i = 0; i < types.length; ++i)
                    if (types[i] == "Files")
                        found = true;
                if (found) {
                    if (e.preventDefault) e.preventDefault(); // Necessary. Allows us to drop.
                    e.dataTransfer.dropEffect = 'copy';  // See the section on the DataTransfer object.
                    return false;
                }
            }, false);
            r.addEventListener('drop', (e) => {
                var files = Util.toArray<File>(e.dataTransfer.files);
                if (files.length > 1) {
                    e.stopPropagation(); // Stops some browsers from redirecting.
                    e.preventDefault();
                    uploadFiles(files);
                } else if (files.length > 0) {
                    e.stopPropagation(); // Stops some browsers from redirecting.
                    e.preventDefault();
                    uploadFile(files[0]);
                }
                return false;
            }, false);
            r.addEventListener('dragend', (e) => {
                return false;
            }, false);
        }

        export function uploadDocumentDialogAsync(input?: TDev.HTML.IInputElement, initialName?: string): Promise {
            if (!Cloud.lite || Cloud.anonMode(lf("uploading documents"))) {
                return Promise.as();
            }
            return new Promise((onSuccess, onError, onProgress) => {
                var m = new ModalDialog();
                var art: JsonArt = null;
                m.onDismiss = () => onSuccess(art);
                var name = HTML.mkTextInput("text", lf("document name"));
                name.value = initialName || "";
                var description = HTML.mkTextInput("text", lf("description"));
                var file = input || HTML.mkDocumentInput(8);
                var errorDiv = div('validation-error');
                var progressDiv = div('');
                var progressBar = HTML.mkProgressBar();
                m.add(div("wall-dialog-header", lf("upload document")));
                m.add(div("wall-dialog-body",
                    [
                        div('', div('', lf("1. choose a document (.txt, .pptx, .pdf, .css, less than 8MB)")), file.element),
                        div('', div('', lf("2. give it a name (minimum 4 characters)")), name),
                        div('', div('', lf("3. describe it")), description),
                        div('', progressBar),
                        errorDiv,
                        progressDiv
                    ]));
                var publishBtn = null;
                m.add(div("wall-dialog-body", lf("Everyone will be able to read your document on the Internet forever. ")));
                m.add(Cloud.mkLegalDiv());
                m.add(div("wall-dialog-buttons", publishBtn = HTML.mkButton(lf("4. publish"),() => {
                    errorDiv.setChildren([]);
                    if (name.value.length < 4) {
                        errorDiv.setChildren([lf("Oops, the name is too short...")]);
                        return;
                    }
                    var ef = file.validate();
                    if (ef) {
                        errorDiv.setChildren([ef]);
                        return; // no file selected
                    }
                    progressBar.start();
                    publishBtn.style.display = "none"
                    progressDiv.setChildren([lf("publishing...")]);
                    file.readAsync()
                        .then(data => {
                        if (!data) return Promise.as(undefined);
                        else {
                            Util.log('upload document: uploading');
                            return uploadArtAsync(name.value, description.value, data);
                        }
                    }).done((resp) => {
                        publishBtn.style.display = null
                        progressBar.stop();
                        progressDiv.setChildren([]);
                        art = resp;
                        if (!art) {
                            Util.log('upload document: could not read document');
                            errorDiv.setChildren([lf("Could not read document.")]);
                        } else {
                            Util.log('upload document: success');
                            m.dismiss();
                            showUrl(art)
                        }
                    }, e => {
                            Cloud.handlePostingError(e, lf("upload document"))
                        });
                })));
                m.show();
            });
        }

        export function uploadSoundDialogAsync(input? : TDev.HTML.IInputElement, initialName? : string): Promise {
            if (Cloud.anonMode(lf("uploading sounds"))) {
                return Promise.as();
            }
            return new Promise((onSuccess, onError, onProgress) => {
                var m = new ModalDialog();
                var art: JsonArt = null;
                m.onDismiss = () => onSuccess(art);
                var name = HTML.mkTextInput("text", lf("sound name"));
                name.value = initialName || "";
                var description = HTML.mkTextInput("text", lf("description"));
                var file = input || HTML.mkAudioInput(false, 1);
                var errorDiv = div('validation-error');
                var progressDiv = div('');
                var progressBar = HTML.mkProgressBar();
                m.add(div("wall-dialog-header", lf("upload sound")));
                m.add(div("wall-dialog-body",
                    [
                     div('', div('', lf("1. choose a WAV sound (less than 1MB, PCM, mono or stereo, 8 or 16 bit per channel)")), file.element),
                     div('', div('', lf("2. give it a name (minimum 4 characters)")), name),
                     div('', div('', lf("3. describe it")), description),
                     div('', progressBar),
                     errorDiv,
                     progressDiv
                    ]));
                var publishBtn = null;
                m.add(div("wall-dialog-body", lf("Everyone will be able to listen to your sound on the Internet forever. ")));
                m.add(Cloud.mkLegalDiv());
                m.add(div("wall-dialog-buttons", publishBtn = HTML.mkButton(lf("4. publish"), () => {
                    errorDiv.setChildren([]);
                    if (name.value.length < 4) {
                        errorDiv.setChildren([lf("Oops, the sound name is too short...")]);
                        return;
                    }
                    var ef = file.validate();
                    if (ef) {
                        errorDiv.setChildren([ef]);
                        return; // no file selected
                    }
                    progressBar.start();
                    progressDiv.setChildren([lf("publishing... PLEASE WAIT, publishing a sound can take a few minutes")]);
                    file.readAsync()
                        .then(data => {
                            if (!data) return Promise.as(undefined);
                            else {
                                Util.log('upload sound: uploading');
                                return uploadArtAsync(name.value, description.value, data);
                            }
                        }).done((resp) => {
                            progressBar.stop();
                            progressDiv.setChildren([]);
                            art = resp;
                            if (!art) {
                                Util.log('upload sound: could not read sound');
                                errorDiv.setChildren([lf("Could not read sound.")]);
                            } else {
                                Util.log('upload sound: success');
                                m.dismiss();
                                ModalDialog.info(lf("sound published!"), lf("You can find your sound under 'my art' in the hub."));
                            }
                        }, e => {
                            Cloud.handlePostingError(e, lf("upload sound"))
                        });
                })));
                m.show();
            });
        }

        function uploadArtAsync(name: string, description: string, dataUri: string): Promise { // JsonArt
            var dataUrl = Util.splitDataUrl(dataUri);
            if (!dataUrl)
                return Promise.as(null);
            else {
                var request = {
                    kind: 'art',
                    name: name || "",
                    description: description || "",
                    content: dataUrl.content,
                    contentType: dataUrl.contentType,
                    userplatform: Browser.platformCaps
                };
                return Cloud.postPrivateApiAsync("art", request);
            }
        }

        export interface UploadPictureOptions {
            removeWhite?: boolean;
            input?: TDev.HTML.IInputElement;
            initialName?: string;
            finalDialog?: boolean;
        }

        export function uploadPictureDialogAsync(options:UploadPictureOptions = {}): Promise {
            if (Cloud.anonMode(lf("uploading pictures")))
                return Promise.as();
            var removeWhite = !!options.removeWhite
            return new Promise((onSuccess, onError, onProgress) => {
                var m = new ModalDialog();
                var art: JsonArt = null;
                m.onDismiss = () => onSuccess(art);
                var name = HTML.mkTextInput("text", lf("picture name"));
                name.required = true;
                name.value = options.initialName || "";
                var description = HTML.mkTextInput("text", lf("description"));
                var file = options.input || HTML.mkImageInput(false, 1);
                var removeWhiteCheck = HTML.mkCheckBox(lf("remove white background (best for game sprites)"), (b) => removeWhite = b, removeWhite);
                var errorDiv = div('validation-error');
                var progressDiv = div('');
                var progressBar = HTML.mkProgressBar();
                m.add(div("wall-dialog-header", lf("upload picture")));
                m.add(div("wall-dialog-body",
                    [
                     div("", div("", options.input ? null : lf("choose a picture (less than 1MB, smaller than 2048x2048)")), file.element),
                     div("", div("", lf("picture name (minimum 4 characters)")), name),
                     div("", div("", lf("description (helps search)")), description),
                     div('', div('', removeWhiteCheck)),
                     div('', progressBar),
                     errorDiv,
                     progressDiv
                    ]));
                var publishBtn, cancelBtn;
                m.add(div("wall-dialog-body", lf("Everyone will be able to see your picture on the Internet forever. ")));
                m.add(TDev.Cloud.mkLegalDiv());
                m.add(div("wall-dialog-buttons",
                    cancelBtn = HTML.mkButton(lf("cancel"), () => m.dismiss()),
                    publishBtn = HTML.mkButton(lf("publish"), () => {
                    errorDiv.setChildren([]);
                    if (name.value.length < 4) {
                        errorDiv.setChildren([lf("Oops, the picture name is too short...")]);
                        return;
                    }
                    var ef = file.validate();
                    if (ef) {
                        errorDiv.setChildren([ef]);
                        return; // no file selected
                    }
                    progressBar.start();
                    progressDiv.setChildren([lf("publishing...")]);
                    publishBtn.style.display = "none"
                    file.readAsync()
                        .then(data => {
                            if (!data) return Promise.as(undefined);
                            else if (removeWhite) {
                                var localPic = null;
                                return TDev.RT.Picture.fromUrl(data, false, false)
                                    .then(p => {
                                        localPic = p;
                                        return p.eraseWhiteBackgroundAsync();
                                    })
                                    .then(() => localPic.getDataUriAsync(1.0));
                            }
                            else return Promise.as(data);
                        })
                        .then(data =>  {
                            if (!data) return Promise.as(undefined);
                            else return uploadArtAsync(name.value, description.value, data);
                        }).done(resp => {
                            progressBar.stop();
                            progressDiv.setChildren([]);
                            art = resp;
                            if (!art) {
                                errorDiv.setChildren(lf("We failed to read the file. Please try again with another picture."));
                            } else {
                                m.dismiss();
                                if (!options.finalDialog)
                                    HTML.showProgressNotification(lf("picture published!"));
                                else showUrl(art)
                            }
                        }, e => {
                            Cloud.handlePostingError(e, lf("upload picture"))
                        });
                    })));
                m.setScroll();
                m.show();
            });
        }

        function showUrl(art:JsonArt)
        {
            var sm = ModalDialog.info(lf("resource published!"), 
                lf("Here's a URL."), null);
            var inp = HTML.mkTextInput("text", "")
            inp.value = art.pictureurl || art.aacurl || art.bloburl
            sm.add(div(null, inp))
            sm.addOk()
        }
    }
}
