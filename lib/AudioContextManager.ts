///<reference path='refs.ts'/>
//declare class AudioContext {}
declare class AudioBuffer {}

module TDev.RT {
    export module AudioContextManager {
        var _context : any; // AudioContext
        var _vco : any; //OscillatorNode;
        var _vca: any; // GainNode;
        
        function context() : any {
            if (!_context) _context = freshContext();
            return _context;
        }
        function freshContext() : any {
            (<any>window).AudioContext = (<any>window).AudioContext || (<any>window).webkitAudioContext;
            if ((<any>window).AudioContext) {
                try {
                    // this call my crash.
                    // SyntaxError: audio resources unavailable for AudioContext construction
                    return  new (<any>window).AudioContext();
                } catch(e) {}
             }
            return undefined;
        }
        
        export function stop() {
            if (_vca) _vca.gain.value = 0;
        }
        
        export function tone(frequency: number, gain: number) { 
            if (frequency <= 0) return;            
            var ctx = context();
            if (!ctx) return;
            
            gain = Math_.normalize(gain);            
            if (!_vco) {
                try {
                    _vco = ctx.createOscillator();
                    _vca = ctx.createGain();
                    _vco.connect(_vca);
                    _vca.connect(ctx.destination);
                    _vca.gain.value = gain;
                    _vco.start(0);
                } catch(e) {
                    _vco = undefined;
                    _vca = undefined;
                    return;
                }
            }
            
            _vco.frequency.value = frequency;
            _vca.gain.value = gain;
        }
                
        export function isSupported() { return !!context(); }
        export function loadAsync(buffer : ArrayBuffer) : Promise { // AudioBuffer
            var ctx = context();
            return new Promise((onSuccess, onError, onProgress) => {
                ctx.decodeAudioData(buffer,
                    b => onSuccess(b),
                    e => onSuccess(undefined)
                    );
            });
        }

        export function play(buffer : AudioBuffer, volume : number) {
            var ctx = context();
            if (ctx) {
                var source = ctx.createBufferSource();
                source.buffer = buffer;
                var gain = ctx.createGain();
                gain.gain.value = volume;
                source.connect(gain);
                gain.connect(ctx.destination);

                source.start(0);
            }
        }

        function createNode(ctx : any) {
            if(!ctx.createScriptProcessor)
               return ctx.createJavaScriptNode(4096, 1, 1);
            else
               return ctx.createScriptProcessor(4096, 1, 1);
        }

        export function isMicrophoneSupported() { return isSupported() && UserMediaManager.isSupported(); }

        export function recordMicrophoneAsync() : Promise { // wav
            if(!isSupported()) return Promise.as(undefined);
            return UserMediaManager.getMicrophoneStreamAsync()
                .then(stream => {
                    if (!stream) return Promise.as(undefined);
                    return new Promise((onSuccess, onError, onProgress)=>{
                        var ctx = freshContext();
                        if (!ctx) {
                            App.log("failed to acquire AudioContext");
                            onSuccess(undefined);
                            return;
                        }
                        var source = ctx.createMediaStreamSource( stream );
                        var node = createNode(ctx);
                        var buffers : Float32Array[] = [];
                        var buffersLength = 0;
                        node.onaudioprocess = (e) => {
                          if (!buffers) return;
                          var b = e.inputBuffer.getChannelData(0);
                          var clone = new Float32Array(b.length);
                          clone.set(b);
                          buffers.push(clone);
                          buffersLength += clone.length;
                        };
                        source.connect(node);
                        // if the script node is not connected to an output the "onaudioprocess" event
                        // is not triggered in chrome.
                        node.connect(ctx.destination);

                        var wav = undefined;
                        var m = new ModalDialog();
                        m.add(div('wall-dialog-header', 'recording microphone...'));
                        m.add(div('wall-dialog-buttons', HTML.mkButton('done', () => {
                            source.disconnect();
                            source = null;
                            node.disconnect();
                            node.onaudioprocess = null;
                            node = null;
                            var wavBytes = encodeToWav(buffers, buffersLength, ctx.sampleRate);
                            wav = 'data:audio/wav;base64,' + Util.base64EncodeBytes(<number[]><any>wavBytes);
                            m.dismiss();
                        }))
                        );
                        m.onDismiss = () => {
                            if (source) {
                                source.disconnect();
                                source = null;
                            }
                            if (node) {
                                node.disconnect();
                                node.onaudioprocess = null;
                                node = null;
                            }
                            ctx = null;
                            onSuccess(wav);
                        };
                        m.show();
                    });
                });
        }


        function encodeToWav(buffers : Float32Array[], buffersLength : number, sampleRate : number) : Uint8Array {
            var buffer = new ArrayBuffer(44 + buffersLength * 2);
            var view = new DataView(buffer);
            var offset = 0;

            function writeString(s : string){
              for (var i = 0; i < s.length; i++, offset++){
                view.setUint8(offset, s.charCodeAt(i));
              }
            }
            function writeUint32(u : number) {
              view.setUint32(offset, u, true);
              offset += 4;
            }
            function writeUint16(u : number) {
              view.setUint16(offset, u, true);
              offset += 2;
            }
            function writePCM(buffer : Float32Array){
                for (var i = 0; i < buffer.length; i++, offset+=2){
                  var s = Math.max(-1, Math.min(1, buffer[i]));
                  view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
                }
            }

            var numChannels = 1; // mono
            var bytesPerSample = 2; // 16 bits
            // WAV header
            writeString('RIFF');
            writeUint32(36 + buffersLength * bytesPerSample);
            writeString('WAVE');
            writeString('fmt ');
            writeUint32(16); // 16 for PCM
            writeUint16(1); // PCM
            writeUint16(numChannels);
            writeUint32(sampleRate);
            writeUint32(sampleRate * bytesPerSample * numChannels);
            writeUint16(numChannels * bytesPerSample);
            writeUint16(bytesPerSample * 8);
            writeString('data');
            writeUint32(buffersLength * numChannels * bytesPerSample);
            // PCM
            for(var j = 0; j<buffers.length;++j)
                writePCM(buffers[j]);
            return new Uint8Array(buffer, 0, buffer.byteLength);
        }
    }
}