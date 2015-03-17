///<reference path='refs.ts'/>
module TDev.RT {
    //? OneDrive, OneNote operations
    //@ skill(3)
    export module CloudStorage {
        //? Prompts the user to upload a picture to OneDrive. If the filename is empty, a default filename gets generated.
        //@ async returns(CloudPicture) cap(cloudservices)
        //@ [folder].deflStrings('public', 'documents', 'pictures', 'camera roll')
        export function upload_picture(pic: Picture, folder: string, filename: string, r: ResumeCtx) {
            if (!folder) folder = "public";
            var shared = false;
            var folders = [];
            switch (folder.toLocaleLowerCase()) {
                case "public": folders.push("me/skydrive/public_documents"); shared = true; break;
                case "documents": folders.push("me/skydrive/my_documents"); break;
                case "pictures": folders.push("me/skydrive/my_photos"); break;
                case "camera roll": folders.push("me/skydrive/camera_roll"); break;
                default:
                    Util.userError(lf("this folder is not supported"));
            }
            if (!filename)
                filename = Picture.niceFilename();
            if (!String_.ends_with(filename.toLocaleLowerCase(), ".jpg"))
                filename += ".jpg";
            OneDrive.uploadPictureAsyncWithDialog(pic, folders, shared, folder, filename)
                .done(cp => r.resumeVal(cp));
        }

        //? Creates a OneNote page from the given HTML fragment. The page can be uploaded using `cloud storage->upload note'.
        //@ cap(cloudservices)
        export function create_note(html: string): FormBuilder {
            var fb = Web.create_form_builder();
            fb.add_text("Presentation", html || "", "text/html", undefined);
            return fb;
        }

        //? Uploads a new OneNote page and returns the web client url if successful. The 'Presentation' field must contain the well-formed HTML. Additional pictures can be stored in other fields.
        //@ cap(cloudservices) async returns(string) ignoreReturnValue
        export function upload_note(form: FormBuilder, r: ResumeCtx) {
            if (!form.contains_key("Presentation")) {
                Util.userError(lf("the OneNote page HTML must be stored in the `Presentation` field in `form`."));
                r.resumeVal(undefined);
            }
            HTML.showProgressNotification(lf("uploading to OneNote..."));
            OneNote.uploadPageAsync(form)
                .done((url) => {
                    HTML.showProgressNotification("");
                    r.resumeVal(url);
                });
        }
    }

    export module LiveConnect {
        export function readContent(response: WebResponse): JsonObject {
            var js = response.content_as_json();
            if (!js || js.contains_key("error")) return undefined;
            return js;
        }

        function matchScopes(current: string, required: string): boolean {
            if (!current) return false;
            return required.split(' ').filter(r => current.indexOf(r) > -1).length > 0;
        }

        function mergeScopes(current: string, required: string): string {
            var all = "wl.signin " + (current ? current + " " : "") + required;
            return Util.unique(all.split(' '), scope => scope).join(' ');
        }

        export function authenticateAsync(scopes: string): Promise {
            var accessToken = window.localStorage["liveconnect_accesstoken"];
            var accessTokenScopes = window.localStorage["liveconnect_accesstoken_scopes"];
            var accessTokenExpires = parseInt(window.localStorage["liveconnect_accesstoken_expires"] || 0);
            if (accessToken && accessTokenExpires > Util.now() && matchScopes(accessTokenScopes, scopes))
                return Promise.as(accessToken);

            if (!ApiManager.liveConnectClientId
                || !ApiManager.liveConnectRedirectDomainId
                || !ApiManager.liveConnectUserId) {
                Util.userError(lf("Live Connect not properly configured."));
                return Promise.as(undefined);
            }

            var allScopes = mergeScopes(accessTokenScopes, scopes);
            var url = "https://login.live.com/oauth20_authorize.srf"
                + "?client_id=" + encodeURIComponent(ApiManager.liveConnectClientId)
                + "&scope=" + encodeURIComponent(allScopes)
                + "&response_type=token"
                + "&tdredirectdomainid=" + encodeURIComponent(ApiManager.liveConnectRedirectDomainId)
            ;
            if (Browser.isMobile) url += "&display=touch";

            var user = ApiManager.liveConnectUserId;
            return Web.oauth_v2_async(url, user)
                .then((o: OAuthResponse) => {
                    if (!o || o.is_error()) {
                        accessToken = "";
                        accessTokenScopes = "";
                        accessTokenExpires = 0;
                    } else {
                        accessToken = o.access_token();
                        accessTokenScopes = o.scope();
                        accessTokenExpires = Util.now() + (1 + o.expires_in()) * 1000;
                    }
                    App.log('liveconnect scopes: ' + allScopes);
                    window.localStorage["liveconnect_accesstoken"] = accessToken;
                    window.localStorage["liveconnect_accesstoken_scopes"] = allScopes;
                    window.localStorage["liveconnect_accesstoken_expires"] = accessTokenExpires;

                    return accessToken;
                });
        }
    }

