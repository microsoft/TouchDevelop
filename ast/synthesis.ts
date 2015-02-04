///<reference path='refs.ts'/>

//(s=(new TDev.Synth.Synthesizer.Synthesizer())).synthesizePrograms("set red background", TDev.TheEditor.currentAction(), 1)

module TDev.Synth {
    export function log(msg: any) {
        if (console.log) console.log(msg);
    }

    export module Settings {
        //general
        export var MaxQueryLength: number = 20;
        export var MaxCoveredWordsCount: number = 4;
        export var INF: number = 1000000000;

        //property matching
        export var CloudMappingFactor: number = 300;
        export var OverlapMappingFactor: number = 2;
        export var CompleteNameMatch: number = 5;
        export var NameMappingScoreThreshold: number = 0.35;
        export var DescMappingScoreThreshold: number = 0.15;
        export var PunctuationSeperatorScore: number = 2;
        export var LocalVarMatchDefaultScore: number = 0.1;
        export var MaxMappingCount: number = 50;
        export var OverlapLengthThreshold: number = 0.6;
        export var LongPathPenaltyFactor: number = 2;
        export var SearchForReplacementMappingThreshold: number = 0.99;
        export var NameWeightInProperty: number = 4;
        export var RandomInstanceOfCollectionGuessScore: number = 0;    //should not ne used

        //program synthesis
        export var MatchingToSynthesisNormalizationFactor: number = 1;
        export var MaxProgramGenerationPerMapping : number= 3;
        export var MaxSynthesisIterationCount: number = 100; //1000
        export var SynthesisCostUpperBound: number = INF;
        export var WordBiteMappingFactor: number = 0.2;
        export var NonTerminalExpansionCost: number = 1;
        export var MatchedFreeVarCost: number = -5;
        export var MatchedFreeCompCost: number = -4;
        export var MatchedReservedCompCost: number = -1;
        export var MatchedDefaultValueCost: number = 2;
        export var MatchedFreeCollOfVarCost: number = 1;
        export var CostPerUnusedReturnValue: number = 2;
        export var RandomInstanceOfCollectionGuessCost: number = 1;

    }

    export module Utils {
        export interface keyValuePair<T1, T2> {
            key: T1;
            value: T2;
        }

        export function containsInList<T>(list: T[], elem: T): boolean {
            return list.some(l => {
                return l == elem;
            });
        }

        export function contains(s: string, substring: string): boolean {
            if (s.indexOf(substring) > -1) return true;
            return false;
        }

        export function matches(s1: string, s2: string): boolean {
            return (s1.toLowerCase() == s2.toLowerCase());
        }

        export function distinctStrings(s: string[]): string[] {
            return distinctAndOverwrite<string>(s, (s1, s2) => {
                return s1 == s2;
            }, (s1, s2) => {
                return true;
                });
        }

        export function distinctAndOverwrite<T>(s: T[], compareFn: (s1: T, s2: T) => boolean, overwrite: (With: T, What: T) => boolean): T[] {
            s = s.sort();
            if (s.length == 0) return [];
            var uniq: T[] = [s[0]];
            for (var i = 1; i < s.length; i++) {
                if (compareFn(s[i], s[i - 1])) {
                    if(overwrite(s[i - 1], s[i])) uniq.pop();
                    else continue;
                }
                uniq.push(s[i]);
            }
            return uniq;
        }

        export function listPropertyRetTypes() : string[]{
            var kinds : string[] = [];
            api.getKinds().forEach(kind => {
                if (kind.isData) return;
                kind.listProperties().forEach(prop => {
                    kinds.push(prop.getResult().getKind().getName());
                })
            });
            return Utils.distinctStrings(kinds);
            /*      ["Action","Appointment", "Appointment Collection", "Bluetooth Device", "Board", "Boolean", "Buffer", "Camera", "Cloud Picture", "Cloud Session", "Collection of Action", "Collection of Bluetooth Device", "Collection of DateTime", "Collection of Gamepad", "Collection of Number", "Collection of Picture", "Collection of Sound", "Collection of User", "Color", "Contact", "Contact Collection", "DateTime", "Device", "Device Collection", "Event Binding", "Form Builder", "Gamepad", "Json Builder", "Json Object", "Link", "Link Collection", "Location", "Location Collection", "Map", "Matrix", "Media Link", "Media Link Collection", "Media Player", "Media Player Collection", "Media Server", "Media Server Collection", "Message", "Message Collection", "Motion", "Nothing", "Number", "Number Collection", "Number Map", "OAuth Response", "Page", "Page Button", "Page Collection", "Picture", "Picture Album", "Picture Albums", "Pictures", "Place", "Place Collection", "Playlist", "Playlists", "Printer", "Printer Collection", "Song", "Song Album", "Song Albums", "Songs", "Sound", "Sprite", "Sprite Set", "String", "String Collection", "String Map", "TextBox", "Tile", "Timer", "Unfinished Type", "User", "Vector3", "Web Event Source", "Web Request", "Web Response", "Xml Object"]     */
        }

        export function listSingletonProperties(): IProperty[]{
            var props: IProperty[] = [];
            listSingletons().forEach(kind => {
                kind.listProperties().forEach(p => {
                    if (!p) return;
                    props.push(p);
                });
            });
            return props;
        }

        export function listSingletons(): TDev.Kind[]{
            var sings: TDev.Kind[] = [];
            TDev.api.getKinds().forEach(kind => {
                if (kind.getName() == "♻") return;      //ignore libraries
                if (kind.isData) return;                //ignore non-singletons
                sings.push(kind);
            });
            return sings;
        }

        export function isSingleton(p: IProperty): boolean {
            return (p.parentKind==undefined || !(p.parentKind.isData==true));
        }

        export function localDefToGlobalDef(l: AST.LocalDef): AST.GlobalDef {
            var v: AST.GlobalDef = new AST.GlobalDef();
            v.setStableName(l.getStableName());
            v.setName(l.getName());
            v.setKind(l.getKind());
            return v;
        }
        export function addToSet<T>(s: T[], e: T, comp: (e1: T,e2: T) => boolean): void {
            if (!(s.some(u => {
                return comp(e, u);
            }))) s.push(e);
        }

        export function isCollectionOf(parent: Kind, child: Kind): boolean {
            var res: boolean = false;
            parent.listProperties().forEach(p => {
                if (p.getName() === "random") {
                    res = (p.getResult().getKind() == child);
                }
            });
            return res;
        }

        export function isLibraryAction(p: IProperty): boolean {
            return (<any>p)._lib != undefined;
        }

        export function isLocalAction(p: IProperty): boolean {
            return (<any>p).allLocals!=undefined;
        }
    }

    export module SynthModel {

        export var tags: ITag[] = [];
        export var includedLibraries: AST.LibraryRef[] = [];
        export var includedActions: AST.Action[] = [];
        export var includedGlobals: AST.GlobalDef[] = [];

        export interface ITag {
            property: IProperty;
            action: AST.Action;
            nameTags: string[];
            descTags: string[];
            thingTags: string[];
        }

            export function initTags(justUpdate: boolean) {
                if (!justUpdate) {
                    Utils.listSingletons().forEach(kind => {
                    if (kind.getName() == "data" || kind.getName() == "art" || kind.getName() == "action") {
                        // deal with it later
                    }
                    else {
                        addThingProperties(kind, undefined);
                    }

                });
                }
            TDev.Script.things.forEach(thing => {
                switch (thing.nodeType()) {
                    case "globalDef":
                        if (justUpdate && includedGlobals.some(g => {
                            return g === <TDev.AST.GlobalDef>thing;
                        })) break;
                        addThingProperties((<TDev.AST.GlobalDef>thing).getKind(), undefined, thing);
                        addDef(thing, undefined);
                        log("added global");
                        break;
                    case "action":
                        //TODO justUpdate
                        addAction((<TDev.AST.Action>thing));
                        addPropertyTags((<TDev.AST.Action>thing), undefined, (<TDev.AST.Action>thing).getResult().getKind());
                        if (1) {        //for all actions
                            (<TDev.AST.Action>thing).allLocals.forEach(local => {
                                var gDef: AST.GlobalDef = Utils.localDefToGlobalDef(local);
                                addThingProperties(gDef.getKind(), (<TDev.AST.Action>thing), gDef);
                                addDef(gDef, (<TDev.AST.Action>thing));
                                log("added local");
                            });
                        }
                        addDef(thing, (<TDev.AST.Action>thing));
                        break;
                    case "libraryRef":
                        if (justUpdate && includedLibraries.some(g => {
                            return g === <TDev.AST.LibraryRef>thing;
                        })) break;
                        addLib(<TDev.AST.LibraryRef>thing);
                        (<TDev.AST.LibraryRef>thing).getPublicActions().forEach(action => {
                            addPropertyTags(action, undefined, action.getResult().getKind());
                            addDef(action, undefined);
                        });
                        //should not add library as independent reference. So, no addDef(lib)
                        break;
                    default:
                        log("unknown thing type for now");
                        Contract.Requires(false);
                }
            });

        }

        export function addLib(lib: AST.LibraryRef): void {
            includedLibraries.push(lib);
        }

        export function addAction(ac: AST.Action): void {
            includedActions.push(ac);
        }

        export function addDef(thing: TDev.AST.Decl, action: AST.Action): void {
            addTags(<TDev.AST.Action>thing, NLP.Stemmer.stemSentence(thing.getName()), NLP.Stemmer.stemSentence(thing.getDescription()), [], action);
        }

