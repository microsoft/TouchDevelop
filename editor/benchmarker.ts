///<reference path='refs.ts'/>

//? This module controls benchmark execution to assess the performance of
//? TouchDevelop on a user device. It can:
//?
//?   - Run JavaScript benchmarks that are used to compute the unit time
//?   - Run TouchDevelop benchmarks that assess the compiler performance
//?     relative to original JavaScript
//?
//? **** Unit time measurement ****
//?
//? The unit time represents the platform speed (lower is better) and is
//? used to normalize all run time measurements. It is the fastest time
//? required to run 8 benchmarks on the device.
module TDev.TestMgr.Benchmarker
{
    //? This benchmark instantiates many tree nodes and exercises tree
    //? traversal.
    module BinaryTrees {
        class TreeNode {
            left: TreeNode;
            right: TreeNode;
            item: number;

            public itemCheck() {
                if (this.left === null)
                    return this.item;
                else
                    return this.item + this.left.itemCheck()
                      - this.right.itemCheck();
            }
        }

        function bottomUpTree(item: number, depth: number) {
            var treeNode: TreeNode;
            if (depth > 0) {
                treeNode = new TreeNode();
                treeNode.left = bottomUpTree(2 * item - 1, depth - 1);
                treeNode.right = bottomUpTree(2 * item, depth - 1);
                treeNode.item = item;
            } else {
                treeNode = new TreeNode();
                treeNode.left = null;
                treeNode.right = null;
                treeNode.item = item;
            }
            return treeNode;
        }

        export function main(n: number, outs: string[]) {
            var timer = Util.perfNow();
            var minDepth = 4;
            var maxDepth = Math.max(minDepth + 2, n);
            var stretchDepth = maxDepth + 1;
            var check = bottomUpTree(0, stretchDepth).itemCheck();
            outs.push("stretch tree of depth " + stretchDepth + " check:" + check);
            var longLivedTree = bottomUpTree(0, maxDepth);
            for (var i = minDepth; i <= maxDepth; i += 2) {
                var iterations = 1 << (maxDepth - i + minDepth);
                check = 0;
                for (var j = 0; j < iterations; ++j) {
                    check = check + bottomUpTree(j + 1, i).itemCheck();
                    check = check + bottomUpTree(-j - 1, i).itemCheck();
                }
                outs.push((iterations * 2) + " trees of depth " + i + " check: "
                         + check);
            }
            outs.push("long lived tree of depth " + maxDepth + " check: " +
                      longLivedTree.itemCheck());
            return Util.perfNow() - timer;
        }
    }

    //? The Mandelbrot benchmark does n^2 calculations to build a 2D fractal
    //? image.
    module Mandelbrot {
        export function main(n: number, outs: string[]) {
            var timer = Util.perfNow();
            var h = n;
            var w = n;
            var yFac = 2 / h;
            var xFac = 2 / w;
            for (var y = 0; y < h; ++y) {
                var Ci = y * yFac - 1;
                for (var x = 0; x < w; ++x) {
                    var Zr = 0;
                    var Zi = 0;
                    var Tr = 0;
                    var Ti = 0;
                    var Cr = x * xFac - 1.5;
                    var bitset = true;
                    for (var i = 0; i < 50; ++i) {
                        Zi = 2 * Zr * Zi + Ci;
                        Zr = Tr - Ti + Cr;
                        Tr = Zr * Zr;
                        Ti = Zi * Zi;
                        if (Tr + Ti > 4) {
                            outs.push("0");
                            bitset = false;
                            break;
                        }
                    }
                    if (bitset) {
                        outs.push("1");
                    }
                }

            }
            return Util.perfNow() - timer;
        }

    }

    //? SpectralNorm performs matrix floating point calculations.
    module SpectralNorm {

        function A(i: number, j: number) {
            return 1 / ((i + j) * (i + j + 1) / 2 + i + 1);
        }

        function Au(u: number[], v: number[]) {
            for (var i = 0; i < u.length; ++i) {
                var t = 0;
                for (var j = 0; j < u.length; ++j) {
                    t += A(i, j) * u[j];
                }
                v[i] = t;
            }
        }

        function Atu(u: number[], v: number[]) {
            for (var i = 0; i < u.length; ++i) {
                var t = 0;
                for (var j = 0; j < u.length; ++j) {
                    t += A(j, i) * u[j];
                }
                v[i] = t;
            }
        }

        function AtAu(u: number[], v: number[], w: number[]) {
            Au(u, w);
            Atu(w, v);
        }

        export function main(n: number, outs: string[]) {
            var timer = Util.perfNow();
            var vv = 0, vBv = 0, u = [], v = [];
            var w = [], i = 0;
            for (i = 0; i < n; ++i) {
                u.push(1);
                v.push(0);
                w.push(0);
            }
            for (i = 0; i < 10; ++i) {
                AtAu(u, v, w);
                AtAu(v, u, w);
            }
            for (i = 0; i < n; ++i) {
                vBv += u[i] * v[i];
                vv += v[i] * v[i];
            }
            outs.push(Math.sqrt(vBv / vv).toFixed(7));
            return Util.perfNow() - timer;
        }
    }

    //? N Body simulation benchmark
    module NBody {
        var PI = 3.141592653589793;
        var SOLAR_MASS = 4 * PI * PI;
        var DAYS_PER_YEAR = 365.24;

        class Body {
            constructor(public x: number, public y: number, public z: number,
                        public vx: number, public vy: number, public vz: number,
                        public mass: number) { }
            static createJupiter() {
                return new Body(
                      /* x= */   4.84143144246472090e+00,
                      /* y= */  -1.16032004402742839e+00,
                      /* z= */  -1.03622044471123109e-01,
                      /* vx= */  1.66007664274403694e-03 * DAYS_PER_YEAR,
                      /* vy= */  7.69901118419740425e-03 * DAYS_PER_YEAR,
                      /* vz= */ -6.90460016972063023e-05 * DAYS_PER_YEAR,
                      /* mass= */9.54791938424326609e-04 * SOLAR_MASS);
            }
            static createSaturn() {
                return new Body(
                    /* x= */   8.34336671824457987e+00,
                    /* y= */   4.12479856412430479e+00,
                    /* z= */  -4.03523417114321381e-01,
                    /* vx= */ -2.76742510726862411e-03 * DAYS_PER_YEAR,
                    /* vy= */  4.99852801234917238e-03 * DAYS_PER_YEAR,
                    /* vz= */  2.30417297573763929e-05 * DAYS_PER_YEAR,
                    /* mass= */2.85885980666130812e-04 * SOLAR_MASS);
            }
            static createUranus() {
                return new Body(
                    /* x= */   1.28943695621391310e+01,
                    /* y= */  -1.51111514016986312e+01,
                    /* z= */  -2.23307578892655734e-01,
                    /* vx= */  2.96460137564761618e-03 * DAYS_PER_YEAR,
                    /* vy= */  2.37847173959480950e-03 * DAYS_PER_YEAR,
                    /* vz= */ -2.96589568540237556e-05 * DAYS_PER_YEAR,
                    /* mass= */4.36624404335156298e-05 * SOLAR_MASS);
            }
            static createNeptune() {
                return new Body(
                    /* x= */   1.53796971148509165e+01,
                    /* y= */  -2.59193146099879641e+01,
                    /* z= */   1.79258772950371181e-01,
                    /* vx= */  2.68067772490389322e-03 * DAYS_PER_YEAR,
                    /* vy= */  1.62824170038242295e-03 * DAYS_PER_YEAR,
                    /* vz= */ -9.51592254519715870e-05 * DAYS_PER_YEAR,
                    /* mass= */5.15138902046611451e-05 * SOLAR_MASS);
            }
            static createSun() {
                return new Body(0, 0, 0, 0, 0, 0, SOLAR_MASS);
            }
            public offsetMomentum(px: number, py: number, pz: number) {
                this.vx = -px / SOLAR_MASS;
                this.vy = -py / SOLAR_MASS;
                this.vz = -pz / SOLAR_MASS;
                return this;
            }
        }

