Run ServiceNow Background Scripts using node on the command line.

Installation
------------

Node must already be installed on your system. Snow-runner was developed using Node 0.10.X.

Before using snow-runner, you must use npm install.

    $ cd /path/to/snow-runner/
    $ npm install

This will create a node_modules folder inside your snow-runner folder and install all dependent packages.

Usage
-----
    $ node run.js base64auth@instance script.js

Where base64auth is username:password encoded in Base64 and instance is a ServiceNow instance hostname such as demo001.

Example
-------
    $ node run.js YWRtaW46YWRtaW4=@demo001 demo.js

In the above example, "YWRtaW46YWRtaW4=" is "admin:admin" encoded (without quotes) using Base64.

Note for this example to work, you must first log into the demo001 instance and give the security_admin role to System Administrator.

