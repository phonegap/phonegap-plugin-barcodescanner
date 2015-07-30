/*
 * Copyright 2013-2015 BlackBerry Limited.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

#include <json/reader.h>
#include <json/writer.h>

#include <zxing/common/GreyscaleLuminanceSource.h>
#include <zxing/common/HybridBinarizer.h>
#include <zxing/MultiFormatReader.h>
#include <img/img.h>
#include <stdio.h>
#include <bps/bps.h>
#include <bps/event.h>
#include <bps/navigator.h>
#include <bps/screen.h>
#include <screen/screen.h>
#include <pthread.h>

#include "barcodescanner_ndk.hpp"
#include "barcodescanner_js.hpp"

#include <string>
#include <sstream>

using namespace zxing;

namespace webworks {

BarcodeScannerJS* eventDispatcher = NULL;
// Variables for native viewfinder screen
static screen_window_t vf_win = NULL;
static uint32_t vfRotation = 0;
static bool touch = false;


#define MUTEX_LOCK() pthread_mutex_trylock(&m_lock)
#define MUTEX_UNLOCK() pthread_mutex_unlock(&m_lock)

static pthread_mutex_t m_lock;
static pthread_t m_thread = 0;

    /*
     * getCameraErrorDesc
     *
     * Returns a descriptive error message for a given camera error code
     */
    const char* getCameraErrorDesc(camera_error_t err) {
        switch (err) {
        case CAMERA_EOK:
            return "The function call to the camera completed successfully.";
        case CAMERA_EAGAIN:
            return "The specified camera was not available. Try again.";
        case CAMERA_EINVAL:
            return "The camera call failed because of an invalid parameter.";
        case CAMERA_ENODEV:
            return "No such camera was found.";
        case CAMERA_EMFILE:
            return "The camera called failed because of a file table overflow.";
        case CAMERA_EBADF:
            return "Indicates that an invalid handle to a @c camera_handle_t value was used.";
        case CAMERA_EACCESS:
            return "Indicates that the necessary permissions to access the camera are not available.";
        case CAMERA_EBADR:
            return "Indicates that an invalid file descriptor was used.";
        case CAMERA_ENOENT:
            return "Indicates that the access a file or directory that does not exist.";
        case CAMERA_ENOMEM:
            return "Indicates that memory allocation failed.";
        case CAMERA_EOPNOTSUPP:
            return "Indicates that the requested operation is not supported.";
        case CAMERA_ETIMEDOUT:
            return "The function call failed due to communication problem or time-out with the camera.";
        case CAMERA_EALREADY:
            return "Indicates an operation on the camera is already in progress. In addition, this error can indicate that an error could not be completed because it was already completed. For example, if you called the @c camera_stop_video() function but the camera had already stopped recording video, this error code would be returned.";
        case CAMERA_EUNINIT:
            return "Indicates that the Camera Library is not initialized.";
        case CAMERA_EREGFAULT:
            return "Indicates that registration of a callback failed.";
        case CAMERA_EMICINUSE:
            return "Indicates that it failed to open because microphone is already in use.";
        }
        return NULL;
    }


    /*
     * viewfinder_callback
     *
     * This callback is invoked when an image frame from the camera viewfinder becomes available.
     * The frame is analyzed to determine if a barcode can be matched.
     * Frames come in NV12 format which makes code analysis very fast.
     */
    void viewfinder_callback(camera_handle_t handle,camera_buffer_t* buf,void* arg) {
        camera_frame_nv12_t* data = (camera_frame_nv12_t*)(&(buf->framedesc));
        uint8_t* buff = buf->framebuf;
        int stride = data->stride;
        int width = data->width;
        int height = data->height;
        if ( eventDispatcher != NULL ){
//            eventDispatcher->getLog()->debug("Frame received");
        }

        try {
            Ref<LuminanceSource> source(new GreyscaleLuminanceSource((unsigned char *)buff, stride, height, 0,0,width,height));

            Ref<Binarizer> binarizer(new HybridBinarizer(source));
            Ref<BinaryBitmap> bitmap(new BinaryBitmap(binarizer));
            Ref<Result> result;

            // setup the code reader
            MultiFormatReader *reader = new MultiFormatReader();
            DecodeHints *hints = new DecodeHints();

            hints->addFormat(BarcodeFormat_QR_CODE);
            hints->addFormat(BarcodeFormat_EAN_8);
            hints->addFormat(BarcodeFormat_EAN_13);
            hints->addFormat(BarcodeFormat_UPC_A);
            hints->addFormat(BarcodeFormat_UPC_E);
            hints->addFormat(BarcodeFormat_DATA_MATRIX);
            hints->addFormat(BarcodeFormat_CODE_128);
            hints->addFormat(BarcodeFormat_CODE_39);
            hints->addFormat(BarcodeFormat_ITF);
            hints->addFormat(BarcodeFormat_AZTEC);

			// attempt to decode and retrieve a valid QR code from the image bitmap
			result = reader->decode(bitmap, *hints);

            std::string newBarcodeData = result->getText()->getText().data();

            Json::FastWriter writer;
            Json::Value root;
            root["text"] = newBarcodeData;
            root["format"] = barcodeFormatNames[result->getBarcodeFormat()];
            root["cancelled"] = false;

            // notify caller that a valid QR code has been decoded
            if ( eventDispatcher != NULL){
            	std::string event = "community.barcodescanner.codefound.native";
            	event.insert(0, " ");
            	event.insert(0, (char *) arg);
            	eventDispatcher->NotifyEvent(event + " " + writer.write(root));
            	eventDispatcher->getLog()->debug("This is the detected Barcode");
            	eventDispatcher->getLog()->debug(newBarcodeData.c_str());
            }

        }
        catch (const std::exception& ex)
        {
            // Uncomment this if you need to verify scanning
            if ( eventDispatcher != NULL ){
//               eventDispatcher->getLog()->warn("Scan error");
//               eventDispatcher->getLog()->warn(ex.what());
            }
        }
    }

    std::string convertIntToString(int i) {
		stringstream ss;
		ss << i;
		return ss.str();
	}


    /*
     * Constructor for Barcode Scanner NDK class
     */
    BarcodeScannerNDK::BarcodeScannerNDK(BarcodeScannerJS *parent): threadHalt(false) {
    	cbId = new char[1000];
        m_pParent     = parent;
        eventDispatcher = parent;
        mCameraHandle = CAMERA_HANDLE_INVALID;
    }

    BarcodeScannerNDK::~BarcodeScannerNDK() {
    	delete[] cbId;
    }

    webworks::Logger* BarcodeScannerNDK::getLog() {
        return m_pParent->getLog();
    }

    void interrogateWindowCV(screen_window_t window, Logger* log, string description, int property) {
        char* value = new char[256];
        int ok = screen_get_window_property_cv(window, property, 256, value);
        if (ok == 0) {
            log->info(description.c_str());
            log->info(value);
        } else {
            log->warn("Unable to interpret value for");
            log->warn(description.c_str());
        }
    }

    void interrogateWindowIV(screen_window_t window, Logger* log, string description, int property) {
        int value = -1;
        int ok = screen_get_window_property_iv(window, property, &value);
        if (ok == 0) {
            log->info(description.c_str());
            log->info(convertIntToString(value).c_str());
        } else {
            log->warn("Unable to interpret value for");
            log->warn(description.c_str());
        }
    }

    void interrogateWindow(screen_window_t window, Logger* log) {
        log->info("Window Details--->");
        interrogateWindowCV(window, log, "Window ID", SCREEN_PROPERTY_ID_STRING);
        interrogateWindowIV(window, log, "Window Type", SCREEN_PROPERTY_TYPE);
        interrogateWindowIV(window, log, "Window Owner PID", SCREEN_PROPERTY_OWNER_PID);
        interrogateWindowCV(window, log, "Window Group", SCREEN_PROPERTY_GROUP);
        interrogateWindowIV(window, log, "Window Z Order", SCREEN_PROPERTY_ZORDER);
        interrogateWindowIV(window, log, "Window Visible", SCREEN_PROPERTY_VISIBLE);
        log->info("Window Interrogation complete");
    }

    void *HandleEvents(void *args) {
        BarcodeScannerNDK *parent = static_cast<BarcodeScannerNDK *>(args);
        parent->getLog()->debug("BarcodeScannerNDK EventHandler");

        /**
         * Creating a native viewfinder screen
         */
        const int usage = SCREEN_USAGE_NATIVE;
        screen_window_t screen_win;
        screen_buffer_t screen_buf = NULL;
        int rect[4] = { 0, 0, 0, 0 };

        if(screen_create_window_type(&screen_win, parent->windowContext, SCREEN_CHILD_WINDOW) == -1) {
            parent->getLog()->error("screen_create_window() failed");;
        }
        screen_join_window_group(screen_win, parent->windowGroup);
        char * groupCheck = new char[256];
        screen_get_window_property_cv(screen_win, SCREEN_PROPERTY_GROUP, 256, groupCheck);
        parent->getLog()->info("Window Group Check");
        parent->getLog()->info(groupCheck);
        screen_set_window_property_iv(screen_win, SCREEN_PROPERTY_USAGE, &usage);
        int r = 0;
        screen_display_t display = NULL;
        screen_get_window_property_pv(screen_win, SCREEN_PROPERTY_DISPLAY, (void**)&display);
        if (display != NULL) {
            screen_get_display_property_iv(display, SCREEN_PROPERTY_ROTATION, &r);
            parent->getLog()->debug("Current Display Rotation");
            parent->getLog()->debug(convertIntToString(r).c_str());
        }
        screen_create_window_buffers(screen_win, 1);
        screen_get_window_property_pv(screen_win, SCREEN_PROPERTY_RENDER_BUFFERS, (void **)&screen_buf);
        screen_get_window_property_iv(screen_win, SCREEN_PROPERTY_BUFFER_SIZE, rect+2);
        // The screen (and backing buffer) don't take into account the rotation, so we need to swap the size.
        if (r == 90 || r == 270) {
            int swap = rect[2];
            rect[2] = rect[3];
            rect[3] = swap;
        }
        // Set the window size and the buffer follows along
        screen_set_window_property_iv(screen_win, SCREEN_PROPERTY_SIZE, rect+2);
        screen_get_window_property_iv(screen_win, SCREEN_PROPERTY_BUFFER_SIZE, rect+2);

        parent->getLog()->debug("Screen Buffer Size:");
        parent->getLog()->debug(convertIntToString(rect[0]).c_str());
        parent->getLog()->debug(convertIntToString(rect[1]).c_str());
        parent->getLog()->debug(convertIntToString(rect[2]).c_str());
        parent->getLog()->debug(convertIntToString(rect[3]).c_str());

        int type = -1;
        screen_get_window_property_iv(screen_win, SCREEN_PROPERTY_TYPE, &type);
        parent->getLog()->debug("Window Type");
        parent->getLog()->debug(convertIntToString(type).c_str());

        // fill the window with a flat colour
        int attribs[] = { SCREEN_BLIT_COLOR, 0x00333333, SCREEN_BLIT_END };
        screen_fill(parent->windowContext, screen_buf, attribs);
        screen_post_window(screen_win, screen_buf, 1, rect, 0);
        // position the window at an arbitrary z-order
        int i = 1;
        screen_set_window_property_iv(screen_win, SCREEN_PROPERTY_ZORDER, &i);
        screen_get_window_property_iv(screen_win, SCREEN_PROPERTY_ZORDER, &i);
        parent->getLog()->debug("Current Zorder");
        parent->getLog()->debug(convertIntToString(i).c_str());
        int visible = 1;
        screen_set_window_property_iv(screen_win, SCREEN_PROPERTY_VISIBLE, &visible);
        screen_get_window_property_iv(screen_win, SCREEN_PROPERTY_VISIBLE, &visible);
        parent->getLog()->debug("Visible?");
        parent->getLog()->debug(convertIntToString(visible).c_str());
        screen_flush_context(parent->windowContext, 0);

        parent->getLog()->debug("Created Background window");

        if (parent->windowContext) {
            if (BPS_SUCCESS == screen_request_events(parent->windowContext)) {
                parent->getLog()->debug("Requested Events");
            } else {
                parent->getLog()->error("Unable to request events");
                return NULL;
            }
        }

        screen_group_t group;
        screen_get_window_property_pv(screen_win, SCREEN_PROPERTY_GROUP, (void **)&group);
        char* groupName = new char[256];
        screen_get_group_property_cv(group, SCREEN_PROPERTY_NAME, 256, groupName);
        parent->getLog()->debug("Group Found");
        parent->getLog()->debug(groupName);

        // reset Touch value before starting up listening for touch events
        touch = false;

        while(!parent->isThreadHalt()) {
            MUTEX_LOCK();

            int domain;
            // Get the first event in the queue.
            bps_event_t *event = NULL;
            if (BPS_SUCCESS != bps_get_event(&event, 0)) {
                parent->getLog()->warn("bps_get_event() failed");
            }

            // Handle all events in the queue.
            while (event) {
                if (touch) {
                    // HandleScreenEvent got a tap on the screen
                    // Shutdown the scanning
                    parent->cancelScan();
                    break;
                }
                if (event) {
                    domain = bps_event_get_domain(event);
                    parent->getLog()->debug("BPS Event");
                    if (domain == screen_get_domain()) {
                        parent->getLog()->debug("BPS Screen Event");
                        parent->handleScreenEvent(event, parent->getLog(), parent->windowGroup);
                    }
                }
                if (BPS_SUCCESS != bps_get_event(&event, 0)) {
                    parent->getLog()->error("bps_get_event() failed");
//                                return;
                }
            }

            MUTEX_UNLOCK();

            // Poll at 10hz
            usleep(100000);
        }
        // stop screen events on this thread
        if(screen_stop_events(parent->windowContext) == -1) {
            parent->getLog()->error("screen_stop_events failed");
        }
        screen_destroy_window(screen_win);
        return NULL;
    }

    void BarcodeScannerNDK::handleScreenEvent(bps_event_t *event, Logger* log, const char* windowGroup) {
        int eventType, objectType, eventProperty;

        screen_event_t screen_event = screen_event_get_event(event);
        screen_get_event_property_iv(screen_event, SCREEN_PROPERTY_TYPE, &eventType);

        switch (eventType) {
        case SCREEN_EVENT_MTOUCH_RELEASE:
        case SCREEN_EVENT_MTOUCH_TOUCH:
        case SCREEN_EVENT_MTOUCH_MOVE:
            log->info("Touch Event");
            touch = true;
            break;
        case SCREEN_EVENT_CREATE:
            log->info("Screen Create Event");
            if (screen_get_event_property_pv(screen_event, SCREEN_PROPERTY_WINDOW, (void **)&vf_win) == -1) {
                log->error("screen_get_event_property_pv(SCREEN_PROPERTY_WINDOW)");
            } else {
                log->info("viewfinder window found!");
            }
            break;
        case SCREEN_EVENT_IDLE:
            log->debug("Screen Idle");
            break;
        case SCREEN_EVENT_POST:
            log->debug("Screen posted first frame");
            if (screen_get_event_property_pv(screen_event, SCREEN_PROPERTY_WINDOW, (void **)&vf_win) == -1) {
                log->error("screen_get_event_property_pv(SCREEN_PROPERTY_WINDOW)");
            } else {
                interrogateWindow(vf_win, log);
                int i = 100;
                screen_set_window_property_iv(vf_win, SCREEN_PROPERTY_ZORDER, &i);
                screen_get_window_property_iv(vf_win, SCREEN_PROPERTY_ZORDER, &i);
                log->debug("Current Zorder");
                log->debug(convertIntToString(i).c_str());
                // make viewfinder window visible
                i = 1;
                screen_set_window_property_iv(vf_win, SCREEN_PROPERTY_VISIBLE, &i);
                screen_get_window_property_iv(vf_win, SCREEN_PROPERTY_VISIBLE, &i);
                log->debug("Visible?");
                log->debug(convertIntToString(i).c_str());
                // Rotate the window as needed
                screen_get_window_property_iv(vf_win, SCREEN_PROPERTY_ROTATION, &i);
                log->debug("Current Rotation");
                log->debug(convertIntToString(i).c_str());
                i = 360 - vfRotation;
                screen_set_window_property_iv(vf_win, SCREEN_PROPERTY_ROTATION, &i);
                screen_get_window_property_iv(vf_win, SCREEN_PROPERTY_ROTATION, &i);
                log->debug("Rotation");
                log->debug(convertIntToString(i).c_str());
                // Make full screen
                screen_display_t display = NULL;
                screen_get_window_property_pv(vf_win, SCREEN_PROPERTY_DISPLAY, (void **)&display);
                if (display != NULL) {
                    log->debug("Found a Display");
                    int size[2] = { 0, 0 };
                    screen_get_display_property_iv(display, SCREEN_PROPERTY_SIZE, size);
                    log->debug("Display Size");
                    log->debug(convertIntToString(size[0]).c_str());
                    log->debug(convertIntToString(size[1]).c_str());
                    int r = 0;
                    screen_get_display_property_iv(display, SCREEN_PROPERTY_ROTATION, &r);
                    log->debug("Current Display Rotation");
                    log->debug(convertIntToString(r).c_str());
                    if (r == 90 || r == 270) {
                        int swap = size[0];
                        size[0] = size[1];
                        size[1] = swap;
                    }
                    screen_set_window_property_iv(vf_win, SCREEN_PROPERTY_SIZE, size);
                    screen_get_window_property_iv(vf_win, SCREEN_PROPERTY_SIZE, size);
                    log->debug("Window Size");
                    log->debug(convertIntToString(size[0]).c_str());
                    log->debug(convertIntToString(size[1]).c_str());
                }

            }
            break;
        case SCREEN_EVENT_CLOSE:
            log->debug("Screen closed");
            break;
        case SCREEN_EVENT_INPUT:
            log->debug("Screen input event");
            break;
        case SCREEN_EVENT_PROPERTY:
            log->debug("Screen property event");
            screen_get_event_property_iv(screen_event, SCREEN_PROPERTY_OBJECT_TYPE, &objectType);
            log->debug("Object Type");
            log->debug(convertIntToString(objectType).c_str());
            screen_get_event_property_iv(screen_event, SCREEN_PROPERTY_NAME, &eventProperty);
            log->debug("Property Name");
            log->debug(convertIntToString(eventProperty).c_str());
            break;
        default:
            log->warn("Unhandled Screen Event Type");
            log->warn(convertIntToString(eventType).c_str());
            break;
        }
    }

    bool BarcodeScannerNDK::StartEvents() {
        if (!m_thread) {
            threadHalt = false;
            pthread_attr_t thread_attr;
            pthread_attr_init(&thread_attr);
            pthread_attr_setdetachstate(&thread_attr, PTHREAD_CREATE_JOINABLE);
            int error = pthread_create(&m_thread, &thread_attr, HandleEvents, static_cast<void *>(this));
            pthread_attr_destroy(&thread_attr);
            if (error) {
                m_pParent->getLog()->error("Thread Failed to start");
                m_thread = 0;
                return false;
            } else {
                m_pParent->getLog()->info("Thread Started");
                MUTEX_LOCK();
                return true;
            }
        }

        return false;
    }

    void BarcodeScannerNDK::StopEvents() {
        if (m_thread) {
            MUTEX_LOCK();
            threadHalt = true;
            MUTEX_UNLOCK();
            m_pParent->getLog()->debug("BarcodeScannerNDK joining event thread");
            pthread_join(m_thread, NULL);
            m_thread = 0;
            m_pParent->getLog()->debug("BarcodeScannerNDK event thread stopped");
        }
    }


    // getter for the stop value
    bool BarcodeScannerNDK::isThreadHalt() {
        bool isThreadHalt;
        MUTEX_LOCK();
        isThreadHalt = threadHalt;
        MUTEX_UNLOCK();
        return isThreadHalt;
    }

    void BarcodeScannerNDK::cancelScan() {
        m_pParent->getLog()->warn("Cancel Scan");
        std::string event = "community.barcodescanner.codefound.native";
        std::string callbackId = cbId;
        Json::FastWriter writer;
        Json::Value root;

        // Scan cancelled by user
        root["text"] = "";
        root["format"] = "";
        root["cancelled"] = true;

        m_pParent->NotifyEvent(callbackId + " "  + event + " " + writer.write(root));
    }

    /*
     * BarcodeScannerNDK::startRead
     *
     * This method is called to start a QR code read. A connection is opened to the device camera
     * and the photo viewfinder is started.
     */
    int BarcodeScannerNDK::startRead(const string &callbackId, const string &arg) {
    	std::string errorEvent = "community.barcodescanner.errorfound.native";
        Json::FastWriter writer;
        Json::Value root;

        // Important for maintaining proper event queue support on 10.2.1
        bps_initialize();

        std::string handle;
        std::string group;
        Json::Reader reader;
        Json::Value input;
        bool parse = reader.parse(arg, input);

        if (!parse) {
            m_pParent->getLog()->error("Parse Error");
            Json::Value error;
            root["state"] = "Parsing JSON object";
            root["error"] = "Cannot parse JSON object";
            root["description"] = "";
            m_pParent->NotifyEvent(callbackId + " " + errorEvent + " " + writer.write(error));
            return EIO;
        } else {
            handle = input["handle"].asString();
            group = input["group"].asString();
        }

        std::copy(callbackId.begin(), callbackId.end(), this->cbId);
        this->cbId[callbackId.size()] = '\0';

        this->windowHandle = handle;
        m_pParent->getLog()->info("Window Handle");
        m_pParent->getLog()->info(handle.c_str());
        // the jsScreenWindowHandle of the UIWebView that we passed in
        int windowPointer = (int) strtol(handle.c_str(), NULL, 10);
        // As an integer is the actual window handle
        screen_window_t window = (screen_window_t) windowPointer;
        interrogateWindow(window, m_pParent->getLog());
        // Create a group for the main window
        windowGroup = new char[group.length()+1];
        std::strcpy (windowGroup, group.c_str());
        m_pParent->getLog()->debug("Window Group using:");
        m_pParent->getLog()->debug(windowGroup);

        int getContext = screen_get_window_property_pv(window, SCREEN_PROPERTY_CONTEXT, (void **)&windowContext);
        if (getContext == -1) {
            m_pParent->getLog()->critical("Unable to get Context");
            root["state"] = "Get App Window Context";
            root["error"] = getContext;
            root["description"] = "Unable to get application context";
            m_pParent->NotifyEvent(callbackId + " " + errorEvent + " " + writer.write(root));
            return EIO;
        }

        StartEvents();

        camera_error_t err;
        // Open the camera first before running any operations on it
        err = camera_open(CAMERA_UNIT_REAR,CAMERA_MODE_RW | CAMERA_MODE_ROLL,&mCameraHandle);

        if ( err != CAMERA_EOK){
            m_pParent->getLog()->error("Ran into an issue when initializing the camera");
            m_pParent->getLog()->error(getCameraErrorDesc( err ));
            root["state"] = "Open Camera";
            root["error"] = err;
            root["description"] = getCameraErrorDesc( err );
            m_pParent->NotifyEvent(callbackId + " " + errorEvent + " " + writer.write(root));
            return EIO;
        }

        // We want maximum framerate from the viewfinder which will scan for codes
        int numRates = 0;
		err = camera_get_photo_vf_framerates(mCameraHandle, true, 0, &numRates, NULL, NULL);
		double* camFramerates = new double[numRates];
		bool maxmin = false;
		err = camera_get_photo_vf_framerates(mCameraHandle, true, numRates, &numRates, camFramerates, &maxmin);

		// do we need to rotate the viewfinder?

		err = camera_get_photovf_property(mCameraHandle, CAMERA_IMGPROP_ROTATION, &vfRotation);
		m_pParent->getLog()->debug("Viewfinder Rotation");
		m_pParent->getLog()->debug(convertIntToString(vfRotation).c_str());

		m_pParent->getLog()->debug("Camera Window Group");
		m_pParent->getLog()->debug(windowGroup);
		// We're going to have the viewfinder window join our app's window group, and start an embedded window
		err = camera_set_photovf_property(mCameraHandle,
		    CAMERA_IMGPROP_WIN_GROUPID, windowGroup,
		    CAMERA_IMGPROP_WIN_ID, "my_viewfinder");
		if ( err != CAMERA_EOK){
		    m_pParent->getLog()->error("Ran into an issue when configuring the camera viewfinder");
		    m_pParent->getLog()->error(getCameraErrorDesc( err ));
			root["state"] = "Set VF Props";
			root["error"] = err;
			root["description"] = getCameraErrorDesc( err );
			m_pParent->NotifyEvent(callbackId + " " + errorEvent + " " + writer.write(root));
			return EIO;
		}

		// Starting viewfinder up which will call the viewfinder callback - this gets the NV12 images for scanning
        err = camera_start_photo_viewfinder( mCameraHandle, &viewfinder_callback, NULL, this->cbId);
        if ( err != CAMERA_EOK) {
            m_pParent->getLog()->error("Ran into a strange issue when starting up the camera viewfinder");
            m_pParent->getLog()->error(getCameraErrorDesc( err ));
            root["state"] = "ViewFinder Start";
            root["error"] = err;
            root["description"] = getCameraErrorDesc( err );
            m_pParent->NotifyEvent(callbackId + " " + errorEvent + " " + writer.write(root));
            return EIO;
        }

        // Focus mode can't be set until the viewfinder is started. We need Continuous Macro for barcodes
        err = camera_set_focus_mode(mCameraHandle, CAMERA_FOCUSMODE_CONTINUOUS_MACRO);
		if ( err != CAMERA_EOK){
		    m_pParent->getLog()->error("Ran into an issue when setting focus mode");
		    m_pParent->getLog()->error(getCameraErrorDesc( err ));
			root["state"] = "Set Focus Mode";
			root["error"] = err;
			root["description"] =  getCameraErrorDesc( err );
			m_pParent->NotifyEvent(callbackId + " " + errorEvent + " " + writer.write(root));
			return EIO;
		}

        std::string successEvent = "community.barcodescanner.started.native";
        root["successful"] = true;
        m_pParent->NotifyEvent(callbackId + " " + successEvent + " " + writer.write(root));
        return EOK;
    }


    /*
     * BarcodeScannerNDK::stopRead
     *
     * This method is called to clean up following successful detection of a barcode.
     * Calling this method will stop the viewfinder and close an open connection to the device camera.
     */
    int BarcodeScannerNDK::stopRead(const string &callbackId) {
    	std::string errorEvent = "community.barcodescanner.errorfound.native";
		Json::FastWriter writer;
		Json::Value root;
        camera_error_t err;

        // Stop events first so that you don't get better response from the screen
        StopEvents();

        err = camera_stop_photo_viewfinder(mCameraHandle);
        if ( err != CAMERA_EOK)
        {
            m_pParent->getLog()->error("Error with turning off the photo viewfinder");
            m_pParent->getLog()->error(getCameraErrorDesc( err ));
            root["error"] = err;
		    root["description"] = getCameraErrorDesc( err );
		    m_pParent->NotifyEvent(callbackId + " " + errorEvent + " " + writer.write(root));
            return EIO;
        }

        //check to see if the camera is open, if it is open, then close it
        err = camera_close(mCameraHandle);
        if ( err != CAMERA_EOK){
            m_pParent->getLog()->error("Error with closing the camera");
            m_pParent->getLog()->error(getCameraErrorDesc( err ));
            root["error"] = err;
            root["description"] = getCameraErrorDesc( err );
            m_pParent->NotifyEvent(callbackId + " " + errorEvent + " " + writer.write(root));
            return EIO;
        }

        std::string successEvent = "community.barcodescanner.ended.native";
        root["successful"] = true;
        mCameraHandle = CAMERA_HANDLE_INVALID;
        m_pParent->NotifyEvent(callbackId + " " + successEvent + " " + writer.write(root));

        // Important for maintaining proper event queue support on 10.2.1
        bps_shutdown();

        return EOK;
    }

}
