///<reference path='refs.ts'/>
module TDev.RT {
    export module ShareManager
    {
        export var copyToClipboardAsync = (text: string): Promise => {
            if ((<any>window).clipboardData && (<any>window).clipboardData.setData) {
                (<any>window).clipboardData.setData('Text', text);
                return Promise.as();
            }
            else {
                return new Promise((onSuccess, onError, onProgress) => {
                    ModalDialog.showText(text, 'copy to clipboard', 'Copy this text to your clipboard.',
                        () => onSuccess(undefined));
                });
            }
        }

        export var sharePictureAsync = (pic : Picture, network : string, message : string) : Promise =>
        {
            return new Promise((onSuccess, onError, onProgress) => {
                var m = new ModalDialog();
                m.onDismiss = () => onSuccess(undefined);
                m.add(div('wall-dialog-header', "share picture"));
                m.add(div('wall-dialog-body', "Copy this picture or save it on your device."));
                var canvas = pic.getViewCanvasClone();
                canvas.style.maxWidth = '100%';
                canvas.style.maxHeight = '100%';
                canvas.style.border = 'solid 2px gray';
                m.addOk('done');
                m.add(div('wall-dialog-body', canvas));
                m.setScroll();
                m.show();
            });
        }

        export var facebookLike = (text : string, url : string, fburl : string) : HTMLElement =>
        {
            var r = div('');
            if (Cloud.isOnline() && !Browser.isMobile && !Browser.inCordova && !Browser.localProxy && !Cloud.isRestricted()) {
                r.innerHTML =
                  TDev.RT.ShareManager.createTwitterTweet(text, url)
                  + "&nbsp;&nbsp;" +
                  TDev.RT.ShareManager.createFacebookLike(fburl || url);
            }
            return r;
        }

        export var createFacebookLike = (url : string) : string =>
        {
            return "<iframe src='//www.facebook.com/plugins/like.php?href=" + encodeURI(url) +
                  "&amp;layout=button_count&amp;show_faces=false&amp;width=100&amp;action=like&amp;font=segoe+ui&amp;colorscheme=light" +
                  "&amp;height=20' scrolling='no' frameborder='0' style='border:none; overflow:hidden; width:80px; height:20px;' allowTransparency='true'></iframe>";
        }

        export var createTwitterTweet = (text : string, url: string): string => {
            return "<iframe src='//platform.twitter.com/widgets/tweet_button.html?url=" + encodeURI(url) + "&amp;text=" + encodeURI(text) + "&amp;count=none'style='border:none;overflow:hidden;width:56px;height:20px;' frameBorder='0' scrolling='no' allowTransparency='true'></iframe>"
        }

        export interface ShareButton {
            text: string;
            handler: () => void;
        }

        export interface ShareOptions {
            header?: string;
            noDismiss?: boolean;
            moreButtons? : ShareButton[];
            tickCallback? : (network:string) => void;
            justButtons?: boolean;
        }

        export var shareButtons = (m:ModalDialog, link: Link, options:ShareOptions) => {
            return [
                HTML.mkButton('email', () => {
                    shareOnNetwork(link, "email", options);
                    if (!options.noDismiss) m.dismiss();
                }),
                HTML.mkButton('facebook', () => {
                    shareOnNetwork(link, "facebook-share", options);
                    if (!options.noDismiss) m.dismiss();
                }),
                HTML.mkButton('twitter', () => {
                    shareOnNetwork(link, "twitter", options);
                    if (!options.noDismiss) m.dismiss();
                })                
            ];
        }

        export function addShareButtons(m:ModalDialog, link: Link, options:ShareOptions = {}) : HTMLElement
        {
            var buttons = shareButtons(m, link, options);
            var cls = 'wall-dialog-buttons';
            if (options.moreButtons) {
                cls += ' wall-dialog-buttons-many';
                options.moreButtons.forEach(b => {
                    buttons.push(HTML.mkButton(b.text, () => {                        
                        if (!options.noDismiss) m.dismiss();
                        b.handler();
                    }));
                });
            }
            if (!options.justButtons) {
                m.add(div('wall-dialog-header', options.header || "share"));
                m.add(div('wall-dialog-body', tweetify(link.name())));
                var txtAddress = HTML.mkTextInput('text', lf("url"));
                txtAddress.value = link.address();
                txtAddress.readOnly = true;
                txtAddress.style.width = '90%';
                Util.selectOnFocus(txtAddress);
                m.add(div('wall-dialog-body', txtAddress));
            }
            var d = div(cls, buttons);
            m.add(d);
            return d;
        }