        export function addTags(p: IProperty, nameTags: string[], descTags: string[], thingTags: string[], action: AST.Action): void {
            //TODO
            Utils.addToSet<SynthModel.ITag>(tags, { property: p, nameTags: [], descTags: [], thingTags: [], action: action }, (e1, e2) => {
                return e1.property == e2.property;
            });
            var tag: SynthModel.ITag = tags.filter(t => {
                return t.property == p;
            })[0];
            nameTags.forEach(nt => {
                Utils.addToSet<string>(tag.nameTags, nt, (e1, e2) => {
                    return e1 == e2;
                })
                    });
            descTags.forEach(dt => {
                Utils.addToSet<string>(tag.descTags, dt, (e1, e2) => {
                    return e1 == e2;
                });
            });
            thingTags.forEach(tt => {
                Utils.addToSet<string>(tag.thingTags, tt, (e1, e2) => {
                    return e1 == e2;
                });
            });
        }

        export function addPropertyTags(p: IProperty, action: AST.Action, kind: TDev.Kind, thing: TDev.AST.Decl= undefined): void {
            var nameTags: string[] = NLP.Stemmer.stemSentence(p.getName()).concat(NLP.Stemmer.stemSentence(kind.getName()));
            var descTags: string[] = NLP.Stemmer.stemSentence(p.getDescription()).concat(NLP.Stemmer.stemSentence(kind.getDescription()));
            if (thing != undefined) {
                nameTags.pushRange(NLP.Stemmer.stemSentence(thing.getName()));
                descTags.pushRange(NLP.Stemmer.stemSentence(thing.getDescription()));
            }
            addTags(p, nameTags, descTags, [], action);
        }

        export function addThingProperties(kind: TDev.Kind, action: AST.Action, thing: TDev.AST.Decl = undefined): void {
                kind.listProperties().forEach(p => {
                addPropertyTags(p, action, kind, thing);
            });
            }

        export function unigramScore(property: IProperty): number {
            if ((<any>property).nodeType && (<any>property).nodeType() == "localDef") return Settings.LocalVarMatchDefaultScore;
            var totalUsageCount = 0;
            Utils.listSingletonProperties().forEach(p => {
                totalUsageCount = totalUsageCount + p.getUsage().count();
            });
            return property.getUsage().count() / totalUsageCount;
        }

        export function searchDefaultInLib(kind: Kind): IProperty {
            var p: IProperty = undefined;
            includedLibraries.forEach(lib => {
                lib.getPublicActions().forEach(action => {
                    if (action.getResult().getKind()===kind && action.getParameters().length == 1) p = action;
                });
            });
            return p;
        }

    }

    export module Graph {
        enum PropertyType {
            GlobalVar,
            LocalVar,
            Action,
            Default,
        }
        export interface MappingScore {
            component: IProperty;
            score: number;
            //definedOn?: TDev.AST.Decl;
        }

        export interface Edge {
            node: Node;
            mapping: MappingScore[];
        }

        export class Node {
            neighbours: Edge[];
            name: string;
            index: number;
            constructor(s: string, index: number) {
                this.neighbours = [];
                this.name = s;
                this.index = index;
            }
        }

        export class Graph {
            nodes: Node[];
            subgraphs: Node[][];
            tags: SynthModel.ITag[];

            constructor() {
                this.nodes = [];
                this.subgraphs = [];
                this.tags = [];
            }


            public addCurves(words: string[]) {
                for (var i = 0; i < this.nodes.length; i++) {
                    for (var j = 2; j <= Settings.MaxCoveredWordsCount && (i+j)<this.nodes.length; j++) {
                        var u: Node = this.nodes[i];
                        var v: Node = this.nodes[i + j];
                        log(u.name + " " + v.name + " -> " + words.slice(i, i+j));
                        log(this.mergeMapping(words.slice(i, i+j)));
                        u.neighbours.push({ node: v, mapping: this.mergeMapping(words.slice(i, i + j)) });
                        log(this);
                        //The slice() method selects the elements starting at the given start argument, and ends at, but does not include, the given end argument.
                    }
                }/*
                for (var len: number = 2; len <= Settings.MaxCoveredWordsCount; len++) {
                    for (var offset: number = 0; offset < len; offset++) {
                        for (var index: number = offset; (index + len) < this.nodes.length; index = index + len) {
                            var u: Node = this.nodes[index];
                            var v: Node = this.nodes[index + len];
                            u.neighbours.push({ node: v, mapping: this.mergeMapping(words.slice(index, index + len - 1)) });
                        }
                    }
                }*/
            }

            public removeDuplicateMappings() {
                this.nodes.forEach(u => {
                    u.neighbours.forEach(v => {
                        v.mapping = Utils.distinctAndOverwrite<MappingScore>(v.mapping,
                            (m1, m2) => {
                                return m1.component == m2.component;
                            },
                            (m1, m2) => {
                                return m1.score > m2.score;
                            }
                            );
                    });
                });
            }

            public removeLongCurvesWithLessScore() {
                //TODO
            }

            public removeEmptyEdges() {
                this.nodes.forEach(u=> {
                    u.neighbours = u.neighbours.filter(v => {
                        return v.mapping.length > 0;
                    });
                });
            }

            initMapping(currentAction: AST.Action): void {
                SynthModel.initTags(true);
                this.tags = SynthModel.tags.filter(tag => {
                    return tag.action == undefined || tag.action == currentAction;
                });
            }

            public buildSubgraphs() {
                var visited: Node[] = [];
                this.nodes.forEach(u=> {
                    if (Utils.containsInList<Node>(visited, u)) return;

                    var subgraph: Node[] = [];
                    var queue: Node[] = [u];
                    while (queue.length) {
                        var v: Node = queue.shift();
                        subgraph.push(v);
                        v.neighbours.forEach(w=> {
                            if (Utils.containsInList<Node>(visited, w.node)) return;
                            visited.push(w.node);
                            queue.push(w.node);
                        });
                    }
                    subgraph.sort((u, v) => {
                        return u.index - v.index;
                    });
                    this.subgraphs.push(subgraph);
                });
            }

            getMappingBetweenNodes(u: Node, v: Node): MappingScore[] {
                if (u.neighbours.some(w => {
                    return w.node == v;
                })) return Utils.distinctAndOverwrite<MappingScore>(u.neighbours.filter(w => {
                        return w.node == v;
                    })[0].mapping.filter(m => {
                            return m != undefined && m.component != undefined;
                        }), (m1, m2) => {
                            return m1.component == m2.component;
                        }, (m1, m2) => {
                            return m1.score < m2.score;
                        });
                else return [];
            }
            getBestMappingBetweenNodes(u: Node, v: Node): MappingScore[] {
                //return getMappingBetweenNodes(u, v).filter(m1 => {
                //    return( ! getMappingBetweenNodes(u, v).some(m2 => { return(m2.score > m1.score) }));
                //})[0];
                var bestScore: number = (() => {
                    var m: MappingScore[] = this.getMappingBetweenNodes(u, v).sort((m1, m2) => {
                        return m2.score - m1.score;
                    });
                    if (m.length) return m[0].score;
                    return 0;
                })();
                return this.getMappingBetweenNodes(u, v).filter(m => {
                    return m.score > bestScore * Settings.SearchForReplacementMappingThreshold;
                }).sort((m1, m2) => {
                        return m2.score - m1.score;
                    });
            }
            public mergeMapping(words: string[]): MappingScore[] {
                var mapping: MappingScore[] = this.tags.map(tag => {
                    return ({ component: tag.property, score: NLP.adjustedTermsFrequency(tag, words) });
                }).filter(m => {
                        return m.score > 0;
                    }).sort((a, b) => {
                        return b.score - a.score;
                    });
                return mapping;
            }

            public matchingInTags(where: string, word: string): MappingScore[] {
                if (NLP.findType(word) == "Punctuation") {
                    return [{ component: TDev.api.getKinds().filter(k => { return k.getName() == "Nothing"; })[0].listProperties()[0], score: Settings.PunctuationSeperatorScore }];
                    //will convert to return [] at the end
                }
                var mapping: MappingScore[] = [];
                switch (where) {
                    case "nameTags":
                        mapping=this.tags.filter(t => {
                            return t.nameTags.some(nt => {
                                return Utils.matches(nt, word);
                            });
                        }).map(t => {
                            return { component: t.property, score: NLP.adjustedTermFrequency(t.property, t, word) };
                            });
                        break;
                    case "descTags":
                        mapping=this.tags.filter(t => {
                            return t.descTags.some(dt => {
                                return Utils.matches(dt, word);
                            });
                        }).map(t => {
                            return { component: t.property, score: NLP.adjustedTermFrequency(t.property, t, word) };
                        });
                        break;
                    case "thingTags":
                        mapping=this.tags.filter(t => {
                            return t.thingTags.some(tt => {
                                return Utils.matches(tt, word);
                            });
                        }).map(t => {
                            return { component: t.property, score: NLP.adjustedTermFrequency(t.property, t, word) };
                        });
                        break;
                    default:
                        log("unrecognized field to search tags: "+where);
                        break;
                }
                return mapping;
            }
        }

        export function likelyReturnTypesInPropertyName(word: string): string[]{
            var likelyReturnTypes: string[] = [];
            Utils.listSingletonProperties().forEach(p => {
                if (p.parentKind.getName() == "data" || p.parentKind.getName() == "art") {
                    likelyReturnTypes.push(p.getResult().getKind().getName());
                }
                if (p.parentKind.getName() == "action") {
                    likelyReturnTypes.push(p.getResult().getKind().getName());
                }

            });
            return likelyReturnTypes;

        }
        export interface Path {
            path: Node[];
            cost: number;
        }

