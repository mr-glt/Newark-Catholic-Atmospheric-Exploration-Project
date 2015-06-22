compilerflasher_new = function (loadFiles) {

    this.boards_list = [];
	this.boardsListExists = false;
    this.programmers_list = [];
    this.selectedBoard = '';
    this.selectedProgrammer = '';
    this.load_files = loadFiles;
    this.loaded_elements = [];
	this.enableShortCuts = false;

	this.minVersion = {
       CodebenderPlugin: '1.6.0.8',
       CodebenderApp: '0.1.0.9'
	};

	this.pluginOrApp = '';

    var selfCf = this;

    this.eventManager = new function () {
        this._listeners = {};

        this.addListener = function (type, listener) {
            if (typeof this._listeners[type] == 'undefined') {
                this._listeners[type] = [];
            }

            this._listeners[type].push(listener);
        };

        this.fire = function (event, param1, param2) {
            if (typeof event == 'string') {
                event = {
	                type: event
                };
            }
            if (!event.target) {
                event.target = this;
            }
            if (!event.type) {
                throw new Error("Event object missing 'type' property.");
            }
            if (this._listeners[event.type] instanceof Array) {
                var listeners = this._listeners[event.type];
                for (var i=0, len=listeners.length; i < len; i++) {
                    if (typeof param1 != 'undefined') {
                        if (typeof param2 != 'undefined') {
                            listeners[i].call(this, param1, param2);
                        }
                        else {
                            listeners[i].call(this, param1);
                        }
                    }
                    else {
                        listeners[i].call(this);
                    }
                }
            }
        };

        this.removeListener =  function (type, listener) {
            if (this._listeners[type] instanceof Array) {
                var listeners = this._listeners[type];
                for (var i=0, len=listeners.length; i < len; i++) {
                    if (listeners[i] === listener) {
                        listeners.splice(i, 1);
                        break;
                    }
                }
            }
        };
    };

    this.setOperationOutput = function (message) {
	    var $cbCfOperationOutput = $('#cb_cf_operation_output');
	    var $operationOutput = $('#operation_output');
	    $cbCfOperationOutput.html(message);
	    $operationOutput.html(message);

	    if (message.length > 0) {
		    $cbCfOperationOutput.removeClass('new-message').width();
		    $cbCfOperationOutput.addClass('new-message');

		    $operationOutput.removeClass('new-message').width();
		    $operationOutput.addClass('new-message');
	    }
    };

    this.on = function(type, listener) {
        this.eventManager.addListener(type, listener);
    };

    this.pluginHandler = new function () {
	    this.owner = selfCf;
	    var selfPh = this;

        this.serialMonitorPort = null;

        this.max_monitor_length = 10000;

        this.uuid4 = function () {
            var time = new Date().getTime();
	        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (charPosition) {
                var r = (time + Math.random() * 16) % 16 | 0;
		        time = Math.floor(time / 16);
                return (charPosition == 'x' ? r : (r & 0x7 | 0x8)).toString(16);
            });
        };

        this.tabID = this.uuid4();

        this.currentPorts = [];

	    this.probeRunning = false;

        this.doflashBootloader = function (programmer, board) {
	        // Remove when codebender app implements programmers
	        if (window.chrome) {
		        this.owner.setOperationOutput("Programmers are not supported by the codebender app yet.");
		        this.owner.eventManager.fire('flash_failed', "Programmers are not supported by the codebender app yet.");
		        return;
	        }

	        this.codebenderPlugin.flashBootloader(
		        (this.portslist.selectedIndex == -1 || programmer['communication'] != 'serial') ?'' :this.portslist.options[this.portslist.selectedIndex].text,
		        programmer['protocol'],
		        programmer['communication'],
		        programmer['speed'],
		        programmer['force'],
		        programmer['delay'],
		        board['bootloader']['high_fuses'],
		        board['bootloader']['low_fuses'],
		        (typeof board['bootloader']['extended_fuses'] == "undefined")?'':board['bootloader']['extended_fuses'],
		        (typeof board['bootloader']['unlock_bits'] == "undefined")?'':board['bootloader']['unlock_bits'],
		        (typeof board['bootloader']['lock_bits'] == "undefined")?'':board['bootloader']['lock_bits'],
		        board['build']['mcu'],
		        bootloader_callback
	        );
        };

        this.clickedPort = function () {
            var port = $("#cb_cf_ports").val();
            var actionId = 43;
            var metaData = {
                "selectedPort": port,
                "tabID": this.tabID
            };
	        createLogCompilerflasher(actionId, metaData);
        };

        this.oldPort = null;

        this.logPorts = function () {
            var oldPort;
            if (this.oldPort === null) {
	            oldPort = '';
            }
            else {
	            oldPort = this.oldPort;
            }

            var newPort = '';
            if (this.currentPorts.length > 0) {
	            newPort = $('#cb_cf_ports').find('option:selected').text();
            }

            this.oldPort = newPort;

            if (oldPort != newPort) {
                var actionId = 38;
                var metaData = {
                    "oldPort": oldPort,
                    "newPort": newPort,
                    "tabID": this.tabID
                };
	            createLogCompilerflasher(actionId, metaData);
            }
        };

        this.savePort = function () {
            if (typeof Lawnchair != 'undefined') {
                new Lawnchair(function () {
                    if (selfPh.currentPorts.length > 0) {
                        var port = $('#cb_cf_ports').find('option:selected').text();
                        this.save({
	                        key: 'port',
	                        name: port
                        });
                    }
                });
            }
	        selfPh.logPorts();
        };

        this.loadPort = function() {
	        var $ports = $('#cb_cf_ports');
	        if (this.currentPorts.length == 0 && $ports.find('option[value=""]').length == 0) {
		        $ports.append('<option value="">No ports detected</option>');
		        return;
	        }

	        $ports.find('option[value=""]').remove();
	        if (typeof Lawnchair == 'undefined') {
		        var port = $ports.find('option:first').val();
		        $("#cb_cf_ports").val(port);
		        return;
	        }

	        Lawnchair(function () {
		        this.exists('port', function (exists) {
			        if (!exists) {
				        var port = $ports.find('option:first').val();
				        $('#cb_cf_ports').val(port);
				        return;
			        }

			        this.get('port', function (config) {
				        var port_exists = $ports.find('option[value="'+config.name+'"]').length;
				        if (port_exists > 0) {
					        $ports.val(config.name);
				        }
				        else {
					        var port = $ports.find('option:first').val();
					        $ports.val(port);
				        }
			        });
		        });
	        });
        };

        this.initializePlugin = function()
        {
	        var location = window.location;
            if (typeof window.location.origin != 'undefined') {
	            location = window.location.origin;
            }

            if (location.indexOf('codebender.cc') != -1 && typeof window.osBrowserIsSupported != 'undefined' && !window.osBrowserIsSupported() && typeof window.isSupportedOs != 'undefined') {
                var actionId = 35;
                var metaData = {
                    "plugin" : false,
                    "message": "Unsupported OS/browser combination."
                };
	            createLogCompilerflasher(actionId, metaData);

	            var supportedOsMessage = '<i class="icon-warning-sign"></i> To program your Arduino from your browser, please use <a href="http://www.google.com/chrome/" target="_blank">Google Chrome</a>/Chromium (version 41 and above on Linux) or <a href="http://www.mozilla.org/en-US/firefox/" target="_blank">Mozilla Firefox</a>.';
	            var unsupportedOsMessage = '<i class="icon-warning-sign"></i> To program your Arduino from your browser, please use <a href="http://www.google.com/chrome/" target="_blank">Google Chrome</a>/Chromium on Windows, Mac, Linux (version 41 and above) or Chrome OS (version 41 and above) or <a href="http://www.mozilla.org/en-US/firefox/" target="_blank">Mozilla Firefox</a> on Windows, Mac or Linux.';

	            var message = unsupportedOsMessage;
	            if (window.isSupportedOs()) {
		            message  = supportedOsMessage;
	            }
	            this.owner.setOperationOutput(message);
	            this.owner.eventManager.fire('plugin_notification', message);
            }
            else {
                this.plugin_searched = false;
                this.plugin_found = false;
                this.plugin_initialized = false;
                this.plugin_validated = false;
                this.plugin_running = false;

                this.plugin_version = null;
                window.plugin_version = null;

	            this.searchPluginOrApp(function () {
		            if (!selfPh.plugin_found) {
						selfPh.pluginNotFound();
		            }
		            else {
			            selfPh.runPlugin();
		            }

		            if (!selfPh.probeRunning) {
			            selfPh.probeChromeApp();
			            selfPh.probeRunning = true;
		            }
	            });
            }
        };

	    this.pluginNotFound = function () {
		    var alert = selfPh.browserSpecificPluginInstall("To program your Arduino from your browser, install the codebender");
		    selfPh.owner.setOperationOutput(alert);
		    selfPh.owner.eventManager.fire('plugin_notification', alert);
		    selfPh.owner.eventManager.fire('plugin_not_found');

		    var actionId = 35;
		    var metaData = {
			    "plugin" : false,
			    "message": "Not on navigator plugins."
		    };
		    createLogCompilerflasher(actionId, metaData);
	    };

	    this.probeChromeApp = function () {
		    if (!window.chrome) {
			    return;
		    }

		    function appLostHandler() {
			    $('#cb_cf_ports').find('option').remove();
			    $('#cb_cf_ports').attr('disabled', 'disabled');
			    $('#cb_cf_flash_btn').attr('disabled', 'disabled');
			    $('#cb_cf_programmers').attr('disabled', 'disabled');
			    $('#cb_cf_flash_with_prog_btn').attr('disabled', 'disabled');
			    $('#cb_cf_baud_rates').attr('disabled', 'disabled');
			    $('#cb_cf_serial_monitor_connect').attr('disabled', 'disabled');

			    clearInterval(window.PluginLoggingInterval);
			    clearInterval(window.getFireInterval);
			    selfPh.pluginNotFound();

			    selfPh.plugin_found = false;
			    selfPh.plugin_initialized = false;
			    selfPh.plugin_validated = false;
			    selfPh.plugin_running = false;
			    selfPh.plugin_version = null;
			    window.plugin_version = null;
		    }

		    var probeCounter = 0;
		    var probeStillCounter = 0;
		    var lastCounterValue = probeCounter;
		    var startFlag = !this.plugin_found;
		    function probe() {
			    if (lastCounterValue == probeCounter) {
				    probeStillCounter++;
			    }
			    if (probeCounter >= 2) {
				    probeCounter = 0;
			    }
			    lastCounterValue = probeCounter;

			    if (probeStillCounter >= 2) {
				    probeCounter = 0;
				    probeStillCounter = 0;
				    if (!startFlag) {
					    startFlag = true;
					    appLostHandler();
				    }
			    }

			    selfPh.codebenderPlugin.getVersion(function (version) {
				    if (version) {
					    probeCounter++;
					    probeStillCounter = 0;
				    }

				    if (startFlag) {
					    startFlag = false;
					    selfPh.plugin_searched = true;
					    selfPh.plugin_found = true;
					    selfCf.pluginOrApp = 'app';
					    selfPh.runPlugin();
				    }
			    });
			    window.probeTimeout = setTimeout(probe, 500);
		    }
		    probe();
	    };

	    this.probeChromeAppStop = function (afterStopCallback) {
		    clearTimeout(window.probeTimeout);
		    afterStopCallback();
	    };

	    this.searchApp = function (getResult) {
		    var appFound = false;

		    if (!window.extentionAvailable) {
			    appFound = false;
			    getResult(appFound);
			    return;
		    }

		    var searchTimeout = setTimeout(function () {
			    clearInterval(pollApp);
			    appFound = false;
			    getResult(appFound);
		    }, 5000);

		    var pollApp = setInterval(function () {
			    selfPh.codebenderPlugin.getVersion(function (version) {
				    clearTimeout(searchTimeout);
				    clearInterval(pollApp);
				    appFound = false;
				    if (version) {
					    selfCf.pluginOrApp = 'app';
					    appFound = true;
				    }
				    getResult(appFound);
			    });
		    }, 500);
	    };

	    this.searchPlugin = function () {
		    for (var i = 0; i < navigator.plugins.length; i++) {
			    if (navigator.plugins[i].name == "Codebender.cc" || navigator.plugins[i].name == "Codebendercc") {
				    selfCf.pluginOrApp = 'plugin';
				    return true;
			    }
		    }
		    return false;
	    };

        this.searchPluginOrApp = function (searchCallback) {
	        this.plugin_found = this.searchPlugin();
	        this.plugin_searched = true;
	        if (this.plugin_found) {
		        searchCallback();
	        }
	        else {
		        this.searchApp(function (appFound) {
			        selfPh.plugin_found = appFound;
			        selfPh.plugin_searched = true;
			        searchCallback();
		        });
	        }
        };

        this.runPlugin = function () {
            var actionId = 35;
            var metaData = {
	            "plugin": true,
                "message": "Found on navigator plugins.",
	            "type": selfCf.pluginOrApp
            };
	        createLogCompilerflasher(actionId, metaData);

            this.owner.setOperationOutput("<i class='icon-spinner icon-spin'></i>  Initializing "+selfCf.pluginOrApp+" ... Make sure that you allow plugin execution on your browser. <a href='http://feedback.codebender.cc/knowledgebase/topics/57328-plugin'>More Info</a>");
            this.owner.eventManager.fire("plugin_notification", "<i class='icon-spinner icon-spin'></i>  Initializing "+selfCf.pluginOrApp+" ... Make sure that you allow plugin execution on your browser. <a href='http://feedback.codebender.cc/knowledgebase/topics/57328-plugin'>More Info</a>");

            var plugin_init_interval = setInterval(function () {
	            if (typeof selfPh.codebenderPlugin.probeUSB != 'undefined') {
		            clearInterval(plugin_init_interval);

		            if (typeof selfPh.codebenderPlugin.init != 'undefined') {
			            selfPh.codebenderPlugin.init(function () {
				            if (typeof selfPh.codebenderPlugin.instance_id != 'undefined') {
					            selfPh.tabID = parseInt(selfPh.codebenderPlugin.instance_id);
				            }

				            selfPh.plugin_initialized = true;
				            selfPh.plugin_version = selfPh.codebenderPlugin.version;
				            window.plugin_version = selfPh.plugin_version;

				            var actionId = 35;
				            var metaData = {
					            "plugin" : true,
					            "version": selfPh.codebenderPlugin.version,
					            "type": selfCf.pluginOrApp
				            };
				            createLogCompilerflasher(actionId, metaData);

				            selfPh.validateVersion(selfCf.minVersion);
				            if (typeof selfPh.codebenderPlugin.setErrorCallback != 'undefined') {
					            selfPh.codebenderPlugin.setErrorCallback(selfPh.plugin_error_logger);
				            }

				            if (typeof selfPh.codebenderPlugin.closeTab != 'undefined') {
					            $(window).unload(function () {
						            selfPh.codebenderPlugin.closeTab();
						            selfPh.codebenderPlugin.deleteMap();
					            });
				            }
				            else {
					            selfPh.disconnect();
				            }
			            });
		            }
	            }
            }, 100);
        };

        this.showPlugin = function () {
            this.owner.setOperationOutput("");
            this.owner.eventManager.fire("plugin_running");
            $.each(this.owner.loaded_elements, function(key, value) {
                if (value != 'cb_cf_boards')
                    $('#'+value).removeAttr('disabled');
            });
            this.plugin_running = true;

	        selfCf.unsupportedBoard(selfCf.selectedBoard.name);
        };

        this.parseVersionString = function (version) {
            if (typeof version != 'string') {
                return false;
            }

            var token = version.split('.');
            // parse from string or default to 0 if can't parse
            var major = parseInt(token[0]) || 0;
            var minor = parseInt(token[1]) || 0;
            var patch = parseInt(token[2]) || 0;
            var build = parseInt(token[3]) || 0;
            return {
                major: major,
                minor: minor,
                patch: patch,
                build: build
            };
        };

        this.comparePluginVersions = function(firstVersion, secondVersion) {
            var major = firstVersion.major - secondVersion.major;
            var minor = firstVersion.minor - secondVersion.minor;
            var patch = firstVersion.patch - secondVersion.patch;
            var build = firstVersion.build - secondVersion.build;

            if (major != 0) {return major;}
            if (minor != 0) {return minor;}
            if (patch != 0) {return patch;}
            return build;
        };

        this.validateVersion = function(version) {
	        var minimumVersion = version.CodebenderPlugin;
	        if (window.chrome)
	        {
		        minimumVersion = version.CodebenderApp;
	        }

	        var compareVersion = this.comparePluginVersions(this.parseVersionString(this.codebenderPlugin.version), this.parseVersionString(minimumVersion));
	        var alert;
	        var actionId;
	        var metaData;
	        if (compareVersion < 0) {
		        alert = this.browserSpecificPluginInstall("You need to update the codebender");
		        this.owner.setOperationOutput(alert);
		        this.owner.eventManager.fire('plugin_notification', alert);
		        actionId = 27;
		        metaData = {
			        "success": true,
			        "plugin" : false,
			        "alert" : "You need to update the codebender plugin or app."
		        };
		        createLogCompilerflasher(actionId, metaData);
		        clearInterval(window.PluginLoggingInterval);
	        } else if (this.codebenderPlugin.version === null) {
		        alert = this.browserSpecificPluginInstall("To program your Arduino from your browser, install the codebender");
		        this.owner.setOperationOutput(alert);
		        this.owner.eventManager.fire('plugin_notification', alert);
		        actionId = 27;
		        metaData = {
			        "success": true,
			        "plugin" : false,
			        "alert" : "To program your Arduino from your browser, install the codebender plugin or app."
		        };
		        createLogCompilerflasher(actionId, metaData);
		        clearInterval(window.PluginLoggingInterval);
	        } else {
		        this.enableUSB();
		        this.initializePluginPortsLogger();
		        this.showPlugin();
	        }
            this.plugin_validated = true;
        };

        this.initializePluginPortsLogger = function () {
            if (typeof portsAvail == 'undefined') {
	            portsAvail = [""];
            }
            window.oldPortsAvail = portsAvail;

            if (typeof serialPortsAvail == 'undefined') {
	            serialPortsAvail = [""];
            }
            window.oldSerialPortsAvail = serialPortsAvail;

            window.PluginLoggingInterval = setInterval(function () {
	            var actionId;
	            var metaData;
	            try {
	                if (typeof selfPh.codebenderPlugin.probeUSB == 'undefined') {
		                actionId = 34;
		                metaData = {
			                "message" : "Non catchable plugin crash.",
			                "tabID": selfPh.tabID,
			                "version": (window.plugin_version == 'undefined' || window.plugin_version === null) ? "undefined" : window.plugin_version,
			                "OS": {
				                "name": (typeof Browsers.os.name == 'undefined') ? 'undefined' : Browsers.os.name,
				                "url":  window.location.pathname,
				                "version": (Browsers.os.version === null || typeof Browsers.os.version.original == 'undefined') ? 'undefined' : Browsers.os.version.original
			                },
			                "Browser": {
				                "name": (typeof Browsers.browser.name == 'undefined') ? 'undefined' : Browsers.browser.name,
				                "version": (typeof Browsers.browser.version == 'undefined' || Browsers.browser.version === null) ? 'undefined' : Browsers.browser.version.original
			                }
		                };
		                createLogCompilerflasher(actionId, metaData);
		                selfCf.setOperationOutput('An unexpected error has occurred. Please refresh your browser.');
		                clearInterval(window.PluginLoggingInterval);
	                }
					else {
		                if ((typeof selfPh.codebenderPlugin.availablePorts == 'undefined') &&
			                ((oldPortsAvail.length < portsAvail.length || (oldPortsAvail.length == 1 && portsAvail.length == 1 && oldPortsAvail[0] == "" && portsAvail[0] != "")) ||
			                (oldPortsAvail.length > portsAvail.length || (oldPortsAvail.length == 1 && portsAvail.length == 1 && oldPortsAvail[0] != "" && portsAvail[0] == "")))
		                ) {
			                var ports = {};
			                $('#cb_cf_ports > option').each(function (index) {
				                ports[index] = this.text;
			                });
			                actionId = 36;
			                metaData = {
				                "success": true,
				                "plugin" : true,
				                "version": selfPh.codebenderPlugin.version,
				                "ports" : ports
			                };
			                createLogCompilerflasher(actionId, metaData);
		                }

		                oldPortsAvail = portsAvail;

		                if (typeof selfPh.codebenderPlugin.getPorts != 'undefined') {
			                selfPh.codebenderPlugin.getPorts(function (portsList) {
				                serialPortsAvail = portsList;
				                if (oldSerialPortsAvail != serialPortsAvail) {
					                var parsedList = $.parseJSON(serialPortsAvail);
					                var ports = "";
					                $.each(parsedList, function (index, elem){
						                ports += elem['port'] + ',';
					                });

					                selfPh.codebenderPlugin.probeUSB(function (result) {
						                actionId = 36;
						                metaData = {
							                "success": true,
							                "plugin" : true,
							                "version": selfPh.codebenderPlugin.version,
							                "tabID": selfPh.tabID,
							                "serialLibPorts" : ports,
							                "probeUSBports" : result
						                };
						                createLogCompilerflasher(actionId, metaData);

						                actionId = 74;
						                metaData = {
							                "success": true,
							                "plugin" : true,
							                "version": selfPh.codebenderPlugin.version,
							                "tabID": selfPh.tabID,
							                "jsonPorts" : parsedList
						                };
						                createLogCompilerflasher(actionId, metaData);
					                });
				                }

				                oldSerialPortsAvail = serialPortsAvail;
			                });
		                }
	                }
                }
                catch(err) {
                    actionId = 27;
                    metaData = {
                        "success" : false,
                        "error" : err
                    };
	                createLogCompilerflasher(actionId, metaData);
                }
            }, 500);
        };

        this.canBurnBootloader = function (programmer) {
            if (this.portslist.options[this.portslist.selectedIndex].value == '' && programmer['communication'] == 'serial') {
                return false;
            }

	        return true;

        };

        this.doflash = function(select, board, programmer, binary, flash_callback) {
	        if (select && typeof board["upload"]["protocol"] != 'undefined') {
		        if (typeof this.portslist. options[this.portslist.selectedIndex] == 'undefined') {
			        this.owner.eventManager.fire('flash_failed', "Could not connect to selected port. Make sure your board is properly connected.");
			        this.owner.setOperationOutput("Could not connect to selected port. Make sure your board is properly connected.");
			        selfCf.pluginHandler.probeChromeApp();
		        }
		        else {
			        var disable_flushing = ((typeof board["upload"]["disable_flushing"] == 'undefined') ? '' : board["upload"]["disable_flushing"]);
			        this.codebenderPlugin.flash(this.portslist.options[this.portslist.selectedIndex].text, binary, board["upload"]["maximum_size"], board["upload"]["protocol"], disable_flushing, board["upload"]["speed"], board["build"]["mcu"], flash_callback);
		        }
	        }
	        else {
		        if (programmer == "") {
			        this.owner.setOperationOutput("The selected device needs a programmer, and none was selected. Operation Aborted.");
			        this.owner.eventManager.fire('flash_failed', "Could not connect to selected port. Make sure your board is properly connected.");
			        selfCf.pluginHandler.probeChromeApp();

		        }
		        else {
			        var selectedPort = (typeof this.portslist.options[this.portslist.selectedIndex] == 'undefined') ? '' : this.portslist.options[this.portslist.selectedIndex].text;
			        this.codebenderPlugin.flashWithProgrammer(selectedPort, binary, board["upload"]["maximum_size"], programmer["protocol"], programmer["communication"], programmer["speed"], programmer["force"], programmer["delay"], board["build"]["mcu"], flash_callback);
		        }
	        }
        };

        this.canflash = function (board, programmer, useProgrammer) {
            if (programmer.communication == 'serial' && this.currentPorts.length == 0) {
                return false;
            }

            useProgrammer = useProgrammer || false;

	        var $ports = $('#cb_cf_ports');
            if (($ports.val() !== null && $ports.val() != "") || (($ports.val() === null || $ports.val() == "") && typeof board["upload"]["protocol"] == 'undefined') || useProgrammer) {
                if (typeof this.portslist.options[this.portslist.selectedIndex] == 'undefined' && programmer["communication"] == "serial" && (typeof board["upload"]["protocol"] == 'undefined' || useProgrammer)) {
                    return false;
                }

                return true;
            }
            else {
                return false;
            }
        };

        this.browserSpecificPluginInstall = function (alert) {
            var location = window.location;
            if (typeof window.location.origin != 'undefined') {
	            location = window.location.origin;
            }

            if (location.indexOf("codebender.cc") == -1) {
                alert += ' plugin or app. <a target="_blank" href="https\x3A\x2F\x2Fcodebender.cc\x2Fstatic\x2Fplugin" >Learn more.</a>';
	            return alert;
            }

	        if(Browsers.isBrowser("Chrome") || Browsers.isBrowser("Chromium")) {
		        alert += " app. <a onclick='compilerflasher.pluginHandler.addTo(\"Chrome\")' href='javascript:void(0);' target='_blank'>Add to Chrome.</a> (If the app is installed please reload it or refresh the browser)";
	        }
	        else if(Browsers.isBrowser("Firefox")) {
		        alert += ' plugin. <a onclick=\'compilerflasher.pluginHandler.addTo("Firefox", "\x2F\x2Fcodebender.cc\x2Fcodebender.xpi")\' id="xpi-download-url" href = "javascript:void(0);" >Add to Firefox.</a>';
	        }

            return alert;
        };

        this.addTo = function (where, pluginUrl) {
	        if (where == 'Chrome') {
		        chrome.webstore.install('https://chrome.google.com/webstore/detail/magknjdfniglanojbpadmpjlglepnlko',
		        function () {
			        selfCf.setOperationOutput('You may be asked to allow access to the codebender app once it is installed. Just press Allow.');
		        });
	        }

            var actionId = 45;
            var metaData = {
                "where": where
            };
            if (typeof pluginUrl == 'undefined') {
	            createLogCompilerflasher(actionId, metaData);
            }
            else {
	            createLogCompilerflasher(actionId, metaData, function() {
                    window.location.replace(pluginUrl);
                });
            }
        };

        this.enableUSB = function () {
            this.connected = false;

            this.serialMonitorVal = '';
            this.serialMonitorToAppend = '';

            this.portslist = $("#cb_cf_ports")[0];
            this.oldPorts = null;

            setTimeout(function () {
	            selfPh.scan();
            }, 200);

            setTimeout(function () {
	            selfPh.loadPort();
            }, 500);
        };

        this.getFire = function () {
	        var $ports = $('#cb_cf_ports');
	        var ports = '';
            try {
	            this.codebenderPlugin.getPorts(function (currentPorts) {
		            var jsonPorts = $.parseJSON(currentPorts);
		            $.each(jsonPorts, function (index, elem) {
			            ports += elem['port'];
			            if (index != Object.keys(jsonPorts).length - 1) ports += ',';
		            });

		            if (selfPh.oldPorts === null) {
			            selfPh.logPorts();
			            selfPh.oldPorts = '';
		            }
		            if (ports != selfPh.oldPorts) {
			            $ports.find('option').remove();
			            var portsAvail = ports.split(",");
			            portsAvail = portsAvail.sort();
			            selfPh.currentPorts = [];
			            for (var i = 0; i < portsAvail.length; i++) {
				            if (selfPh.portslist && portsAvail[i] != "") {
					            selfPh.portslist.options[i] = new Option(portsAvail[i], portsAvail[i], true, false);
					            selfPh.currentPorts.push(portsAvail[i]);
				            }
			            }

			            selfPh.oldPorts = ports;
			            selfPh.loadPort();
			            selfPh.logPorts();
		            }
	            });
            }
            catch (err) {
	            $ports.find('option').remove();
                this.oldPorts = ports;
            }
        };

        this.scan = function () {
	        window.hasPerm = this.codebenderPlugin.setCallback(function (from, output) {
		        if (output == "disconnect") {
			        compilerflasher.pluginHandler.disconnect(true);
		        } else {
			        compilerflasher.eventManager.fire("plugin_notification", output);
			        compilerflasher.setOperationOutput(output);
		        }
	        });

            if (typeof window.hasPerm != 'undefined' && !window.hasPerm) {
                compilerflasher.setOperationOutput("You need to grant permissions to the codebender");
                compilerflasher.eventManager.fire('plugin_notification', "You need to grant permissions to the codebender");
            }

            this.getFire();
            window.getFireInterval = setInterval(function () {
	            selfPh.getFire();
            }, 1000);
        };

        this.show_alert = function (message, divname) {
            var alertElement = $('<div id="'+divname+'" class="alert">'+message+'</div>');
	        var $portsDiv = $('#cb_cf_ports_div');
	        $portsDiv.find('.alert').hide(100).remove();
	        $portsDiv.prepend(alertElement);
        };

        /*
         Serial Monitor functions
         */
	    this.toggle = function () {
			if (this.connected) {
				this.disconnect();
			}
		    else {
				this.connect();
			}
	    };

        this.connect = function () {
            if (window.operationInProgress) {
	            return;
            }
            window.operationInProgress = true;

	        selfCf.setOperationOutput('');
	        if (this.connected) {
		        window.operationInProgress = false;
		        this.disconnect();
		        return;
	        }

	        var $baudRates = $('#cb_cf_baud_rates');
            var speed = $baudRates.find('option:selected').val();
	        var $ports = $("#cb_cf_ports");
	        var $serialHud = $("#serial_hud");

	        var actionId = 18;
	        var metaData = {
		        "baudrate" : speed,
		        "port": $ports.val(),
		        "tabID": this.tabID,
		        "type": selfCf.pluginOrApp
	        };
	        createLogCompilerflasher(actionId, metaData);

	        if ($ports.val() === null || $ports.val() == '') {
		        window.operationInProgress = false;
		        this.owner.setOperationOutput("Please select a valid port!");
		        this.owner.eventManager.fire('plugin_notification', "Please select a valid port!");
		        return;
	        }

	        selfPh.serialMonitorPort = $ports.val();
	        var $serialMonitorConnect = $('#cb_cf_serial_monitor_connect');
	        $serialMonitorConnect.addClass('active');
	        $baudRates.attr('disabled', 'disabled');
	        $("#serial_monitor_content").fadeIn(300);

	        this.connected = true;

	        $serialMonitorConnect
		        .html('<i class="icon-unlink"></i> Disconnect')
		        .off('click')
		        .click(function () {
			        selfPh.disconnect();
		        });

	        $serialHud.html("");

	        var port = this.portslist.options[this.portslist.selectedIndex].text;
	        this.codebenderPlugin.serialRead(
		        this.portslist.options[this.portslist.selectedIndex].text,
		        speed,
		        function (from, line) {
			        selfPh.serialHudAppendString(line);
		        },
		        function (from, line){
			        var actionId = 69;
			        var metaData = {
				        "retVal" : line,
				        "type": selfCf.pluginOrApp,
				        "version": (window.plugin_version == 'undefined' || window.plugin_version === null) ? "undefined" : window.plugin_version,
				        "url":  window.location.pathname,
				        "OS": {
					        "name": (typeof Browsers.os.name == 'undefined') ? 'undefined' : Browsers.os.name,
					        "version": (Browsers.os.version === null || typeof Browsers.os.version.original == 'undefined') ? 'undefined' : Browsers.os.version.original
				        },
				        "Browser": {
					        "name": (typeof Browsers.browser.name == 'undefined') ? 'undefined' : Browsers.browser.name,
					        "version": (typeof Browsers.browser.version == 'undefined' || Browsers.browser.version === null) ? 'undefined' : Browsers.browser.version.original
				        }
			        };
			        createLogCompilerflasher(actionId, metaData);
			        var msg = compilerflasher.getFlashFailMessage(line);
			        compilerflasher.setOperationOutput(msg);
			        compilerflasher.eventManager.fire("plugin_notification", msg);
		        }
	        );

	        this.serialMonitorToAppend = '';
	        this.serialMonitorVal = '';
	        $serialHud.html(escapeHtml(this.serialMonitorVal));
	        if (typeof window.isWindowsWithChrome != 'undefined' && window.isWindowsWithChrome()) {
		        $serialHud.append(escapeHtml('Warning! Because of a known bug on Chrome, you should press the disconnect button before physically disconnecting your device.\nOr else the connection with the serial monitor will stay open until you restart your browser.\n\n'));
	        }

	        window.serialMonitorUpdater = setInterval(function () {
		        if (selfPh.serialMonitorToAppend != '') {
			        var total_length =  selfPh.serialMonitorToAppend.length + selfPh.serialMonitorVal.length;
			        if (total_length > selfPh.max_monitor_length) {
				        selfPh.serialMonitorVal = selfPh.serialMonitorVal.substring(total_length - selfPh.max_monitor_length) + selfPh.serialMonitorToAppend;
				        $serialHud.html(escapeHtml(selfPh.serialMonitorVal));
			        }
			        else {
				        selfPh.serialMonitorVal = selfPh.serialMonitorVal + selfPh.serialMonitorToAppend;
				        $serialHud.append(escapeHtml(selfPh.serialMonitorToAppend));
			        }

			        selfPh.serialMonitorToAppend = '';

			        if ($('#autoscroll_check').is(':checked')) {
				        $serialHud.scrollTo(99999999);
			        }
		        }
	        }, 50);

	        if (typeof this.codebenderPlugin.availablePorts != 'undefined') {
		        window.portValidatorInterval = setInterval(function () {
			        selfPh.codebenderPlugin.availablePorts(function (ports) {
				        if (ports.indexOf(port) == -1) {
					        clearInterval(window.portValidatorInterval);
					        selfPh.disconnect(false);
				        }
			        });
		        }, 100);
	        }

	        this.owner.setOperationOutput('');
	        window.operationInProgress = false;
        };

        this.disconnect = function (notified) {
	        notified = notified || false;

            var $baudRates = $('#cb_cf_baud_rates');
            if (!notified) {
                var actionId = 59;
                var metaData = {
                    "baudrate": $baudRates.find('option:selected').val(),
                    "port": selfPh.serialMonitorPort,
                    "tabID": this.tabID
                };
                createLogCompilerflasher(actionId, metaData);
            }

            selfPh.serialMonitorPort = null;

            if (typeof this.codebenderPlugin.availablePorts != 'undefined') {
	            clearInterval(window.portValidatorInterval);
            }

            var $serialMonitorConnect = $('#cb_cf_serial_monitor_connect');
            $serialMonitorConnect
	            .html('<i class="icon-link"></i> Connect')
	            .off('click')
	            .click(function () {
		            selfPh.connect();
	            });

            this.connected = false;

            $baudRates.removeAttr('disabled');
            $serialMonitorConnect.attr('disabled', 'disabled').removeClass('active');
            setTimeout(function () {
                if (!selfCf.serial_monitor_disabled) {
	                $serialMonitorConnect.removeAttr('disabled');
                }
            }, 2000);

            $("#serial_monitor_content").fadeOut(300);

            clearInterval(window.serialMonitorUpdater);
            if (!notified) {
                this.codebenderPlugin.serialMonitorSetStatus();
            }
        };

        this.serialHudAppendString = function(msg) {
	        if (msg.indexOf('\r\n') != -1) {
	            msg = msg.replace(/\r\n/g, '\n');
            }
            if (msg.indexOf('\r') != -1) {
	            msg = msg.replace(/\r/g, '');
            }

            var total_length =  this.serialMonitorToAppend.length + msg.length;
            if (total_length > this.max_monitor_length) {
                this.serialMonitorToAppend = this.serialMonitorToAppend.substring(total_length - this.max_monitor_length) + msg;
            }
            else {
                this.serialMonitorToAppend = this.serialMonitorToAppend + msg;
            }
        };

        this.serialHudAppend = function(line) {
	        var $serialHud = $('#serial_hud');
            if (isNaN(line)) {
                this.serialHudWrite($serialHud.html() + line + "<br>");
            } else {
                if (line == "13") {return;}
                if (line == "10") {serialHudWrite($serialHud.html() + "<br>");}
                if (line != "10") {serialHudWrite($serialHud.html() + String.fromCharCode(line));}
            }
        };

        this.serialHudWrite = function(message) {
	        var $serialHud = $('#serial_hud');
            if ($serialHud.find('br').length > 500) {
	            $serialHud.html(message.substring(message.indexOf('<br>') + 4));
            }
            else if ($serialHud.html().length > this.max_monitor_length ) {
	            $serialHud.html(message.substring($serialHud.html().length - this.max_monitor_length));
            }
            else {
	            $serialHud.html(message);
            }

            if ($('#autoscroll_check').is(':checked')) {
	            $serialHud.scrollTo(99999999);
            }
        };

        this.serialSendOnEnter = function(event){
            var e = event || window.event; // resolve event instance
            if (e.keyCode == '13') {
                this.serialSend();
            } else if (e.keyCode == '10') {
                this.serialSend();
            }
        };

        this.serialSend = function () {
	        var inputText = $('#text2send').val();
	        var lineEndings = $('#serial-line-endings').val();

	        var breakFlag = false;
	        if (lineEndings == 'nl') {
		        inputText += '\n';
		        breakFlag = true;
	        }
	        else if (lineEndings == 'cr') {
		        inputText += '\r';
	        }
	        else if (lineEndings == 'nlcr') {
		        inputText += '\r\n';
		        breakFlag = true;
	        }

	        var comparePluginVersion = this.comparePluginVersions(this.parseVersionString(this.codebenderPlugin.version), this.parseVersionString('1.6.0.8'));
	        if (window.chrome || comparePluginVersion <= 0) {
		        this.codebenderPlugin.serialWrite(inputText);
	        }
	        else {
		        this.codebenderPlugin.serialWrite(inputText, this.serialMonitorPort);
	        }

	        if ($('#echo_check').is(':checked')) {
		        var message = '<span class="serial-monitor-echo">'+escapeHtml(inputText)+'</span>';
		        if (breakFlag) {
			        message += '<br>';
		        }
		        this.serialHudWrite($('#serial_hud').html() + message);
	        }
        };

        this.plugin_error_logger = function (from, msg, status) {
	        var actionId;
	        var metaData;
            if (typeof status == 'undefined' || status == 0) {
                actionId = 34;
                metaData = {
                    "message" : msg,
                    "version": (window.plugin_version == 'undefined' || window.plugin_version === null) ? "undefined" : window.plugin_version,
                    "url":  window.location.pathname,
                    "tabID": selfPh.tabID,
                    "OS": {
                        "name": (typeof Browsers.os.name == 'undefined') ? 'undefined' : Browsers.os.name,
                        "version": (Browsers.os.version === null || typeof Browsers.os.version.original == 'undefined') ? 'undefined' : Browsers.os.version.original
                    },
                    "Browser": {
                        "name": (typeof Browsers.browser.name == 'undefined') ? 'undefined' : Browsers.browser.name,
                        "version": (typeof Browsers.browser.version == 'undefined' || Browsers.browser.version === null) ? 'undefined' : Browsers.browser.version.original
                    }
                };
	            createLogCompilerflasher(actionId, metaData);
            }
            else if (status == 1) {
                actionId = 55;
                metaData = {
                    "message" : msg , "version": (window.plugin_version == 'undefined' || window.plugin_version === null) ? "undefined" : window.plugin_version,
                    "url":  window.location.pathname,
                    "tabID": selfPh.tabID,
                    "OS": {
                        "name": (typeof Browsers.os.name == 'undefined') ? 'undefined' : Browsers.os.name,
                        "version": (Browsers.os.version === null || typeof Browsers.os.version.original == 'undefined') ? 'undefined' : Browsers.os.version.original
                    },
                    "Browser": {
                        "name": (typeof Browsers.browser.name == 'undefined') ? 'undefined' : Browsers.browser.name,
                        "version": (typeof Browsers.browser.version == 'undefined' || Browsers.browser.version === null) ? 'undefined' : Browsers.browser.version.original
                    }
                };
	            createLogCompilerflasher(actionId, metaData);
            }
        };
    }; // pluginHandler

    this.saveBoard = function () {
	    var $boards = $('#cb_cf_boards');

        if (typeof Lawnchair != 'undefined') {
            new Lawnchair(function () {
                this.save({
	                key: 'board',
	                name: $boards.find('option:selected').text()
                });
            });
        }

        var oldBoard = this.selectedBoard.name;
        this.selectedBoard = this.boards_list[$boards.prop('selectedIndex')];
        var newBoard = this.selectedBoard.name;

        var actionId = 37;
        var metaData = {
            "oldBoard": oldBoard,
            "newBoard": newBoard,
            "tabID": this.pluginHandler.tabID
        };
	    createLogCompilerflasher(actionId, metaData);

	    this.unsupportedBoard(newBoard);
    };

    this.loadBoard = function () {
	    var $boards = $('#cb_cf_boards');

	    if (typeof Lawnchair == 'undefined') {
		    this.selectedBoard = this.boards_list[$boards.prop('selectedIndex')];
		    return;
	    }

	    Lawnchair(function () {
		    this.exists('board', function (exists) {
			    if (exists) {
				    this.get('board', function (config) {
					    $boards.val(config.name);
				    });
			    }
			    selfCf.selectedBoard = selfCf.boards_list[$boards.prop('selectedIndex')];
		    });
	    });
    };

    this.getMaxSize = function () {
        return parseInt(this.selectedBoard['upload']['maximum_size']);
    };

    this.saveProgrammer = function () {
	    var $programmers = $('#cb_cf_programmers');

        if (typeof Lawnchair != 'undefined') {
            new Lawnchair(function () {
                this.save({
	                key: 'programmer',
	                name: $programmers.find('option:selected').text()
                });
            });
        }

        var oldProgrammer = this.selectedProgrammer.name;
        this.selectedProgrammer = this.programmers_list[$programmers.prop('selectedIndex')];
        var newProgrammer = this.selectedProgrammer.name;

        var actionId = 39;
        var metaData = {
            "oldProgrammer": oldProgrammer,
            "newProgrammer": newProgrammer,
            "tabID": this.pluginHandler.tabID
        };
	    createLogCompilerflasher(actionId, metaData);
    };

    this.loadProgrammer = function() {
        var programmersInitInterval = setInterval(function () {
            if (selfCf.pluginHandler.plugin_running) {
                clearInterval(programmersInitInterval);
	            if (typeof Lawnchair == 'undefined') {
		            selfCf.selectedProgrammer = selfCf.programmers_list[$("#cb_cf_programmers").prop("selectedIndex")];
		            return;
	            }

	            Lawnchair(function () {
		            this.exists('programmer', function (exists) {
			            if (exists) {
				            this.get('programmer', function (config) {
					            $("#cb_cf_programmers").val(config.name);
				            });
			            }
			            selfCf.selectedProgrammer = selfCf.programmers_list[$("#cb_cf_programmers").prop("selectedIndex")];
		            });
	            });
            }
        }, 60);
    };

    this.getDefaultBoard = function () {
        var SearchString = window.location.search.substring(1);
        var VariableArray = SearchString.split('&');
        for (var i = 0; i < VariableArray.length; i++) {
            var KeyValuePair = VariableArray[i].split('=');
            if (KeyValuePair[0] == 'board') {
                return decodeURIComponent(KeyValuePair[1]);
            }
        }
    };

    this.setBoardsList = function (data) {
        this.boards_list = data;
    };

    this.getBoardsList = function () {
        return this.boards_list;
    };

    this.clickedBoard = function () {
        var board = $('#cb_cf_boards').find('option:selected').text();

        var actionId = 42;
        var metaData = {
            "selectedBoard": board,
            "tabID": this.pluginHandler.tabID
        };
	    createLogCompilerflasher(actionId, metaData);
    };

    this.clickedProgrammer = function () {
        var programmer = $('#cb_cf_programmers').find('option:selected').text();

        var actionId = 44;
        var metaData = {
            "selectedProgrammer": programmer,
            "tabID": this.pluginHandler.tabID
        };
	    createLogCompilerflasher(actionId, metaData);
    };

    this.generate_payload =  function (format, logging) {
        logging = (typeof logging == 'undefined') ? false : logging;
        var files = this.load_files();

        var files_array = [];
        $.each(files, function (fname, contents) {
            /* We have to append a newline in every file, in order
             * to follow closely the behavior of the original Arduino IDE and
             * keep the clang auto-completer happy! */
            files_array.push({
                'filename': fname,
                'content': decodeHtml(contents) + '\n'
            });
        });

	    var payload = {
		    'files': files_array,
		    'format': format,
		    'version': '105',
		    'build': compilerflasher.selectedBoard['build'],
		    'board': this.selectedBoard.name,
		    'upload': this.selectedBoard.upload
	    };
        if (logging) {
	        payload['logging'] = logging;
        }

        if (format == 'autocomplete' && typeof editor != 'undefined' && typeof fileManager != 'undefined') {
            payload['position'] = editor.getSession().getSelection().selectionLead.getPosition();
            payload['position']['file'] = fileManager.openFname;
            payload['archive'] = true;
        }

        return JSON.stringify(payload);
    };

    this.getFlashFailMessage = function (error) {
        var msg = '';
        if (window.flashing_errors[error]) {
	        msg = window.flashing_errors[error] + " <a href='http://feedback.codebender.cc/knowledgebase/articles/183395-usb-flashing-known-errors' target='_blank'>More Info</a>";
        }
        else {
	        msg = "An error occured while connecting to your device. Please try again.";
        }

        return msg;
    };

    this.flash_callback = function (from, progress) {
        if (progress) {
            var msg = compilerflasher.getFlashFailMessage(progress);
            compilerflasher.setOperationOutput(msg);
            compilerflasher.eventManager.fire('flash_failed', msg, progress);

            if (progress != 0 && (progress > -1 || progress < -23) && progress != -30 && progress != -55 && progress != -56 && progress != -57) {
	            var actionId = 51;
	            compilerflasher.pluginHandler.codebenderPlugin.getFlashResult(function (result) {
		            var metaData = {
			            "version": compilerflasher.pluginHandler.codebenderPlugin.version,
			            "retVal": progress,
			            "flashResult": result.substring(0, 1800)
		            };
		            createLogCompilerflasher(actionId, metaData);
	            });
            }
        }
        else {
            compilerflasher.eventManager.fire('flash_succeed');
            compilerflasher.setOperationOutput('Upload successful!');
        }

	    selfCf.pluginHandler.probeChromeApp();

        var url = "https\x3A\x2F\x2Fcodebender.cc\x2Futilities\x2Fflash\x2FERROR_CODE";
        url = url.replace('ERROR_CODE', progress+'&'+selfCf.pluginHandler.tabID+'&'+selfCf.pluginOrApp);
        $.get(url);

        window.operationInProgress = false;
    };

    this.getHex = function () {
        this.eventManager.fire('pre_hex');
        var payload = this.generate_payload('hex');
        $.post("https\x3A\x2F\x2Fcodebender.cc\x2Futilities\x2Fcompile\x2F", payload, function (data) {
            try {
                var obj = jQuery.parseJSON(data);
                if (!obj.success) {
	                selfCf.setOperationOutput("Verification failed.");
	                selfCf.eventManager.fire('hex_failed', obj.message);
                }
                else {
	                selfCf.setOperationOutput("Verification Successful!");
	                selfCf.eventManager.fire('hex_succeed', obj);
                }

            }
            catch (error) {
	            selfCf.eventManager.fire('hex_failed', '<i class="icon-remove"></i> Unexpected error occured. Try again later.');
	            selfCf.setOperationOutput('<i class="icon-remove"></i> Unexpected error occured. Try again later.');
            }
        });
    };

	// Blacklists in Chrome the boards that need a programmer (until codebender app implements them)
	// @method: blackListBoard
	// @param {String} selectedBoard Current selected board name
	// @return: bool
	this.blackListBoard = function (selectedBoard) {
		var blackList = false;

		if (window.chrome) {
			var boardsNeedProgrammer = [
				'Adafruit Pro Trinket 3V/12MHz (USB)',
				'Adafruit Pro Trinket 5V/12MHz (USB)',
				'Adafruit Gemma 8MHz',
				'Adafruit Trinket 8MHz (3V)',
				'Adafruit Trinket 8MHz',
				'Adafruit Trinket 16MHz'
			];

			for (var i=0; i<boardsNeedProgrammer.length; i++) {
				if (selectedBoard == boardsNeedProgrammer[i]) {
					blackList = true;
					break;
				}
			}
		}

		return blackList;
	};

    this.usbflash = function () {
        if (window.operationInProgress || !this.enableShortCuts) {
            return;
        }
        window.operationInProgress = true;

		var actionId = 40;
		var metaData = {
			"port": $('#cb_cf_ports').val(),
			"board": $('#cb_cf_boards').find('option:selected').text(),
			"programmer": $('#cb_cf_programmers').find('option:selected').text(),
			"tabID": this.pluginHandler.tabID,
			"state": getEditorState()
		};
	    createLogCompilerflasher(actionId, metaData);

	    // Remove when codebender app implements programmers
	    if (this.blackListBoard(this.selectedBoard.name)) {
		    this.setOperationOutput('The selected device needs a programmer, which is not supported by the codebender app yet.');
		    this.eventManager.fire('flash_failed', 'The selected device needs a programmer, which is not supported by the codebender app yet.');
		    window.operationInProgress = false;
		    return;
	    }

	    if (!this.pluginHandler.canflash(this.selectedBoard, this.selectedProgrammer)) {
		    this.setOperationOutput('Please select a valid port!');
		    this.eventManager.fire('plugin_notification', 'Please select a valid port!');
		    window.operationInProgress = false;
		    return;
	    }

	    this.eventManager.fire('pre_flash');
	    this.setOperationOutput('<i class="icon-spinner icon-spin"> </i> Working...');
	    this.getbin(function (obj) {
		    if (!obj.success) {
			    selfCf.setOperationOutput('There was an error compiling.');
			    selfCf.eventManager.fire('verification_failed', obj.message);
			    window.operationInProgress = false;
		    }
		    else {
			    selfCf.eventManager.fire('mid_flash', obj.size);

			    if (parseInt(obj.size) > selfCf.getMaxSize()) {
				    selfCf.setOperationOutput('There is not enough space!');
				    selfCf.eventManager.fire('flash_failed', 'There is not enough space!');
				    window.operationInProgress = false;
			    }
			    else {
				    if (obj.output.length > selfCf.getMaxSize()) {
					    var actionId = 55;
					    var msg = 'Program too large (base64 encoded). Program size: '+ obj.output.length + '>' + selfCf.getMaxSize();
					    var metaData = {
						    "message" : msg , "version": (window.plugin_version == 'undefined' || window.plugin_version === null) ? "undefined" : window.plugin_version,
						    "url":  window.location.pathname,
						    "tabID": selfCf.pluginHandler.tabID,
						    "OS": {
							    "name": (typeof Browsers.os.name == 'undefined') ? 'undefined' : Browsers.os.name,
							    "version": (Browsers.os.version === null || typeof Browsers.os.version.original == 'undefined') ? 'undefined' : Browsers.os.version.original
						    },
						    "Browser": {
							    "name": (typeof Browsers.browser.name == 'undefined') ? 'undefined' : Browsers.browser.name,
							    "version": (typeof Browsers.browser.version == 'undefined' || Browsers.browser.version === null) ? 'undefined' : Browsers.browser.version.original
						    }
					    };
					    createLogCompilerflasher(actionId, metaData);
				    }
				    if (selfCf.pluginHandler.connected) {
					    selfCf.pluginHandler.disconnect(false);
					    setTimeout(function () {
						    selfCf.pluginHandler.probeChromeAppStop(function () {
							    selfCf.pluginHandler.doflash(true, selfCf.selectedBoard, selfCf.selectedProgrammer, obj['output'], selfCf.flash_callback);
						    });
					    }, 200);
				    } else {
					    selfCf.pluginHandler.probeChromeAppStop(function () {
						    selfCf.pluginHandler.doflash(true, selfCf.selectedBoard, selfCf.selectedProgrammer, obj['output'], selfCf.flash_callback);
					    });
				    }
			    }
		    }
	    });
    };


    this.usbflashWithProgrammer = function () {
        if (window.operationInProgress || !this.enableShortCuts) {
	        return;
        }
        window.operationInProgress = true;

		var actionId = 41;
		var metaData = {
			"port": $('#cb_cf_ports').val(),
			"board": $('#cb_cf_boards').find('option:selected').text(),
			"programmer": $('#cb_cf_programmers').find('option:selected').text(),
			"tabID": this.pluginHandler.tabID,
			"state": getEditorState()
		};
	    createLogCompilerflasher(actionId, metaData);

	    // Remove when codebender app implements programmers
	    if (window.chrome) {
		    this.setOperationOutput('Programmers are not supported by the codebender app yet.');
		    this.eventManager.fire('flash_failed', 'Programmers are not supported by the codebender app yet.');
		    window.operationInProgress = false;
		    return;
	    }

	    if (!this.pluginHandler.canflash(this.selectedBoard, this.selectedProgrammer, true)) {
		    this.setOperationOutput('Please select a valid port for the programmer!');
		    this.eventManager.fire('plugin_notification', 'Please select a valid port for the programmer!');
		    window.operationInProgress = false;
		    return;
	    }

	    this.eventManager.fire('pre_flash');
	    this.setOperationOutput('<i class="icon-spinner icon-spin"> </i> Working...');
	    this.getbin(function (obj) {
		    if (!obj.success) {
			    selfCf.setOperationOutput('There was an error compiling.');
			    selfCf.eventManager.fire('verification_failed', obj.message);
			    window.operationInProgress = false;
		    }
		    else {
			    selfCf.eventManager.fire('mid_flash', obj.size);

			    if (selfCf.pluginHandler.connected) {
				    selfCf.pluginHandler.disconnect(false);
				    setTimeout(function(){
					    selfCf.pluginHandler.probeChromeAppStop(function () {
						    selfCf.pluginHandler.doflash(false, selfCf.selectedBoard, selfCf.selectedProgrammer, obj['output'], selfCf.flash_callback);
					    });
				    }, 200);
			    } else {
				    selfCf.pluginHandler.probeChromeAppStop(function () {
					    selfCf.pluginHandler.doflash(false, selfCf.selectedBoard, selfCf.selectedProgrammer, obj['output'], selfCf.flash_callback);
				    });
			    }
		    }
	    });
    };

    this.getbin = function (callback) {
        var payload = this.generate_payload('binary');
        $.post("https\x3A\x2F\x2Fcodebender.cc\x2Futilities\x2Fcompile\x2F", payload, function (data) {
            try{
                var obj = jQuery.parseJSON(data);
                callback(obj);
            }
            catch(err){
                selfCf.setOperationOutput('<i class="icon-remove"></i> Unexpected error occurred. Try again later.');
                selfCf.eventManager.fire('verification_failed', '<i class="icon-remove"></i> Unexpected error occurred. Try again later.');
	            window.operationInProgress = false;
            }
        })
        .fail(function () {
            selfCf.setOperationOutput('Connection to server failed.');
            selfCf.eventManager.fire('verification_failed', 'Connection to server failed.');
	        window.operationInProgress = false;
        });
    };

    this.verify =  function () {
        if (window.operationInProgress || !this.enableShortCuts) {
	        return;
        }
        window.operationInProgress = true;

        var board = $('#cb_cf_boards').find('option:selected').text();

        var actionId = 47;
        var metaData = {
            "selectedBoard": board,
            "tabID": this.pluginHandler.tabID,
	        "state": getEditorState()
        };
	    createLogCompilerflasher(actionId, metaData);

        this.eventManager.fire('pre_verify');
        this.setOperationOutput('<i class="icon-spinner icon-spin"> </i> Working...');

        this.getbin(function (obj) {
            if (!obj.success) {
                selfCf.setOperationOutput('Verification failed.');
                selfCf.eventManager.fire('verification_failed', obj.message);
            }
            else {
                selfCf.setOperationOutput('Verification Successful');
                selfCf.eventManager.fire('verification_succeed', obj.size);
            }
	        window.operationInProgress = false;
        });
    };

    this.burn_bootloader = function () {
	    if (!this.pluginHandler.canBurnBootloader(this.selectedProgrammer)) {
		    this.setOperationOutput("Please select a valid port!");
		    return;
	    }

	    var actionId = 25;
	    var metaData = {
		    "programmer": $('#programmer').find('option:selected').val(),
		    "board": $('#cb_cf_boards').find('option:selected').val(),
		    "port" : $('#cb_cf_ports').find('option:selected').val(),
		    "bootloader_file": ((typeof this.selectedBoard['bootloader']['file']) == 'undefined') ? 'undefined' : this.selectedBoard['bootloader']['file']
	    };
	    createLogCompilerflasher(actionId, metaData);

	    this.setOperationOutput('<i class="icon-spinner icon-spin"></i> Working...');
	    if (typeof this.selectedBoard['bootloader']['file'] == 'undefined') {
		    this.pluginHandler.codebenderPlugin.saveToHex("");
		    window.result = this.pluginHandler.doflashBootloader(this.selectedProgrammer, this.selectedBoard);
	    }
	    else {
		    $.get("\x2Fbootloader\x2F" + this.selectedBoard['bootloader']['file'].replace('.hex', '.txt'))
			    .success(function (data) {
				    selfCf.pluginHandler.codebenderPlugin.saveToHex(data);
				    window.result = selfCf.pluginHandler.doflashBootloader(selfCf.selectedProgrammer, selfCf.selectedBoard);
			    })
			    .error(function () {
				    selfCf.setOperationOutput('The bootloader file was not found.');
			    });
	    }
    };

	if ($("#cb_cf_operation_output").length > 0) {
		this.loaded_elements.push("cb_cf_operation_output");
	}
	if ($("button#cb_cf_verify_btn").length > 0) {
		$("#cb_cf_verify_btn").click(function () {
			selfCf.verify();
		});
		this.loaded_elements.push("cb_cf_verify_btn");
	}
	if ($("select#cb_cf_boards").length > 0) {
		this.boardsListExists = true;
		$("#cb_cf_boards").append($('<option></option>').html('Loading Boards...'))
			.attr('disabled', 'disabled')
			.click(function () {
				selfCf.clickedBoard();
			})
			.change(function () {
				selfCf.saveBoard();
			});
		$.getJSON("https\x3A\x2F\x2Fcodebender.cc\x2Fboard\x2Flistboards", function (data) {
			boardsListCallback(data);
		});
		this.loaded_elements.push("cb_cf_boards");
	}
	if ($("select#cb_cf_ports").length > 0) {
		var $ports = $('#cb_cf_ports');
		$ports.click(function () {
			selfCf.pluginHandler.clickedPort();
		})
		.change(function () {
			selfCf.pluginHandler.savePort();
		})
		.attr("disabled", "disabled");

		if ($ports.data().pluginVersion) {
			this.pluginHandler.minVersion = $ports.data().pluginVersion;
		}

		this.loaded_elements.push("cb_cf_ports");
	}
	if ($("button#cb_cf_flash_btn").length > 0) {
		$("#cb_cf_flash_btn")
			.click(function () {
				selfCf.usbflash();
			})
			.attr("disabled", "disabled");
		this.loaded_elements.push("cb_cf_flash_btn");
	}
	if ($("select#cb_cf_programmers").length > 0) {
		$("#cb_cf_programmers").append($('<option></option>').html("Loading Programmers..."))
			.attr('disabled', 'disabled')
			.click(function () {
				selfCf.clickedProgrammer();
			})
			.change(function () {
				selfCf.saveProgrammer();
			});
		$.getJSON("https\x3A\x2F\x2Fcodebender.cc\x2Fboard\x2Fprogrammers", function (data)
		{
			programmersListCallback(data);
		});
		this.loaded_elements.push("cb_cf_programmers");
	}
	if ($("button#cb_cf_flash_with_prog_btn").length > 0) {
		$("#cb_cf_flash_with_prog_btn").click(function () {
				selfCf.usbflashWithProgrammer();
			})
			.attr('disabled', 'disabled');
		this.loaded_elements.push("cb_cf_flash_with_prog_btn");
	}
	if ($("select#cb_cf_baud_rates").length > 0) {
		$("#cb_cf_baud_rates").append(
			"<option>9600</option>" +
			"<option>19200</option>" +
			"<option>28800</option>" +
			"<option>38400</option>" +
			"<option>57600</option>" +
			"<option>115200</option>")
			.attr('disabled', 'disabled');

		this.loaded_elements.push("cb_cf_baud_rates");
	}
	if ($("button#cb_cf_serial_monitor_connect").length > 0) {
		$("#cb_cf_serial_monitor_connect").click(function () {
				selfCf.pluginHandler.connect();
			})
			.attr('disabled', 'disabled');
		this.loaded_elements.push("cb_cf_serial_monitor_connect");
	}
	if ($("#cb_cf_serial_monitor").length > 0) {
		$("#cb_cf_serial_monitor").html("\x3Cstyle\x3E\x0A\x09\x23serial_monitor_content\x0A\x09\x7B\x0A\x09\x09display\x3A\x20none\x3B\x0A\x09\x7D\x0A\x0A\x09\x23serial_hud\x0A\x09\x7B\x0A\x09\x09overflow\x2Dy\x3A\x20scroll\x3B\x0A\x09\x7D\x0A\x0A\x09\x23serial_monitor_hud_and_autoscroll\x0A\x09\x7B\x0A\x09\x09display\x3A\x20inline\x2Dblock\x3B\x0A\x09\x7D\x0A\x0A\x09\x23serial\x2Dchecboxes\x0A\x09\x7B\x0A\x09\x09display\x3A\x20inline\x2Dblock\x3B\x0A\x09\x7D\x0A\x0A\x09\x23serial\x2Dchecboxes\x20\x3E\x20label\x0A\x09\x7B\x0A\x09\x09margin\x2Dbottom\x3A\x200\x3B\x0A\x09\x7D\x0A\x0A\x09\x23autoscroll_label\x0A\x09\x7B\x0A\x09\x09position\x3A\x20relative\x3B\x0A\x09\x09top\x3A\x208px\x3B\x0A\x09\x7D\x0A\x0A\x09\x23autoscroll_check\x0A\x09\x7B\x0A\x09\x09display\x3A\x20block\x3B\x0A\x09\x7D\x0A\x0A\x09\x23echo_label\x0A\x09\x7B\x0A\x09\x09position\x3A\x20relative\x3B\x0A\x09\x09top\x3A\x203px\x3B\x0A\x09\x7D\x0A\x0A\x09.serial\x2Dmonitor\x2Decho\x0A\x09\x7B\x0A\x09\x09display\x3A\x20inline\x2Dblock\x3B\x0A\x09\x09color\x3A\x20\x23FF0000\x3B\x0A\x09\x7D\x0A\x0A\x09\x23serial\x2Dline\x2Dendings\x0A\x09\x7B\x0A\x09\x09width\x3A\x20130px\x3B\x0A\x09\x09margin\x2Dbottom\x3A\x2010px\x3B\x0A\x09\x7D\x0A\x3C\x2Fstyle\x3E\x0A\x0A\x3Cdiv\x20id\x3D\x22serial_monitor_content\x22\x3E\x0A\x09\x3Cdiv\x20id\x3D\x22serial_monitor_hud_and_autoscroll\x22\x3E\x0A\x09\x09\x3Cpre\x20id\x3D\x22serial_hud\x22\x20class\x3D\x22well\x22\x3E\x3C\x2Fpre\x3E\x0A\x0A\x09\x20\x20\x20\x20\x3Cspan\x20id\x3D\x22serial\x2Dchecboxes\x22\x3E\x0A\x09\x09\x20\x20\x20\x20\x3Clabel\x20id\x3D\x22autoscroll_label\x22\x20class\x3D\x22checkbox\x22\x3E\x0A\x09\x09\x09\x20\x20\x20\x20\x3Cinput\x20id\x3D\x27autoscroll_check\x27\x20type\x3D\x22checkbox\x22\x20checked\x3E\x0A\x09\x09\x09\x20\x20\x20\x20Autoscroll\x0A\x09\x09\x20\x20\x20\x20\x3C\x2Flabel\x3E\x0A\x0A\x09\x09\x20\x20\x20\x20\x3Clabel\x20id\x3D\x22echo_label\x22\x20class\x3D\x22checkbox\x22\x3E\x0A\x09\x09\x09\x20\x20\x20\x20\x3Cinput\x20id\x3D\x27echo_check\x27\x20type\x3D\x22checkbox\x22\x3E\x0A\x09\x09\x09\x20\x20\x20\x20Echo\x0A\x09\x09\x20\x20\x20\x20\x3C\x2Flabel\x3E\x0A\x09\x20\x20\x20\x20\x3C\x2Fspan\x3E\x0A\x0A\x09\x09\x3Cselect\x20id\x3D\x22serial\x2Dline\x2Dendings\x22\x3E\x0A\x09\x09\x09\x3Coption\x20value\x3D\x22nle\x22\x3ENo\x20line\x20ending\x3C\x2Foption\x3E\x0A\x09\x09\x09\x3Coption\x20value\x3D\x22nl\x22\x3ENewline\x3C\x2Foption\x3E\x0A\x09\x09\x09\x3Coption\x20value\x3D\x22cr\x22\x3ECarriage\x20return\x3C\x2Foption\x3E\x0A\x09\x09\x09\x3Coption\x20value\x3D\x22nlcr\x22\x20selected\x3D\x22selected\x22\x3EBoth\x20NL\x20\x26\x20CR\x3C\x2Foption\x3E\x0A\x09\x09\x3C\x2Fselect\x3E\x0A\x09\x3C\x2Fdiv\x3E\x0A\x0A\x09\x3Cdiv\x20class\x3D\x22input\x2Dappend\x22\x3E\x0A\x09\x09\x3Cinput\x20id\x3D\x22text2send\x22\x20type\x3D\x22text\x22\x20placeholder\x3D\x22Type\x20a\x20message\x22\x20onkeydown\x3D\x22compilerflasher.pluginHandler.serialSendOnEnter\x28event\x29\x22\x3E\x0A\x09\x09\x3Cbutton\x20id\x3D\x22serial_send\x22\x20onclick\x3D\x22compilerflasher.pluginHandler.serialSend\x28\x29\x22\x20class\x3D\x22btn\x22\x20title\x3D\x22Send\x20Message\x22\x3ESend\x3C\x2Fbutton\x3E\x0A\x09\x3C\x2Fdiv\x3E\x0A\x3C\x2Fdiv\x3E\x0A");
		this.loaded_elements.push("cb_cf_serial_monitor");
	}
	if ($("#cb_cf_burn_bootloader").length > 0) {
		$("#cb_cf_burn_bootloader").click(function () {
				selfCf.burn_bootloader();
			})
			.attr('disabled', 'disabled');
		this.loaded_elements.push("cb_cf_burn_bootloader");
	}

    this.serial_monitor_disabled = false;
    this.disableCompilerFlasherActions = function(){
        $("#cb_cf_boards").attr("disabled", "disabled");
        $("#cb_cf_verify_btn").attr("disabled", "disabled");
        if (compilerflasher.pluginHandler.plugin_running) {
            $("#cb_cf_ports").attr("disabled", "disabled");
            $("#cb_cf_flash_btn").attr("disabled", "disabled");
            $("#cb_cf_programmers").attr("disabled", "disabled");
            $("#cb_cf_flash_with_prog_btn").attr("disabled", "disabled");
            $("#cb_cf_baud_rates").attr("disabled", "disabled");
            $("#cb_cf_serial_monitor_connect").attr("disabled", "disabled");
            selfCf.serial_monitor_disabled = true;
        }
    };

    this.enableCompilerFlasherActions = function(){
        $("#cb_cf_boards").removeAttr("disabled");
        $("#cb_cf_verify_btn").removeAttr("disabled");
        if (compilerflasher.pluginHandler.plugin_running) {
            $("#cb_cf_ports").removeAttr("disabled");
            $("#cb_cf_flash_btn").removeAttr("disabled");
            $("#cb_cf_programmers").removeAttr("disabled");
            $("#cb_cf_flash_with_prog_btn").removeAttr("disabled");
            $("#cb_cf_baud_rates").removeAttr("disabled");
            $("#cb_cf_serial_monitor_connect").removeAttr("disabled");
            selfCf.serial_monitor_disabled = false;
        }
    };

    this.on("pre_verify", this.disableCompilerFlasherActions);
    this.on("verification_succeed", this.enableCompilerFlasherActions);
    this.on("verification_failed", this.enableCompilerFlasherActions);
    this.on("pre_flash", this.disableCompilerFlasherActions);
    this.on("flash_failed", this.enableCompilerFlasherActions);
    this.on("flash_succeed", this.enableCompilerFlasherActions);
    this.on("pre_hex", this.disableCompilerFlasherActions);
    this.on("hex_succeed", this.enableCompilerFlasherActions);
    this.on("hex_failed", this.enableCompilerFlasherActions);

    window.operationInProgress = false;

	if (!this.boardsListExists) {
		clientLoader(initializeCompilerflasher);
	}

	this.unsupportedBoard = function (board) {
		this.setOperationOutput('');
		if (window.chrome && board == 'TinyLily Mini' &&
			typeof window.isWindowsWithChromeApp == 'function' && window.isWindowsWithChromeApp()) {
			this.setOperationOutput('The selected board is unsupported at the current platform. We are sorry for the inconvenience.');
			return true;
		}
		return false;
	};

	function clientLoader(initializeCallback) {
		var path = "\x2Fembed\x2Ffirefox\x2Dclient.js";
		if (window.chrome) {
			path = "\x2Fembed\x2Fchrome\x2Dclient.js";
		}
		$.getScript(path)
			.done(function () {
				compilerflasher.pluginHandler.codebenderPlugin = new window.CodebenderPlugin();
				initializeCallback();
			})
			.fail(function () {
				compilerflasher.setOperationOutput('There was an unexpected error. Please referesh your browser.');
			});
	}

	function initializeCompilerflasher() {
		if (window.location.origin.indexOf("codebender.cc") == -1) {
			compilerflasher.pluginHandler.initializePlugin();
		}
		else {
			window.osBrowserDetectionValidInterval = setInterval(function(){
				if (typeof window.osBrowserIsSupported != 'undefined') {
					clearInterval(window.osBrowserDetectionValidInterval);
					compilerflasher.pluginHandler.initializePlugin();
				}
			}, 100);
		}
	}

	function boardsListCallback(data) {
		var plainList = getPlainBoardList(data);
		compilerflasher.setBoardsList(plainList);

		var $boards = $('#cb_cf_boards');
		$boards.find('option').remove().end();
		var found = false;
		var i;
		if ($boards.data().board) {
			for (i = 0; i < compilerflasher.boards_list.length; i++) {
				if (compilerflasher.boards_list[i]["name"] == $boards.data().board) {
					compilerflasher.selectedBoard = compilerflasher.boards_list[i];
					$boards.hide();
					found = true;
					break;
				}
			}
		}

		if (!found) {
			$.each(data, function(vendorName, vendorBoards) {
				if (Object.keys(vendorBoards).length != 0) {
					var optgroup = $('<optgroup>');
					optgroup.attr('label', vendorName);

					$.each(vendorBoards, function (index, board) {
						var option = $('<option></option>');
						option.val(board['name']).html(board['name']);
						optgroup.append(option);
					});
					$("#cb_cf_boards").append(optgroup);
				}
			});

			compilerflasher.loadBoard();

			var board = compilerflasher.getDefaultBoard();
			if (typeof board != 'undefined' && $boards.find('option[value="'+board+'"]').length == 1) {
				$boards.val(board);
				compilerflasher.saveBoard();
			}

			$boards.removeAttr('disabled');
			$('#cb_cf_verify_btn').removeAttr('disabled');
		}

		compilerflasher.enableShortCuts = true;

		clientLoader(initializeCompilerflasher);
	}

	/*
	 Extracts the board list in the old format (that is, an array of board objects)
	 from the response of the boardlist action. Note that the response of the
	 boardslist action is a JSON encoded array of board vendors and each vendor
	 element contains the boards manufactured by the vendor.
	 */
	function getPlainBoardList(data) {
		var boards = [];
		$.each(data, function(vendorName, vendorBoards) {
				$.each(vendorBoards, function(index, board) {
						boards.push(board);
					}
				);
			}
		);
		return boards;
	}

	function programmersListCallback (data) {
		compilerflasher.programmers_list = data;

		var $programmers = $('#cb_cf_programmers');
		$programmers.find('option').remove().end();
		for (var i = 0; i < compilerflasher.programmers_list.length; i++) {
			$programmers.append($('<option></option>')
				.val(compilerflasher.programmers_list[i]["name"])
				.html(compilerflasher.programmers_list[i]["name"]));
		}
		compilerflasher.loadProgrammer();
	}

	function createLogCompilerflasher (actionId, metaData, callback) {
		if (typeof createLog == 'function') {
			createLog(actionId, metaData, callback);
		}
	}

	// Decodes an HTML string
	function decodeHtml (html) {
		return html.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
	}

	// Escape an HTML string
	function escapeHtml (html) {
		return html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
	}

	function checkObjEquals(a, b) {
		var aProps = Object.getOwnPropertyNames(a);
		var bProps = Object.getOwnPropertyNames(b);
		if (aProps.length != bProps.length)
		{
			return false;
		}
		for (var i = 0; i < aProps.length; i++)
		{
			var propName = aProps[i];
			if (a[propName] !== b[propName])
			{
				return false;
			}
		}
		return true;
	}

	function getEditorState () {
		var state = 'unknown';
		if (typeof fileManager == 'undefined') {
			return state;
		}

		if (checkObjEquals(fileManager.currentState, fileManager.getCurrentState())) {
			state = 'clean';
		}
		else {
			state = 'dirty';
		}
		fileManager.currentState = fileManager.getCurrentState();
		return state;
	}
};

