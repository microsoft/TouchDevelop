///<reference path='refs.ts'/>


module TDev.AST {
    export module Lexer
    {
        var operators = [
            "+", "-", "*", "/", "=", "\u2260", "\u2264", "<", "\u2265", ">",
            ":=", "(", ")", ",", "\u2225", "\u2192", "$",
            "...",
            ";", "{", "}", "//", ":", "?",
            "[", "]",
            "\u267B"
        ];
        var asciiOps = {
                "!=": "\u2260",
                "<=": "\u2264",
                ">=": "\u2265",
                "||": "\u2225",
                "->": "\u2192",
                "`": "\u267B"
        };
        var invAsciiOps:any = {};
        var keywordList:string[] = [
                "for", "do", "foreach", "if", "then", "else",
                "action", "event", "table", "var", "script", "in", "while", "meta", "skip", "returns",
                // query language
                "apply", "distinct", "reverse", "top", "bottom", "where", "order by", "transform to",
                // to be possibly used later
                "function", "global",
                "goto", "break", "continue", "return",
                "match", "switch", "case",
                "public", "private",
                "this", "self",
                "try", "finally", "catch", "throw",
                "and", "or", "not"
        ];
        var keywords:any = {};
        var jsRegexpChars:RegExp =  /[\\\(\)\|\[\]\^\$\.\?\+\*\{\}]/g;
        var operatorRx:RegExp = /x/;

        export function init()
        {
            var ops:string[] = operators.slice(0);
            for (var k in asciiOps)
                if (asciiOps.hasOwnProperty(k)) {
                    ops.push(k);
                    invAsciiOps[asciiOps[k]] = k;
                }
            ops.push("0", "1", "2", "3", "4", "5", "6", "7", "8", "9", ".");
            ops.sort((a, b) => b.length - a.length); // longest first

            var opRx = "^(?:";
            var first = true;
            ops.forEach(function (s:string) {
                if (!first) opRx += "|";
                first = false;
                opRx += s.replace(jsRegexpChars, "\\$&");
                keywords[s] = true;
            });
            operatorRx = new RegExp(opRx + ")");

            keywordList.forEach(function (s:string) {
                keywords[s] = true;
            });
        }

        export function quotedOp(op:string) { return /^[a-zA-Z]/.test(op); }

        function escapeStr(s:string, quoted:boolean, asciiOnly:boolean)
        {
            var sb = "";
            for (var i = 0; i < s.length; ++i) {
                var c = s.charAt(i);
                if (/[A-Za-z0-9]/.test(c))
                    sb += c;
                else
                    switch (c) {
                    case "\\":
                    case "'":
                    case "\"":
                        sb += "\\" + c;
                        break;
                    case " ":
                        if (quoted) sb += c;
                        else sb += "_";
                        break;
                    case "_":
                        if (quoted) sb += c;
                        else sb += "\\_";
                        break;
                    case "\t": sb += "\\t"; break;
                    case "\n": sb += "\\n"; break;
                    case "\r": sb += "\\r"; break;
                    default:
                        var k = c.charCodeAt(0);
                        if (!quoted || k < 32 || (asciiOnly && k > 127))
                            sb += "\\u" + (k|0x10000).toString(16).slice(-4);
                        else
                            sb += c;
                        break;
                    }
            }
            return sb;
        }

        var isKeyword = (id:string) => keywords.hasOwnProperty(id);

        export function quoteId(id:string)
        {
            if (id == "") return "\\j";
            var sb = "";
            if (isKeyword(id) || /^[0-9]/.test(id)) sb += "@";
            sb += escapeStr(id, false, true);
            return sb;
        }

        export function quoteString(id:string, useAscii:boolean) { return "\"" + escapeStr(id, true, useAscii) + "\""; }
        export function asciiOperator(id:string) { return invAsciiOps.hasOwnProperty(id) ? invAsciiOps[id] : id; }

        var idBegChar = (s:string) => /[_\\A-Za-z]/.test(s);
        var idMidChar = (s:string) => /[_\\A-Za-z0-9]/.test(s);