        export interface PathWithEnd extends Path {
            endNode: Node;
        }

        export function getBestTraces(subgraph: Node[]): Path[] {
            if (subgraph.length == 1) return [{ path: subgraph, cost: 0 }];

            var rootNode: Node = subgraph[0];
            var endNode: Node = subgraph[subgraph.length - 1];
            log(endNode);

            var traces: Path[] = [];
            var stack: PathWithEnd[] = [{ path: [rootNode], cost: 0, endNode: rootNode }];

            while (stack.length) {
                var task: PathWithEnd = stack.shift();

                if (task.endNode == endNode) {
                    task.cost = (task.cost - task.path.length * Settings.LongPathPenaltyFactor);       //penalty for long paths
                    task.cost = task.cost * Settings.MatchingToSynthesisNormalizationFactor;           //Cost of task is actually profit by that task
                    traces.push({path: task.path, cost: task.cost});
                }
                else {
                    var u: Node = task.endNode;
                    u.neighbours.forEach(v => {
                        var maxEdgeCost: number = v.mapping.map(m=> { return m.score; }).max();
                        stack.push({ path: task.path.slice(0).concat(v.node), cost: task.cost + maxEdgeCost, endNode: v.node });
                    });
                }
            }
            traces.sort((t1, t2) => {
                return t2.cost - t1.cost;
            });
            traces=Utils.distinctAndOverwrite<Path>(traces, (t1, t2) => {
                return t1.path.length == t2.path.length && t1.path.filter(n => {
                    return t2.path.some(m=> {
                        return m == n;
                    });
                }).length==t1.path.length;
            }, (With, What) => {
                return With.cost<What.cost;
                });
            log(traces);
            return traces;
        }

        export function joinSubtraces(graph: Graph, allSubtraces: Path[][]): Path[] {
            var traces: Path[] = [];
            var normalizingCostFactor: number = (graph.nodes.length - 1) *(Settings.MaxCoveredWordsCount+1) / (Settings.MaxCoveredWordsCount);


            allSubtraces.forEach(subtraces=> {
                if (traces.length) {
                    var newTraces: Path[] =[];
                    subtraces.forEach(subtrace => {
                        traces.forEach(oldTrace => {
                            newTraces.push({ path: oldTrace.path.concat(subtrace.path), cost: oldTrace.cost + (subtrace.cost / normalizingCostFactor) });
                        });
                    });
                    traces.pushRange(newTraces);
                }
                else {
                    traces = subtraces;
                }
            });
            return traces;
        }

        export function getBestMapping(words: string[], currentAction: TDev.AST.Action):NLP.MappedPropertiesToComponents[] {
            var graph: Graph = new Graph();
            var likelyReturnTypes: string[] = [];
            var prevNode: Node = new Node("", 0);
            graph.nodes.push(prevNode);

            graph.initMapping(currentAction);

            words.forEach(word => {
                var type: string = NLP.findType(word);
                var mappings: MappingScore[] = [];

                if (type == "TDToken" || type == "MathOperator" || type == "CompOperator") {
                    //TODO
                    //mappings.push({ component: word, score: 2.0 });
                    if (NLP.findType(word) != "Undefined") likelyReturnTypes.push(NLP.findType(word));
                }


                //in name tags
                mappings = mappings.concat(graph.matchingInTags("nameTags", word));

                //in desc tags
                mappings = mappings.concat(graph.matchingInTags("descTags", word));

                //////
                var newNode: Node = new Node(word, prevNode.index+1);
                graph.nodes.push(newNode);
                if(mappings.length && mappings[0].component) prevNode.neighbours.push({ node: newNode, mapping: mappings });
                prevNode = newNode;
            });

            graph.addCurves(words);
            graph.removeDuplicateMappings();
            graph.removeLongCurvesWithLessScore();
            graph.removeEmptyEdges();

            //TODO // use the likely return types to slightly favours apis that use these types

            graph.buildSubgraphs();

            var subtraces: Path[][] = [];
            graph.subgraphs.forEach(subgraph => {
                subtraces.push(getBestTraces(subgraph));
            });
            var traces: Path[] = joinSubtraces(graph, subtraces);
            traces=traces.sort((t1, t2) => {
                return t2.cost - t1.cost;
            }).slice(0, Settings.MaxMappingCount);

            /*
            var mapping: NLP.MappedPropertiesToComponents[] = [];
            traces.forEach(trace => {
                var lastNode: Node = undefined;
                var localMappings: MappingScore[][] = [];

                trace.path.forEach(u => {
                    if (lastNode == undefined) {
                        lastNode = u;
                    }
                    else {
                        var maps: MappingScore[] = [graph.getBestMappingBetweenNodes(lastNode, u)[0]];
                        if (localMappings.length == 0) {
                            maps.forEach(map => {
                                if(map.component!=undefined) localMappings.push([map]);
                            });
                        }
                        else {
                            var orgs = localMappings.slice(0);
                            localMappings = [];
                            maps.forEach(map => {
                                if (map!=undefined && map.component != undefined) orgs.forEach(org => {
                                    localMappings.push(org.concat(map));
                                });
                            });
                            //localMappings=localMappings.filter(m => {
                            //    return m.length == (orgs[0].length + 1);
                            //});
                        }
                    }
                });
                localMappings.forEach(localMapping => {
                     if(localMapping.length) mapping.push({cost: trace.cost, mapping: localMapping});
                });
            });
            */

            var mapping:NLP.MappedPropertiesToComponents[] = traces.map(trace => {
                var lastNode: Node = undefined;

                return {
                    cost: trace.cost,
                    mapping: trace.path.map(u => {
                        if (!lastNode) {
                            lastNode = u;
                        }
                        else {
                            var mapping: MappingScore = graph.getBestMappingBetweenNodes(lastNode, u)[0];
                            lastNode = u;
                            return mapping;
                        }
                    }).filter(mapping => {
                            return mapping!=undefined && mapping.component!=undefined;
                        })
                };
            }).filter(m => {
                return m.mapping.length > 0;
                });

            log("traces:");
            log(traces);
            log("mapping:");
            log(mapping);
            log("graph:");
            log(graph);

            return mapping;
        }

    }


    export module NLP {

        var stopWords: string[] = [
            "a", "able", "about", "across", "after", "all", "almost", "also",
            "among", "an", "and", "any", "are", "as", "be", "because", //"at",
            "been", "but", "by", "can", "cannot", "could", "dear", "did", "do",
            "does", "either", //"else",
            "ever", "from", "had", "has", //"for",
            "have", "he", "her", "hers", "him", "his", "how", "however", //"i",
            "into", "is", //"it", "its",
            "just", "least", "let", "like", "likely",
            "may", "me", "might", "most", "must", "my", "neither", "no", "nor",
            "of", "often", "only", "or", "other", "our", "own", "rather", //"not"
            "she", "should", "since", "so", "some", "than", "that", "the", "their",
            "them", "then", "there", "these", "they", "this", "tis", "to", "too",
            "twas", "us", "wants", "was", "we", "were", "what", "where", "which",
            "who", "whom", "why", "will", "with", "would", "yet", //"while",
            "you", "your"];

        var synonyms: Synonym[] = [
            { from: "what", to: "gets" },
            { from: "+", to: "adds" },
            { from: "-", to: "subtracts" },
            { from: "*", to: "multiplies" },
            { from: "/", to: "divides" },
            { from: "complete", to: "finish" },
            { from: "submit", to: "complete" },
        ];

        var tdTokens = ["if", "while", "for", "foreach", "index"];
        var compOperators = [" > ", " < ", " >= ", " <= ", " = ", " != "];
        var mathOperators = ["+", "-", "*", "/"];
        var punctuation: string[] = [",", ".", "?"];

        export interface MappedPropertiesToComponents {
            cost: number;
            mapping: Graph.MappingScore[];
        }
        export interface Synonym {
            from: string;
            to: string;
        }

        export function findType(word: string): string {
            if (word.length == 0) return "Undefined";
            if (/^-{0,1}\d*\.{0,1}\d+$/.test(word)) return "Number";
            if (/\?|\.|\,|;/.test(word)) return "Punctuation";
            word = word.toLowerCase();
            if (word == "true" || word == "false") return "Boolean";
            if (stopWords.some(v => {
                return v == word;
            })) return "StopWord";
            if (tdTokens.some(v=> {
                return v == word;
            })) return "TDToken";
            if (mathOperators.some(v=> {
                return v == word;
            })) return "MathOperator";
            if (compOperators.some(v=> {
                return v == word;
            })) return "CompOperator";
            if (/^\w+$/.test(word)) return "String";
            return "Undefined";
        }

        export function adjustedTermFrequency(property: IProperty, tag: SynthModel.ITag, singleWord: string): number {
            if (findType(singleWord) == "Punctuation") return 0;
            var cloudScore: number = SynthModel.unigramScore(property) * Settings.CloudMappingFactor;
            //TODO check if its not a api (i,e, its a var)
            if (tag.nameTags.length == 1 && tag.nameTags[0] == singleWord) return Settings.CompleteNameMatch + cloudScore;
            if (tag.nameTags.indexOf(singleWord) > -1) return Settings.NameMappingScoreThreshold + cloudScore;
            if (tag.descTags.indexOf(singleWord) > -1) return Settings.DescMappingScoreThreshold + cloudScore;
            return cloudScore;
        }