    export module OneNote {
        // http://msdn.microsoft.com/EN-US/library/office/dn575432(v=office.15).aspx#sectionSection4
        export function uploadPageAsync(form: FormBuilder): Promise { // string;
            return LiveConnect.authenticateAsync("office.onenote_create")
                .then((accessToken: string) => {
                    if (!accessToken) return undefined;
                    var request = WebRequest.mk("https://www.onenote.com/api/v1.0/pages", undefined);
                    request.set_method("POST");
                    request.set_header("Authorization", "Bearer " + accessToken);
                    request.set_content_as_form(form);
                    return request.sendAsync()
                        .then((response: WebResponse) => {
                            if (response.status_code() == 201) {
                                var js = LiveConnect.readContent(response);
                                var links = js.field("links");
                                var oneNoteWebUrl = links.field("oneNoteWebUrl");
                                var href = oneNoteWebUrl.string("href");
                                return href;
                            }
                            return undefined;
                        });
                });
        }
    }

    export module OneDrive {
        function mkRequestAsync(scope : string, path : string) : Promise {
            return LiveConnect.authenticateAsync(scope)
                .then((accessToken: string) => {
                    if (!accessToken) return undefined;
                    var request = WebRequest.mk("https://apis.live.net/v5.0/" + path, undefined);
                    request.set_header("Authorization", "Bearer " + accessToken);
                    return request;
                });
        }

        /*
        // returns available bytes
        export function quotaAsync() : Promise { // number            
            return mkRequestAsync("wl.skydrive", "/me/skydrive/quota")
                .then((request: WebRequest) => {
                    if (!request) return Promise.as(-1);
                    return request.sendAsync()
                        .then((response : WebResponse) => {
                            var js = LiveConnect.readContent(response);
                            if (js) {
                                return js.number('available');
                            }
                            return -1;
                        });
                });
        }
        */

        export function downloadPictureUrlAsync(id: string, media : string = 'normal'): Promise { // string
            return LiveConnect.authenticateAsync("wl.skydrive wl.skydrive_update wl.contacts_skydrive")
                .then((accessToken: string) => {
                    if (!accessToken) return undefined;
                    return "https://apis.live.net/v5.0/" + id + "/picture?type=" + media + "&access_token=" + accessToken;
                });
        }

        export function uploadPictureAsyncWithDialog(pic: Picture, folders: string[], shared : boolean, folderName : string, filename: string) : Promise {
            return new Promise((onSuccess, onError, onProgress) => {
                var cp: CloudPicture = undefined;
                var m = new ModalDialog();
                m.onDismiss = () => {
                    m.onDismiss = undefined;
                    onSuccess(cp);
                };
                var imgDiv = div('wall-dialog-body');
                pic.getUrlAsync().done(url => imgDiv.setChildren([HTML.mkImg(url, 'wall-picture-preview')]));
                m.add(div('wall-dialog-header', 'upload to OneDrive'));
                m.add(div('wall-dialog-body', 'Would you like to upload this picture to "', folderName, '" your OneDrive?'));
                if (shared)
                    m.add(div('wall-dialog-body', '!!! This picture will be shared with everyone.'));
                m.add(div('wall-dialog-body', imgDiv));
                m.add(div('wall-dialog-buttons', [
                    HTML.mkButton('cancel', () => {
                        m.dismiss();
                    }),
                    HTML.mkButton('upload', () => {
                        m.onDismiss = undefined;
                        m.dismiss();
                        internalUploadPictureAsync(pic, folders, shared, filename)
                            .done((c : CloudPicture) => {
                                onSuccess(c);
                            });
                    })
                ]));
                m.show();
            });
        }

