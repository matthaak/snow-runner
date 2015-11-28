Run ServiceNow Background Scripts using node on the command line.

Installation
------------

Node must already be installed on your system. Snow-runner was developed using Node 0.10.X.

To use snow-runner, you can download the zip from GitHub, expand it to create the snow-runner folder, and then run npm install.

    $ cd /path/to/snow-runner/
    $ npm install

This will create a node_modules folder inside your snow-runner folder and install all dependent packages.

Usage
-----
    $ node run.js base64auth@instance script.js

Where _base64auth_ is username:password encoded in Base64 and instance is a ServiceNow instance hostname such as demo001.

    $ node run.js base64auth@instance --scope 'someScope' script.js
    
Where _someScope_ is the name of a Fuji scope on the instance.

    $ node run.js base64auth@instance -e 'someJavaScript'
    
Where _someJavaScript_ is a JavaScript expression to be evaluated on the instance.

    $ node run.js base64auth@instance -i
    > someJavaScript
    >

Where _someJavaScript_ is a multi-line JavaScript expression entered interactively and following which an empty line is entered to invoke evaluation on the instance. Note that scope is not maintained between evaluations. In other words, a variable defined in one code block and then evaluated is not available in the next code block. Typing Control-C exits interactive mode.


### Example Usage

    $ node run.js YWRtaW46YWRtaW4=@demo001 demo.js

In the above example, "YWRtaW46YWRtaW4=" is "admin:admin" encoded (without quotes) using Base64. For it to work, you must first log into the demo001 instance and give the security_admin role to System Administrator.

    $ node run.js YWRtaW46YWRtaW4=@demo001 --scope 'x_acme_testapp' demo.js
    
The above example shows how to use the optional --scope parameter for Fuji and later instances. If --scope is not supplied, global scope is assumed.

    $ node run.js YWRtaW46YWRtaW4=@demo001 -e "gs.print('Hello World')"
    [0:00:00.002]Script completed in scope global: script
    --------------------------------------------------------------------------------
    *** Script: Hello World
    --------------------------------------------------------------------------------

The above example shows how to use the -e option to evaluate an expression on the instance. The example also includes sample output.

    $ node run.js YWRtaW46YWRtaW4=@demo001 -i
    > var msg='Hello World';
    > gs.print(msg);
    > 
    [0:00:00.002]Script completed in scope global: script
    --------------------------------------------------------------------------------
    *** Script: Hello World
    --------------------------------------------------------------------------------

The above example shows how to use the -i option to interactively enter multi-line JavaScript and evaluate it on the instance. The example also includes sample output. Typing Control-C exits interactive mode.

Console Mode
------------
### What it Does
Console mode keeps an interactive snow-runner node process running, awaiting JavaScript to be piped into its STDIN. ServiceNow's output is then displayed in the console as usual.

Several convenient shell/batch scripts make it very simple to not only start snow-runner in console mode but then pipe JavaScript to it.

### Why Console Mode Exists
By keeping a snow-runner node process running, HTTPS connections with the instance can be kept open, like with web browsers. So, once a session is established, subsequent JavaScript submissions are evaluated in a matter of a couple hundred millesconds (assuming a fast connection and non compute-intense JavaScript.) This advantage is actually present in interactive mode (using the -i option) but interactive mode is a very cumbersome way to execute JavaScript.

Console mode makes it easy to pipe JavaScript to a ServiceNow instance and see its output, while providing the performance advantage of persistent HTTPS connections.

### Risks in using Console Mode
Think of console mode as an open, running web browser with ServiceNow's "Remember me" checkbox checked. If anyone else gains physical or remote access to your computer, they could gain access to your ServiceNow instance.

### The Console Mode Shell/Batch Scripts

#### snow-runner-console

    $ cd /path/to/snow-runner/
    $ ./snow-runner-console.sh YWRtaW46YWRtaW4=@demo001
    
    C:\>cd \path\to\snow-runner\
    C:\path\to\snow-runner\>snow-runner-console.bat "YWRtaW46YWRtaW4=@demo001"
    
Starts snow-runner in console mode. Run this in a Terminal or Cmd window before running any of the other shell/batch scripts in different window. This first window (where snow-runner-console is started) is where ServiceNow output will be displayed.

#### snow-runner-use-file
    $ cd /path/to/snow-runner/
    $ ./snow-runner-use-file.sh demo.js
    
    C:\>cd \path\to\snow-runner\
    C:\path\to\snow-runner\>snow-runner-use-file.bat demo.js
    
Pipes the contents of _demo.js_ to the snow-runner node process running in the separate Terminal or Cmd window and causes the resulting ServiceNow output to be displayed there.

#### snow-runner-eval
    $ cd /path/to/snow-runner/
    $ ./snow-runner-eval.sh "gs.print('Hello World')"
    
    C:\>cd \path\to\snow-runner\
    C:\path\to\snow-runner\>snow-runner-eval.bat "gs.print('Hello World')"
    
Pipes the expression _gs.print('Hello World')_ to the snow-runner node process running in the separate Terminal or Cmd window and causes the resulting ServiceNow output to be displayed there.

#### snow-runner-tester-suite
    $ cd /path/to/snow-runner/
    $ ./snow-runner-tester-suite.sh "Demo.spec"
    
    C:\>cd \path\to\snow-runner\
    C:\path\to\snow-runner\>snow-runner-tester-suite.bat "Demo.spec"
    
Pipes some built-in JavaScript to invoke a snow-tester test suite to the snow-runner node process running in the separate Terminal or Cmd window and causes the resulting ServiceNow output to be displayed there. Note: The contents of Demo.spec itself are not piped; those contents must be stored in a Tester Suite record named "Demo.spec". What is piped is:

    gs.include('SnowLib.Tester.Suite');SnowLib.Tester.Suite.getByName('$1').run();
    
Where _$1_ is the name of a suite passed to snow-runner-tester-suite. Needless to say, snow-tester must be installed in the instance for this to work.