function logging()
{
    var payload = generate_payload('binary', true);

    $.post("\x2Futilities\x2Fcompile\x2F", payload, function (data) {
        var obj = jQuery.parseJSON(data);
    });
}
window.flashing_errors =
{
	"-1": "Couldn’t find an Arduino on the selected port. If you are using Leonardo check that you have the correct port selected. If it is correct, try pressing the board’s reset button after initiating the upload.",
	"-2": "There was a problem programming your Arduino. If you are using a non-English Windows version, or username please contact us.",
	"-22": "The selected port seems to be in use. Please check your board connection, and make sure that you are not using it from some other application or you don't have an open serial monitor.",
	"-23": "Another flashing process is still active. Please wait until it is done and try again.",
	"-55": "The specified port might not be available. Please check if it is used by another application. If the problem persists, unplug your device and plug it again.",
	"-56": "The specified port is in use or you do not have enough permissions to use the device. Please check if it is used by another application or correct its permissions.",
	"-57": "The specified port might not be available. Please check if it is used by another application. If the problem persists, unplug your device and plug it again.",
	"-200": "There was a problem during the flashing process. Please make sure you have selected the correct device, close other tabs that may use it, reload the page and try again. If the problem persists, please contact us.",
	"-204": "Could not program your device, the process timed out. Make sure that you have connected it properly, that you have selected the correct settings (device type and port) and try again.",
	1: "Could not connect to your device. Make sure that you have connected it properly, that you have selected the correct settings (device type and port) and try again.",
	100: "Could not connect to your device. Make sure that you have connected it properly, that you have selected the correct settings (device type and port) and try again.",
	126: "Something seems to be wrong with the plugin installation. You need to install the plugin again.",
	127: "Something seems to be wrong with the plugin installation. You need to install the plugin again.",
	256: "Could not connect to your device. Make sure that you have connected it properly, that you have selected the correct settings (device type and port) and try again.",
	1001: "Your device is unresponsive. Please make sure you have selected the correct device and it is connected properly.",
	1002: "Your device is unresponsive. Please make sure you have selected the correct device and it is connected properly.",
	2001: "The selected port seems to be in use. Please make sure that you are not using it from some other program.",
	3005: "This baudrate is not supported by the operating system.",
	20000: "Your device is unresponsive. Please make sure you have selected the correct device and it is connected properly.",
	20001: "There was a problem during the flashing process. Please make sure you have selected the correct device, close other tabs that may use it, reload the page and try again. If the problem persists, please contact us.",
	20002: "There was a problem during the flashing process. Please make sure you have selected the correct device, close other tabs that may use it, reload the page and try again. If the problem persists, please contact us.",
	20003: "There was a problem during the flashing process. Please make sure you have selected the correct device, close other tabs that may use it, reload the page and try again. If the problem persists, please contact us.",
	20004: "There was a problem during the flashing process. Please make sure you have selected the correct device, close other tabs that may use it, reload the page and try again. If the problem persists, please contact us.",
	20005: "There was a problem during the flashing process. Please make sure you have selected the correct device, close other tabs that may use it, reload the page and try again. If the problem persists, please contact us.",
	20006: "There was a problem during the flashing process. Please make sure you have selected the correct device, close other tabs that may use it, reload the page and try again. If the problem persists, please contact us.",
	20007: "There was a problem during the flashing process. Please make sure you have selected the correct device, close other tabs that may use it, reload the page and try again. If the problem persists, please contact us.",
	20008: "There was a problem during the flashing process. Please make sure you have selected the correct device, close other tabs that may use it, reload the page and try again. If the problem persists, please contact us.",
	20009: "There was a problem during the flashing process. Please make sure you have selected the correct device, close other tabs that may use it, reload the page and try again. If the problem persists, please contact us.",
	20010: "Your device sends data faster than your computer can proccess.",
	20500: "There was a problem during the flashing process. Please make sure you have selected the correct device, close other tabs that may use it, reload the page and try again. If the problem persists, please contact us.",
	32001: "The selected port seems to be in use. Please make sure that you are not using it from some other program.",
	33005: "This baudrate is not supported by the operating system.",
	36000: "Could not connect to your device. Make sure that you have connected it properly, that you have selected the correct settings (device type and port) and try again."
};

    //Scrolling function
    (function ($) {
        var h = $.scrollTo = function (a, b, c) {
            $(window).scrollTo(a, b, c);
        };
        h.defaults = {
	        axis: 'xy',
	        duration: parseFloat($.fn.jquery) >= 1.3 ? 0 : 1,
	        limit: true
        };
        h.window = function () {
            return $(window)._scrollable();
        };
        $.fn._scrollable = function () {
            return this.map(function () {
                var a = this, isWin = !a.nodeName || $.inArray(a.nodeName.toLowerCase(), ['iframe', '#document', 'html', 'body']) != -1;
                if (!isWin)return a;
                var b = (a.contentWindow || a).document || a.ownerDocument || a;
                return /webkit/i.test(navigator.userAgent) || b.compatMode == 'BackCo    mpat' ? b.body : b.documentElement;
            })
        };
        $.fn.scrollTo = function (e, f, g) {
            if (typeof f == 'object') {
                g = f;
                f = 0;
            }
            if (typeof g == 'function') {
	            g = {
		            onAfter: g
	            };
            }
            if (e == 'max') {
	            e = 9e9;
            }
            g = $.extend({}, h.defaults, g);
            f = f || g.duration;
            g.queue = g.queue && g.axis.length > 1;
            if (g.queue) {
	            f /= 2;
            }
            g.offset = both(g.offset);
            g.over = both(g.over);
            return this._scrollable().each(function () {
                if (e === null) {
	                return;
                }
                var d = this, $elem = $(d), targ = e, toff, attr = {}, win = $elem.is('html,body');
                switch (typeof targ) {
                    case'number':
                    case'string':
                        if (/^([+-]=)?\d+(\.\d+)?(px|%)?$/.test(targ)) {
                            targ = both(targ);
                            break;
                        }
                        targ = $(targ, this);
                        if (!targ.length) {
	                        return;
                        }
                    case'object':
                        if (targ.is || targ.style) {
	                        toff = (targ = $(targ)).offset();
                        }
	                    break;
                }
                $.each(g.axis.split(''), function (i, a) {
                    var b = a == 'x' ? 'Left' : 'Top', pos = b.toLowerCase(), key = 'scroll' + b, old = d[key], max = h.max(d, a);
                    if (toff) {
                        attr[key] = toff[pos] + (win ? 0 : old - $elem.offset()[pos]);
                        if (g.margin) {
                            attr[key] -= parseInt(targ.css('margin' + b)) || 0;
                            attr[key] -= parseInt(targ.css('border' + b + 'Width')) || 0;
                        }
                        attr[key] += g.offset[pos] || 0;
                        if (g.over[pos]) {
	                        attr[key] += targ[a == 'x' ? 'width' : 'height']() * g.over[pos];
                        }
                    } else {
                        var c = targ[pos];
                        attr[key] = c.slice && c.slice(-1) == '%' ? parseFloat(c) / 100 * max : c;
                    }
                    if (g.limit && /^\d+$/.test(attr[key])) {
	                    attr[key] = attr[key] <= 0 ? 0 : Math.min(attr[key], max);
                    }
                    if (!i && g.queue) {
                        if (old != attr[key]) {
	                        animate(g.onAfterFirst);
                        }
                        delete attr[key];
                    }
                });
                animate(g.onAfter);
                function animate(a) {
                    $elem.animate(attr, f, g.easing, a && function () {
                        a.call(this, e, g);
                    })
                }
            }).end()
        };
        h.max = function (a, b) {
            var c = b == 'x' ? 'Width' : 'Height', scroll = 'scroll' + c;
            if (!$(a).is('html,body')) {
	            return a[scroll] - $(a)[c.toLowerCase()]();
            }
            var d = 'client' + c, html = a.ownerDocument.documentElement, body = a.ownerDocument.body;
            return Math.max(html[scroll], body[scroll]) - Math.min(html[d], body[d]);
        };
        function both(a) {
            return typeof a == 'object' ? a : {top: a, left: a};
        }
    })(jQuery);