        export function adjustedTermsFrequency(tag: SynthModel.ITag, words: string[]): number {
            if (words.some(word => {
                return findType(word) == "Punctuation";
            })) return 0;
            var distinctWords: string[] = Utils.distinctStrings(words);
            var propertyWords: string[] = tag.nameTags.concat(tag.descTags.concat(tag.thingTags));

            var punishmentForRepitition: number = distinctWords.length;
            var overlapWithName: number = (distinctWords.filter(dw => {
                return tag.nameTags.some(pw => {
                    return pw == dw;
                });
            }).length) / distinctWords.length;
            var overlapWithDesc: number = (distinctWords.filter(dw => {
                return tag.descTags.some(pw => {
                    return pw == dw;
                });
            }).length) / distinctWords.length;
            //TODO overlap with thing

            var overlapWithProperty: number = ((Settings.NameWeightInProperty * overlapWithName) + overlapWithDesc) / (Settings.NameWeightInProperty + 1);
            var propertyScore: number = SynthModel.unigramScore(tag.property) * Settings.CloudMappingFactor;
            if (overlapWithProperty < Settings.OverlapLengthThreshold) return 0;
            return punishmentForRepitition + overlapWithProperty * distinctWords.length * Settings.OverlapMappingFactor + distinctWords.length*distinctWords.length*Settings.WordBiteMappingFactor+ propertyScore;
        }

        export function mapKeywordsToComponents(search: Synthesizer.searchString, currentAction: TDev.AST.Action): MappedPropertiesToComponents[] {
            var words: string[] = Stemmer.stemSentence(search.s);
            log(words);
            return Graph.getBestMapping(words.slice(0, Settings.MaxQueryLength), currentAction);
        }

        export module Stemmer {
            export function stem(s: string): string {
                //return s.toLowerCase();
                // Porter stemmer in Javascript. Few comments, but it's easy to follow against the rules in the original
                // paper, in
                //
                //  Porter, 1980, An algorithm for suffix stripping, Program, Vol. 14,
                //  no. 3, pp 130-137,
                //
                // see also http://www.tartarus.org/~martin/PorterStemmer

                // Release 1 be 'andargor', Jul 2004
                // Release 2 (substantially revised) by Christopher McKenzie, Aug 2009
                 var stemmer = (function () {
                                var step2list = {
                                    "ational": "ate",
                                    "tional": "tion",
                                    "enci": "ence",
                                    "anci": "ance",
                                    "izer": "ize",
                                    "bli": "ble",
                                    "alli": "al",
                                    "entli": "ent",
                                    "eli": "e",
                                    "ousli": "ous",
                                    "ization": "ize",
                                    "ation": "ate",
                                    "ator": "ate",
                                    "alism": "al",
                                    "iveness": "ive",
                                    "fulness": "ful",
                                    "ousness": "ous",
                                    "aliti": "al",
                                    "iviti": "ive",
                                    "biliti": "ble",
                                    "logi": "log"
                                },

                                    step3list = {
                                        "icate": "ic",
                                        "ative": "",
                                        "alize": "al",
                                        "iciti": "ic",
                                        "ical": "ic",
                                        "ful": "",
                                        "ness": ""
                                    },

                                    c = "[^aeiou]",          // consonant
                                    v = "[aeiouy]",          // vowel
                                    C = c + "[^aeiouy]*",    // consonant sequence
                                    V = v + "[aeiou]*",      // vowel sequence

                                    mgr0 = "^(" + C + ")?" + V + C,               // [C]VC... is m>0
                                    meq1 = "^(" + C + ")?" + V + C + "(" + V + ")?$",  // [C]VC[V] is m=1
                                    mgr1 = "^(" + C + ")?" + V + C + V + C,       // [C]VCVC... is m>1
                                    s_v = "^(" + C + ")?" + v;                   // vowel in stem

	            return function (w: string) {
                                    var stem,
                                        suffix,
                                        firstch,
                                        re,
                                        re2,
                                        re3,
                                        re4,
                                        origword = w;

                                    if (w.length < 3) { return w; }

                                    firstch = w.substr(0, 1);
                                    if (firstch == "y") {
                                        w = firstch.toUpperCase() + w.substr(1);
                                    }

                                    // Step 1a
                                    re = /^(.+?)(ss|i)es$/;
                                    re2 = /^(.+?)([^s])s$/;

                                    if (re.test(w)) { w = w.replace(re, "$1$2"); }
                                    else if (re2.test(w)) { w = w.replace(re2, "$1$2"); }

                                    // Step 1b
                                    re = /^(.+?)eed$/;
                                    re2 = /^(.+?)(ed|ing)$/;
                                    if (re.test(w)) {
                                        var fp = re.exec(w);
                                        re = new RegExp(mgr0);
                                        if (re.test(fp[1])) {
                                            re = /.$/;
                                            w = w.replace(re, "");
                                        }
                                    } else if (re2.test(w)) {
                                        var fp = re2.exec(w);
                                        stem = fp[1];
                                        re2 = new RegExp(s_v);
                                        if (re2.test(stem)) {
                                            w = stem;
                                            re2 = /(at|bl|iz)$/;
                                            re3 = new RegExp("([^aeiouylsz])\\1$");
                                            re4 = new RegExp("^" + C + v + "[^aeiouwxy]$");
                                            if (re2.test(w)) { w = w + "e"; }
                                            else if (re3.test(w)) { re = /.$/; w = w.replace(re, ""); }
                                            else if (re4.test(w)) { w = w + "e"; }
                                        }
                                    }

                                    // Step 1c
                                    re = /^(.+?)y$/;
                                    if (re.test(w)) {
                                        var fp = re.exec(w);
                                        stem = fp[1];
                                        re = new RegExp(s_v);
                                        if (re.test(stem)) { w = stem + "i"; }
                                    }

                                    // Step 2
                                    re = /^(.+?)(ational|tional|enci|anci|izer|bli|alli|entli|eli|ousli|ization|ation|ator|alism|iveness|fulness|ousness|aliti|iviti|biliti|logi)$/;
                                    if (re.test(w)) {
                                        var fp = re.exec(w);
                                        stem = fp[1];
                                        suffix = fp[2];
                                        re = new RegExp(mgr0);
                                        if (re.test(stem)) {
                                            w = stem + step2list[suffix];
                                        }
                                    }

                                    // Step 3
                                    re = /^(.+?)(icate|ative|alize|iciti|ical|ful|ness)$/;
                                    if (re.test(w)) {
                                        var fp = re.exec(w);
                                        stem = fp[1];
                                        suffix = fp[2];
                                        re = new RegExp(mgr0);
                                        if (re.test(stem)) {
                                            w = stem + step3list[suffix];
                                        }
                                    }

                                    // Step 4
                                    re = /^(.+?)(al|ance|ence|er|ic|able|ible|ant|ement|ment|ent|ou|ism|ate|iti|ous|ive|ize)$/;
                                    re2 = /^(.+?)(s|t)(ion)$/;
                                    if (re.test(w)) {
                                        var fp = re.exec(w);
                                        stem = fp[1];
                                        re = new RegExp(mgr1);
                                        if (re.test(stem)) {
                                            w = stem;
                                        }
                                    } else if (re2.test(w)) {
                                        var fp = re2.exec(w);
                                        stem = fp[1] + fp[2];
                                        re2 = new RegExp(mgr1);
                                        if (re2.test(stem)) {
                                            w = stem;
                                        }
                                    }

                                    // Step 5
                                    re = /^(.+?)e$/;
                                    if (re.test(w)) {
                                        var fp = re.exec(w);
                                        stem = fp[1];
                                        re = new RegExp(mgr1);
                                        re2 = new RegExp(meq1);
                                        re3 = new RegExp("^" + C + v + "[^aeiouwxy]$");
                                        if (re.test(stem) || (re2.test(stem) && !(re3.test(stem)))) {
                                            w = stem;
                                        }
                                    }

                                    re = /ll$/;
                                    re2 = new RegExp(mgr1);
                                    if (re.test(w) && re2.test(w)) {
                                        re = /.$/;
                                        w = w.replace(re, "");
                                    }

                                    // and turn initial Y back to y

                                    if (firstch == "y") {
                                        w = firstch.toLowerCase() + w.substr(1);
                                    }

                                    return w;
                                }
            })();
                return stemmer(s.toLowerCase());
            }

            export function stemSentence(s: string): string[] {
                var words: string[] = [];
                var escapedQuery: string = "";
                for (var i = 0; i < s.length; i++) {
                    if (findType(s.charAt(i).toString()) == "Punctuation")  escapedQuery = escapedQuery.concat(" " + s.charAt(i).toString() + " ");
                    else    escapedQuery = escapedQuery.concat(s.charAt(i).toString());
                }
                words = escapedQuery.split(" ").filter(v => {
                    return findType(v) != "StopWord" && findType(v) != "Undefined";
                }).map(v => {
                    return findSynonym(stem(v));
                }).filter(v => {
                        return (findType(v) != "Undefined" && findType(v) != "StopWord");
                    });
                //log(words);
                return words;
            }

            export function findSynonym(word: string): string {
                var w: Synonym[] = synonyms.filter(s=> {
                    return s.from == word;
                });
                if (w.length == 0) return word;
                return findSynonym(w[0].to);
            }
        }

    }

