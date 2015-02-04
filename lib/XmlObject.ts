///<reference path='refs.ts'/>
module TDev.RT {
    //? An xml element or collection of elements
    //@ stem("xml") immutable ctx(general,gckey,enumerable)
    export class XmlObject
        extends RTValue {
        private _element: Element = undefined;
        private _nodeList: XmlObject[] = undefined;

        constructor () {
            super()
        }
        static removeWhitespace(node: any) {
            for (var i = node.childNodes.length; i-- > 0;) {
                var child = node.childNodes[i];
                if (child.nodeType === 3 && child.data.match(/^\s*$/))
                    node.removeChild(child);
                if (child.nodeType === 1)
                    XmlObject.removeWhitespace(child);
            }
        }

        static parseToDOM(value: string): Document {
            try {
                var x = new XmlObject();
                var parser = new DOMParser();
                var doc = parser.parseFromString(value, "application/xml");
                XmlObject.removeWhitespace(doc);
                return doc;
            }
            catch (e) {
                App.logEvent(App.DEBUG, "xml", lf("error parsing xml: {0}", e.message), undefined);
                return undefined;
            }
        }
        static mk(value: string): XmlObject {
            var doc = XmlObject.parseToDOM(value);
            if (doc) {
                var x = new XmlObject();
                x._element = <Element>doc.firstChild;
                return x;
            }
            return undefined;
        }

        static mkNode(element: Element): XmlObject {
            if (element) {
                var x = new XmlObject();
                x._element = element;
                return x;
            } else {
                return null;
            }
        }

        static mkNodeList(nodeList: Element[]): XmlObject {
            if (nodeList) {
                var x = new XmlObject();
                x._nodeList = XmlObject.toElements(nodeList);
                return x;
            } else {
                return null;
            }
        }

        static toElements(childNodes: Element[]): XmlObject[] {
            var nodes: XmlObject[] = [];
            for (var i = 0; i < childNodes.length; ++i) {
                var child = childNodes[i];
                nodes.push(XmlObject.mkNode(<Element>child));
            }
            return nodes;
        }

        private initializeElements() {
            if (this._nodeList == null) {
                var childNodes = this._element.childNodes;
                var args = [];
                for (var i = 0; i < childNodes.length; ++i) {
                    var child = childNodes[i];
                    args.push(child);
                }
                this._nodeList = XmlObject.toElements(args);
            }
        }

        //? Gets the number of child element
        public count(): number
        {
            this.initializeElements();
            if (this._nodeList)
                return this._nodeList.length;
            return 0;
        }

        //? Indicates if this instance is an element or a filtered collection
        public is_element(): boolean
        {
            return this._element ? true : false;
        }

        //? Gets the full name of this element
        public name(): string
        {
            return this._element ? this.create_name(this._element.localName, this._element.namespaceURI) : "";
        }

        //? Gets the concatenated text contents of this element
        public value(): string
        {
            if (this._element)
                return this._element.textContent;
            else if (this._nodeList) {
                var s = [];
                this._nodeList.forEach((e) => { s.push(e.value()) });
                return s.join("\n");
            }
            return "";
        }

        //? Gets the i-th child element in the collection
        public at(index: number): XmlObject
        {
            this.initializeElements();
            if (this._nodeList)
				return this._nodeList[Math.floor(index)];
            return undefined;
        }

        //? Gets the value of the attribute
        public attr(name: string): string
        {
            if (this._element)
                return this._element.getAttribute(name);
            return undefined;
        }

        //? Gets the list of attribute names
        public attr_names(): Collection<string>
        {
            var c = new Collection<string>("string");
            if (this._element) {
                var attrs = this._element.attributes;
                if (attrs) {
                    for (var i = 0; i < attrs.length; ++i) {
                        var attr = attrs[i].name;
                        c.add(attr);
                    }
                }
            }
            return c;
        }

        //? Gets a first child element matching the fully qualified name
        public child(name:string) : XmlObject
        {
            if (this._element && name) {
                var localName = name;
                var namespaceURI = null
                var m = /^\{([^\}]*)\}(.*)$/i.exec(name);
                if (m) {
                    namespaceURI = m[1];
                    localName = m[2];
                }

                var childNodes = this._element.childNodes;
                for (var i = 0; i < childNodes.length; ++i) {
                    var child = childNodes[i];
                    if (child.nodeType == Node.ELEMENT_NODE && 
                        child.localName == localName &&
                        (!namespaceURI || child.namespaceURI == namespaceURI)
                        )
                        return XmlObject.mkNode(<Element>child);
                }
            }
            return undefined;
        }

        //? Gets a collection of child element matching the fully qualified name
        public children(name: string): XmlObject
        {
            if (!name) name = ''; // normalizing

            if (this._element) {
                var localName = name;
                var namespaceURI = null;
                if (localName) {
                    var m = /^\{([^\}]*)\}(.*)$/i.exec(name);
                    if (m) {
                        namespaceURI = m[1];
                        localName = m[2];
                    }
                }

                var nodes: Element[] = [];
                var childNodes = this._element.childNodes;
                for (var i = 0; i < childNodes.length; ++i) {
                    var child = childNodes[i];
                    if (child.nodeType == Node.ELEMENT_NODE  && (name.length === 0 || 
                        (child.localName == localName &&
                        (!namespaceURI || child.namespaceURI == namespaceURI))))
                        nodes.push(<Element>child);
                }
                return XmlObject.mkNodeList(nodes);
            }
            return undefined;
        }

        //? Display the xml content to the wall
        public post_to_wall(s: IStackFrame): void
        {
            s.rt.postBoxedText(this.to_string(), s.pc);
        }

        public toString(): string { return this.to_string(); }

        //? Gets an xml string
        public to_string(): string
        {
            if (this._element) {
                return (new XMLSerializer()).serializeToString(this._element);
            }
            else if (this._nodeList)
            {
                var result = [];
                this._nodeList.forEach((e) => { result.push(e.to_string()) });
                return result.join("\n");
            }
            else
                return "";
        }

        //? Gets the local name of this element
        public local_name(): string
        {
            if (this._element)
                return this._element.localName || "";
            return "";
        }

        //? Gets the namespace of this element
        public namespace(): string
        {
            if (this._element)
                return this._element.namespaceURI || "";
            return "";
        }

        public next_sibling(): XmlObject {
            if (this._element)
                return XmlObject.mkNode(<Element>this._element.nextSibling);
            else return null;
        }

        public previous_sibling(): XmlObject {
            if (this._element)
                return XmlObject.mkNode(<Element>this._element.previousSibling);
            else return null;
        }

        //? Creates a qualified full name from the namespace and local name
        public create_name(local_name: string, namespace_uri: string): string
        {
            if (!namespace_uri) return local_name;
            if (this._element && this._element.isDefaultNamespace(namespace_uri)) return local_name;
            return "{" + namespace_uri + "}" + local_name;
        }
    }
}
