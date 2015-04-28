///<reference path='refs.ts'/>
module TDev.RT {
    //? A document resource
    //@ stem("doc") immutable
    export class Document_
        extends RTValue
    {
        private _url : string = undefined;

        constructor() {
            super()
        }

        static fromArtUrl(url: string): Promise {
            var doc = new Document_();
            doc._url = url;
            return Promise.as(doc);
        }
    }
}