        export function tokenize(input:string) : LexToken[]
        {
            var inputPos = 0;
            var res:LexToken[] = [];

            function addTok(cat:TokenType, d:string)
            {
                Util.assert(typeof d == "string");
                res.push(new LexToken(input, inputPos, cat, d));
            }

            function getId(delim:string)
            {
                var sb = "";
                var len = 0;

                while (true) {
                    if (inputPos + len >= input.length)
                        break;

                    var c = input.charAt(inputPos + len++);
                    if (c == '\\') {
                        c = input.charAt(inputPos + len++);
                        switch (c)
                        {
                            case 's': c = ' '; break;
                            case 't': c = '\t'; break;
                            case 'n': c = '\n'; break;
                            case 'r': c = '\r'; break;
                            case 'q': c = '\"'; break;
                            case 'j': c = ''; break;
                            case 'z': c = '\u0000'; break;
                            case '_': c = '_'; break;
                            case 'x':
                                var hex = input.slice(inputPos + len, inputPos + len + 2);
                                if (!/^[a-f0-9]+$/i.test(hex)) {
                                    error("invalid \\x sequence");
                                    sb += "\\";
                                } else {
                                    c = String.fromCharCode(parseInt(hex, 16));
                                    len += 2;
                                }
                                break;
                            case 'u':
                                var hex = input.slice(inputPos + len, inputPos + len + 4);
                                if (!/^[a-f0-9]+$/i.test(hex)) {
                                    error("invalid unicode sequence");
                                    sb += "\\";
                                } else {
                                    c = String.fromCharCode(parseInt(hex, 16));
                                    len += 4;
                                }
                                break;
                            default:
                                if (/[A-Za-z0-9]/.test(c)) {
                                    error("invalid escape sequence");
                                    sb += "\\";
                                }
                                break;
                        }
                        sb += c;
                    } else {
                        if (delim != null) {
                            if (c == delim)
                                break;
                            else
                                sb += c;
                        } else {
                            if (c == '_')
                                sb += ' ';
                            else if (idMidChar(c))
                                sb += c;
                            else {
                                len--;
                                break;
                            }
                        }
                    }
                }

                inputPos += len;
                return sb;
            }

            function error(msg:string)
            {
                addTok(TokenType.Error, msg);
            }

            while (inputPos < input.length) {
                var c = input.charAt(inputPos);

                if (/[ \t\n\r]/.test(c)) {
                    inputPos++;
                    continue;
                }

                if (c == '@' && idMidChar(input.charAt(inputPos + 1))) {
                    inputPos++;
                    addTok(TokenType.Id, getId(null));
                } else if (c == "\"" || c == "'") {
                    inputPos++;
                    addTok(TokenType.String, getId(c));
                } else if (c == "`") {
                    inputPos++;
                    addTok(TokenType.Op, getId(c));
                } else if (c == '#') {
                    inputPos++;
                    if (input.charAt(inputPos) == '@') inputPos++;
                    addTok(TokenType.Label, getId(null));
                } else if (idBegChar(c)) {
                    var id = getId(null);
                    if (/^(and|or|not)$/.test(id))
                        addTok(TokenType.Op, id);
                    else if (isKeyword(id))
                        addTok(TokenType.Keyword, id);
                    else
                        addTok(TokenType.Id, id);
                } else {
                    var possibleOp = input.slice(inputPos, inputPos + 3);
                    var matchRes = operatorRx.exec(possibleOp);
                    var rs:string = null;
                    if (!!matchRes)
                        rs = (<any> matchRes)[0];
                    if (!!rs) {
                        inputPos += rs.length;
                        if (rs == "//") {
                            addTok(TokenType.Comment, getId('\n').trim());
                        } else {
                            rs = asciiOps[rs] || rs;
                            addTok(TokenType.Op, rs);
                        }
                    } else {
                        error("unexpected character " + c);
                        inputPos++;
                    }
                }
            }

            addTok(TokenType.EOF, "");

            return res;
        }
    }

    export class LexToken
    {
        constructor(public input:string, public inputPos:number, public category:TokenType, public data:string) {
        }
        private toString() { return this.data; } // TODO
    }

    export enum TokenType
    {
        Op,
        Id,
        Keyword,
        String,
        Comment,
        Label,
        Error,
        EOF
    }

}
