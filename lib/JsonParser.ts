///<reference path='refs.ts'/>
module TDev.RT {
    export class JsonParser
    {
        /// JSON parser trying to be more lenient than real JSON, mimicking what .NET does. This means we accept
        /// - single quoted or double quoted keys
        /// - unquoted keys, as long as they are letter, digit, _, -, ., +, -
        /// NOTE this does not match .NET exactly, as .NET uses Unicode characterization of IsNumberOrDigit.
        ///
        static parse(s: string, log? : (msg:string) => void) : JsonObject
        {
            var index = 0;
            var current = s[0];

            var onerror = function (m:string) :void {
                throw { message: m }
            };

            var cnext = function (expected:string) {
                if (expected != current) {
                    onerror(lf("got `{0}`, but expected `{1}`", current, expected));
                }

                current = s[++index];
                return current;
            };

            var parseNumber = function () : number {
                var value: number;
                var sofar = "";
                if (current === "-") {
                    sofar = "-";
                    cnext("-");
                }
                while (current >= "0" && current <= "9") {
                    sofar += current;
                    cnext(current);
                }
                if (current === ".") {
                    sofar += current;
                    while (cnext(current) && current >= "0" && current <= "9") {
                        sofar += current;
                    }
                }
                if (current === "E" || current === "e") {
                    sofar += current;
                    cnext(current);
                    if (current === "-" || current === "+") {
                        sofar += current;
                        cnext(current);
                    }
                    while (current >= "0" && current <= "9") {
                        sofar += current;
                        cnext(current);
                    }
                }

                value = +sofar;
                if (isNaN(value)) {
                    onerror(lf("not a number"));
                }
                return value;
            }

            var getQuoteChar = function() : string {
                if (current == '"') return current;
                if (current == "'") return current;
                onerror(lf("missing quote for string"));
            }
            var parseString = function () {
                var quote = getQuoteChar();
                var escapedChar=false;
                var sofar = "";
                while (cnext(current)) {
                    if (current === "\\") {
                        if (escapedChar) {
                            sofar += '\\';
                            escapedChar = false;
                        }
                        else {
                            escapedChar = true;
                        }
                        continue;
                    }
                    if (escapedChar) {
                        escapedChar = false;
                        if (current === '"' || current === "'" || current === "/") {
                            sofar += current;
                        }
                        else if (current === "b") {
                            sofar += "\b";
                        }
                        else if (current === "f") {
                            sofar += "\f";
                        }
                        else if (current === "n") {
                            sofar += "\n";
                        }
                        else if (current === "r") {
                            sofar += "\r";
                        }
                        else if (current === "t") {
                            sofar += "\t";
                        }
                        else if (current === "u") {
                            var value = 0;
                            for (var i = 0; i < 4; i++) {
                                var digit = parseInt(cnext(current), 16);
                                if (!isFinite(digit)) {
                                    break;
                                }
                                value = value * 16 + digit;
                            }
                            sofar += String.fromCharCode(value);
                        }
                        else {
                            onerror(lf("bad escaped char: {0}", current));
                        }
                    }
                    else {
                        if (current === quote) {
                            cnext(quote);
                            return sofar;
                        }
                        sofar += current;
                    }
                }
                onerror(lf("non-terminated string"));
            }

            var skipWhiteSpace = function () {
                while (current && current <= " ") {
                    cnext(current);
                }
            }

            var parsePrimitiveToken = function() {
                var sofar = "";
                while (current) {
                    if (current >= "0" && current <= "9" || current >= "a" && current <= "z" || current >= "A" && current <= "Z" || current === "." || current === "-" || current === "_" || current === "+") {
                        sofar += current;
                        cnext(current);
                    }
                    else {
                        break;
                    }
                }
                return sofar;
            }

            var parsePrimitive = function () : any {
                switch (current) {
                    case 't':
                        cnext("t");
                        cnext("r");
                        cnext("u");
                        cnext("e");
                        return true;
                    case 'f':
                        cnext("f");
                        cnext("a");
                        cnext("l");
                        cnext("s");
                        cnext("e");
                        return false;
                    case 'n':
                        cnext("n");
                        cnext("u");
                        cnext("l");
                        cnext("l");
                        return null;
                }
                onerror("expected true, false, or null at \n"
                       +"      " + s.slice(Math.max(0, index - 20), index) + "\n"
                       +" ---->" + s.slice(index + 1, Math.min(s.length, index + 20)));
            }

            var parseArray : () => any[] = function() {
                var result = [];

                cnext('[');
                skipWhiteSpace();
                if (current === ']') {
                    cnext(']');
                    return result;
                }
                while (current) {
                    result.push(parseValue());
                    skipWhiteSpace();
                    if (current === ']') {
                        cnext(']');
                        return result;
                    }
                    cnext(",");
                    skipWhiteSpace();
                }
                onerror(lf("incomplete array"));
                return result;
            }

            var parseValue : () => any = function (){
                skipWhiteSpace();
                switch (current) {
                    case '{': return parseObject();
                    case '[': return parseArray();
                    case '"':
                    case "'":
                        return parseString();
                    case '-':
                        return parseNumber();
                    default:
                        if (current >= '0' && current <= '9') return parseNumber();
                        else return parsePrimitive();
                }
            }

            var parseObject = function (): any {
                var result = {};
                cnext("{");
                skipWhiteSpace();
                if (current === "}") {
                    cnext("}");
                    return result;
                }
                var key: string;
                while (current) {
                    if (current === "'" || current === '"') {
                        key = parseString();
                    }
                    else {
                        key = parsePrimitiveToken();
                    }
                    if (key === null || key === undefined) {
                        onerror(lf("bad key"));
                    }
                    skipWhiteSpace();
                    cnext(":");
                    result[key] = parseValue();
                    skipWhiteSpace();
                    if (current === "}") {
                        cnext("}");
                        return result;
                    }
                    cnext(",");
                    skipWhiteSpace();
                }
                onerror(lf("incomplete object"));
            }

            try {
                return JsonObject.wrap(JSON.parse(s))
            } catch (e) {
                try {
                    var value = parseValue();
                    skipWhiteSpace();
                    if (current) {
                        onerror(lf("illegal json value"));
                    }
                    var js = JsonObject.wrap(value);
                    return js;
                }
                catch(e)
                {
                    if (log)
                        log(lf("error parsing json {0} {1}", s.length > 100 ? s.slice(0,100) + "..." : s, e.message));
                    return undefined;
                }
            }
        }

    }
}
