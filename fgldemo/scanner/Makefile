BUNDLE_IDENTIFIER   = com.4js.scanner
APPNAME             = CDVScanner
DEVICE              = phone
MODE                = debug
IDENTITY='(59W7RY75ZU)'
PROVISIONING_PROFILE=/Users/leo/Library/MobileDevice/Provisioning\ Profiles/4js_wildcard

PLUGIN= $(CURDIR)/../..

MODULES  = $(patsubst %.4gl, %.42m, $(wildcard *.4gl))
FORMS    = $(patsubst %.per, %.42f, $(wildcard *.per))

%.42m: %.4gl
	fglcomp -M $*

%.42f: %.per
	fglform -M $*

all:: $(MODULES) $(FORMS) 

define gmibuild
	gmibuildtool --install=$(1) --app-name=$(APPNAME) --bundle-id=$(BUNDLE_IDENTIFIER) --provisioning=$(PROVISIONING_PROFILE) --certificate=$(IDENTITY) --device=$(DEVICE) --mode=$(MODE) --build-cordova=$(PLUGIN) 
endef

#just builds build/iphoneos/GMI.ipa
gmi.build: all
	$(call gmibuild,no)
	
#installs the ipa on the device
gmi.install: all
	$(call gmibuild,yes)

clean::
	rm -rf build gmi/appRoot
	rm -f *.42* cordovamap.txt gmiignore gmi/link_flags.sh gmi/*.a
