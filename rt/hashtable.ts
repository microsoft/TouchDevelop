///<reference path='refs.ts'/>

module TDev {

    export class HashtableEntry
    {
        public value:any;
        constructor(public key:any, public next:HashtableEntry) {
        }
    }

    export class Hashtable
    {
        static primeSizes = [13, 29, 59, 127, 257, 521, 1049, 2099, 4201, 8419, 16843, 33703, 67409, 134837,
            269683, 539389, 1078787, 2157587, 4315183, 8630387, 17260781, 34521589, 69043189, 138086407,
            276172823, 552345671, 1104691373, 2209382761];

        private entries:HashtableEntry[];
        private entryCount = 0;

        constructor(private getHashCode:(v:any)=>number, private equals:(a:any, b:any)=>boolean, private initialSize = 13) {
        }
        public count() { return this.entryCount; }

        private deleteKey(k: any): HashtableEntry {
            if (!this.entries) return null;

            var h = (this.getHashCode(k) & 0x7fffffff) % this.entries.length;
            var e0 = this.entries[h];
            if (!e0) return null;

            // the first element in the bucket
            if (this.equals(k, e0.key)) {
                this.entries[h] = e0.next;
                e0.next = null;
                this.entryCount--;
                return e0;
            }

            // now we want to find the element _before_ the one with key
            var e = e0;
            while (e && e.next && !this.equals(k, e.next.key)) e = e.next;

            if (!e.next) return null;

            var found = e.next;
            e.next = found.next;
            found.next = null;
            this.entryCount--;
            return found;
        }

        public remove(k: any): HashtableEntry {
            return this.deleteKey(k);
        }

        private lookup(k:any, addNew = false)
        {
            if (!this.entries) {
                if (!addNew) return null;
                this.entries = [];
                for (var i = 0; i < this.initialSize; ++i)
                    this.entries[i] = null;
            }

            var h = (this.getHashCode(k) & 0x7fffffff) % this.entries.length;
            var e0 = this.entries[h];
            var e = e0;

            while (e && !this.equals(k, e.key)) e = e.next;

            if (!e && addNew) {
                e = new HashtableEntry(k, e0);
                this.entryCount++;
                this.entries[h] = e;

                if (this.entryCount > this.entries.length + this.entries.length) {
                    this.rehash();
                }
            }

            return e;
        }

        private sizeAtLeast(n:number)
        {
            for (var i = 0; i < Hashtable.primeSizes.length; ++i)
                if (Hashtable.primeSizes[i] > n)
                    return Hashtable.primeSizes[i];
            return 0;
        }

        private rehash()
        {
            var size = this.sizeAtLeast(this.entries.length);
            if (size == 0) return; // over 4G entries?

            var oldEntries = this.entries;
            this.entries = [];
            for (var i = 0; i < size; ++i)
                this.entries[i] = null;

            for (var i = 0; i < oldEntries.length; ++i) {
                var next:any;
                for (var e = oldEntries[i]; e; e = next) {
                    next = e.next;
                    var h = (this.getHashCode(e.key) & 0x7fffffff) % this.entries.length;
                    e.next = this.entries[h];
                    this.entries[h] = e;
                }
            }
        }

        private forEachEntry(f:(e:HashtableEntry)=>void)
        {
            if (!this.entries) return;

            for (var i = 0; i < this.entries.length; ++i)
                for (var e = this.entries[i]; e; e = e.next)
                    f(e);
        }

        public forEach(f: (k, v) => void )
        {
            this.forEachEntry(e => f(e.key, e.value));
        }

        private mapEntries(f:(e:HashtableEntry)=>any)
        {
            var res = []
            if (this.entries) {
                for (var i = 0; i < this.entries.length; ++i)
                    for (var e = this.entries[i]; e; e = e.next)
                        res.push(f(e));
            }
            return res;
        }

        public keys() { return this.mapEntries((e) => e.key); }
        public pairs() { return this.mapEntries((e) => { return { key: e.key, value: e.value } }); }

        public filteredValues(filter:(v:any)=>boolean) {
            var res = []
            if (this.entries) {
                for (var i = 0; i < this.entries.length; ++i)
                    for (var e = this.entries[i]; e; e = e.next)
                    {
                        var val = e.value;
                        if(filter(val))
                           res.push(val);
                    }
            }
            return res;
        }
        public countFiltered(filter:(v:any)=>boolean):number
        {
            var count = 0
            if (this.entries) {
                for (var i = 0; i < this.entries.length; ++i)
                    for (var e = this.entries[i]; e; e = e.next)
                    {
                        var val = e.value;
                        if(filter(val))
                           count = count + 1;
                    }
            }
            return count;
        }

        public set(k:any, v:any)
        {
            var e = this.lookup(k, true);
            e.value = v;
        }

        public get(k:any)
        {
            var e = this.lookup(k);
            if (!e) return undefined;
            return e.value;
        }

        public clear()
        {
            this.entries = null
            this.entryCount = 0
        }

        static stringHash(s:string) : number
        {
            var res = 5381;
            for (var i = 0; i < s.length; ++i)
                res = (((res + (res << 5)) | 0) + s.charCodeAt(i)) | 0;
            return res;
        }

        static stringEq(a:string, b:string) { return a == b; }
        static forStrings() { return new Hashtable(Hashtable.stringHash, Hashtable.stringEq); }

        static jsonHash(v:any) { return Hashtable.stringHash(JSON.stringify(v)); }
        static jsonEq(a:any, b:any) { return (a == b) || JSON.stringify(a) == JSON.stringify(b); }
        static forJson() { return new Hashtable(Hashtable.jsonHash, Hashtable.jsonEq); }
    }
}