    export module Parser {
        export interface RHS {
            list: CFG.Symbol[];
        }
        export interface Rule {
            lhs: CFG.Symbol;
            rhsList: RHS[];

        }

        export class Parser {
            topNonTermial: CFG.NonTerminal;
            rulesList: Rule[];
            symbolList: CFG.Symbol[];
            constructor(topNonterminalName: string, rules: string[]) {
                this.rulesList = [];
                this.symbolList = [];
                this.topNonTermial = new CFG.NonTerminal(topNonterminalName, undefined);
                this.insertSymbol(this.topNonTermial);
                this.parseRules(rules);
                log("parser created");
                log(this);
            }
            insertSymbol(newSymbol: CFG.Symbol): CFG.Symbol {
                var symbols: CFG.Symbol[] = this.symbolList.filter(s => {
                    return s.name == newSymbol.name;
                });
                if (symbols.length) return symbols[0];
                else {
                    this.symbolList.push(newSymbol);
                    this.rulesList.push({ lhs: newSymbol, rhsList: [] });
                    return newSymbol;
                }

            }
            addRule(lhs: CFG.Symbol, rhs: CFG.Symbol[]) {
                lhs = this.insertSymbol(lhs);
                this.rulesList.filter(rule => {
                    return rule.lhs == lhs;
                })[0].rhsList.push({ list: rhs });
            }
            parseRules(rules: string[]) {
                //Rules of the form [ "A -> B C D", "A ->"]
                //First letter capitalized means NonTerminal else it is terminal
                //No trailing spaces
                //Parent of symbol only in the case of parsing of abstract program
                rules.forEach(rule => {
                    var lhs: CFG.NonTerminal = new CFG.NonTerminal(rule.split(" ")[0], undefined);
                    var rhs: CFG.Symbol[] = [];
                    rule.split(" ").slice(2).forEach(symbolName => {
                        if (symbolName.charAt(0) == symbolName.charAt(0).toUpperCase()) rhs.push(new CFG.NonTerminal(symbolName, undefined));
                        else rhs.push(new CFG.Terminal(symbolName, undefined));
                    });
                    this.addRule(lhs, rhs);
                });
            }
            getRhsList(symbol: CFG.NonTerminal): RHS[] {
                return this.rulesList.filter(rules => {
                    return rules.lhs.name == symbol.name;
                })[0].rhsList.map(rhs => {
                    return {
                        list: rhs.list.map(child => {
                            return child.clone(symbol);
                        })
                    };
                    });
            }
        }
        export var grammar: string[] = [
            "Start -> Program",
            "Program -> Statement",
            "Program -> Statement Program",
            "Statement -> CallAction",
            "CallAction -> action",
        ];

        export var parser: Parser;
    }


    export module CFG {

        export class Symbol {
            isConcrete: boolean;
            concretizedValue: IProperty;
            name: string;
            expectedValue: string;
            returnType: TDev.Kind;
            defaultValue: string;
            type: string;
            parent: Symbol;

            constructor(name: string, parent: Symbol) {
                this.name = name;
                this.defaultValue = undefined;
                this.expectedValue = name;
                this.isConcrete = false;
                this.type = "Symbol";
                this.parent = parent;
            }
            clone(parent: Symbol): Symbol{
                var sym = (new Symbol(this.name, parent));
                sym.isConcrete = this.isConcrete;
                sym.returnType = this.returnType;
                return sym;
            }
            unroll(rootProgram: Synthesizer.AbstractProgram): Synthesizer.AbstractProgram[] {
                switch (this.type) {
                    case "Terminal":
                        return (<Terminal>this).unroll(rootProgram);
                        break;
                    case "NonTerminal":
                        return (<NonTerminal>this).unroll(rootProgram);
                        break;
                    default:
                        Contract.Requires(false);
                }
            }
        }
        export class Terminal extends Symbol {
            getsValueFromTerminal: Terminal;
            isArgumentOf: Terminal;
            usedInGenAST: boolean = false;
            token: AST.Token = undefined;
            tokens: AST.Token[] = [];
            constructor(name: string, parent: Symbol) {
                super(name,parent);
                this.type = "Terminal";
                this.getsValueFromTerminal = undefined;
                this.isArgumentOf = undefined;
            }
            clean(): void {
                this.token = undefined;
                this.tokens = [];
            }
            clone(parent: Symbol): Terminal {
                var sym = new Terminal(this.name, parent);
                sym.isConcrete = this.isConcrete;
                sym.getsValueFromTerminal = this.getsValueFromTerminal;
                sym.isArgumentOf = this.isArgumentOf;
                sym.returnType = this.returnType;
                return sym;
            }
            useInGenAST(token: AST.Token): void {
                this.token = token;
                this.usedInGenAST = true;
                log(this.tokens);
            }
            createActionTerminal(kind: TDev.Kind, propertyName: string): Terminal {
                var name: string = "action";
                var acTerm = new Terminal(name, undefined);
                acTerm.isConcrete = true;
                acTerm.concretizedValue = kind.listProperties().filter(p => {
                    return p.getName() == propertyName;
                })[0];
                return acTerm;
            }
            createPropertyTerminal(acTerm: Terminal, propertyName: string): Terminal {
                var pTerm = new Terminal(propertyName, undefined);
                pTerm.isConcrete = true;
                pTerm.returnType = acTerm.concretizedValue.getResult().getKind();
                pTerm.getsValueFromTerminal = acTerm;
                pTerm.concretizedValue = acTerm.concretizedValue;
                return pTerm;
            }
            getKind(name: string) : TDev.Kind{
                return TDev.api.getKinds().filter(k => {
                    return k.getName() == name;
                })[0];
            }
            makeDirectReference(p: IProperty): void {
                var pTerm: Terminal = new Terminal("directRef", undefined);
                pTerm.isConcrete = true;
                pTerm.returnType = p.getResult().getKind();
                pTerm.concretizedValue = p;
                pTerm.getsValueFromTerminal = undefined;

                this.getsValueFromTerminal = pTerm;
                this.isConcrete = true;
                this.concretizedValue = pTerm.concretizedValue;
                log("direct refernece set");
            }

            makeDefaultArgument(): Terminal[] {
                var acTerm: Terminal = undefined;
                var propTerm: Terminal = undefined;
                var dTerm: Terminal = undefined;
                switch (this.returnType.getName()) {
                    case "Color":
                        acTerm = this.createActionTerminal(this.getKind("Colors"), "random");
                        propTerm = this.createPropertyTerminal(acTerm, "transitiveReference");
                        break;
                    case "Number":
                        propTerm = new Terminal("declaration", undefined);
                        propTerm.isConcrete = true;
                        propTerm.returnType = this.returnType;
                        propTerm.defaultValue = "0";
                        break;
                    case "String":
                        propTerm = new Terminal("declaration", undefined);
                        propTerm.isConcrete = true;
                        propTerm.returnType = this.returnType;
                        propTerm.defaultValue = "";
                        break;
                    case "Boolean":
                        propTerm = new Terminal("declaration", undefined);
                        propTerm.isConcrete = true;
                        propTerm.returnType = this.returnType;
                        propTerm.defaultValue = "false";
                        break;
                    case "Json Object":
                        dTerm = new Terminal("declaration", undefined);
                        dTerm.isConcrete = true;
                        dTerm.returnType = this.getKind("String");
                        dTerm.defaultValue = "";
                        acTerm = this.createActionTerminal(this.getKind("String"), "to json");
                        propTerm = this.createPropertyTerminal(acTerm, "transitiveReference");
                        dTerm.isArgumentOf = acTerm;
                        break;
                    default:
                        var p: IProperty = SynthModel.searchDefaultInLib(this.returnType);
                        if (p != undefined) {
                            acTerm = this.createActionTerminal(p.parentKind, p.getName());
                            propTerm = this.createPropertyTerminal(acTerm, "transitiveReference");
                        }
                        else   log("default values of " + this.returnType.getName() + " type not listed");
                        break;
                }
                if (propTerm == undefined) {
                    log("no default values found");
                    this.isConcrete = false;
                    return [];
                }
                else {
                    this.getsValueFromTerminal = propTerm;
                    this.isConcrete = true;
                    this.concretizedValue = propTerm.concretizedValue;
                    log("default value set");
                if (dTerm == undefined) return [];
                    return [dTerm];
                }
            }

            reserveComponent(freeComp: Graph.MappingScore, term: Terminal, newProgram: Synthesizer.AbstractProgram, worklist: Synthesizer.AbstractProgram[]): void {
                //
            }

