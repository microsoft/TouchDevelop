///<reference path='refs.ts'/>
module TDev.RT {
    //? A piece of text
    //@ stem("s") icon("fa-file-text-o") immutable isData builtin ctx(general,indexkey,cloudfield,walltap,enumerable,json)
    export module String_
    {

        //? Returns a string collection that contains the substrings in this string that are delimited by elements of a specified string.
        //@ [separator].defl(",")
        //@ [result].writesMutable
        //@ robust
        export function split(self:string, separator:string) : Collection<string> { return Collection.mkStrings(self.split(separator)); }

        export function valueFromArtUrl(url: string) {
            var m = /^data:[^,]*base64,/i.exec(url)
            if (m)
                return Web.base64_decode(url.substring(m[0].length));
            return null;
        }

        export function valueToArtUrl(value: string) {
            return "data:text/plain;base64," + Web.base64_encode(value);
        }

        export function fromArtUrl(url: string) {
            var value = valueFromArtUrl(url);
            if (value) return Promise.wrap(value);

            return ArtCache.getArtAsync(url)
                .then(dataUrl => {
                    if (dataUrl) return Promise.as(valueFromArtUrl(dataUrl));
                    else Util.httpGetTextAsync(url)
                })
                .then(txt => txt, e => {
                    App.logEvent(App.ERROR, "art", lf("failed to load url {0}", url), undefined);
                    return ""
                });
        }

        //? Trims the string at the given length and adds ``...`` if necessary
        //@ [lim].defl(140)
        export function trim_overflow(self: string, lim: number): string {
            var v = self;
            if (v && v.length > lim)
                v = v.slice(0, lim) + "...";
            return v;
        }

        //? Displays string on the wall
        export function post_to_wall(self:string, s:IStackFrame)
        {
            // backdoor for session testing
            if (dbg && self != null && self.indexOf("magic trap ") == 0) {
               var tests = new Revisions.SessionTests(s.rt);
               tests.runtest(self.substr(11));
               return;
            }

            if (self != null) {

                if (s.rt.onCssPage())
                    s.rt.postUnboxedText(self, s.pc);
                else
                  s.rt.postBoxedTextWithTap(self, self, s.pc);
            }
        }

        //? Returns the number of characters
        //@ robust
        export function count(self:string):number { return self.length; }

        //? Gets the charecter unicode value at a given index. Returns NaN if out of bounds
        export function code_at(self: string, index: number): number { return self.charCodeAt(index); }

        //? Gets the character at a specified index. Returns invalid if out of bounds.
        export function at(self:string, index:number):string { return index < 0 || index >= self.length ? undefined : self.charAt(index); }

        //? Returns a copy of this string converted to lowercase, using the casing rules of the current culture.
        //@ robust
        export function to_lower_case(self:string) : string { return self.toLocaleLowerCase(); }

        //? Returns a copy of this string converted to uppercase, using the casing rules of the current culture.
        //@ robust
        export function to_upper_case(self:string) : string { return self.toLocaleUpperCase(); }

        //? Use ``to_character_code`` instead
        //@ hidden
        export function to_unicode(self:string) : number { return self.length == 1 ? self.charCodeAt(0) : undefined; }

        //? Converts the first character into the character code number (unicode)
        export function to_character_code(self:string) : number { return self.length == 1 ? self.charCodeAt(0) : 0; }
        
        //? Compares two pieces of text
        //@ robust
        export function compare(self:string, other:string) : number
        {
            var r = self.localeCompare(other);
            if (r < 0) return -1;
            if (r > 0) return 1;
            return 0;
        }

        //? Concatenates two pieces of text
        //@ robust
        export function concat(self:string, other:string) : string { return self + other; }

        //? Concatenates two pieces of text
        //@ name("\u2225") infixPriority(6)
        //@ robust
        export function concat_op(self:string, other:string) : string { return self + other; }

        //@ robust
        export function concatAny(a:any, b:any) : string
        {
            function toStr(v:any) {
                if (v === undefined || v === null) return "(invalid)";
                if (typeof v == "string") return v;
                if (typeof v == "JsonObject") return v.toString();
                if (v.to_string) return v.to_string();
                return v + "";
            }
            return toStr(a) + toStr(b);
        }