        function advance(bodySystem: Body[], dt: number) {
            for (var i = 0; i < bodySystem.length; ++i) {
                var iBody = bodySystem[i];
                for (var j = i + 1; j < bodySystem.length; ++j) {
                    var dx = iBody.x - bodySystem[j].x,
                        dy = iBody.y - bodySystem[j].y,
                        dz = iBody.z - bodySystem[j].z;
                    var dSquared = dx * dx + dy * dy + dz * dz;
                    var distance = Math.sqrt(dSquared);
                    var mag = dt / (dSquared * distance);
                    iBody.vx -= dx * bodySystem[j].mass * mag;
                    iBody.vy -= dy * bodySystem[j].mass * mag;
                    iBody.vz -= dz * bodySystem[j].mass * mag;
                    bodySystem[j].vx += dx * iBody.mass * mag;
                    bodySystem[j].vy += dy * iBody.mass * mag;
                    bodySystem[j].vz += dz * iBody.mass * mag;
                }
            }
            bodySystem.forEach(function (body: Body) {
                body.x += dt * body.vx;
                body.y += dt * body.vy;
                body.z += dt * body.vz;
            });
        }

        function energy(bodySystem: Body[]) {
            var e = 0;
            for (var i = 0; i < bodySystem.length; ++i) {
                var iBody = bodySystem[i];
                e += 0.5 * iBody.mass * (iBody.vx * iBody.vx +
                                         iBody.vy * iBody.vy +
                                         iBody.vz * iBody.vz);
                for (var j = i + 1; j < bodySystem.length; ++j) {
                    var jBody = bodySystem[j];
                    var dx = iBody.x - jBody.x;
                    var dy = iBody.y - jBody.y;
                    var dz = iBody.z - jBody.z;
                    var distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
                    e -= (iBody.mass * jBody.mass) / distance;
                }
            }
            return e;
        }


        export function main(n: number, outs: string[]) {
            var timer = Util.perfNow();
            var bodySystem = [];
            bodySystem.push(Body.createSun());
            bodySystem.push(Body.createJupiter());
            bodySystem.push(Body.createSaturn());
            bodySystem.push(Body.createUranus());
            bodySystem.push(Body.createNeptune());
            var px = 0, py = 0, pz = 0;
            bodySystem.forEach(function (body) {
                px += body.vx * body.mass;
                py += body.vy * body.mass;
                pz += body.vz * body.mass;
            });
            bodySystem[0].offsetMomentum(px, py, pz);
            outs.push(energy(bodySystem).toFixed(7));
            for (var i = 0; i < n; ++i) {
                advance(bodySystem, 0.01);
            }
            outs.push(energy(bodySystem).toFixed(7));
            return Util.perfNow() - timer;
        }

    }

    //? The pfannkuchen (pancakes) calculates the maximum number of flips
    //? (element exchanges) necessary to achieve a certain configuration for
    //? any permutation of size n.
    module Pfannkuchen {
        export function main(n: number, outs: string[]) {
            var timer = Util.perfNow();
            var p = [], q = [], s = [];
            var sign = 1, maxflips = 0, sum = 0, m = n - 1, i = 0;
            for (i = 0; i < n; ++i) {
                p.push(i);
                q.push(i);
                s.push(i);
            }
            while (true) {
                var q0 = p[0];
                if (q0 != 0) {
                    for (i = 1; i < n; ++i) {
                        q[i] = p[i];
                    }
                    var flips = 1;
                    var qq = 1;
                    // Flipping
                    while (qq != 0) {
                        qq = q[q0];
                        if (qq == 0) {
                            sum += sign * flips;
                            if (flips > maxflips)
                                maxflips = flips;
                        } else {
                            q[q0] = q0;
                            if (q0 >= 3) {
                                var k = 1, x = q0 - 1;
                                while (k < x) {
                                    var t = q[k];
                                    q[k] = q[x];
                                    q[x] = t;
                                    ++k; --x;
                                }
                            }
                            q0 = qq;
                            ++flips;
                        }
                    }
                }
                // Generate next permutation
                if (sign == 1) {
                    var t = p[1];
                    p[1] = p[0];
                    p[0] = t;
                    sign = -1;
                } else { // sign == -1
                    var t = p[1];
                    p[1] = p[2];
                    p[2] = t;
                    sign = 1;
                    for (i = 2; i < n; ++i) {
                        var sx = s[i];
                        if (sx != 0) {
                            s[i] = sx - 1;
                            break;
                        }
                        if (i == m) {
                            outs.push('sum=' + sum.toString());
                            outs.push('maxflips=' + maxflips.toString());
                            return Util.perfNow() - timer;
                        }
                        s[i] = i;
                        var t = p[0];
                        for (var j = 0; j <= i; ++j) {
                            p[j] = p[j + 1];
                        }
                        p[i + 1] = t;
                    }
                }
            }
            outs.push('sum=' + sum.toString());
            outs.push('maxflips=' + maxflips.toString());
            return Util.perfNow() - timer;
        }

    }

    // Fasta benchmark exercises maps and string operations
    module Fasta {
        var hamasapiens = {
            'a': 0.3029549426680,
            'c': 0.1979883004921,
            'g': 0.1975473066391,
            't': 0.3015094502008
        }

        var iub = {
            'a': 0.27,
            'c': 0.12,
            'g': 0.12,
            't': 0.27,
            'B': 0.02,
            'D': 0.02,
            'H': 0.02,
            'K': 0.02,
            'M': 0.02,
            'N': 0.02,
            'R': 0.02,
            'S': 0.02,
            'V': 0.02,
            'W': 0.02,
            'Y': 0.02
        }

