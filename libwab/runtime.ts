///<reference path='refs.ts'/>

module TDev.RT.Wab {
    var URI = "ws://localhost:8042";

    export enum Status {
        OK = 0,
        ERR_PERMISSION_DENIED = -1,
        ERR_WEBSOCK_NOT_AVAILABLE = -2,
        ERR_WEBSOCK_ACCESS_DENIED = -3,
        ERR_WEBSOCK_NOT_CONNECTED = -4,
        ERR_AUTHENTICATION_REQUIRED = -5,
        ERR_CANCELLED = -6,
        ERR_MALFORMED_REQUEST= -7,
        ERR_NOT_AVAILABLE = -8,
        ERR_NOT_AVAILABLE_WP8 = -43,
        ERR_INTERNAL_ERROR= -500,
    }

    export module Action {
        export var REQUEST_AUTHENTICATION = "REQUEST_AUTHENTICATION";
        export var AUTHENTICATE = "AUTHENTICATE";
        export var REQUEST_PERMISSIONS = "REQUEST_PERMISSIONS";
        export var PICK_CONTACT = "PICK_CONTACT";
        export var START_GYRO = "START_GYRO";
        export var STOP_GYRO = "STOP_GYRO";
        export var START_ACCELEROMETER = "START_ACCELEROMETER";
        export var STOP_ACCELEROMETER = "STOP_ACCELEROMETER";
        export var START_COMPASS = "START_COMPASS"; // new 
        export var STOP_COMPASS = "STOP_COMPASS"; // new
        export var START_ORIENTATION = "START_ORIENTATION"; // new 
        export var STOP_ORIENTATION = "STOP_ORIENTATION"; // new
        export var LOG = "LOG";
        export var PROXY = "PROXY";
        export var NOTIFICATION = "NOTIFICATION";
        export var DB_GET = "DB_GET";
        export var DB_SET = "DB_SET";
        export var DB_KEYS = "DB_KEYS";
        export var DB_DELETE = "DB_DELETE";
        export var VIBRATE = "VIBRATE";
        export var LIST_SONGS = "LIST_SONGS";
        // player commands
        export var PLAYER_COMMAND = "PLAYER_COMMAND"; // new
        export var PLAYER_STATE = "PLAYER_STATE"; // new
        export var ACTIVE_SONG = "ACTIVE_SONG"; // new
        export var START_ACTIVE_SONG_CHANGED = "START_ACTIVE_SONG_CHANGED"; // new
        export var STOP_ACTIVE_SONG_CHANGED = "STOP_ACTIVE_SONG_CHANGED"; // new
        export var START_PLAYER_STATE_CHANGED = "START_PLAYER_STATE_CHANGED"; // new
        export var STOP_PLAYER_STATE_CHANGED = "STOP_PLAYER_STATE_CHANGED"; // new
        // picture commands
        export var SAVE_TO_GALLERY = "SAVE_TO_GALLERY";
        export var LIST_IMAGES = "LIST_IMAGES";
        export var PICK_IMAGE = "PICK_IMAGE"; // new, Request -> UriResponse
        export var TAKE_PHOTO = "TAKE_PHOTO";
        export var RECORD_MICROPHONE = "RECORD_MICROPHONE"; // new, Request -> UriResponse
        export var SHARE = "SHARE"; // new
        export var PLAY_SOUND = "PLAY_SOUND"; // new
        export var BROWSE = "BROWSE"; // new
        export var DICTATE = "DICTATE"; // speech to text, new
        export var OAUTH_AUTHENTICATION = "OAUTH_AUTHENTICATION"; // new
        export var NETWORK_INFORMATION = "NETWORK_INFORMATION"; // new 
        export var LOCK_ORIENTATION = "LOCK_ORIENTATION"; // new
        export var POWER_INFORMATION = "POWER_INFORMATION"; // new
        export var REVIEW_CURRENT_APP = "REVIEW_CURRENT_APP"; // new
        export var LIST_IMAGE_ALBUMS = "LIST_IMAGE_ALBUMS"; // new
        export var LIST_IMAGE_ALBUM = "LIST_IMAGE_ALBUM"; // new, UriRequest -> ListAlbumsResponse[]
        export var IMAGE = "IMAGE"; // new, UriRequest -> UriResponse
        export var LIST_SONG_ALBUMS = "LIST_SONG_ALBUMS"; // new
        export var LIST_SONG_ALBUM = "LIST_SONG_ALBUM"; // new
        export var SONG_ALBUM = "SONG_ALBUM"; // new
        export var SONG_ALBUM_ART = "SONG_ALBUM_ART"; // new
        export var LIST_CONTACTS = "LIST_CONTACTS"; // new
        export var LIST_APPOINTMENTS = "LIST_APPOINTMENTS"; // new
        export var START_SEND_NFC_MESSAGE = "START_SEND_NFC_MESSAGE"; // new
        export var STOP_SEND_NFC_MESSAGE = "STOP_SEND_NFC_MESSAGE"; // new
        export var START_RECEIVE_NFC_MESSAGE = "START_RECEIVE_NFC_MESSAGE"; // new
        export var STOP_RECEIVE_NFC_MESSAGE = "STOP_RECEIVE_NFC_MESSAGE"; // new
		export var UPDATE_TILE = "UPDATE_TILE"; // new, UpdateTileRequest
		export var SPEAK_TEXT = "SPEAK_TEXT"; // new
		export var SPEAK_SSML = "SPEAK_SSML"; // new
		export var STATUS = "STATUS"; // new
        export var CURRENT_HASH = "CURRENT_HASH"; // new, wp8 specific
        export var CHECK_FOR_REFRESH = "CHECK_FOR_REFRESH"; // new, wp8 specific
        export var SWITCH_CHANNEL = "SWITCH_CHANNEL"; // new, wp8 specific
        export var SEND_SMS = "SEND_SMS"; // new
        export var COPY_TO_CLIPBOARD = "COPY_TO_CLIPBOARD"; // new

