meta version "v2.2,js,ctx,refs,localcloud,unicodemodel,allasync,upperplex";
meta name "parallel";
meta icon "AlmostEqual";
meta color "#ff008080";
meta rootId "hm3ag5H4HdONCI6xFGB26i21";
meta isLibrary "yes";
meta allowExport "yes";
meta hasIds "yes";
meta platform "current";
meta parentIds "";
// A library to run operations in parralel
#l8q4PLuTeO32zahN
action @for(#MbFPt0h2CuDzUvpx count: Number, #Plr6Xkw4IkkDMy5G @action: Number_Action) {
  #BIImwq8fBrhYCOX6 // Runs the ``action`` for the elements of a collection in parralel
  #cjCBHOG34oA2MY4Y $coll := create→Collection_of→Task_of→Nothing;
  #tITKqVNxzvNiqJ1v for 0 ≤ i < $count do {
    #xLkv1ISFhxFjKBuq $task := `async` $@action→run($i);
    #xrpqb7qkGDicnIle $coll→add($task);
  }
  #L4ffrFxU2NpvctWh foreach task2 in $coll
  do {
    #z27L7pqYIaAEK1RM $task2→await;
  }
}
#z9uzCKqcwOxFcCWl
action example() {
  #xWdX6NmbYaGcBpZl // A library to run operations in parallel
  #DwnKj8KXgbLpgkiT // {hide}
  #cj6Gp1R3ti2hYdis $entries := "a;b;c" →split(";");
  #a7lvdblEm4Uli9MP // {/hide}
  #xs8TnI3FXYPUq8co // ### for
  #xyxPHUpAZgL9tvMX // The ``for`` action takes the number of element and an action to be called on each index. The action will be run `async` on each element.
  #Ia9q0ZpwQ7ThUWbt code→@for($entries→count, $@action);
  #TKfukRpW1f5cLaPO where @action(x: Number) {
    #xieo7IlRbNzhHZ4J $s := $entries→at($x);
    #F06ke7CvJsnyoL2C // do something with s
  }
  #xbeaKa31HQtkbjd4 // ### for batches
  #WoGj93aspaM7M4x0 // Similar to `code->for` but wait for groups of elements to finish processing.
  #PUP0H8lyfc9uus2F code→for_batched($entries→count, 10, $item_action, $batch_action);
  #Rb2RNJjMvh2RvlBQ where item_action(x: Number) {
    #xHHBlvhLms5mDYyd $s := $entries→at($x);
    #I4Z2Kouqay4IDtLC // do something with s
  }
  #DUqKQOob0QSg9uWi where batch_action() {
    #Otw4T4hFZoJ2fl6E skip;
  }
  #ndfI79eUX8ICBDc5 // ### for json
  #qUhDTrGgPbAZHvRe // Similar to `code->for` but applies the action to the array element or field elements of JSON value.
  #NqI2Z6aS3xDrf4EQ // {hide}
  #VLkyWRQwumUF3zO5 $js := web→json("{}");
  #dxA4Y3ndvrMvvl61 // {/hide}
  #x5RAfeNjuMJ4SL8l code→for_json($js, $jaction);
  #Hf0FJk23KckRWwU4 where jaction(jchild: Json_Object) {
    #YmzsRo2BV0JMDrsk // do something with ``child``
  }
  #BgSuyvXg5ZSvQIuY // ### queue
  #aTZO4DechW17w7U2 // `queue` is used to run at most `N` async tasks at once. For example, the following code will initiate at most 5 downloads at once:
  #UVEP3jkVqyBEuHvR $queue := code→create_queue(5);
  #hnBXf4PLSTHblsJY // {hide}
  #zAMoRdQZichzP8c6 $urls := "foo,bar" →split(",");
  #zPpgDz6zsJj9PrIl // {/hide}
  #lxBnk0KWnmM6oDnM foreach url in $urls
  do {
    #YNPBHmLsxhZpNyiv $queue→schedule($@action);
    #AUlmqgUFviKDhh82 where @action() {
      #xui31jZ4OTL6LRfL web→download($url)→post_to_wall;
    }
  }
  #Y5y0iQT3D2NWxo5D $queue→wait_for_empty;
  #QWZAMdwYGZZCss41 // ... do something with files ...
  meta private;
}
#xGorkMU94Svdsz6e
action for_batched(#h04zXERolON4BNpm count: Number, #MoF7ft70R1VQLQK6 batch_count: Number, #HTnZIgWO6AmUt4wb item_action: Number_Action, #i21cw0dvNQp7Jr9H batch_action: Action) {
  #NqfszM2PJmshaBW8 // Runs the ``action`` for the elements of a collection in parralel in batches. Waits for each batch to finish before starting on the next one. The batch action gets executed after each batch.
  #C7UFPlAkbz2fF1L7 $coll := create→Collection_of→Task_of→Nothing;
  #zejKvb3h7iMRg7sc $i := 0;
  #KSBAiIY4jT8Oj27M while $i < $count do {
    #Eh3t2IuO1odKp7gU $c := math→min($batch_count, $count - $i);
    #oJGaYZRusRjKnk82 code→@for($c, $action2);
    #r74n8cnldF5zK7iz where action2(x: Number) {
      #QGjWAPXnBWTelmFJ $j := $i + $x;
      #IWkwk2XmaF4asUYw $item_action→run($j);
    }
    #D44j2DWbs3GKAKKu $batch_action→run;
    #bY4DwUDpjLDRPH5M $i := $i + $c;
  }
}
#grdHvzgY1bA41T8K4N4WDloD
action schedule(#jnZjv5fgHwVShCyU q: * queue, #f0qOUtzjZ7SzCPjo task: Action) {
  #xYpBn0h4riRw9iKA // Add a new task to the queue. The task will run when queue has spare capacity.
  #xVHcQwo4EidMQBmG $q→to_run→add($task);
  #L9PUejhPjKj4T916 $q→poke_run_queue;
  meta sync;
}
#h3GHc1N1hj4y24Q9UCWV72Cc
action poke_run_queue(#IjxmKUH0l9EKghFb q: * queue) {
  #kMaSexpxyoCm0p4J while $q→to_run→count > 0 `and` $q→num_running < $q→max_running do {
    #U495SJofMMD6b0rS $action2 := $q→to_run→at(0);
    #xj5L1UvGYSAF5o1K $q→to_run→remove_at(0);
    #afCgL8ZtYDgIHxR2 $q→num_running→\u25c8add(1);
    #U32T9eOhhDDL34OV time→run_after(0, $perform);
    #xAfmCWz8GHCSppMX where perform() {
      #xclIy54MWnivfbpx `async` $q→run_and_poke($action2);
    }
  }
  meta private;
  meta sync;
}
#BdGhpbmca
table queue {
  type = "Object";
  persistent = false;
  fields {
    #Lhv9Pv4Uci3w68Wta2uC8YUE num_running : Number
    #qXDbwXMCXHBF1Pw4LUJQz14x max_running : Number
    #F3rka445Dx9PJ4QWGAeS5edz to_run : Collection[Action]
  }
}
#xi00X2O2ZI4z7tyY3qI3ooku
action create_queue(#oTgjQHcTORj8SlYp max_running: Number) returns(#eW8thMXMoS52OJfm queue: * queue) {
  #xedGmC24V2pD1s2j // Construct a new queue that can run up to `max running` tasks at a time.
  #ObO7ClJ0wqA454lc // {hints:max running:5}
  #DUZqCzqVtCQ1rwCD $queue := records→queue→create;
  #fL7eXhe8Sez0wKcq $queue→to_run := collections→create_action_collection;
  #E2fjjUL84dgwUmvd $queue→num_running := 0;
  #sbkHmmz3sm2lNaRe $queue→max_running := $max_running;
  meta sync;
}
#xm1UV7QunTtGLqqCFxb6hWJM
action run_and_poke(#cvm9h5QKPVapWMsy q: * queue, #xoPEdfy4Lxc5l2Ua @action: Action) {
  #E2b2RTxOEokPhyxT $@action→run;
  #xVR8FpvFmEMVaL9H $q→num_running→\u25c8add( - 1);
  #TQnWGyaVV4vEBA6C $q→poke_run_queue;
  meta private;
}
#XwkY6bGbC4mrtQpq
action wait_for_empty(#mPGWtQu7oM6j7cUI q: * queue) {
  #CFyB9OjhDnjKyAOH // Waits until there are no more tasks running in the queue.
  #stKIAPg2emQY52sx while $q→num_running > 0 do {
    #NhTRN0cdSjA1VPnv time→sleep(0.1);
  }
}
#HSjDt2UaS8rnrwhl
action for_json(#WieX4fimBW4XiS5w js: Json_Object, #BNTNbIXwiyWYH24g @action: Json_Action) {
  #A2rf2oB8UVtqXBTD // Applies the ``action`` action to the array element or field values.
  #FA2rykL1BNwwLNMS if $js→kind→equals("array") then {
    #ejgu862ljGyAKRS4 code→@for($js→count, $a);
    #uTfPxymIpz5j1ugO where a(x: Number) {
      #v92vwSgh2eBiIkk0 $jsi := $js→at($x);
      #m0W62bhacckR012F $@action→run($jsi);
    }
  }
  else { #bYQvaEy9acrqTtQ6 if $js→kind→equals("object") then {
    #yNRX1iHs2nvwbr7q $keys := $js→keys;
    #Y36kt6SMKDDkyepF code→@for($keys→count, $action2);
    #q3FB2Yk24QI4dPte where action2(x: Number) {
      #BBui2WAb566urpSd $jsf := $js→field($keys→at($x));
      #m5Z4CblfPcRjQdjt $@action→run($jsf);
    }
  }
  else { } } 
}


