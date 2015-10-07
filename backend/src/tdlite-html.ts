/// <reference path='../typings/node/node.d.ts' />

'use strict';

import * as td from './td';

export var enterCode_html: string = 
`<script>
function oncode() {
  var inp = document.getElementById("code")
  seturl("&td_state=" + encodeURIComponent(inp.value))
}
function onteacher() {
  seturl("&td_state=teacher")
}

(function() {
  var m = /validated_code=([^?&]+)/.exec(url)
  if (m) {
    localStorage['validated_code'] = m[1]
    window.location = window.location.href.replace("/oauth/dialog", "/oauth/login")
  }
}())
</script>
<div style='margin: 0 auto; width: 310px;  text-align: center;'>
<h1 style='font-size:3em; font-weight:normal;'>Enter code</h1>
<div style='color:red; margin: 1em 0'>@MSG@</div>
<input type="text" id="code" class="code"/><br/>
<a href="#" class="provider" onclick="oncode()">Go</a><br/>
<a href="#" onclick="onteacher()">I'm an adult</a><br/>
</div>
`;

export var template_html: string = 
`<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=320.1" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<title>Sign in</title>
<style>
input.code,
.provider {
   padding: 0.7em;
   text-decoration: none;
   width: 310px;
   display: block;
   margin: 0 auto;
   font-size: 16px;
   font-family: inherit;
   box-sizing: border-box;
}
.provider {
  color: white;
  background: #2986E0;
}
</style>
<body id='root' style='font-size:16px; font-family:sans-serif;'>
<script>
@JS@
</script>

@BODY@
</body>
</html>
`;

export var activate_html: string = 
`<script>
function oncode() {
  var inp = document.getElementById("code")
  seturl("&td_state=" + encodeURIComponent(inp.value))
}
(function() {
  var cd = localStorage['validated_code'];
  if (cd) {
     localStorage['validated_code'] = "";
     seturl("&td_state=" + encodeURIComponent(cd))
  }
}())
</script>
<div style='margin: 0 auto; width: 310px;  text-align: center;'>
<h1 style='font-size:3em; font-weight:normal;'>We still need a code</h1>
<div style='color:red; margin: 1em 0'>@MSG@</div>
<input type="text" id="code" class="code"/><br/>
<a href="#" class="provider" onclick="oncode()">Go</a><br/>
<div style='color:#999;'>You are logged in, but you still need to provide an activation code.</div>
</div>
`;

export var newuser_html: string = 
`<script>
var session = "&td_session=@SESSION@";
function oncode() {
    var inp = document.getElementById("code")
    seturl("&td_state=" + encodeURIComponent(inp.value) + session)
}

function forgotcode() {
  var f = document.getElementById('forgot')
  f.style.fontSize = '1.5em';
  f.innerHTML = 'Go ask your teacher to reset your code.';
}

function nocode() {
  var f = document.getElementById('kidcode')
  f.style.display = 'none';
  f = document.getElementById('newuser')
  f.style.display = 'block';
}

function passwordok(n) {
  var inp = document.getElementById("firstname")
  if (!inp.value || inp.value.length < 3) {
    inp.style.borderColor = "red"
    return
  }
  seturl("&td_username=" + encodeURIComponent(inp.value) + "&td_password=" + encodeURIComponent(n) + session)
}

document.onready = function() {
}
</script>
<div style='margin: 0 auto; width: 310px;  text-align: center;'>

<div id='kidcode'>
<h1 style='font-size:3em; font-weight:normal;'>Do you have kid code?</h1>
<div style='color:red; margin: 1em 0'>@MSG@</div>
<input type="text" id="code" class="code"/><br/>
<a href="#" class="provider" onclick="oncode()">Here it goes!</a><br/>
<div id='forgot'>
<a href="#" onclick="forgotcode()">I forgot my kid code</a><br/>
</div>
<a href="#" onclick="nocode()">I never got a kid code</a><br/>
</div>

<div id='newuser' style='display:none'>
<h1 style='font-size:3em; font-weight:normal;'>Tell us your first name</h1>
<input type="text" id="firstname" placeholder='First Name' class="code"/><br/>
<div>
And now pick a 4-word password you'll use in future.
</div>
<!-- TODO only show passwords once there is 3 letters in the firstname field -->
<div id='passwords'>
@PASSWORDS@
</div>
</div>

</div>
`;

export var user_created_html: string = 
`<script>
  setTimeout(function(){
    document.getElementById("weredone").style.display = "block";
  }, 2000)
</script>

<div style='margin: 0 auto; width: 310px;  text-align: center;'>
<h1 style='font-size:3em; font-weight:normal;'>Welcome, @NAME@</h1>
<p>Your password is:</p>
<p style='font-size:1.5em' class='password'>@PASSWORD@</p>
<p>Remember it!</p>
<p>
<a style='display:none' id='weredone' href="@URL@" class="provider">Got it!</a>
</p>
</div>
`;

export var notFound_html: string = 
`<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=320.1" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<title>Not found</title>
<body id='root' style='font-size:16px; font-family:sans-serif;'>
<div style='margin: 0 auto; width: 310px;  text-align: center;'>
<h1 style='font-size:3em; font-weight:normal;'>HTTP 404</h1>
<p>The page you've requested cannot be found.</p>
</div>
</body>
</html>
`;

export var kidOrNot_html: string = 
`<script>
function onkid() {
  window.location = seturl("&td_state=kid")
}
function onteacher() {
  window.location = seturl("&td_state=teacher")
}
</script>
<div style='margin: 0 auto; width: 310px;  text-align: center;'>
<h1 style='font-size:3em; font-weight:normal;'>Who are we dealing with?</h1>
<a href="#" class="provider" onclick="onkid()">I'm a kid</a><br/>
<a href="#" class="provider" onclick="onteacher()">I'm an adult</a><br/>
</div>
`;

export var login_js: string = 
`function seturl(p) {
  var url = window.location.href.replace(/#.*/, "").replace(/\\&td_(username|password|state)=[^?&]*/g, "")
  window.location.href = url + p
}

function setstate(s) {
    seturl("&td_state=" + encodeURIComponent(s))
}

function checkready(f)
{
    var userid = "@USERID@";
    var done = false;
    if (userid && !/^@/.test(userid)) {
        setInterval(function() {
            if (done) return
            $.get("/api/ready/" + userid).then(function(r) {
              if (r && r.ready) {
                  done = true;
                  f();
              }
            })
        }, 2000)
    } else {
        f();
    }
}
`;

export var agree_html: string = 
`<div style='margin: 0 auto; width: 310px;  text-align: center;'>
<h1 style='font-size:3em; font-weight:normal;'>Legal stuff</h1>
<p>Agree to terms and conditions?</p>
<a href="@AGREEURL@" class="provider">Agree</a><br/>
</div>
`;