        export var BLUETOOTH_DEVICES = "BLUETOOTH_DEVICES"; // new
        export var BLUETOOTH_CONNECT = "BLUETOOTH_CONNECT"; // new
        export var BLUETOOTH_READ = "BLUETOOTH_READ"; // new
        export var BLUETOOTH_WRITE = "BLUETOOTH_WRITE"; // new
        export var BLUETOOTH_DISCONNECT = "BLUETOOTH_DISCONNECT"; // new

        export var BLUETOOTHLE_DEVICES = "BLUETOOTHLE_DEVICES"; // new
        export var BLUETOOTHLE_READ = "BLUETOOTHLE_READ"; // new
        export var BLUETOOTHLE_WRITE = "BLUETOOTHLE_WRITE"; // new

        export var SCREENSHOT = "SCREENSHOT"; // new
        export var RADIO_COMMAND = "RADIO_COMMAND"; // new

        export var SHOW_AD = "SHOW_AD"; // only supported in exported apps
        export var CURRENT_APP_INFO = "CURRENT_APP_INFO"; // only supported in exported apps
    }

    export module Permission {
        export var READ_CONTACTS = "READ_CONTACTS";
        export var READ_CALENDAR = "READ_CALENDAR";
        export var GYRO = "GYRO";
        export var ACCELEROMETER = "ACCELEROMETER";
        export var AUDIO = "AUDIO";
        export var GALLERY = "GALLERY";
        export var CAMERA = "CAMERA";
        export var VIBRATE = "VIBRATE";
        export var RECORD_AUDIO = "RECORD_AUDIO";
        export var BLUETOOTH = "BLUETOOTH";
    }

    export interface Request {
        id?: number; // not really optional; just omitted at request construction time, but always defined by _sendRequest
        noResponse?: boolean;
        action: string; // one of Action.SOMETHING
    }

    export interface Response {
        id?: number;
        status: number; // Status
    }

    export interface CurrentAppInfoResponse extends Response {
        storeid : string;
    }

    export interface SendSmsRequest extends Request {
        to?: string;
        body?: string;
    }

    export interface ListResponse extends Response {
        removeCallbackId?: string;
        lastForId?: string;
    }

    export function isLastResponse(r:ListResponse)
    {
        return !!r.lastForId || !!r.removeCallbackId
    }

    export interface RequestPermissionsRequest extends Request {
        permissions: string[]; // array of Permission.SOMETHING
    }

    export interface CurrentHashRequest extends Request
    {
        hash:string;
        isMainScreen:boolean;
    }

    export interface OsSettings
    {
        osVersion:string;
        themeBackgroundColor?:string;
        themeForegroundColor?:string;
        themeSubtleColor?:string;
        themeAccentColor?:string;
        themeChromeColor?:string;
    }

    export interface StatusRequest extends Request {
        message: string;
        progress: boolean; // show moving dots?
        kind?: string;
        duration?: number;
    }

    export interface RadioCommandRequest extends Request {
        command?: string; // play, stop
        frequency?: number; //
    }

    export interface RadioCommandResponse extends Response {
        isPlaying: boolean;
        frequency: number;
        signal: number; // signalstrengh normalized
    }

    export interface RequestPermissionsResponse extends Response
    { 
        version:string;
        supportedActions:string[]; // Action.SOMETHING

        osVersion?:string;
        wp8AppVersion?:number;
        osSettings?:OsSettings;
    }

    export interface SpeakTextRequest extends Request {
        language: string;
        gender: string;
        text: string;
    }

    export interface SpeakSsmlRequest extends Request {
        markup: string;
    }