            unroll(rootProgram: Synthesizer.AbstractProgram): Synthesizer.AbstractProgram[] {
                //TODO: Give priority to unused components
                //TODO: unroll terminal
                var worklist: Synthesizer.AbstractProgram[] = [];
                this.isConcrete = true;
                switch (this.name) {
                    case "argument":
                        var newProgram: Synthesizer.AbstractProgram = rootProgram.clone();
                        var newThis: Terminal = this.clone(this.parent);
                        newProgram.symbols[rootProgram.symbols.indexOf(this)] = newThis;
                        //now dont use `this`. `this` refers to roots terminal, that should not be changed (other guys may use it)
                        var freeVars: CFG.Terminal[] = newProgram.freeVariables.filter(v => {
                            return newThis.returnType == v.returnType && newThis.isArgumentOf!=v.getsValueFromTerminal;
                        });
                        var freeComps: Graph.MappingScore[] = newProgram.unusedComponents.filter(c => {
                            return newThis.returnType == c.component.getResult().getKind() && (!newProgram.reservedComponents.some(rc => {
                                return rc.component == c.component;
                            }));
                        });
                        //free comp = unused as well as unreserved
                        var freeCollsofComp: Graph.MappingScore[] = newProgram.unusedComponents.filter(c => {
                            return Utils.isCollectionOf(c.component.getResult().getKind(), newThis.returnType) && (!newProgram.reservedComponents.some(rc => {
                                return rc.component == c.component;
                            }));
                        });
                        var freeCollsofVars: CFG.Terminal[] = newProgram.freeVariables.filter(v => {
                            return Utils.isCollectionOf(v.returnType, newThis.returnType);
                        });
                        //free colls = collections of wanted items

                        if (freeVars.length) {
                            //check in free vars
                            newThis.isConcrete = true;
                            newThis.concretizedValue = freeVars[0].concretizedValue;
                            newThis.getsValueFromTerminal = freeVars[0];
                            newProgram.freeVariables.splice(newProgram.freeVariables.indexOf(freeVars[0]), 1);
                            newProgram.addExpansionCost(Settings.MatchedFreeVarCost);
                            worklist.push(newProgram);
                        }
                        else if (freeComps.length) {
                            //check in unused comps
                            var freeComp: Graph.MappingScore = freeComps[0];
                            if (freeComp.component.getParameters().length == 1) {
                                newThis.makeDirectReference(freeComp.component);
                                if (newThis.isConcrete) {
                                    newProgram.useComponent(freeComp, newThis);
                                    newProgram.addExpansionCost(Settings.MatchedFreeCompCost);
                                    worklist.push(newProgram);
                                }
                                else {
                                    log("direct reference failed");
                                }
                            }
                            else {
                                newProgram.reservedComponents.push({ component: freeComp.component, score: freeComp.score, reservedBy: newThis });
                                //lost 1 day here. Be very careful of difference between `this` and `newThis`.
                                newThis.isConcrete = true;
                                newThis.concretizedValue = freeComp.component;
                                newThis.getsValueFromTerminal = undefined;
                                newProgram.addExpansionCost(Settings.MatchedReservedCompCost);      //another part added when reserved comp is found
                                worklist.push(newProgram);
                            }
                        }
                        else if (freeCollsofVars.length) {
                            var freeCollVar: Terminal= freeCollsofVars[0];
                            newThis.isConcrete = true;
                            var p: Terminal = new Terminal("action", undefined);
                            p.isConcrete = true;
                            p.concretizedValue = freeCollVar.returnType.listProperties().filter(p=> {
                                return p.getName() == "random";
                            })[0];
                            freeCollVar.isArgumentOf = p;
                            newProgram.freeVariables.splice(newProgram.freeVariables.indexOf(freeCollVar), 1);
                            newThis.getsValueFromTerminal = p;
                            newProgram.addExpansionCost(Settings.MatchedFreeCollOfVarCost);
                            worklist.push(newProgram);
                        }
                        /*
                        else if (freeColls.length) {
                            var freeColl: Graph.MappingScore = freeColls[0];
                            var randomInstanceOfColl: Graph.MappingScore = {
                                component: freeColl.component.getResult().getKind().listProperties().filter(p => {
                                    return p.getName() == "random";
                                })[0],
                                score: Settings.RandomInstanceOfCollectionGuessScore
                            };
                            newProgram.unusedComponents.push(randomInstanceOfColl);
                            newProgram.addExpansionCost(Settings.RandomInstanceOfCollectionGuessCost);
                            Contract.Requires(randomInstanceOfColl.component.getResult().getKind() == newThis.returnType);
                            this.reserveComponent(randomInstanceOfColl, newThis, newProgram, worklist);
                            log("component reserved");
                        }
                        */
                        else {
                            //try default value
                            log("no matching comp/var found for this argument. Using default value");
                            log(newThis);
                            var extraSymbols: Terminal[]= newThis.makeDefaultArgument();
                            if (newThis.isConcrete) {
                                newProgram.addExpansionCost(Settings.MatchedDefaultValueCost);
                                newProgram.symbols.pushRange(extraSymbols);
                                worklist.push(newProgram);
                            }
                            else {
                                log("no default values found");
                                log("aborting this branch");
                                //Contract.Requires(false);
                            }
                        }
                        break;
                    case "action":
                        var unusedActions: Graph.MappingScore[] = rootProgram.unusedComponents.filter(comp => {
                            return true;
                        });
                        var actionIndex: number = rootProgram.symbols.indexOf(this);
                        unusedActions.forEach(action => {
                            var newProgram: Synthesizer.AbstractProgram = rootProgram.clone();
                            var newThis: Terminal = this.clone(this.parent);
                            newProgram.symbols[rootProgram.symbols.indexOf(this)] = newThis;
                            //same explanation as prev one
                            newProgram.totalComponentDistace = newProgram.totalComponentDistace + 1;
                            //TODO: check if expected type is compatible

                            var parameterSymbols: CFG.Terminal[] = [];
                            action.component.getParameters().forEach(p => {
                                if (Utils.isSingleton(action.component) && (p.getName() == "this" || p.getName() == "_this_")) {
                                    return;
                                }
                                //if (p.getName() == "_this_") return;                //user defined action, ignore this of it
                                //if (p.getName() == "this" || p.getName() == "_this_") return;
                                var newP = new CFG.Terminal("argument", newThis.parent);
                                newP.returnType = p.getKind();
                                newP.isArgumentOf = newThis;
                                parameterSymbols.push(newP);
                                log("found parameter of");
                                log(newP);
                                log(newThis);
                            });

                            var res: PropertyParameter = action.component.getResult();
                            if (res.getKind().getName() != "Nothing") {
                                log("saving result of ");
                                log(newThis);
                                var newR = new CFG.Terminal("ret", newThis.parent);
                                newR.isConcrete = true;
                                newR.concretizedValue = action.component;   /// need to store which action's parameter i am
                                newR.returnType = action.component.getResult().getKind();
                                newR.getsValueFromTerminal = newThis;
                                parameterSymbols.push(newR);

                                var reservedComp: Synthesizer.ReservedMapping[] = newProgram.reservedComponents.filter(rc => {
                                    return rc.component == action.component;
                                });
                                if (reservedComp.length) {
                                    //i was reserved already
                                    reservedComp[0].reservedBy.getsValueFromTerminal = newR;
                                    var t: CFG.Terminal = reservedComp[0].reservedBy;
                                    newProgram.reservedComponents.splice(newProgram.reservedComponents.indexOf(reservedComp[0]), 1);
                                    newProgram.addExpansionCost(Settings.MatchedReservedCompCost);
                                    log(t);
                                    log("was waiting for me");
                                }
                                else {
                                    newProgram.freeVariables.push(newR);
                                }
                            }

                            newThis.isConcrete = true;
                            newThis.concretizedValue = action.component;
                            log("symbols of " + newThis + " before pushing");
                            log(newProgram.symbols);
                            log(parameterSymbols);
                            Array.prototype.splice.apply(newProgram.symbols, (<any[]>[actionIndex + 1, 0]).concat(parameterSymbols));
                            log("symbols of " + newThis+ " after pushing");
                            log(newProgram.symbols);
                            newProgram.useComponent(action, newThis);
                            worklist.push(newProgram);
                        });
                        break;
                    default:
                        log("that type of terminal not implemented");
                        Contract.Requires(false);
                }
                log("unrolled terminal "+this.name);
                log(worklist);
                return worklist;
            }
        }
        export class NonTerminal extends Terminal {
            constructor(name: string, parent: Symbol) {
                super(name,parent);
                this.type = "NonTerminal";
            }
            clone(parent: Symbol): NonTerminal {
                var sym = new NonTerminal(this.name, parent);
                sym.isConcrete = this.isConcrete;
                sym.returnType = this.returnType;
                return sym;
            }
            unroll(rootProgram: Synthesizer.AbstractProgram): Synthesizer.AbstractProgram[] {
                //TODO: Give priority to unused components
                var workItems: Synthesizer.AbstractProgram[] = [];
                //In Wu's code, value is unused components
                Parser.parser.getRhsList(this).forEach(rhs => {
                    //log(rootProgram.symbols);
                    //log("this is what root symbol array was");
                    var newProgram: Synthesizer.AbstractProgram = rootProgram.clone();
                    newProgram.addExpansionCost(Settings.NonTerminalExpansionCost);
                    var index: number = newProgram.symbols.indexOf(this);
                    Contract.Requires(index >= 0 && index < newProgram.symbols.length);
                    //TODO: if expexted type is null or empty

                    //newProgram.symbols = (newProgram.symbols).slice(0, index - 1).concat( (rhs.list).concat( (newProgram.symbols).slice(index + 1, newProgram.symbols.length)));
                    newProgram.symbols[index] = this.clone(this.parent);      //VERIFY THIS
                    Array.prototype.splice.apply(newProgram.symbols, <any[]>(<any[]>[index, 1]).concat(<any[]>rhs.list));
                    //log(rootProgram.symbols);
                    //log("this is what root symbol array is");
                    log("replacing a non terminal by its children");
                    workItems.push(newProgram);
                    newProgram.dump();
                });
                log("unrolled non terminal " + this.name);
                return workItems;
            }
        }
    }


    export module Synthesizer {

       export interface searchString {
            s: string;
       }
        export interface MappedScore extends Graph.MappingScore{
            mappedTerminal: CFG.Terminal;
        }
        export interface ReservedMapping extends Graph.MappingScore {
            reservedBy: CFG.Terminal;
        }