        var alu =
          "GGCCGGGCGCGGTGGCTCACGCCTGTAATCCCAGCACTTTGG" +
          "GAGGCCGAGGCGGGCGGATCACCTGAGGTCAGGAGTTCGAGA" +
          "CCAGCCTGGCCAACATGGTGAAACCCCGTCTCTACTAAAAAT" +
          "ACAAAAATTAGCCGGGCGTGGTGGCGCGCGCCTGTAATCCCA" +
          "GCTACTCGGGAGGCTGAGGCAGGAGAATCGCTTGAACCCGGG" +
          "AGGCGGAGGTTGCAGTGAGCCGAGATCGCGCCACTGCACTCC" +
          "AGCCTGGGCGACAGAGCGAGACTCCGTCTCAAAAA";

        var genRandomLast = 42;
        function genRandom(max: number) {
            genRandomLast = (genRandomLast * 3877 + 29573) % 139968;
            return max * genRandomLast / 139968;
        }

        function makeCumulative(table: Object): Object {
            var last = null;
            var newMap = {};
            for (var c in table) {
                newMap[c] = table[c];
                if (last) newMap[c] += newMap[last];
                last = c;
            }
            return newMap;
        }

        function selectRandom(genelist: Object) {
            var r = genRandom(1);
            var s = '';
            for (var key in genelist) {
                s = key;
                if (r < genelist[key])
                    break;
            }
            return s;
        }

        function makeRandomFasta(id: string, desc: string, genelist: Object,
            n: number, outs: string[]) {
            outs.push('>' + id + ' ' + desc);
            var line = [], todo = n;
            while (todo > 0) {
                var m = 0;
                if (todo < 60)
                    m = todo
                else
                    m = 60;
                for (var i = 0; i < m; ++i) {
                    line.push(selectRandom(genelist));
                }
                outs.push(line.join(''));
                line = [];
                todo -= 60;
            }
        }

        function makeRepeatFasta(id: string, desc: string, s: string,
            n: number, outs: string[]) {
            outs.push('>' + id + ' ' + desc);
            var i = 0, lineLength = 60;
            while (n > 0) {
                if (n < lineLength)
                    lineLength = n;
                if (i + lineLength < s.length) {
                    outs.push(s.substring(i, i + lineLength));
                    i += lineLength;
                } else {
                    var t = s.substring(i);
                    i = lineLength - (s.length - i);
                    outs.push(t + s.substring(0, i));
                }
                n -= lineLength;
            }
        }

        export function resetRandomSeed() {
            genRandomLast = 42;
        }

        export function main(n: number, outs: string[]) {
            var timer = Util.perfNow();
            var newHama = makeCumulative(hamasapiens);
            var newIUB  = makeCumulative(iub);
            makeRepeatFasta("ONE", "Hama sapiens alu", alu, n * 2, outs);
            makeRandomFasta("TWO", "IUB ambiguity codes", newIUB, n * 3, outs);
            makeRandomFasta("THREE", "Hama sapiens frequency", newHama, n * 5,
                            outs);
            return Util.perfNow() - timer;
        }
    }

    //? Exercises string operations and maps by reversing a sequence of DNA
    //? nucleotides.
    module ReverseComplement {
        var complement = {
            y: 'R',
            v: 'B',
            w: 'W',
            t: 'A',
            u: 'A',
            r: 'Y',
            s: 'S',
            n: 'N',
            m: 'K',
            k: 'M',
            h: 'D',
            g: 'C',
            d: 'H',
            b: 'V',
            c: 'G',
            a: 'T',
            Y: 'R',
            V: 'B',
            W: 'W',
            T: 'A',
            U: 'A',
            R: 'Y',
            S: 'S',
            N: 'N',
            M: 'K',
            K: 'M',
            H: 'D',
            G: 'C',
            D: 'H',
            B: 'V',
            C: 'G',
            A: 'T'
        };

        function reverseFormat(a: string[], outs: string[]) {
            var outbuff = [], c = 0, i = 0;
            for (i = 0 ; i < 60; ++i) {
                outbuff.push('');
            }
            for (i = a.length - 1; i >= 0; --i) {
                var line = a[i];
                for (var j = line.length - 1; j >= 0; --j) {
                    outbuff[c++] = complement[line[j]];
                    if (c == 60) {
                        outs.push(outbuff.join(''));
                        c = 0;
                    }
                }
            }
            if (c > 0) {
                for (i = 0; i < 60 - c; ++i) {
                    outbuff[i + c] = '';
                }
                outs.push(outbuff.join(''));
            }
        }


        export function main(n: number, outs: string[]) {
            var input = [];
            Fasta.main(n, input);
            var timer = Util.perfNow();
            var lines = [];
            input.forEach(function (s) {
                if (s.length == 0)
                    return;
                if (s[0] != '>') {
                    lines.push(s);
                } else {
                    reverseFormat(lines, outs);
                    lines = [];
                    outs.push(s);
                }
            });
            reverseFormat(lines, outs);
            return Util.perfNow() - timer;
        }
    }

    //? Exercises hash maps
    module KNucleotide {
        function populateFreq(seq: string, length: number) {
            var n = seq.length - length + 1;
            var frequencies = {};
            for (var i = 0; i < n; ++i) {
                var sub = seq.substring(i, i + length);
                frequencies[sub] = (frequencies[sub] === undefined ? 0
                                    : frequencies[sub])
                    + 1;
            }
            return frequencies;
        }

        function find(seq: string, s: string, outs: string[]) {
            var frequencies = populateFreq(seq, s.length);
            outs.push((frequencies[s] === undefined ? 0 : frequencies[s])
                      .toString() + ' ' + s);
        }

        function sort(seq: string, length: number, outs: string[]) {
            var n = seq.length - length + 1;
            var frequencies = populateFreq(seq, length);
            var keys = Object.keys(frequencies);

            keys.sort(function (a, b) {
                return frequencies[b] - frequencies[a];
            });

            for (var i in keys) {
                if (typeof keys[i] == 'string' || typeof keys[i] == 'object')
                    outs.push(keys[i] + ' '
                              + (frequencies[keys[i]] * 100 / n).toFixed(7));
            }
            outs.push('');
        }

        export function main(n: number, outs: string[]) {
            var input = [];
            Fasta.main(n, input);
            var timer = Util.perfNow();
            var lines = [];
            var read = false;
            input.forEach(function (s) {
                if (s.length == 0)
                    return;
                if (s.substring(0, 6) == '>THREE') {
                    read = true;
                } else {
                    if (s[0] == '>')
                        read = false;
                    if (read)
                        lines.push(s);
                }
            });
            var seq = lines.join('').toUpperCase();
            sort(seq, 1, outs);
            sort(seq, 2, outs);
            find(seq, 'GGT', outs);
            find(seq, 'GGTA', outs);
            find(seq, 'GGTATT', outs);
            find(seq, 'GGTATTTTAATT', outs);
            find(seq, 'GGTATTTTAATTTATAGT', outs);
            return Util.perfNow() - timer;
        }

    }

    // ** End of benchmarks **

    //? Records a single program measurement.
    export class Measurement {
        constructor(public name: string, public time: number,
                    public correct: boolean) { }
    }