    export interface StartSendNfcMessageRequest extends Request {
        value: string;
        type: string; // url, text, vcard, picture, mime type
        writeTag:boolean;
    }

    export interface SendNfcMessageResponse extends Response {
        id: number;
        transferred?: boolean; // true when message transfered
    }

    export interface StopNfcMessageRequest extends Request {
        id: number;
    }

    export interface StartReceiveNfcMessageRequest extends Request {
        type?: string; // url, text, vcard, picture, mime type
    }

    export interface ReceiveNfcMessageResponse extends Response {
        value: string;
        type: string;
        id: number;
        received?: boolean; // true when message transfered
    }

    export interface PowerInformationResponse extends Response {
        level: number; // between 0 (discharged) and 1 (charged)
        source: string; // battery, external
    }

    export interface CompassResponse extends Response {
        v: number; // value
        a: number; // accuracy
    }

    export interface AccelerometerResponse extends Response {
        x: number;
        y: number;
        z: number;
        orientation: number; // 0, 90, -90
    }

    export interface GyroResponse extends Response {
        x: number;
        y: number;
        z: number;
        orientation: number;
    }

    export interface OrientationResponse extends Response {
        p: number; // pitch
        r: number; // roll
        y: number; // yaw
        orientation: number;
    }

	export interface UpdateTileRequest extends UriRequest {
        counter?: number;
        content?: string;
        title?: string;
        background?: string;
        pin?: boolean;
        pictures?: string[];
        icon?: string;
        template?: string;
	}

    export interface NetworkInformationResponse extends Response {
        connectionName?: string;
        connectionType?: string; // unknown, none, ethernet, wifi, mobile
    }

    export interface ListImageAlbumsResponse extends ListResponse {
        name: string;
        uri: string;
    }

    export interface ListImagesResponse extends ListResponse {
        uri: string;
    }

    export interface SongAlbumResponse extends Response {
        name: string;
        genre?: string;
        artist?: string;
        duration?: number;
        thumbnail?: string;
    }

    export interface ListSongAlbumsResponse extends ListResponse {
        name: string;
        artist: string;
    }

    export interface ListSongsResponse extends ListResponse {
        uri: string;
        data: string;
        title: string;
        artist: string;
        album: string;
        duration?: number;
        track?: number;
    }

    export interface ActiveSongResponse extends Response {
        uri: string;
        data: string;
        title: string;
        artist: string;
        album: string;
        duration?: number;
        track?: number;
    }

    export interface PlaySoundRequest extends UriRequest {
        soundid?: string;
        pan?: number;
        pitch?: number;
        volume?: number;
    }

    export interface PlaySoundResponse extends Response {
        soundid?: string;
        cachemiss?: boolean;
    }

    export interface ShareRequest extends Request {
        provider?: string; // optional preferred social network
        text?: string;
        uri?: string;
        photoUri?: string;
    }
    
    export interface UriRequest extends Request {
        uri: string;
    }
    
    export interface UriResponse extends Response {
        uri: string;
    }

	export interface DictateRequest extends Request {
		title?:string;
		caption?: string;
	}

    export interface DictateResponse extends Response {
        text: string;
    }

    export interface SaveToGalleryResponse extends Response {
        name: string;
    }

    export interface PlayerCommandRequest extends Request {
        command: string; // 'play', 'stop', 'resume', 'pause', 'next', 'previous'
        uri?: string; // required for play
    }

    export interface PlayerStateRequest extends Request {
        shuffle?: boolean;
        repeat?: boolean;// a single song
    }

    export interface PlayerStateResponse extends Response {
        state: string; // 'playing', 'paused', 'stopped'
        shuffle: boolean;
        muted: boolean;
        repeat: boolean;
    }

    export interface SearchAppointmentsRequest extends Request {
        start: number; // DateTime
        end: number; // DateTime
    }

    export interface AppointmentContact {
        nameDisplay: string;
        email: string;
    }

    export interface CopyToClipboardRequest extends Request {
        text: string;
    }

    export interface ListAppointmentsResponse extends ListResponse {
        subject: string;
        location: string;
        start: number; // DateTime
        end: number; // DateTime
        source: string;
        details?: string;
        isAllDay?: boolean;
        isPrivate?: boolean;
        onlineStatus?: string;
        organizer?: AppointmentContact; // display name of the organizer
        attendees?: AppointmentContact[];
    }

    export interface SearchContactsRequest extends Request {
        query: string;
    }

    export interface ListContactsResponse extends ListResponse {
        nameDisplay: string;
        email: string;
    }