        //? Returns a value indicating if the second string is contained
        //@ robust
        export function contains(self:string, value:string) : boolean { return self.indexOf(value) > -1; }

        //? Checks if two strings are the same
        //@ robust
        export function equals(self:string, other:string) : boolean { return self == other; }

        //? Determines whether the ending matches the specified string
        //@ robust
        export function ends_with(self:string, value:string) : boolean
        {
            var i = self.lastIndexOf(value);
            return i > -1 && i == (self.length - value.length); // TODO: more efficient implementation
        }

        //? Returns the index of the first occurence if found starting at a given position
        //@ robust
        export function index_of(self:string, value:string, start:number) : number { return self.indexOf(value, start); }

        //? Inserts a string at a given position
        export function insert(self: string, start: number, value: string): string
        {
            if (!value) return self;
            if (start < 0 || start > self.length) return undefined;

            return self.slice(0, start) + value + self.slice(start);
        }

        //? Indicates if the string is empty
        //@ robust
        export function is_empty(self:string) : boolean { return self.length == 0; }

        //? Indicates if the string matches a regular expression
        export function is_match_regex(self: string, pattern: string): boolean
        {
            var rx = new RegExp(pattern, "");
            return rx.test(self);
        }

        //? Returns the index of the last occurence if found starting at a given position
        //@ robust
        export function last_index_of(self:string, value:string, start:number) : number { return self.lastIndexOf(value, start); }

        //? Gets the groups from the matching the regex expression (pattern). Returns an empty collection if no matches.
        export function match(self: string, pattern: string): Collection<string>
        {
            try {
                var rx = new RegExp(pattern, "");
                var r = rx.exec(self);
                if (!r)
                    return Collections.create_string_collection();
                return Collection.mkStrings(Util.toArray(r));
            }
            catch (e) {
                Time.log('invalid regex pattern: ' + pattern);
                return Collections.create_string_collection();
            }
        }

        //? Gets the strings matching the regex expression (pattern)
        export function matches(self: string, pattern: string): Collection<string>
        {
            try {
                var rx = new RegExp(pattern, "g");
                var r = self.match(rx);
                return Collection.mkStrings(r || []);
            }
            catch (e) {
                Time.log('invalid regex pattern: ' + pattern);
                return Collections.create_string_collection();
            }
        }

        //? Returns the string with characters removed starting at a given index
        //@ robust
        export function remove(self:string, start:number) : string { return self.slice(0, start); }

        //? Returns a given string with a replacement
        //@ robust
        export function replace(self: string, old: string, new_: string): string {
            if (!old) return self;
            return self.split(old).join(new_);
        }

        //? Replace every match of the regex according to the replacement string
        export function replace_regex(self: string, pattern: string, replace: string): string
        {
            try
            {
                var rx = new RegExp(pattern, "g");
                return self.replace(rx, replace);
            }
            catch (e)
            {
                Time.log('invalid regex pattern: ' + pattern);
                return undefined;
            }
        }

        //? Run `replacer` on every match of the regex
        export function replace_regex_with_converter(self: string, pattern: string, replace: StringConverter<Collection<string>>, s:IStackFrame): string
        {
            try
            {
                var rx = new RegExp(pattern, "g");
            }
            catch (e)
            {
                Time.log('invalid regex pattern: ' + pattern);
                return undefined;
            }

            return self.replace(rx, (...args:string[]) =>
                s.rt.runUserAction(replace, [Collection.fromArray(args, "string")]))
        }

        //? Determines whether the beginning matches the specified string
        export function starts_with(self:string, value:string) : boolean {
            return self.indexOf(value) == 0; // TODO: more efficient implementation
        }

        //? Returns a substring given a start index and a length
        export function substring(self:string, start:number, length:number) : string { return self.substr(start, length); }

        //? Removes all leading and trailing occurrences of a set of characters specified in a string from the current string.
        //@ [chars].defl(" \t")
        //@ robust
        export function trim(self: string, chars: string): string
        {
            if (!self || !chars) return self;

            return trim_start(trim_end(self, chars), chars);
        }