    //? Records the summary of several Measurement objects
    export class SumMeasurement {
        constructor(public name: string, public lowest: number,
                    public average: number, public correct: boolean,
                    public stddev: number) { }
    }

    //? Manages a collection of Measurement and SumMeasurement objects.
    //? Once we collect several Measurement objects for a particular program,
    //? we can summarize them into a single SumMeasurement object containing
    //? the relevant information for all runs.
    export class MeasurementsMgr {
        measurements: Measurement[];
        sumMeasurements: SumMeasurement[];
        constructor() {
            this.measurements = [];
            this.sumMeasurements = [];
        }

        //? Returns the SumMeasurement object for a particular program,
        //? or -1 if it is not yet available.
        public lookUp(s: string): number {
            if (s == null)
                return -1;
            for (var i = 0; i < this.sumMeasurements.length; ++i) {
                if (this.sumMeasurements[i].name == s)
                    return this.sumMeasurements[i].lowest;
            }
            // if we were unable to find, check local storage
            var benchtimesraw = localStorage["benchtimes"];
            if (benchtimesraw) {
                var benchtimes: { [name: string]: number } = {};
                try {
                    benchtimes = JSON.parse(benchtimesraw);
                } catch (e) { }
                var lowest = benchtimes[s];
                if (lowest)
                    return lowest;
            }
            return -1;
        }

        //? Returns the lowest time found for a particular program,
        //? or -1 if not available.
        public getLowest(s: string): number {
            var lowest = Number.MAX_VALUE;
            for (var i = 0; i < this.measurements.length; ++i) {
                if (this.measurements[i].name == s &&
                    this.measurements[i].time < lowest)
                    lowest = this.measurements[i].time;
            }
            if (lowest == Number.MAX_VALUE)
                return -1;
            return lowest;
        }

        //? Creates SumMeasurement objects with summary of all Measurement
        //? objects managed, one for each different program.
        //? It replaces the old list of SumMeasurement.
        public computeAggregate(): void {
            var aggList : SumMeasurement[] = [];
            this.measurements.forEach((entry: Measurement) => {
                // See if it already has an aggregate record
                var s = entry.name;
                for (var i = 0; i < aggList.length; ++i) {
                    if (aggList[i].name == s)
                        return;
                }
                var eltList : Measurement[] = [];
                this.measurements.forEach((a) => {
                    if (a.name == s)
                        eltList.push(a);
                });
                // Calculates the aggregate record for this program
                var agg = new SumMeasurement(s,0,0,false,0);
                var cumulative = 0;
                var lowest = Number.MAX_VALUE;
                var correct = true;
                for (var i = 0; i < eltList.length; ++i) {
                    cumulative += eltList[i].time;
                    if (eltList[i].time < lowest)
                       lowest = eltList[i].time;
                    correct = correct && eltList[i].correct;
                }
                agg.average = cumulative / eltList.length;
                agg.lowest = lowest;
                agg.correct = correct;
                var sumdev = 0;
                for (var i = 0; i < eltList.length; ++i) {
                    sumdev += (eltList[i].time - agg.average)
                        * (eltList[i].time - agg.average);
                }
                agg.stddev = Math.sqrt(sumdev / eltList.length);
                aggList.push(agg);
            });
            this.sumMeasurements = aggList;
        }

        //? Calculates the total time spent in the testing of all the
        //? measurements that were recorded in this manager
        public totalTime(): number {
            var total = 0;
            this.measurements.forEach((elt: Measurement) => {
                total += elt.time;
            });
            return total;
        }

        //? Iterates over all aggregates (SumMeasurement objects) calling
        //? callback for each element.
        public forEachAggregate(callback: (SumMeasurement) => void) {
            this.sumMeasurements.forEach(callback);
        }

        //? Iterates over all measurements (Measurement objects) calling
        //? callback for each element.
        public forEachMeasurement(callback: (Measurement) => void) {
            this.measurements.forEach(callback);
        }

        //? Returns how many aggregates (SumMeasurement objects) there are
        public aggregatesCount() : number {
            return this.sumMeasurements.length;
        }

        //? Compute the unit time if this manager has the results of all
        //? JavaScript benchmarks.
        public computeUnitTime(): number {
            var num = 0;
            if (this.sumMeasurements.length == 0)
                this.computeAggregate();
            var benchtimes: { [name: string]: number; } = {};
            this.sumMeasurements.forEach((elt: SumMeasurement) => {
                // we also need to store all intermediate programs time
                benchtimes[elt.name] = Math.round(elt.lowest * 100) / 100;
                num += elt.lowest;
            });
            localStorage["benchtimes"] = JSON.stringify(benchtimes);
            return Math.round(num * 100) / 100;
        }

        //? Clear all data used by this manager
        public clear(): void {
            this.sumMeasurements = [];
            this.measurements = [];
        }
    }

    //? A manager instance to store measurements of JavaScript benchmarks
    export var jsProgramsTested: MeasurementsMgr = new MeasurementsMgr();
    //? A manager instance to store measurements of TouchDevelop benchmarks
    export var tdProgramsTested: MeasurementsMgr = new MeasurementsMgr();

    //? Minimum amount of time that JavaScript benchmarks should run (ms) to
    //? improve the stability of the unit time. It ensures that if the platform
    //? is too fast, we will perform multiple measurements.
    var timeOutTime = 5000;

    //? Minimum number of times to run each JavaScript benchmark for unit time
    //? computation
    var jsIterations = 3;

    //? Identify a JavaScript benchmark
    interface IJsBenchmark {
        fn: (number, string) => number;  // Callback to execute this benchmark
        name: string;                    // The name of this benchmark
        n: number;                       // Input size
    }

    //? Identify a TouchDevelop benchmark
    interface IBenchmark {
        id: string;     // The published script id
        name: string;   // The name of this benchmark program
    }