    export interface ContactResponse extends Response {
        nameGiven: string;
        nameMiddle: string;
        nameFamily: string;
        nameDisplay: string;
        phoneMain: string;
        phoneHome: string;
        phoneWork: string;
        phoneMobile: string;
        phoneOther: string;
        faxHome: string;
        faxWork: string;
        emailHome: string;
        emailWork: string;
        emailOther: string;
        addressHome: string;
        addressWork: string;
        addressOther: string;
        photoUri: string;
        source?: string;

        phone: string; // legacy
        email: string; // legacy
        name: string; // legacy
    }

    export interface VibrateRequest extends Request {
        millis: number;
    }

    interface RequestAuthenticationRequest extends Request {
        path: string;
    }
    interface AuthenticateRequest extends Request {
        token: string;
    }

    interface LogRequest extends Request {
        texts: string[];
    }
    
    interface ProxyCredentials {
        name: string;
        password: string;
    }

    interface ProxyHeader {
        name: string;
        value: string;
    }

    interface ProxyRequest extends Request {
        url: string;
        method: string;
        // content of web request, at most one present
        contentText?: string;
        content?: string; // base64 encoded
        headers?: ProxyHeader[];
        credentials?: ProxyCredentials;
        responseType: string; // "base64" or "text"
    }

    export interface OAuthAuthenticationRequest extends UriRequest {
        redirectUri: string; // registered redirect uri
		state: string; // state value to be validated
    }

    interface ProxyResponse extends Response {
    }

    interface DbGetRequest extends Request {
        table: string;
        keys: string[];
    }
    
    interface DbGetResponse extends Response {
        values: string[];
    }
    
    interface DbSetRequest extends Request {
        table: string;
        keys: string[];
        values: string[];
    }
    
    interface DbSetResponse extends Response {
    }
    
    interface DbKeysRequest extends Request {
        table: string;
    }
    
    interface DbKeysResponse extends Response {
        keys: string[];
    }

    interface LockOrientationRequest extends Request {
        portraitAllowed: boolean;
        landscapeAllowed: boolean;
        showClock: boolean;
    }
    

    export interface BluetoothDeviceName {
        hostName: string;
        serviceName: string;
    }

    export interface BluetoothDeviceFriendlyName extends BluetoothDeviceName {
        displayName: string;
    }

    export interface BluetoothDevicesRequest extends Request {}
    export interface BluetoothConnectRequest extends Request, BluetoothDeviceName {}
    export interface BluetoothDisconnectRequest extends Request, BluetoothDeviceName {}
    export interface BluetoothWriteRequest extends Request, BluetoothDeviceName {
        data: string;
    }
    export interface BluetoothReadRequest extends Request, BluetoothDeviceName {
        length: number;
    }

    export interface BluetoothDevicesResponse extends Response {
        bluetoothOn: boolean;
        devices?: BluetoothDeviceFriendlyName[];
    }

    export interface BluetoothConnectResponse extends Response {
        connected: boolean;
    }
    export interface BluetoothDisconnectResponse extends BluetoothConnectResponse {}
    export interface BluetoothWriteResponse extends BluetoothConnectResponse {}
    export interface BluetoothReadResponse extends BluetoothConnectResponse {
        data: string;
    }

    export interface BluetoothLeDeviceName {
        deviceId: string;
        displayName: string;
        services: string[];
        connected?: boolean;
    }
    export interface BluetoothLeDevicesRequest extends Request { }
    export interface BluetoothLeDevicesResponses extends Response {
        bluetoothOn: boolean;
        devices?: BluetoothLeDeviceName[];
    }
    export interface BluetoothLeDeviceRequest extends Request {
        deviceId: string;
        serviceId: string;
        characteristicId: string;
    }
    export interface BluetoothLeWriteRequest extends BluetoothLeDeviceRequest {
        withResponse: boolean;
        data: string;
    }
    export interface BluetoothLeReadRequest extends BluetoothLeDeviceRequest {}
    export interface BluetoothLeConnectResponse extends Response {
        connected: boolean;
    }
    export interface BluetoothLeWriteResponse extends BluetoothLeConnectResponse {}
    export interface BluetoothLeReadResponse extends BluetoothLeConnectResponse {
        data: string[];
    }

    interface NotificationRequest extends Request {
        enable: boolean;
    }

    class PendingResponse {
        constructor(public action: string, public onSuccess: (r: Response) => void , public onError: (any) => void ) {
        }
    }


    var _nextId = 0;
    var _pendingResponses: any = {}; // TODO: time out stale requests
    var _webSocket: WebSocket = undefined;
    var isWP8app = false;
    var wp8AppVersion = -1;
    var supportsAttachments = false;
    var confirmedWP8app = false;

    export function isActive() {
        return !!_webSocket || isWP8app;
    }

