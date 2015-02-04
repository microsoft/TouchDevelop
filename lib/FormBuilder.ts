///<reference path='refs.ts'/>
module TDev.RT {
    export interface FormValue {
        name: string;
        value: any;
        blobName?: string;
    }
    //? A builder to create HTML Form data
    //@ stem("form")
    export class FormBuilder
        extends RTValue
    {
        private _data : FormValue[] = [];

        public data(): FormData {
            var fd = new FormData();
            this._data.forEach(d => {
                if (d.blobName)
                    fd.append(d.name, d.value, d.blobName);
                else
                    fd.append(d.name, d.value);
            });
            return fd;
        }

        public toString() {
            return "form: " + this._data.map(d => d.name).join(", ");
        }

        //? Displays the form to the wall
        public post_to_wall(s: IStackFrame) {
            s.rt.postText(this.toString(), s.pc);
        }

        public contains_key(name: string) {
            return !!this._data.filter(fv => fv.name == name)[0];
        }

        //? Adds a piece of text to the form using a custom type and/or file name.
        //@ [mimetype].deflStrings('text/html', 'text/plain')
        public add_text(name: string, content: string, mimetype: string, filename: string) {
            this._data.push({ name: name, value: new Blob([content], { type: mimetype || 'text/plain' }), blobName: filename });
        }

        //? Adds a buffer as an attached file
        public add_buffer(name: string, buffer: Buffer, filename: string) {
            this._data.push({ name: name, value: new Blob([buffer.buffer.buffer]), blobName: filename });
        }

        //? Adds a buffer as an attached file
        public add_string_as_file(name: string, text: string, filename: string) {
            this._data.push({ name: name, value: new Blob([text], { type:'text/plain' }), blobName: filename });
        }

        //? Adds a string value
        public add_string(name: string, value: string): void {
            this._data.push({ name: name, value: value });
        }

        //? Adds a number value
        public add_number(name: string, value: number): void {
            this._data.push({ name: name, value: value });
        }

        //? Adds a boolean value
        public add_boolean(name: string, value: boolean): void {
            this._data.push({ name: name, value: value });
        }

        //? Adds a picture
        //@ picAsync
        //@ [pictureName].defl("pic")
        public add_picture(name: string, value: Picture, pictureName : string, r:ResumeCtx): void {
            value.loadFirst(r, () => {
                var blob = Util.canvasToBlob(value.getCanvas(), pictureName);
                this._data.push({ name: name, value: blob, blobName : pictureName });
            })
        }
    }
}