    //? The list of all JavaScript benchmarks implemented in this module, as
    //? well as the size of the input used to balance the time taken by each
    //? benchmark.
    var jsProgramsToTest : IJsBenchmark[] = [
        { fn: BinaryTrees.main, name: 'BinaryTrees', n: 9 },
        { fn: Mandelbrot.main, name: 'Mandelbrot', n: 250 },
        { fn: SpectralNorm.main, name: 'SpectralNorm', n: 150 },
        { fn: NBody.main, name: 'N Body', n: 7000 },
        { fn: Pfannkuchen.main, name: 'Pfannkuchen', n: 8 },
        { fn: Fasta.main, name: 'Fasta', n: 15000 },
        { fn: ReverseComplement.main, name:'ReverseComplement', n:15000 },
        { fn: KNucleotide.main, name: 'KNucleotide', n: 750 }
    ];
    //? The list of corresponding TouchDevelop programs that use the exact
    //? same input size hardcoded into these published ids.
    var tdBenchmarks : IBenchmark[] = [
        { id: "smvepynf", name: 'BinaryTrees' },
        { id: "iyyydbkw", name: 'Mandelbrot' },
        { id: "kibzzrvl", name: 'SpectralNorm' },
        { id: "gkzpyhif", name: 'N Body' },
        { id: "hmbgugdu", name: 'Pfannkuchen' },
        { id: "ezksbyle", name: 'Fastax' },
        { id: "sqdrxjsu", name: 'ReverseComplement'},
        { id: "zuakcwjt", name: 'KNucleotide' }
    ];
    //? A list of the same TouchDevelop programs, but using a reduced input
    //? for functional testing only.
    var tdSmallBenchmarks : IBenchmark[] = [
        { id: "kqlseizl", name: 'binary trees (small)' },
        { id: "ntgpnwsf", name: 'mandelbrot (small)' },
        { id: "bvmckmio", name: 'spectral norm (small)' },
        { id: "bjhxvkup", name: 'n body (small)' },
        { id: "aznnthrd", name: 'fannkuch redux (small)' },
        { id: "nejqfqkl", name: 'fasta (small)' },
        // This script cannot be upgraded to IDS right now - Cloud balks on the JSON size
        //{ id: "ncjphsqu", name: 'reverse complement (small)' },
        { id: "rjwclgjz", name: "k nucleotide (small)" }
    ];

    //? Respond to the "Run Benchmarks" button by running JavaScript benchmarks,
    //? TouchDevelop benchmarks and displaying a summary screen.
    export function runBenchmarksButtonAsync(): void {
        return Cloud.isOnlineWithPingAsync()
            .then((isOnline: boolean) => {
                if (!isOnline) {
                    TDev.ModalDialog.info("Tests cancelled", "You seem to be offline. Tests can only run when you are online.");
                    return;
                }
                invalidateResults = false;
                installVisibilityChangeHook();
                // The display function receives the total number of ms spent into
                // the unit time calculation "durr".
                var displayResults = (res: { durr: number; iter: number; }) => {
                    ProgressOverlay.hide();
                    uninstallVisibilityChangeHook();
                    displayBenchResults(res.durr, res.iter);
                };

                var displayError = (err: any) => {
                    ProgressOverlay.hide();
                    uninstallVisibilityChangeHook();
                    TDev.ModalDialog.info("Tests cancelled", "We couldn't complete the tests: " + err.message);
                };

                if (TDev.dbg) {
                    ProgressOverlay.lockAndShow("Running the TouchDevelop benchmark",
                                                () => {
                                                    runUnitBenchmarksAsync(/*test=*/false, /*updateOverlay=*/true)
                                                        .then((res: { durr: number; iter: number; }): Promise => {
                                                            var rp = new PromiseInv();
                                                            runTDBenchmarksAsync(/*testOnly=*/false,/*update=*/true)
                                                                .then((tdDur: number) => {
                                                                    rp.success({
                                                                        durr: tdDur + res.durr,
                                                                        iter: res.iter
                                                                    });
                                                                }, rp.error);
                                                            return rp;
                                                        }).then(displayResults, displayError);
                                                });
                } else {
                    iterations -= tdBenchmarks.length;
                    ProgressOverlay.lockAndShow("Running the TouchDevelop benchmark",
                                                () => {
                                                    runUnitBenchmarksAsync(/*test=*/false, /*updateOverlay=*/true)
                                                        .then(displayResults, displayError);
                                                });
                }
            }).done();
    }

    export function unitTimeReported(): boolean {
        return !!localStorage["perfunitv2reported"];
    }

    //? Sends unit time data to the cloud
    export function reportUnitTime(): void {
        var durr = RT.Perf.unit();
        if (durr < 0) {
            Util.log("benchmarker: There is no unit time to be submitted.");
            return;
        }
        var a: RT.Perf.PerfData = {
            unitduration: durr,
            duration: durr,
            id: "unit",
            compilerversion: TDev.AST.Compiler.version,
            releaseid: Cloud.currentReleaseId,
            userplatform: Browser.platformCaps
        };

        Cloud.postPrivateApiAsync("benchmarks", [a]).done(
            json => {
                localStorage["perfunitv2reported"] = 1;
                Util.log("benchmarker: Unit time successfully submitted.");
            },
            e => Util.log("benchmarker: Unit time submission failed.")
            );
    }

    //? Starts measuring the unit time by running JavaScript benchmarks and
    //? displays a "please wait" screen to avoid any other activity while
    //? the benchmark is running.
    export function measureUnitTimeAsync(): Promise {
        var m = new ModalDialog();
        invalidateResults = false;
        m.canDismiss = false;
		m.fullWhite();
        m.add(div("wall-dialog-header", lf("Calculating your experience score...")));
        m.add(div("wall-dialog-body", lf("Please wait, it should take less than a minute.")));
        m.show();
        return runUnitBenchmarksAsync(false, false).then((res) => {
            m.canDismiss = true;
            m.dismiss();
            return res;
        });
    }

    //? Prompts a dialog while running the benchmarks the user voluntarily accepted
    //? to run. It can either run one benchmark or the entire suite.
    export function runTDBenchmarksWithDialog(entireSuite = false): Promise {
        var rp = new PromiseInv();
        invalidateResults = false;
        installVisibilityChangeHook();
        var showEndDialog = (res: number) => {
                uninstallVisibilityChangeHook();
                var m = new ModalDialog();
                m.add(div("wall-dialog-header", lf("Finished!")));
                m.add(div("wall-dialog-body", lf("Your help has been very important, thank you.")));
                m.add(div("wall-dialog-body", "Your device took " + res + " ms to run this test."));
                m.add(div("wall-dialog-buttons", HTML.mkButton(lf("ok"), () => {
                    m.dismiss();
                })));
                m.onDismiss = () => {
                    rp.success(undefined);
                }
                m.show();
            };


        var displayError = (err: any) => {
            ProgressOverlay.hide();
            uninstallVisibilityChangeHook();
            TDev.ModalDialog.info("Tests cancelled", "We couldn't complete the tests: " + err.message);
        };

        iterations = 0;

        var doIt = () => {
            ProgressOverlay.lockAndShow("Running the TouchDevelop benchmark",
                () => {
                    if (RT.Perf.unit() < 0) {
                        runUnitBenchmarksAsync(/*test=*/false, /*updateOverlay=*/true)
                            .done((res: { durr: number; iter: number; }) => {
                                var rp = new PromiseInv();
                                var unit = RT.Perf.unit();
                                if (unit > 0) {
                                    var a: RT.Perf.PerfData = {
                                        unitduration: unit,
                                        duration: unit,
                                        id: "unit",
                                        compilerversion: TDev.AST.Compiler.version,
                                        releaseid: Cloud.currentReleaseId,
                                        userplatform: Browser.platformCaps
                                    };
                                    RT.Perf.pushCustomData(a);
                                    runTDBenchmarksAsync(false, true, !entireSuite)
                                        .done((tdDur: number) => {
                                            var durr = tdDur + res.durr;
                                            ProgressOverlay.hide();
                                            showEndDialog(durr);
                                            RT.Perf.saveCurrent(true);
                                        }, displayError);
                                }
                            });
                    } else {
                        runTDBenchmarksAsync(false, true, !entireSuite).done((res) => {
                            ProgressOverlay.hide();
                            showEndDialog(res);
                            if (!invalidateResults)
                                RT.Perf.saveCurrent(true);
                        }, displayError);
                    }
                });
        };

        ProgressOverlay.lockAndShow("Please wait while syncing with server", () => {
            var hideAndDoIt = () => {
                ProgressOverlay.hide();
                doIt();
            };
            World.syncAsync().then(hideAndDoIt, hideAndDoIt);
        });
        return rp;
    }