    function openWp8Async(): Promise {
        var ret = new PromiseInv();
        _webSocket = new WebSocket(URI);
        _webSocket.onopen = () => { 
            var r = ret;
            ret = undefined;
            Util.log("wp8ws: open");
            if (r) r.success(null);
        };
        _webSocket.onmessage = _onmessage;
        numAttachments = 0;
        _webSocket.onerror = (e) =>
        {
            Util.log("wp8ws: error");
            var r = ret;
            ret = undefined;
            _webSocket = undefined;
            _onerror(e);
            if (r) r.error(e);
        }
        _webSocket.onclose = () => {
            Util.log("wp8ws: close");
            _webSocket = undefined;
        };
        return ret;
    }

    var numAttachments = 0;
    var attachments = [];
    var finalAttachments = () => { };
    var orphanedReported = false;

    function handleMessage(r: any) {
        if (r == undefined) return;
        var id = r.id;
        if (id == undefined) return;

        var key = id + "";
        var pending: PendingResponse = _pendingResponses[key];

        if (pending) {
            if (!/START_|LIST_/.test(pending.action) ||
                isLastResponse(r)) {
                delete _pendingResponses[key];
            }
            if (pending.onSuccess) 
                Util.setTimeout(0, () => {
                    try {
                        pending.onSuccess(r);
                    } catch (e) {
                        Util.reportError("wab-onmessage-success", e);
                    }
                })
        } else if (r.status) {
            if (!orphanedReported) {
                orphanedReported = true;
                statusError(r);
            }
        }
    }

    function handleAttachments(r: any): boolean {
        var scan = (repl) => {
            Object.keys(r).forEach((k) => {
                if (!/^attach:/.test(k)) return;
                var v = r[k]
                if (typeof v == "number") {
                    if (repl)
                        v = attachments[v];
                    else 
                        maxId = Math.max(maxId, v);
                } else if (Array.isArray(v)) {
                    v.forEach((z, i) => {
                        if (typeof z == "number") {
                            if (repl)
                                v[i] = attachments[z];
                            else
                                maxId = Math.max(maxId, z);
                        }
                    })
                }
                if (repl) {
                    delete r[k];
                    k = k.slice(7);
                    r[k] = v;
                }
            })
        }

        var maxId = -1;
        scan(false);
        maxId++;
        if (maxId > 0) {
            numAttachments = maxId;
            attachments = [];
            finalAttachments = () => {
                scan(true);
                attachments = [];
                handleMessage(r);
            };
            return true;
        }

        return false;
    }

    function _onmessage(ev: MessageEvent): void {

        try {
            if (numAttachments > 0) {
                numAttachments--;
                attachments.push(ev.data);
                if (numAttachments == 0)
                    finalAttachments();
                return;
            }

            var r;
            try {
                r = JSON.parse(ev.data);
            } catch (e) { return; }

            if (supportsAttachments && handleAttachments(r)) return;
            handleMessage(r);
        } catch (e) {
            Util.reportError("wab-onmessage", e);
        }
    }

    function _onerror(ev: ErrorEvent): void {
        var prs = _pendingResponses;
        _pendingResponses = {};
        Object.keys(prs).forEach(k => {
            var h = prs[k].onError;
            if (h) h(ev);
        });
        // TODO: reopen channel?
    }

    var sendingLock = new Lock();

    function moveToAttachments(request: any): string[] {
        var oob = []
        function isLong(v) {
            return typeof v == "string" && v.length > 4000;
        }
        function attach(v) {
            if (isLong(v)) {
                var r = oob.length;
                oob.push(v);
                return r;
            } else {
                return v;
            }
        }
        Object.keys(request).forEach((k) => {
            var v = request[k]
            if (isLong(v)) {
                delete request[k];
                request["attach:" + k] = attach(v);
            } else if (Array.isArray(v) && v.some(isLong)) {
                delete request[k];
                request["attach:" + k] = v.map(attach);
            }
        })
        oob.unshift(JSON.stringify(request));
        return oob;
    }

    function _sendRequest(request: Request, onSuccess: (r: Response) => void , onError: (any) => void ): string {
        if (_webSocket === undefined) {
            if (onSuccess) onSuccess({ status: Status.ERR_WEBSOCK_NOT_CONNECTED });
            return;
        }
        request.id = _nextId++;
        if (!(isWP8app && request.noResponse))
            _pendingResponses[request.id + ""] = new PendingResponse(request.action, onSuccess, onError);

        //Util.log("ws send");
        if (supportsAttachments) {
            var msgs = moveToAttachments(request);
            msgs.forEach((s) => _webSocket.send(s));
        } else {
            _webSocket.send(JSON.stringify(request));
        }

        return request.id + "";
    }