        //? Removes all leading occurrences of a set of characters specified in a string from the current string.
        //@ [chars].defl(" \t")
        //@ robust
        export function trim_start(self:string, chars:string) : string
        {
            if (!self || !chars) return self;

            var i = 0;
            for(; i < self.length && chars.indexOf(self[i]) > -1; i++) {}
            return self.substr(i);
        }

        //? Removes all trailing occurrences of a set of characters specified in a string from the current string.
        //@ [chars].defl(" \t")
        //@ robust
        export function trim_end(self: string, chars: string): string
        {
            if (!self || !chars) return self;

            var i = self.length;
            for(; i > 0 && chars.indexOf(self[i-1]) > -1; i--) {}
            return self.substring(0, i);
        }

        //? Parses the string as a time (12:30:12) and returns the number of seconds.
        export function to_time(self: string): number
        {
            if (self != null) {
                var s = trim(self, ' \t\n\r');
                var m = s.match(/(\d{1,2})\s*:\s*(\d{1,2})\s*(:\s*(\d{1,2}))?\s*(pm|am)?/i);
                if (m) {
                    var hours = parseFloat(m[1]);
                    if (m[5] && /pm/i.test(m[5])) hours += 12;
                    var minutes = parseFloat(m[2]);
                    var seconds = m[4] ? parseFloat(m[4]) : 0;
                    return Math_.clamp(0, 23, hours) * 3600 + Math_.clamp(0, 59, minutes) * 60 + seconds;
                }
            }
            return undefined;
        }

        //? Parses the string as a number
        export function to_number(self: string): number {
            // TODO: localization
            var r: number = undefined;
            if (/^\s*[-+]?\d*\.?(\d+([eE][-+]?\d+)?)?\s*$/.test(self)) {
                r = parseFloat(self);
            } else if (/^\s*[-+]?0x[a-z0-9]{1,4}\s*$/i.test(self)) {
                r = parseInt(self);
            }
            if (isNaN(r)) return undefined;
            return r;
        }

        //? Parses the string as a boolean
        export function to_boolean(self:string) : boolean { return self.trim().toLocaleLowerCase() == "true"; }

        //? Parses the string as a geo coordinate.
        export function to_location(self: string): Location_
        {
            var s = trim_start(trim_end(self, ")}] "), "([{ ");
            var seps = ',;:';
            for (var i = 0; i < seps.length; ++i) {
                var index = s.indexOf(seps[i]);
                if (index > -1) {
                    var lat = to_number(s.substring(0, index));
                    var long = to_number(s.substring(index + 1));
                    if (lat && long && !isNaN(lat) && !isNaN(long)) {
                        return Location_.mkShort(lat, long);
                    }
                }
            }
            return undefined;
        }

        //? Shares the string (email, sms, facebook, social or '' to pick from a list)
        //@ uiAsync flow(SinkSharing)
        //@ [network].defl("social")
        export function share(self: string, network: string, r : ResumeCtx): void
        {
            HTML.showProgressNotification(lf("sharing text..."));
            ShareManager.shareTextAsync(self, network)
                    .done(() => r.resume());
        }

        // Stores text in the clipboard

        //? Stores text in the clipboard
        //@ flow(SinkClipboard) uiAsync
        export function copy_to_clipboard(self:string, r : ResumeCtx) : void
        {
            ShareManager.copyToClipboardAsync(self).done(() => r.resume());
        }

        //? Parses the string as a date and time.
        export function to_datetime(self:string) : DateTime { return DateTime.parse(self); }

        //? Parses the string as a color.
        export function to_color(self: string): Color { return Color.fromHtml(self); }

        export function picker()
        {
            var inp = HTML.mkTextInput("text", lf("color"));
            return <IPicker>{
                html: inp,
                validate: () => true,
                get: () => inp.value,
                set: function(v) { inp.value = v + "" }
            };
        }

        //? Converts the value into a json data structure.
        export function to_json(self: string): JsonObject {
            return JsonObject.wrap(self);
        }
    }
}