    var invalidateResults = false;

    function getHiddenType(): string {
        var hidden = "hidden";
        if (hidden in document)
            return hidden;
        else if ((hidden = "mozHidden") in document)
            return hidden;
        else if ((hidden = "webkitHidden") in document)
            return hidden;
        else if ((hidden = "msHidden") in document)
            return hidden;
        return hidden;
    }

    function onchange(evt): void {
        evt = evt || window.event;
        if (document[getHiddenType()]) {
            invalidateResults = true;
        }
    }

    function uninstallVisibilityChangeHook(): void {
        var hidden = getHiddenType();
        if (hidden == "hidden")
            document.removeEventListener("visibilitychange", onchange, false);
        else if (hidden == "mozHidden")
            document.removeEventListener("mozvisibilitychange", onchange, false);
        else if (hidden == "webkitHidden")
            document.removeEventListener("webkitvisibilitychange", onchange, false);
        else if (hidden == "msHidden")
            document.removeEventListener("msvisibilitychange", onchange, false);
    }

    function installVisibilityChangeHook():void {
        var hidden = "hidden";

        if (hidden in document)
            document.addEventListener("visibilitychange", onchange);
        else if ((hidden = "mozHidden") in document)
            document.addEventListener("mozvisibilitychange", onchange);
        else if ((hidden = "webkitHidden") in document)
            document.addEventListener("webkitvisibilitychange", onchange);
        else if ((hidden = "msHidden") in document)
            document.addEventListener("msvisibilitychange", onchange);
    }

    var iterations = 0;

    //? Run JavaScript benchmarks and computes the unit time. The
    //? jsProgramsTested object is also populated with all individual
    //? measurements for each program.
    //?
    //? Inputs:
    //?
    //?  - testOnly:  runs only one iteration to check if the output is correct
    //?  - updateOverlay:  sends messages to ProgressOverlay reporting progress
    //?
    //? Returns:
    //?
    //?   promise with pair <time spent, number iterations>
    export function runUnitBenchmarksAsync(testOnly: boolean = false,
                                           updateOverlay: boolean = false)
    : Promise {
        Util.log('perf: running unit benchmarks');
        jsProgramsTested.clear();
        var rp = new PromiseInv();
        var i = 0, numIterations = 0;
        var totalTime = RT.Perf.start(testOnly? "testunitbenchmark" : "unitbenchmark", !testOnly);
        var timeRanOut = false;
        if (iterations > 0)
            iterations = 0;

        Util.setTimeout(timeOutTime, () => {
            timeRanOut = true;
        });

        // Our inductive step to be done asynchronously
        var doNextJS = () => {
            if (invalidateResults) {
                // don't crash
                // rp.error(new Error("User went away."));
                RT.Perf.purgeSavedEvents();
                invalidateResults = false;
                return;
            }
            // Stop criteria is after 1 iteration for tests, otherwise
            // runs a minimum of jsIterations and a minimum of timeOutTime ms
            if ((i >= 1 && testOnly) || (i >= jsIterations && timeRanOut)) {
                jsProgramsTested.computeAggregate();
                RT.Perf.setUnit(jsProgramsTested.computeUnitTime());
                iterations = (testOnly ?  1: jsIterations);
                rp.success({durr: RT.Perf.stop(totalTime),
                            iter: i});
                return;
            }

            if (updateOverlay) {
                if (testOnly) {
                    ProgressOverlay.setProgress("testing benchmarks (" + (i + 1).toString() + " of "
                        + (1 + getNumScripts() + TestMgr.getNumScripts()).toString() + ")");
                } else if (i < jsIterations) {
                    ProgressOverlay.setProgress("unit time measurement (" + (i + 1).toString() + " of "
                        + (jsIterations + getNumScripts() + TestMgr.getNumScripts()).toString() + ")");
                } else {
                    var curTime = ((timeOutTime - RT.Perf.ellapsed(totalTime))/1000).toFixed(0);
                    var suffix = (curTime == "1")? " second" : " seconds";
                    ProgressOverlay.setProgress("unit time - measuring until " + curTime + suffix +  " time out (" + jsIterations + " of " + (jsIterations
                        + getNumScripts() + TestMgr.getNumScripts()).toString() + ")");
                }
            }
            // collect time
            try {
                for (var idx = 0; idx < jsProgramsToTest.length; ++idx) {
                    var ellapsed = BenchTester.Run(jsProgramsToTest[idx]);
                    jsProgramsTested.measurements.push(ellapsed);
                    var logStr = "perf unittime (" + ellapsed.name + ") took ";
                    logStr += ellapsed.time.toFixed(0) + " ms";
                    Util.log(logStr);
                }
            } catch (err) {
                Util.reportError('perf: run benchmarks failed with error: ',
                                 err, false);
                rp.error(err);
                return;
            }
            ++i;
            Util.setTimeout(Browser.isWebkit ? 100 : 1, doNextJS)
        }

        Util.setTimeout(Browser.isWebkit ? 100 : 1, doNextJS)
        return rp;
    }

    export function getNumScripts(): number {
        return tdBenchmarks.length + iterations;
    }

    function getRandomCompilerFlags(): AST.CompilerOptions {
        var randomValue = Math.floor(Math.random() * 8)
        switch (randomValue) {
            case 0: return {};
            case 1: return { inlining: true };
            case 2: return { okElimination: true };
            case 3: return { blockChaining: true };
            case 4: return { inlining: true,
                             okElimination: true };
            case 5: return { inlining: true,
                             blockChaining: true };
            case 6: return { okElimination: true,
                             blockChaining: true };
            case 7: return { inlining: true,
                             okElimination: true,
                             blockChaining: true };
        }
    }

    function buildCompilerFlagsString(flags: AST.CompilerOptions): string {
        if (flags == null) {
            flags = {
                inlining: /inlining/.test(document.URL),
                okElimination: /okElimination/.test(document.URL),
                blockChaining: /blockChaining/.test(document.URL)
            };
        }
        var res = "";
        if (flags.inlining)
            res += "i"
        if (flags.okElimination)
            res += "o"
        if (flags.blockChaining)
            res += "b"
        return res;
    }