        function getOrCreateFolder(accessToken: string, folders: string[]): Promise {
            if (folders.length == 1)
                return Promise.as(folders[0]);

            var parentFolder = folders[0];
            var folder = folders[1];

            App.log('onedrive: create folder ' + parentFolder + '/' +  folder);
            var foldersUrl = "https://apis.live.net/v5.0/" + parentFolder + "/files?type=folder&access_token=" + accessToken;
            var foldersRequest = WebRequest.mk(foldersUrl, undefined);
            return foldersRequest.sendAsync()
                .then((response: WebResponse) => {
                    var js = LiveConnect.readContent(response);
                    if (!js) {
                        App.log('onedrive: folder enumeration failed');
                        return undefined;
                    }
                    var jsFolders = js.field("data");
                    for (var i = 0; i < jsFolders.count(); ++i) {
                        var jsFolder = jsFolders.at(i);
                        if (jsFolder.string('name') == folder) {
                            var folderid = jsFolder.string('id');
                            var newFolders = folders.splice(0, 2, folderid);
                            return getOrCreateFolder(accessToken, newFolders);
                        }
                    }
                    // create new folder
                    return createFolder(accessToken, parentFolder, folder);
                });
        }

        function createFolder(accessToken: string, parentFolder: string, folder: string): Promise {
            var createFolderUrl = "https://apis.live.net/v5.0/"
                + parentFolder
                + "?access_token=" + accessToken;
            var createFolderRequest = WebRequest.mk(createFolderUrl, undefined);
            var createFolderBody = Web.create_json_builder();
            createFolderBody.set_string("name", folder);
            createFolderRequest.set_content_as_json(createFolderBody.to_json());
            createFolderRequest.set_method("POST");
            return createFolderRequest.sendAsync()
                .then((createFolderResponse: WebResponse) => {
                    var createFolderResponseJs = LiveConnect.readContent(createFolderResponse);
                    if (!createFolderResponseJs) {
                        App.log('onedrive: folder creation failed');
                        return undefined;
                    }
                    var folderid = createFolderResponseJs.string("id");
                    return folderid;
                });
        }

        function internalUploadPictureAsync(pic: Picture, folders : string[], shared:boolean, filename : string): Promise { // CloudPicture
            // authenticate
            var accessToken = undefined;
            App.log('onedrive: uploading picture');
            return pic.initAsync()
                .then(() => LiveConnect.authenticateAsync("wl.skydrive wl.skydrive_update wl.contacts_skydrive"))
                .then((at: string) => {
                    accessToken = at;
                    if (!accessToken) {
                        App.log('onedrive: authentication failed');
                        return Promise.as(undefined);
                    }

                    var progress = HTML.mkProgressBar();
                    var imgDiv = div('wall-dialog-body');
                    pic.getUrlAsync().done(url => imgDiv.setChildren([HTML.mkImg(url, 'wall-picture-preview')]));
                    var m = new ModalDialog();
                    m.canDismiss = false;
                    m.add(div('wall-dialog-header', 'uploading picture...'));
                    m.add(imgDiv);
                    m.add(progress);
                    progress.start();
                    m.show();

                    return getOrCreateFolder(accessToken, folders)
                        .then((folderid) => {
                            if (!folderid) {
                                progress.stop();
                                m.canDismiss = true;
                                m.dismiss();
                                return undefined;
                            }
                            App.log('onedrive: uploading to ' + folderid);
                            var uploadUrl = "https://apis.live.net/v5.0/" + folderid
                                + "/files/" + filename
                                + "?downsize_photo_uploads=false"
                                + "&overwrite=ChooseNewName"
                                + "&access_token=" + accessToken;
                            var request = WebRequest.mk(uploadUrl, undefined);
                            request.set_method("PUT");
                            request.setContentAsPictureInternal(pic, 1, true);
                            request.set_content_type(null);
                            return request.sendAsync()
                                .then((response: WebResponse) => {
                                    progress.stop();
                                    m.canDismiss = true;
                                    m.dismiss();
                                    var js = response.content_as_json();
                                    if (!js) {
                                        App.log('onedrive: upload failed');
                                        return undefined;
                                    }
                                    var pictureid = js.string('id');
                                    App.log('onedrive: picture uploaded - ' + pictureid);
                                    var cp = CloudPicture.mk("onedrive", pictureid, shared, pic.widthSync(), pic.heightSync());
                                    return cp;
                                });
                        });
                });
        }
    }
}