    function wrapResponse(response: Response) {
        var msg = ""
        switch (response.status) {
            case Status.ERR_INTERNAL_ERROR:
                msg = "TouchDevelop runtime crashed"; break;
            case Status.ERR_MALFORMED_REQUEST:
                msg = "WebAppBooster reported a malformed request"; break; 
            case Status.ERR_NOT_AVAILABLE:
            case Status.ERR_NOT_AVAILABLE_WP8:
                msg = "Not available";
            default:
                msg = "Error " + response.status;
        }
        if ((<any>response).errorMessage)
            msg += ": " + (<any>response).errorMessage;
        Util.log(msg);
        var e:any = new Error(msg);
        e.wabStatus = (<any>response).status;
        e.wabCrashInfo = (<any>response).crashInfo;
        //I don't think we should be really getting these - the command should not be boosted
        //if (response.status == Response.ERR_NOT_AVAILABLE)
        //    response.isUserError = true;
        return e;
    }

    function requestError(err:any)
    {
        Util.reportError("wab-request", err);
    }

    function statusError(err:any)
    {
        Util.reportError("wab-status", wrapResponse(err));
    }

    export function statusErrorRaw(err:any):void
    {
        Util.reportError("wab-status", err);
    }

    export function sendRequest(request: Request, onSuccess: (r: Response) => void, onError = statusErrorRaw): string {
        return _sendRequest(request, response => {
            switch (response.status) {
                case Status.OK:
                case Status.ERR_CANCELLED:
                    onSuccess(response); break;
                case Status.ERR_PERMISSION_DENIED: requestPermissionsAsync().done(() => {
                    _sendRequest(request, response => {
                        if (response.status == Status.OK || response.status == Status.ERR_CANCELLED)
                            onSuccess(response);
                        else onError(wrapResponse(response));
                    }, requestError);
                }, requestError); break;
                default: 
                    onError(wrapResponse(response));
            }
        }, requestError)
    }

    export function cancelRequest(id: string) {
        var pending: PendingResponse = _pendingResponses[id];
        if (pending) {
            delete _pendingResponses[id];
            if (/^START_/.test(pending.action)) {
                _sendRequest({ action: pending.action.replace(/^START_/, "STOP_") }, resp => { }, err => { });
            }
        }
    }
    
    export function sendRequestAsync(request: Request): Promise {
        return new Promise((onSuccess, onError, onProgress) => {
            sendRequest(request, onSuccess, onError);
        });
    }

    function boostColors(s:OsSettings)
    {
        if (!s) return;
        Util.log('wab: boosting COLORS');
        function boost(n:string, v:string)
        {
            if (v) {
                var c = Color.fromHtml(v);
                Colors[n] = () => c;
            }
        }

        boost("foreground_os", s.themeForegroundColor);
        boost("background_os", s.themeBackgroundColor);
        boost("chrome", s.themeChromeColor);
        boost("subtle", s.themeSubtleColor);
        boost("accent", s.themeAccentColor);
    }

    function requestPermissionsAsync(): Promise {
        Util.log('wab: requesting permissions');
        return new Promise((onSuccess, onError, onProgress) => {
            _sendRequest(<RequestPermissionsRequest>{
                action: Action.REQUEST_PERMISSIONS, 
                permissions: [Permission.READ_CONTACTS, Permission.READ_CALENDAR, Permission.GYRO, Permission.ACCELEROMETER, 
                              Permission.AUDIO, Permission.GALLERY, Permission.CAMERA, Permission.VIBRATE, Permission.RECORD_AUDIO, Permission.BLUETOOTH],
            }, (response: RequestPermissionsResponse) => {
                if (response.status == Status.OK) {
                    supportedActions = response.supportedActions;
                    Util.log('wab: permissions: ' + supportedActions.join(', '));
                    if (response.wp8AppVersion && wp8AppVersion < 0) {
                        wp8AppVersion = response.wp8AppVersion;
                        Browser.platformCaps.push("wp8app-v" + wp8AppVersion)
                        Browser.platformCaps.push("wp8-v" + response.osVersion)
                        Util.log(Browser.platformCaps.join(", "))
                        boostColors(response.osSettings)
                    }
                    onSuccess(response);
                }
                else {
                    Util.log('wab: permissions request failed');
                    onError(undefined);
                }
            }, onError);
        });
    }

    var pendingMsgs = []
    function flushMsgs() {
        if (pendingMsgs.length > 0) {
            sendRequestAsync(<LogRequest>{ action: Action.LOG, noResponse: true, texts: pendingMsgs }).done();
            pendingMsgs = [];
        }
        Util.setTimeout(500, flushMsgs);
    }

    class Wp8Table implements Storage.Table {
        constructor(public name: string) {
        }

        public getValueAsync(key: string): Promise // of string
        {
            return this.getItemsAsync([key]).then((items) => items[key]);
        }