        export function shareOnNetwork(link: Link, network: string, options:ShareOptions = {}) : boolean
        {
            var text = link.name() + " " + link.address();
            var encodedText = encodeURIComponent(text);
            var encodedName = encodeURIComponent(link.name());
            var encodedAddress = encodeURIComponent(link.address());
            function shareEmail() { window.open('mailto:?subject=' + encodedName + '&body=' + encodedAddress); }
            function shareTweet() { window.open('https://twitter.com/intent/tweet?text=' + encodedText); }
            function shareFacebookLike() { window.open('http://www.facebook.com/plugins/like.php?send=false&layout=standard&width=200&show_faces=false&font&colorscheme=light&action=like&height=35&href=' + encodedAddress); }
            function shareFacebook() {
                window.open('https://www.facebook.com/sharer/sharer.php?u=' + encodedAddress,
                            'facebook-share-dialog',
                            'width=626,height=436'); }

            if (options.tickCallback) options.tickCallback(network)

            switch (String_.trim(network, ' \t').toLowerCase()) {
                case "email": shareEmail(); break;
                case "facebook": shareFacebookLike(); break;
                case "facebook-share": shareFacebook(); break;
                case "twitter":
                case "social": shareTweet(); break;
                default: return false;
            }

            return true;
        }

        export var shareSocialAsync = (provider: string, text: string, uri: string): Promise => {
            var encodedText = encodeURIComponent(text || ' ' || uri);
            window.open('https://twitter.com/intent/tweet?text=' + encodedText);
            return Promise.as();
        };

        export function shareLinkAsync(link: Link, network: string) : Promise
        {
            return new Promise((onSuccess, onError, onProgress) => {
                if (shareOnNetwork(link, network)) onSuccess(null);
                else {
                    // implemented in seperate platforms
                    var m = new ModalDialog();
                    addShareButtons(m, link);
                    m.onDismiss = () => { onSuccess(null); };
                    m.show();
                }
            });
        }

        export function shareTextAsync(text : string, network : string) : Promise
        {
            return new Promise((onSuccess, onError, onProgress) => {

                var encodedText = encodeURIComponent(text);
                function shareSms() { Social.sendSmsAsync('', text).done(); }
                function shareEmail() { window.open('mailto:?body=' + encodedText); }
                function shareSocial() { ShareManager.shareSocialAsync(network, text, null).done(); }
                function shareSkype() { window.open("skype:?chat&topic=" + encodedText); }

                switch (String_.trim(network, ' \t').toLowerCase())
                {
                    case "email": shareEmail(); onSuccess(null); break;
                    case "twitter":
                    case "social": shareSocial(); onSuccess(null); break;
                    case "sms": shareSms(); onSuccess(null); break;
                    case "skype": shareSkype(); onSuccess(null); break;
                    default:
                        // implemented in seperate platforms
                        var m = new ModalDialog();
                        m.add(div('wall-dialog-header', "share"));
                        m.add(div('wall-dialog-body', tweetify(text)));
                        m.add(div('wall-dialog-body',
                            HTML.mkButton('email', () => {
                                shareEmail();
                                m.dismiss();
                            }),
                            HTML.mkButton('sms', () => {
                                shareSms();
                                m.dismiss();
                            }),
                            HTML.mkButton('Skype', () => {
                                shareSkype();
                                m.dismiss();
                            }),
                            HTML.mkButton('social', () => {
                                shareSocial();
                                m.dismiss();
                            })
                            ));
                        m.onDismiss = () => { onSuccess(null); };
                        m.show();
                        break;
                }
            });
        }
    }
}
