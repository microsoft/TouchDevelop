/// <reference path='../typings/node/node.d.ts' />

'use strict';

import * as td from 'td';

export class Queue
    extends td.JsonRecord
{
    public numRunning: number = 0;
    public maxRunning: number = 0;
    public toRun: td.Action[] = [];

    /**
     * Add a new task to the queue. The task will run when queue has spare capacity.
     */
    public schedule(task:td.Action) : void
    {
        this.toRun.push(task);
        this.pokeRunQueue();
    }

    private pokeRunQueue() : void
    {
        let q: Queue = this;
        while (q.toRun.length > 0 && q.numRunning < q.maxRunning) {
            let action2 = q.toRun[0];
            q.toRun.splice(0, 1);
            q.numRunning += 1;
            process.nextTick(() => q.runAndPokeAsync(action2));
        }
    }

    private async runAndPokeAsync(action:td.Action) : Promise< void >
    {
        let q: Queue = this;
        await action();
        q.numRunning -= 1;
        q.pokeRunQueue();
    }

    /**
     * Waits until there are no more tasks running in the queue.
     */
    public async waitForEmptyAsync() : Promise< void >
    {
        while (this.numRunning > 0) {
            await td.sleepAsync(0.1);
        }
    }
}

/**
 * Runs the ``action`` for the elements of a collection in parralel
 */
export async function forAsync(count: number, action:td.NumberAction) : Promise< void >
{
    let coll = [];
    for (let i = 0; i < count; i++) {
        coll.push(action(i));
    }
    for (let task2 of coll) {
        await task2;
    }
}

async function exampleAsync() : Promise< void >
{
    // A library to run operations in parallel
    // {hide}
    let entries = "a;b;c".split(";");
    // {/hide}
    // ### for
    // The ``for`` action takes the number of element and an action to be called on each index. The action will be run `async` on each element.
    await forAsync(entries.length, async(x: number) => {
        let s = entries[x];
        // do something with s
    });
    // ### for batches
    // Similar to `code->for` but wait for groups of elements to finish processing.
    await forBatchedAsync(entries.length, 10, async(x1: number) => {
        let s1 = entries[x1];
        // do something with s
    }
    , async() => {
    });
    // ### for json
    // Similar to `code->for` but applies the action to the array element or field elements of JSON value.
    // {hide}
    let js = ({});
    // {/hide}
    await forJsonAsync(js, async(jchild: td.JsonObject) => {
        // do something with ``child``
    });
    // ### queue
    // `queue` is used to run at most `N` async tasks at once. For example, the following code will initiate at most 5 downloads at once:
    let queue = createQueue(5);
}

/**
 * Runs the ``action`` for the elements of a collection in parralel in batches. Waits for each batch to finish before starting on the next one. The batch action gets executed after each batch.
 */
export async function forBatchedAsync(count: number, batchCount: number, itemAction:td.NumberAction, batchAction:td.Action) : Promise< void >
{
    let coll = [];
    let i = 0;
    while (i < count) {
        let c = Math.min(batchCount, count - i);
        await forAsync(c, async(x: number) => {
            let j = i + x;
            await itemAction(j);
        });
        await batchAction();
        i = i + c;
    }
}

/**
 * Construct a new queue that can run up to `max running` tasks at a time.
 * {hints:max running:5}
 */
export function createQueue(maxRunning: number) : Queue
{
    let queue = new Queue();
    queue.maxRunning = maxRunning;
    return queue;
}

/**
 * Applies the ``action`` action to the array element or field values.
 */
export async function forJsonAsync(js: td.JsonObject, action:td.JsonAction) : Promise< void >
{
    if (Array.isArray(js)) {
        await forAsync(js.length, async(x: number) => {
            let jsi = js[x];
            await action(jsi);
        });
    } else {
        let keys = Object.keys(js);
        await forAsync(keys.length, async(x1: number) => {
            let jsf = js[keys[x1]];
            await action(jsf);
        });
    }
}