        public getItemsAsync(keys: string[]): Promise // of Object
        {
            return sendRequestAsync(<DbGetRequest>{ action: Action.DB_GET, table: this.name, keys: keys })
                .then((resp: DbGetResponse) => {
                    var r = {}
                    keys.forEach((k, i) => {
                        r[k] = resp.values[i];
                    })
                    return r;
                })
        }
        
        public getKeysAsync(): Promise // of string[]
        {
            return sendRequestAsync(<DbKeysRequest>{ action: Action.DB_KEYS, table: this.name })
                .then((resp: DbKeysResponse) => resp.keys)
        }

        static dbSetLock = new Lock();

        public setItemsAsync(items: any): Promise // of void
        {
            var keys = Object.keys(items);
            var hasBig = false;
            var vals = keys.map((k) => {
                var v:string = items[k]
                if (v && v.length > 100000) hasBig = true;
                if (v === undefined) return null;
                return v;
            });
            var req: DbSetRequest = { action: Action.DB_SET, table: this.name, keys: keys, values: vals };
            if (hasBig) {
                var ret = new PromiseInv();
                Wp8Table.dbSetLock.acquire(() => {
                    sendRequestAsync(req).done((resp) => {
                        Wp8Table.dbSetLock.release();
                        ret.success(resp);
                    });
                });
                return ret;
            } else
                return sendRequestAsync(req);
        }
    }

    function setWp8UriAsync() {
        var r = new PromiseInv();
        (<any>window).tdevWsUri = (uri, legal, appName) => {
            Util.log("ws uri: " + uri);
            URI = uri;
            Runtime.legalNotice = legal || "";
            Runtime.appName = appName;
            (<any>window).tdevWsUri = () => { };
            r.success(uri);
        };
        Util.log("notifying parent app");
        var wsuriRetry = 5
        function tryNotify() {
            try {
                (<any>window.external).Notify("WSURI");
            } catch (e) {
                if (wsuriRetry-- < 0) throw e;
                else Util.setTimeout(500, tryNotify);
            }
        }
        tryNotify();
        Util.log("parent app notified");
        return r;
    }

    function setupWp8app(): Promise {
        if (!Browser.isWP8app) return null;
        if (!window.external) return null;

        isWP8app = true;
        supportsAttachments = true;
        Browser.deviceMotion = true;
        Browser.webAppBooster = true;
        Browser.audioWav = true;
        Browser.canIndexedDB = false;
        Storage.getTableAsync = (name: string) => Promise.as(new Wp8Table(name));
        Storage.clearPreAsync = () =>
            Promise.join(Storage.tableNames.map((t) => sendRequestAsync({ action: Action.DB_DELETE, table: t })));

        Util.log("wp8: sending auth app request");
        return setWp8UriAsync().then(() => openWp8Async()).then(() => {
            _sendRequest({ action: Action.REQUEST_AUTHENTICATION, path: "app" }, resp => {
                if (resp.status == Status.OK) {
                    Util.externalLog = (msg) => {
                        pendingMsgs.push(msg);
                    };
                    Util.log("wp8: auth app request OK");
                    confirmedWP8app = true;
                    flushMsgs();
                } else {
                    Util.log("wp8: auth app request failed: " + JSON.stringify(resp));
                    isWP8app = false;
                }
            }, err => {
                Util.log("wp8: auth app request failed (onError): " + err);
                isWP8app = false;
            });
        })
    }

    var supportedActions: string[] = [];
    export function isSupportedAction(name: string) {
        return supportedActions.indexOf(name) > -1;
    }

    function lockOrientation(p: boolean, l: boolean, clock: boolean) {
        SizeMgr.lastOrientationLockTime = Util.now();
        sendRequestAsync(<LockOrientationRequest>{ 
            action: Action.LOCK_ORIENTATION,
            portraitAllowed: p,
            landscapeAllowed: l,
            showClock: clock
        }).done(() => {
            SizeMgr.lastOrientationLockTime = Util.now();
        });
    }

    function arrivedAtHash(h:string) {
        sendRequestAsync(<CurrentHashRequest>{ 
            action: Action.CURRENT_HASH,
            hash: h,
            isMainScreen: h == '#hub' || h == '#',
        }).done();
    }

    var lastChannelUri: string;
    function refreshNotifications(enable: boolean) {
        var request = <NotificationRequest >{
            action: Action.NOTIFICATION,
            enable: enable
        };
        //Util.log("Notification request: " + JSON.stringify(request));
        sendRequestAsync(request).then(response => {
            //Util.log("Notification response: " + JSON.stringify(response));
            if (response.channelUri && lastChannelUri != response.channelUri) {
                lastChannelUri = response.channelUri;
                var webRequest = { subscriptionuri: response.channelUri, versionminor: response.versionMinor, versionmajor: response.versionMajor };
                //Util.log("Notification web request: " + JSON.stringify(webRequest));
                Cloud.postNotificationChannelAsync(webRequest).done(webResponse =>
                {
                    //Util.log("Notification web response: " + JSON.stringify(webResponse));
                },
                ex => { });
            }
        }).done();
    }