    export function reportBenchmarkResult(name: string, id: string, lowest: number,
                                 flags: AST.CompilerOptions): void {
        var jsdur = jsProgramsTested.lookUp(name) > 0 ?
            jsProgramsTested.lookUp(name) : 0;
        jsdur = Math.round(jsdur * 100) / 100;
        var data: RT.Perf.PerfData = {
            unitduration: RT.Perf.unit(),
            duration: lowest,
            id: id,
            jsduration: jsdur,
            compilerflags: buildCompilerFlagsString(flags),
            compilerversion: TDev.AST.Compiler.version,
            releaseid: Cloud.currentReleaseId,
            userplatform: Browser.platformCaps
        };
        RT.Perf.pushCustomData(data);
    }

    //? Run TouchDevelop benchmarks and populates tdProgramsTested with the
    //? results for each program tested.
    //?  - testOnly:  runs only one iteration to check if the output is correct
    //?  - updateOverlay:  sends messages to ProgressOverlay reporting progress
    //?  - runRandom: run a random program from the benchmark and report
    //?      the results to the cloud
    //? It returns a Promise with the total time spent in this process
    export function runTDBenchmarksAsync(testOnly: boolean = false,
                                         updateOverlay : boolean = false,
                                         runRandom : boolean = false)
    : Promise {
        var scriptCache = [];
        tdProgramsTested.clear();
        // It is expensive to run full TD benchmark iterations
        var tdIterations = 2, i = 0;
        var rp = new PromiseInv();
        var totalTime = RT.Perf.start(testOnly ? "testtdbenchmarks" : "tdbenchmarks", !(testOnly || runRandom));
        var myBench: IBenchmark[] = null;
        var flags: AST.CompilerOptions = null;
        var timeRanOut = false;
        if (runRandom) {
            myBench = [tdBenchmarks[Math.floor(Math.random()*tdBenchmarks.length)]];
            flags = getRandomCompilerFlags();
            tdIterations = 1;
        } else {
            myBench = tdBenchmarks;
        }
        var tryAgain = 5;

        // If we are testing, reduce the number to only one iteration and
        // reduce the input size
        if (testOnly) {
            tdIterations = 1;
            myBench = tdSmallBenchmarks;
        }

        // Our inductive step to be done asynchronously
        function doNextTD(): void {
            if (invalidateResults) {
                rp.error(new Error("User went away."));
                RT.Perf.purgeSavedEvents();
                invalidateResults = false;
                return;
            }
            // Stop criteria is met once every benchmark runs for tdIterations
            if (i >= myBench.length * tdIterations) {
                var durr = RT.Perf.stop(totalTime);
                tdProgramsTested.computeAggregate();
                setGlobalScript(null);
                rp.success(durr);
                return;
            }

            var prg = myBench[Math.floor(i / tdIterations)];

            if (updateOverlay) {
                var prefix = "";
                if (testOnly) {
                    prefix = "script ";
                } else {
                    prefix = "performance test ";
                }
                ProgressOverlay.setProgress(prefix + prg.id + " ("
                    + (Math.floor(i / tdIterations) + 1 + iterations)
                        .toString() + " of " + (myBench.length + iterations
                        + TestMgr.getNumScripts()).toString() + ")");

            }
            i++;

            var getScriptAsync = (s) => {
                if (!s) s = prg.id;
                var r = scriptCache[s];
                if (r) return Promise.as(r);
                return ScriptCache.getScriptAsync(s)
                    .then((text) => (scriptCache[s] = text));
            }

            AST.loadScriptAsync(getScriptAsync).done((resp: AST.LoadScriptResult) =>
            {
                if (resp.numErrors > 0 && Script.actions()
                    .every((a) => !a.isCompilerTest())) {
                    var res = new Measurement(prg.id + Script.getName(), 0,
                                              false);
                    res.name += " (parse errors)";
                    tdProgramsTested.measurements.push(res);

                    var h = new TestMgr.TestHost();
                    h.scriptId = prg.id;
                    h.exceptionHandler(new Error(resp.status));

                    doNextTD();
                } else {
                    var timeToken = RT.Perf.start(prg.id);
                    TestMgr.runTestsAsync(prg.id, flags)
                        .done((res: TestMgr.ScriptTestResult) => {
                            res.totalTime = RT.Perf.stop(timeToken);
                            if (res.downloadError) {
                                if (--tryAgain == 0) {
                                    rp.error("download error");
                                    return;
                                }
                                --i;
                                doNextTD();
                                return;
                            }
                            tdProgramsTested.measurements
                                .push(new Measurement(prg.name, res.totalTime,
                                                      res.numErrors == 0 ? true
                                    : false));
                            // Report if it is the last iteration of this benchmark
                            if (i % tdIterations == 0) {
                                var lowest = tdProgramsTested.getLowest(prg.name);
                                if (lowest > 0)
                                    reportBenchmarkResult(prg.name, prg.id, lowest, flags);
                            }
                            doNextTD();
                        })
                }
            }, rp.error);
        }

        function startTDTestsAsync() : Promise {
            i = 0;
            var downloadErrors = 0;
            return Promise.join(myBench.map((bench) => {
                ScriptCache.getScriptAsync(bench.id).then((text) => {
                    scriptCache[bench.id] = text;
                    if (text = "") {
                        scriptCache[bench.id] = false;
                        ++downloadErrors;
                    }
                })
            })).then((): Promise => {
                if (downloadErrors > 0) {
                    HTML.showProgressNotification(lf("Warning: Failed to download script. Are you online?"));
                }
                doNextTD();
                return rp;
            });
        }

        return startTDTestsAsync();
    }

    function copyToClipboard(s: string): void {
        if (!!(<any>window).clipboardData &&
            !!(<any>window).clipboardData.setData) {
            window.clipboardData.setData('Text', s);
        } else {
            ModalDialog.showText(s, lf("copy to clipboard"), lf("Copy the text below into your clipboard."));
        }
    }