        export class AbstractProgram {
            symbols: CFG.Symbol[];
            unusedComponents: Graph.MappingScore[];
            usedComponents: MappedScore[];
            freeVariables: CFG.Terminal[];
            reservedComponents: ReservedMapping[];
            underlyingMapping: NLP.MappedPropertiesToComponents;
            totalComponentDistace: number;
            expansionCost: number;
            tokens: AST.Token[] = [];
            cycleFree: boolean = false;
            constructor(symbols: CFG.Symbol[], unusedComponenets: Graph.MappingScore[], underlyingMapping: NLP.MappedPropertiesToComponents, currentExpansionCost: number) {
                this.symbols = symbols;
                this.usedComponents = [];
                this.unusedComponents = unusedComponenets;
                this.freeVariables = [];
                this.totalComponentDistace = 0;
                this.reservedComponents = [];
                this.underlyingMapping = underlyingMapping;
                this.expansionCost = currentExpansionCost;
            }
            clean(): void {
                this.tokens = [];
                this.cycleFree = false;
                this.listAllSymbols().forEach(s => {
                    s.clean();
                });
            }
            useComponent(c: Graph.MappingScore, term: CFG.Terminal) : void{
                this.usedComponents.push({ component: c.component, score: c.score, mappedTerminal: term });
                this.unusedComponents.splice(this.unusedComponents.indexOf(c), 1);
            }
            abstractCost(): number {            //less the program cost, better the program
                return this.expansionCost+this.minCost()-this.underlyingMapping.cost;      //mapping's cost is actually profit
            }
            minCost(): number {
                return this.symbols.filter(symbol => {
                    return symbol.isConcrete;
                }).length;
            }
            maxCost(): number {
                return Settings.INF;
            }
            addExpansionCost(c: number) : void{
                this.expansionCost = this.expansionCost + c;
            }
            sementicCost(): void {
                var returnTerms: CFG.Terminal[] = (<CFG.Terminal[]>this.symbols).filter(s => {
                    return s.name == "ret";
                });
                var unusedReturnTerms: CFG.Terminal[] = returnTerms.filter(r => {
                    return !(<CFG.Terminal[]>this.symbols).some(s => {
                        return s.getsValueFromTerminal==r;
                    });
                });
                this.addExpansionCost(unusedReturnTerms.length * Settings.CostPerUnusedReturnValue);
            }
            expand(): AbstractProgram[]{
                var expandingSymbols: CFG.Symbol[] = this.symbols.filter(s => {
                    return !s.isConcrete;
                });
                if (expandingSymbols.length == 0) {
                    Contract.Requires(this.reservedComponents.length > 0);
                    log("No way to reach reserved components. Ignoring this branch.");
                    return [];
                }
                else    {
                    Contract.Requires(expandingSymbols[0] != undefined);
                    return expandingSymbols[0].unroll(this);
                    }
            }
            clone(): AbstractProgram {
                var cloned: AbstractProgram = new AbstractProgram(this.symbols.slice(0), this.unusedComponents.slice(0), this.underlyingMapping, this.expansionCost);
                cloned.freeVariables = this.freeVariables.slice(0);
                cloned.totalComponentDistace = this.totalComponentDistace;
                cloned.usedComponents = this.usedComponents.slice(0);
                cloned.reservedComponents = this.reservedComponents.slice(0);
                return cloned;
            }
            isConcrete(): boolean {
                return (! this.symbols.some(s => { return !s.isConcrete})) && (this.reservedComponents.length==0);
            }
            dump(): void {
                log(this.symbols);
            }

            dfs(n: { visited: boolean; term: CFG.Terminal }, parent: CFG.Terminal, nodes: { visited: boolean; term: CFG.Terminal }[], L:CFG.Terminal[], stack: CFG.Terminal[]) {
                if (n.visited) return;
                n.visited = true;
                stack.push(n.term);
                nodes.filter(u => {
                    return u.term.getsValueFromTerminal == n.term;
                }).concat(nodes.filter(u => { return u.term == n.term.isArgumentOf })).forEach(node => {
                if(node.term != parent && node.visited && stack.some(s => {
                    return s == node.term;
                })) {
                    log("graph contain cycle");     //TODO: logging error
                }
                    else if (!node.visited) this.dfs(node, n.term, nodes, L, stack);
                });
                stack = stack.filter(s => {
                    return n.term != s;
                });
                L.push(n.term);
            }

            topologicalSort(): void {
                var L: CFG.Terminal[] = [];
                var nodes: { visited: boolean; term: CFG.Terminal }[] = this.listAllSymbols().map(s => {
                    return { visited: false, term: s }
                });
                nodes.forEach(node => {
                    if (!node.visited) this.dfs(node, undefined, nodes, L, []);
                });
                this.symbols = L.filter(l => {
                    return this.symbols.some(s => {return s == l });
                }).slice(0);
            }


            returnAllReferencedSymbols(s: CFG.Terminal, syms: CFG.Terminal[]) : void{
                if (s == undefined) return;
                if (!syms.some(sym2 => {
                    return sym2 === s
                })) syms.push(s);
                this.returnAllReferencedSymbols(s.getsValueFromTerminal, syms);
                this.returnAllReferencedSymbols(s.isArgumentOf, syms);
            }
            listAllSymbols(): CFG.Terminal[] {
                var syms: CFG.Terminal[] = [];
                this.symbols.forEach(s => {
                    this.returnAllReferencedSymbols(<CFG.Terminal>s, syms);
                });
                return syms;
            }
            oldTopologicalSort(): void {
                var allSymbols: CFG.Terminal[] = this.listAllSymbols().slice(0);
                var L: CFG.Terminal[] = [];
                var S: CFG.Terminal[] = allSymbols.filter(s => {
                    return s.getsValueFromTerminal == undefined;
                });
                log(allSymbols);
                log(S);
                while (S.length) {
                    var n: CFG.Terminal = S.shift();
                    L.push(n);
                    var initSize: number = S.length;
                    allSymbols.filter(s => {
                        return (!L.some(l => {
                            return l === s;
                        }) &&( s.getsValueFromTerminal == undefined || L.some(l => {
                            return s.getsValueFromTerminal == l;
                        })));
                    }).forEach(s => {
                        S.push(s);
                    });
                    if (S.length == initSize) break;
                }
                if (S.length) {
                    this.cycleFree = false;
                    //penalize it
                }
                else {
                    this.cycleFree = true
                    this.symbols = L.filter(l => {
                        return this.symbols.some(s => {
                            return s === l;
                        });
                    }).reverse();
                }

            }
        }

        export class CompletedProgram extends AbstractProgram {
            block: AST.CodeBlock;
            constructor(absProgram: AbstractProgram) {
                Contract.Requires(absProgram.unusedComponents.length == 0);
                super(absProgram.symbols, [], absProgram.underlyingMapping, absProgram.expansionCost);
                this.unusedComponents = [];
                this.block = undefined;
            }
            cost() :number{
                return this.abstractCost();
            }
            genAST(currentAction: AST.Action): void {
                this.block = (new Generator.ASTBlock(this, currentAction)).block;
            }
        }

        class TopPrograms {
            programs: CompletedProgram[];
            //sorted so that first program is of least cost
            constructor() {
                this.programs = [];
            }
            insert(program: CompletedProgram) {
                if (this.programs.some(oldP => {
                    return oldP === program;
                })) return;
                if (this.programs.length == 0) this.programs = [program];
                else {
                    this.programs.push(program);
                    this.programs.sort((p1, p2) => {
                        return p1.cost() - p2.cost();
                    });
                    if (this.programs.length > Settings.MaxProgramGenerationPerMapping) this.programs.pop();
                }
            }
            foundMaxCost() {
                if (this.programs.length) return this.programs[this.programs.length - 1].cost();
                else return Settings.INF;
            }
            canInsert(task: AbstractProgram): boolean {
                return (task.minCost() < this.foundMaxCost() || this.programs.length < Settings.MaxProgramGenerationPerMapping);
            }
        }
        export class Synthesizer {
            private startTicks = 0;
            constructor() {
                this.startTicks = 0;
                SynthModel.initTags(false);
            }
            synthesizePrograms(query: string, currentAction: TDev.AST.Action, newTicks: number) : AST.CodeBlock[]{
                this.startTicks = newTicks;
                var start = new Date().getTime();
                var searchQuery: searchString = { s: query };
                Parser.parser = new Parser.Parser("Start", Parser.grammar);

                var choices: NLP.MappedPropertiesToComponents[] = NLP.mapKeywordsToComponents(searchQuery, currentAction);
                if (this.startTicks != newTicks) return [];

                log("choices");
                log(choices);

                var choiceCounter: number = 0;      //debug
                var programs: CompletedProgram[] = [];
                choices.forEach(mapping => {
                    log("choice: " + choiceCounter);
                    choiceCounter = choiceCounter + 1;
                    programs.pushRange(this.generateCompletedPrograms(mapping));
                    if (this.startTicks != newTicks) return [];
                });
                programs.sort((p1, p2) => {
                    return p1.cost() - p2.cost();
                });
                log("final programs:");
                log(programs);
                if (this.startTicks != newTicks) return [];
                programs[0].genAST(currentAction);
                console.log((new Date().getTime() - start) / 1000.0);
                log(this.startTicks + "  ticks  " + newTicks);
                return [];
            }