    export function initAsync(): Promise {
        var r = setupWp8app();
        if (r) return r.then(() => requestPermissionsAsync()).then(() => {
            Util.log('wab: boosting NOTIFICATION');
            Runtime.refreshNotifications = refreshNotifications;
            Runtime.lockOrientation = lockOrientation;
            if (isSupportedAction(Action.CURRENT_HASH))
                Screen.arrivedAtHash = arrivedAtHash;
            Runtime.rateTouchDevelop = () => {
                sendRequestAsync(<Request>{ action: Action.REVIEW_CURRENT_APP }).done();
            };
            lockOrientation(true, false, true);

            function waitForUpdate(id:string)
            {
                sendRequestAsync(<Request>{ action: Action.CHECK_FOR_REFRESH }).done();
                (<any>TDev).updateLoop(id, "refreshing runtime");
                return true;
            }

            var w = (<any>TDev).World;
            if (w) {
                if (isSupportedAction(Action.CHECK_FOR_REFRESH)) {
                    Util.log('wab: boosting CHECK_FOR_REFRESH');
                    w.waitForUpdate = waitForUpdate;
                } else {
                    w.waitForUpdate = () => false;
                }

                if (isSupportedAction(Action.SWITCH_CHANNEL)) {
                    Util.log('wab: boosting SWITCH_CHANNEL');
                    w.switchToChannel = (ch:string) => {
                        sendRequestAsync({
                            action: Action.SWITCH_CHANNEL,
                            channel: ch,
                        }).done();
                        ProgressOverlay.lockAndShow("switching to " + ch);
                    };
                } else {
                    w.switchToChannel = null;
                }
            }

            // we use this guy as a ping; it doesn't do much at all on the C# side
            if (isSupportedAction(Action.CURRENT_HASH))
                Util.log('wab: boosting CURRENT_HASH');
                Runtime.continueAfter = (ms:number, f:()=>void) => {
                    sendRequestAsync(<CurrentHashRequest>{
                        action: Action.CURRENT_HASH,
                        hash: undefined,
                        isMainScreen: false
                    }).done(f);
                };
        });

        return Promise.as();
    }

    export function getSupportedCapabilities(): string[] {
        if (!isActive()) return [];
        var caps: string[] = [];
        if (isSupportedAction(Action.PICK_CONTACT) ||
            isSupportedAction(Action.LIST_CONTACTS))
            caps.push("contacts");
        if (isSupportedAction(Action.START_GYRO))
            caps.push("gyroscope");
        if (isSupportedAction(Action.START_ACCELEROMETER))
            caps.push("accelerometer");
        if (isSupportedAction(Action.START_COMPASS))
            caps.push("compass");
        if (isSupportedAction(Action.START_ORIENTATION))
            caps.push("orientation");
        if (isSupportedAction(Action.LIST_APPOINTMENTS))
            caps.push("calendar");
		if (isSupportedAction(Action.UPDATE_TILE))
            caps.push("tiles");
        if (isSupportedAction(Action.SPEAK_TEXT) || 
            isSupportedAction(Action.SPEAK_SSML) ||
            isSupportedAction(Action.DICTATE))
            caps.push("speech");
        if (isSupportedAction(Action.LIST_SONGS) 
            || isSupportedAction(Action.LIST_SONG_ALBUM) 
            || isSupportedAction(Action.LIST_SONG_ALBUMS) 
            || isSupportedAction(Action.SONG_ALBUM) 
            || isSupportedAction(Action.PLAYER_COMMAND) 
            || isSupportedAction(Action.PLAYER_STATE)
            || isSupportedAction(Action.ACTIVE_SONG)
            || isSupportedAction(Action.START_ACTIVE_SONG_CHANGED)
            || isSupportedAction(Action.START_PLAYER_STATE_CHANGED)
            || isSupportedAction(Action.PLAY_SOUND))
            caps.push('musicandsounds');
        if (isSupportedAction(Action.SAVE_TO_GALLERY)
            || isSupportedAction(Action.PICK_IMAGE))
            caps.push('media');
        if (isSupportedAction(Action.RECORD_MICROPHONE))
            caps.push('microphone');
        if (isSupportedAction(Action.START_SEND_NFC_MESSAGE) ||
            isSupportedAction(Action.START_RECEIVE_NFC_MESSAGE))
            caps.push('proximity');
        if (isSupportedAction(Action.BLUETOOTH_DEVICES))
            caps.push('bluetooth');
        if (isSupportedAction(Action.RADIO_COMMAND))
            caps.push('radio');
        return caps;
    }
}