    export function displayPerfData(): void {
        var m = new ModalDialog();
        var allData: RT.Perf.PerfData[] = [];

        m.addClass("accountSettings");
        //m.noChrome();

        var setIds: string[] = [];
        var changeSetIds = (name: string, v: boolean) => {
            if (v)
                setIds.push(name);
            else {
                if (setIds.indexOf(name) >= 0) {
                    setIds.splice(setIds.indexOf(name), 1);
                }
            }
        };

        var errorHandler = (err) => {
            TDev.ModalDialog.info("Perf display cancelled", "We couldn't fetch the data: " + err[0].message);
        }

        var fetchDataAsync = (id: string, continuation: string): Promise => {
            var rp = new PromiseInv();
            var reqstr = "benchmarks?view=raw&id=" + id;
            if (continuation != null)
                reqstr += "&continuation=" + continuation;
            Util.httpGetJsonAsync(Cloud.getServiceUrl() + "/api/" + reqstr).then((data: any): void => {
                allData = allData.concat(data.items);
                if (data.continuation == null || data.continuation.length == 0)
                    rp.success(undefined);
                else
                    fetchDataAsync(id, data.continuation).then(() => {
                        rp.success(undefined);
                    }, rp.error);
            }, rp.error);
            return rp;
        };

        var displayData = () => {
            HTML.showProgressNotification(lf("retrieving cloud data..."));
            Promise.join(setIds.map((s: string) => fetchDataAsync(s, null))).done(() => {
                if (allData.length == 0) {
                    TDev.ModalDialog.info("Empty dataset", lf("No results match your criteria."));
                    return;
                }
                var s = "unitduration\tduration\tid\tjsduration\tcompilerflags\tcompilerversion\treleaseid\tplatform\n";
                allData.forEach((data: RT.Perf.PerfData) => {
                    s += data.unitduration + "\t" + data.duration
                    + "\t" + data.id + "\t" + (data.jsduration == undefined ? 0 : data.jsduration)
                    + "\t" + (data.compilerflags == undefined ? "" : data.compilerflags)
                    + "\t" + data.compilerversion + "\t" + data.releaseid + "\t" + data.userplatform.join(",")
                    + "\n";
                });
                copyToClipboard(s);
            }, errorHandler);
        }

        m.add([div("wall-dialog-header", lf("TouchDevelop settings")),
               div("wall-dialog-body", lf("Which perf measurements are you interested in?"))
            ]);
        tdBenchmarks.forEach((a: IBenchmark) => {
            m.add(div("wall-dialog-body", HTML.mkCheckBox(a.name, (v) => changeSetIds(a.id, v), false)));
        });

        var divbuttons = div("wall-dialog-buttons", "");
        divbuttons.appendChild(HTML.mkButton(lf("ok"), () => {
            m.onDismiss = () => {
                displayData();
            };
            m.dismiss();
        }));
        divbuttons.appendChild(HTML.mkButton(lf("cancel"), () => { m.dismiss() }));

        m.add([div("wall-dialog-body", HTML.mkCheckBox("syncasync", (v) => changeSetIds("syncasync", v), false)),
               div("wall-dialog-body", HTML.mkCheckBox("tests", (v) => changeSetIds("tests", v), false)),
               divbuttons
            ]);

        m.fullWhite();
        m.setScroll();
        m.show();
    }

    function displayBenchResults(totalTime: number, numIterations: number): void {
        elt("testHostFrame").setChildren([]);

        var m = new ModalDialog();
        var d = div("test-results");
        m.add(d);
        m.noChrome();
        m.setScroll();

        var h = "";
        var hasError = false;

        var perScript = "";
        if (RT.Perf.unit() > 0 && jsProgramsTested.aggregatesCount() > 0) {
            perScript += "<div>Perf unit time measurement (total time: ";
            perScript += (totalTime / RT.Perf.unit()).toFixed(3) + " - ";
            perScript += totalTime.toFixed(0) + " ms - iterations: " + numIterations;
            perScript += ")</div>\n<div><table>\n";
            perScript += "<tr> <th>Name</th> <th>Lowest time</th> ";
            perScript += "<th>Average</th> <th>Std dev</th></tr> \n";
            jsProgramsTested.forEachAggregate((pgr) => {
                if (!pgr.correct)
                    hasError = true;
                perScript += "<tr><td><b class='";
                perScript += (pgr.correct ? "test-ok" : "test-error");
                perScript += "'>" + pgr.name + "</b></td> <td>";
                perScript += (pgr.lowest / RT.Perf.unit()).toFixed(3) + " - ";
                perScript += pgr.lowest.toFixed(0) + " ms </td> <td>";
                perScript += (pgr.average / RT.Perf.unit()).toFixed(3) + " - ";
                perScript += pgr.average.toFixed(3) + " ms. </td><td> +-";
                perScript += pgr.stddev.toFixed(3) +"</td></tr> \n";
            });
            perScript += "</table></div>\n";
        }
        if (tdProgramsTested.aggregatesCount() > 0) {
            perScript += "<div><table>\n";
            perScript += "<tr> <th>Script id</th> <th>TD Slowdown</th> ";
            perScript += "<th>Average</th> <th>Std dev</th></tr> \n";
            tdProgramsTested.forEachAggregate((pgr) => {
                perScript += "<tr><td><b class='";
                perScript += (pgr.correct ? "test-ok" : "test-error");
                perScript += "'>" + pgr.name + "</b></td> <td>";
                if (jsProgramsTested.lookUp(pgr.name) > 0) {
                    perScript += (pgr.lowest / jsProgramsTested.lookUp(pgr.name)).toFixed(1);
                } else {
                    perScript += "N/A ";
                }
                perScript += "x</td> <td>";
                perScript += (pgr.average / RT.Perf.unit()).toFixed(3) + " - ";
                perScript += pgr.average.toFixed(1) + " ms. </td><td> +-";
                perScript += pgr.stddev.toFixed(3) + "</td></tr> \n";
            });
            perScript += "</table></div>\n";
        }
        if (RT.Perf.unit() > 0) {
            perScript += "<br/><div><b>Unit time is " + RT.Perf.unit()
                .toFixed(3);
            perScript += " ms</b></div>\n";
        }

        if (!hasError)
            h += "<h2 class='test-ok'>Benchmarks completed</h2>\n"
        else
            h += "<h2 class='test-error'>Benchmarks in red failed</h2>\n"

        Browser.setInnerHTML(d, h + perScript);
        d.appendChild(HTML.mkButton(lf("ok"), () => {m.dismiss() }));

        m.show();
    }

    interface IPerfBenchmark {
        id: string;
        browser: BrowserSoftware;
        unit: number;
        value: number;
    }

    //? Time measurement code
    module BenchTester {
        export function hashResultString(input: string): number {
            var h = 0, g = 0;
            for (var i = 0; i < input.length; ++i) {
                h = (h << 4) + input[i].charCodeAt(0) + 5;
                g = h & 0xf0000000;
                if (g != 0)
                    h = h ^ (g >> 24);
                h = h & ~g;
            }
            return h;
        }

        //? Runs a benchmark for i times and reports mesurements
        export function Run(put: IJsBenchmark) {
            var outs = [];
            Fasta.resetRandomSeed();
            var time = put.fn(put.n, outs);
            var correct = false;
			var hash = hashResultString(outs.join(""));
            if (put.name == "BinaryTrees" && hash == 45204502)
                correct = true;
            if (put.name == "Mandelbrot" && hash == 18057621)
                correct = true;
            if (put.name == "SpectralNorm" && hash == 1794939966)
                correct = true;
            if (put.name == "N Body" && hash == 23206584)
                correct = true;
            if (put.name == "Pfannkuchen" && hash == 1066574183)
                correct = true;
            if (put.name == "Fasta" && hash == 1577509497)
                correct = true;
            if (put.name == "ReverseComplement" && hash == 229377384)
                correct = true;
            if (put.name == "KNucleotide" && hash == 1731025545)
                correct = true;
            return new Measurement(put.name, time, correct);
        }
    }
}