            generateCompletedPrograms(mapping: NLP.MappedPropertiesToComponents): CompletedProgram[] {
                var worklist: AbstractProgram[] = [new AbstractProgram([Parser.parser.topNonTermial], mapping.mapping, mapping, mapping.cost)];
                var task: AbstractProgram = undefined;
                var topPrograms = new TopPrograms();
                var iterCount: number = 0;

                while (worklist.length && iterCount < Settings.MaxSynthesisIterationCount) {
                    iterCount++;

                    task = worklist.shift();
                    log("new task to precess: ");
                    log(task);
                    log(worklist);
                    if (task.abstractCost() < Settings.SynthesisCostUpperBound) {
                        if (topPrograms.canInsert(task)) {
                            if (task.isConcrete()) {
                                if (task.unusedComponents.length == 0) {
                                    log("task fully expanded");
                                    task.sementicCost();
                                    topPrograms.insert(new CompletedProgram(task));
                                }
                                else {
                                    log("there are unused comps present. ignore it");
                                }
                            }
                            else {
                                //expand it
                                log("expanding this task");
                                worklist.pushRange(task.expand());
                            }
                        }
                        else {
                            log("this task woiuld eventually be ignored");
                        }

                    }
                    else {
                        log("very costly, ignore it");
                    }

                }


                return topPrograms.programs;
            }
        }
    }

    export module Generator {
        export class ASTBlock {
            block: AST.CodeBlock;
            program: Synthesizer.CompletedProgram;
            currentAction: AST.Action;
            usedNames: string[] = [];
            constructor(program: Synthesizer.CompletedProgram, currentAction: AST.Action) {
                this.program = program;
                this.currentAction = currentAction;
                this.block = this.genAST();
            }

            makeCompletePropRef(p: IProperty): AST.Token[] {
                if (Utils.isSingleton(p)) {
                    if (Utils.isLibraryAction(p)) {
                        return [AST.mkThing(AST.libSymbol), (AST.mkPropRef((<AST.LibraryRefAction>(p)).parentLibrary().getName()))];
                    }
                    else if (Utils.isLocalAction(p)) {
                        return [AST.mkThing("code")];
                    }
                    else {
                        return [AST.mkThing(p.parentKind.singleton.getName())];
                    }
                }
                else {
                    return [AST.mkPropRef(p.parentKind.getName())];
                }
            }

            exprStmtClone(e: AST.ExprStmt): AST.ExprStmt {
                var e2: AST.ExprStmt = new AST.ExprStmt();
                e2.expr = new AST.ExprHolder();
                e2.expr.tokens = e.expr.tokens.slice(0);
                log("pushing to stmts");
                log(e2);
                return e2;
            }

            makeExprs(tokens: AST.Token[]): AST.ExprStmt[] {
                var stmts: AST.ExprStmt[] = [];
                var exprStmt: AST.ExprStmt = new AST.ExprStmt();
                exprStmt.expr = new AST.ExprHolder();
                exprStmt.expr.tokens = [];
                log(tokens);
                tokens.forEach(token => {
                    log(token);
                    if (token == undefined) return;
                    if (token.nodeType() == "operator" && token.getText() == "_Enter") {
                        if (exprStmt.expr.tokens.length > 0) {
                            stmts.push(this.exprStmtClone(exprStmt));
                            exprStmt = new AST.ExprStmt();
                            exprStmt.expr = new AST.ExprHolder();
                            exprStmt.expr.tokens = [];
                        }
                    }
                    else {
                        exprStmt.expr.tokens.push(token);
                    }
                });
                if (exprStmt.expr.tokens.length) stmts.push(this.exprStmtClone(exprStmt));
                log("this stmts are of");
                log(stmts);
                log(tokens);
                return stmts;
            }

            genAST(): AST.CodeBlock {
                //generate exp
                var stmts: AST.ExprStmt[] = [];
                log("starting topo");
                this.program.topologicalSort();
                log(this.program.symbols);
                log("topo done");
                this.program.symbols.forEach(s => {
                    stmts.pushRange(this.makeExprs(this.useInAst(<CFG.Terminal>s, <CFG.Terminal[]>this.program.symbols, this.program)));
                });
                //program.clean();
                var block = AST.Parser.emptyBlock();
                block.setChildren(stmts);
                log(block);
                log(block.serialize())
                return block;
            }

            getName(k: Kind): string {
                var newName: string = this.currentAction.nameLocal(k.getStemName(), this.usedNames)
                this.usedNames.push(newName);
                return newName;
            }

            useInAst(t: CFG.Terminal, symbols: CFG.Terminal[], program: Synthesizer.AbstractProgram): AST.Token[] {
                if (t == undefined) return [];
                if (t.usedInGenAST) return [];
                log("using");
                log(t);

                var args: CFG.Terminal[] = symbols.filter(s => {
                    return s.isArgumentOf === t;
                });
                //evaluate  arguments, if any
                args.forEach(arg => {
                    this.useInAst(arg, symbols, program);
                });

                var token: AST.Token = undefined;

                switch (t.name) {
                    case "argument":
                        //evaluate the reference
                        this.useInAst(t.getsValueFromTerminal, symbols, program);
                        t.token = t.getsValueFromTerminal.token;
                        t.tokens = t.getsValueFromTerminal.tokens;
                        t.useInGenAST(t.token);
                        break;

                    case "ret":
                        //TODO: evaluate the refernece
                        this.useInAst(t.getsValueFromTerminal, symbols, program);
                        var varName = this.getName(t.returnType);
                        t.token = AST.mkThing(varName, true);
                        t.tokens = [t.token, AST.mkOp(":=")];
                        t.tokens.pushRange(t.getsValueFromTerminal.tokens);
                        t.tokens.push(AST.mkOp("_Enter"));
                        t.useInGenAST(t.token);
                        break;

                    case "directRef":
                        if (0) {
                            t.token = AST.mkThing(t.concretizedValue.getName());
                            t.tokens = [t.token];
                            t.useInGenAST(t.token);
                        }
                        //TODO: to ckeck the correctness
                        else if ((<AST.AstNode>(<any>t.concretizedValue)).nodeType != undefined && (<AST.AstNode>(<any>t.concretizedValue)).nodeType() == "globalDef") {
                            log("it is direct ref of a var");
                            t.token = AST.mkThing(t.concretizedValue.getName());
                            t.tokens = [t.token];
                            t.useInGenAST(t.token);
                        }
                        else {
                            log("it is direct ref of property");
                            var varName: string = this.getName(t.concretizedValue.getResult().getKind());
                            t.token = AST.mkThing(varName, true);
                            t.tokens = [t.token, AST.mkOp(":=")];
                            t.tokens.pushRange( this.makeCompletePropRef(t.concretizedValue).concat(AST.mkPropRef(t.concretizedValue.getName())) );
                            t.tokens.push(AST.mkOp("_Enter"));
                            t.useInGenAST(t.token);
                        }
                        break;

                    case "transitiveReference":
                        this.useInAst(t.getsValueFromTerminal, symbols, program);
                        var varName = this.getName(t.returnType);
                        t.token = AST.mkThing(varName, true);
                        t.tokens = [t.token, AST.mkOp(":=")];
                        t.tokens.pushRange(t.getsValueFromTerminal.tokens);
                        t.tokens.push(AST.mkOp("_Enter"));
                        t.useInGenAST(t.token);
                        break;

                    case "declaration":
                        var varName = this.getName(t.returnType);
                        switch (t.returnType.getName()) {
                            case "String":
                                t.token = AST.mkLit(t.defaultValue);
                                break;
                            case "Number":
                                t.token = AST.mkLit(Number(t.defaultValue));
                                break;
                            default:
                                log("unknown declaration type");
                        }
                        t.tokens = [t.token];
                        //t.tokens = [t.token, AST.mkOp(":="), AST.mkThing(t.defaultValue), AST.mkOp("_Enter")];
                        t.useInGenAST(t.token);
                        break;

                    case "action":
                        args.forEach(arg => {
                            if (arg.tokens.length > 1) t.tokens.pushRange(arg.tokens);
                        });
                        if (t.concretizedValue.parentKind.getName() == "Number" || t.concretizedValue.parentKind.getName() == "String") {
                            switch (args.length) {
                                case 1:
                                    t.token = AST.mkPropRef(t.concretizedValue.getName());
                                    t.tokens = [args[0].token, AST.mkPropRef(t.concretizedValue.getName())];
                                    break;
                                case 2:
                                    t.token = AST.mkPropRef(t.concretizedValue.getName());
                                    t.tokens = [args[0].token,AST.mkOp(t.concretizedValue.getName()),args[1].token];
                                    break;
                                default:
                                    Contract.Requires(false);
                                    break;
                            }
                        }

                        else {
                            t.tokens.pushRange(this.makeCompletePropRef(t.concretizedValue));
                            t.token = AST.mkPropRef(t.concretizedValue.getName());              // may not be correct, error prone
                            t.tokens.push(t.token);
                            if (args.length) {
                                t.tokens.push(AST.mkOp("("));
                                args.forEach((arg, i) => {
                                    if (i > 0) t.tokens.push(AST.mkOp(","));
                                    t.tokens.push(arg.token);
                                    //TODO push arhument token
                                });
                                t.tokens.push(AST.mkOp(")"));
                            }
                            else {
                                //do nothing
                            }
                        }
                        t.useInGenAST(t.token);
                        break;

                    default:
                        log("unrecognized terminal");
                        Contract.Requires(false);
                        break;
                }
                return t.tokens;

            }
        }
    }

}