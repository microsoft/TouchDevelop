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

                doKind("select type of this " + model.kindBoxHeader(), model.getContexts(), k => model.setKind(k))
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
                                  saveBox,
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
        private keyUrl: HTMLInputElement;
        constructor() {
            super()
            this.value = HTML.mkTextArea("variableDesc");
            this.url = HTML.mkTextInput("text", lf("url"));
            this.keyUrl = HTML.mkTextInput("text", lf("key uri"));
        }

        public set(v: string) {
            var value = TDev.RT.String_.valueFromArtUrl(v);
            if (value) {
                // TODO: limit size of value
                this.value.value = value;
                this.url.value = "";
                this.keyUrl.value = "";
            } else {
                var key = TDev.RT.String_.valueFromKeyUrl(v);
                if (key) {
                    this.value.value = "";
                    this.url.value = "";
                    this.keyUrl.value = key;
                }
                else {
                    this.value.value = "";
                    this.url.value = v;
                    this.keyUrl.value = "";
                }
            }
        }
        public get() {
            var v = this.value.value;
            if (v) return TDev.RT.String_.valueToArtUrl(v);

            var k = this.keyUrl.value;
            if (k) return TDev.RT.String_.valueToKeyUrl(k);

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
                this.url,
                div("varLabel", lf("key url")),
                this.keyUrl);
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

        export function setupDragAndDrop(r: HTMLElement) {
            if (!Browser.dragAndDrop) return;

            r.addEventListener('dragover', function(e) {
                if (e.dataTransfer.types[0] == 'Files') {
                    if (e.preventDefault) e.preventDefault(); // Necessary. Allows us to drop.
                    e.dataTransfer.dropEffect = 'copy';  // See the section on the DataTransfer object.
                    return false;
                }
            }, false);
            r.addEventListener('drop', (e) => {
                var file = e.dataTransfer.files[0];
                if (file) {
                    e.stopPropagation(); // Stops some browsers from redirecting.
                    e.preventDefault();
                    if (Cloud.anonMode(lf("uploading art"))) return;
                    if (file.size > 1000000) {
                        ModalDialog.info(lf("file too big"), lf("sorry, the file is too big (max 1Mb)"));
                    } else {
                        HTML.fileReadAsDataURLAsync(file).done(s => {
                            s.toString();
                        });
                        var name = file.name;
                        var m = /^([\w ]+)(\.[a-z0-9]+)$/i.exec(file.name);
                        if (m) name = m[1];
                        if (/^image\/(png|jpeg)$/i.test(file.type)) {
                            ArtUtil.uploadPictureDialogAsync(/^image\/png$/i.test(file.type), HTML.mkFileInput(file, 1), name)
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
                        } else if (Cloud.lite && !!HTML.documentMimeTypes[file.type]) {
                            ArtUtil.uploadDocumentDialogAsync(HTML.mkFileInput(file, 1), name).done((art: JsonArt) => {
                                if (art && Script) {
                                    var n = TheEditor.freshDocumentResource(art.name, art.bloburl);
                                    TheEditor.addNode(n);
                                }
                            });
                        } else {
                            ModalDialog.info('unsupported file type', 'sorry, you can only upload pictures (PNG and JPEG) or sounds (WAV)');
                        }
                    }
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
                var file = input || HTML.mkDocumentInput(1);
                var errorDiv = div('validation-error');
                var progressDiv = div('');
                var progressBar = HTML.mkProgressBar();
                m.add(div("wall-dialog-header", lf("upload document")));
                m.add(div("wall-dialog-body",
                    [
                        div('', div('', lf("1. choose a document (.txt, .pptx, .pdf, .css, .js, less than 1MB)")), file.element),
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
                    progressDiv.setChildren([lf("publishing...")]);
                    file.readAsync()
                        .then(data => {
                        if (!data) return Promise.as(undefined);
                        else {
                            Util.log('upload document: uploading');
                            return uploadArtAsync(name.value, description.value, data);
                        }
                    }).done((resp) => {
                        progressBar.stop();
                        progressDiv.setChildren([]);
                        art = resp;
                        if (!art) {
                            Util.log('upload document: could not read document');
                            errorDiv.setChildren([lf("Could not read document.")]);
                        } else {
                            Util.log('upload document: success');
                            m.dismiss();
                            ModalDialog.info(lf("document published!"), lf("You can find your document under 'my art' in the hub."));
                        }
                    }, e => {
                            Util.log('upload documeent: error ' + e.status);
                            progressBar.stop();
                            progressDiv.setChildren([]);
                            if (e.status == 502)
                                errorDiv.setChildren([lf("Could not publish document. ") + Cloud.onlineInfo()]);
                            else if (e.status == 503)
                                errorDiv.setChildren([lf("Could not publish documeent. Did you publish a lot recently? Please try again later.")]);
                            else if (e.status == 403)
                                errorDiv.setChildren([lf("Access denied; Please return to the main hub and then try again.")]);
                            else if (e.status == 400)
                                errorDiv.setChildren([lf("Could not publish document: ") + e.errorMessage]);
                            else
                                throw e;
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
                            Util.log('upload sound: error ' + e.status);
                            progressBar.stop();
                            progressDiv.setChildren([]);
                            if (e.status == 502)
                                errorDiv.setChildren([lf("Could not publish sound. ") + Cloud.onlineInfo()]);
                            else if (e.status == 503)
                                errorDiv.setChildren([lf("Could not publish sound. Did you publish a lot recently? Please try again later.")]);
                            else if (e.status == 403)
                                errorDiv.setChildren([lf("Access denied; Please return to the main hub and then try again.")]);
                            else if (e.status == 400)
                                errorDiv.setChildren([lf("Could not publish sound: ") + e.errorMessage]);
                            else
                                throw e;
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

        export function uploadPictureDialogAsync(removeWhite = false, input? : TDev.HTML.IInputElement, initialName? : string): Promise {
            if (Cloud.anonMode(lf("uploading pictures")))
                return Promise.as();
            return new Promise((onSuccess, onError, onProgress) => {
                var m = new ModalDialog();
                var art: JsonArt = null;
                m.onDismiss = () => onSuccess(art);
                var name = HTML.mkTextInput("text", lf("picture name"));
                name.required = true;
                name.value = initialName || "";
                var description = HTML.mkTextInput("text", lf("description"));
                var file = input || HTML.mkImageInput(false, 1);
                var removeWhiteCheck = HTML.mkCheckBox(lf("remove white background (best for game sprites)"), (b) => removeWhite = b, removeWhite);
                var errorDiv = div('validation-error');
                var progressDiv = div('');
                var progressBar = HTML.mkProgressBar();
                m.add(div("wall-dialog-header", lf("upload picture")));
                m.add(div("wall-dialog-body",
                    [
                     div("", div("", lf("choose a picture (less than 1MB, smaller than 2048x2048)")), file.element),
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
                                HTML.showProgressNotification(lf("picture published!"));
                            }
                        }, e => {
                            if (e.status == 502)
                                errorDiv.setChildren([lf("Could not publish picture. ") + Cloud.onlineInfo()]);
                            else if (e.status == 503)
                                errorDiv.setChildren([lf("Could not publish picture. Did you publish a lot recently? Please try again later.")]);
                            else if (e.status == 403)
                                errorDiv.setChildren([lf("Access denied; Please return to the main hub and then try again.")]);
                            else if (e.status == 400)
                                errorDiv.setChildren([lf("Could not publish picture: ") + e.errorMessage]);
                            else
                                throw e;
                        });
                    })));
                m.setScroll();
                m.show();
            });
        }
    }
}
