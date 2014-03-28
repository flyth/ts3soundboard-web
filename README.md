# TS3Soundboard Music Bot Webinterface

This project is just a simple demo of the new remote-control feature of my TS3-Soundboard Plugin that can be used to queue music.

I will update this from time to time but feel free to fork and send pull requests!

## Setup

First, make sure you've got the bot working on the same machine (or virtual machine) you want to run the webinterface on. You might want to follow these steps: http://www.kampfrausch.de/ts3/#Guides

I'm assuming you're running this under 64bit Ubuntu 12.04 x64. For x86, change the x64 that appears in the following steps to x86.

So after you've installed TeamSpeak 3 and the plugin, close TeamSpeak and open the file

	~/.ts3client/soundboard.conf

in your favorite editor.

Place the following lines in the [General] section of this configuration file:

	enableUDP=true
	udpListen=19111
	udpNotify=19112

Now start/restart TeamSpeak via VNC again.

Install git, if that's not already present

	sudo apt-get install git

The next step would be to install nodejs, which will run the actual webserver for you.

	wget http://nodejs.org/dist/v0.10.8/node-v0.10.8-linux-x64.tar.gz
	tar -xzvf node-v0.10.8-linux-x64.tar.gz
	mv node-v0.10.8-linux-x64 node

Now clone the web-interface to your local machine and install some dependencies

	git clone https://github.com/flyth/ts3soundboard-web.git
	cd ts3soundboard-web
	../node/bin/npm install

Now let's create a new config-file and edit it to contain the path to your music folder (basePath). Make sure both the user account you'll be running the webserver th and the user account that's running TeamSpeak will both have access to this directory. You need to enter the path of your music folder in "basePath".

	cp config.dist.json config.json
	nano config.json

And run that thing

	../node/bin/npm start

If you've done everything right, you should now be able to open your browser and go to

	http://<yourip>:8080

and see your files.
