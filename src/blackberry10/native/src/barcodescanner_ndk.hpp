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

#ifndef BARCODESCANNERNDK_HPP_
#define BARCODESCANNERNDK_HPP_

#include <camera/camera_api.h>
#include "Logger.hpp"
#include <bps/event.h>
#include <string>

class BarcodeScannerJS;

namespace webworks {

class BarcodeScannerNDK {
public:
    explicit BarcodeScannerNDK(BarcodeScannerJS *parent = NULL);
    virtual ~BarcodeScannerNDK();

    int startRead(const std::string& callbackId, const std::string& handle);
    int stopRead(const std::string& callbackId);
    bool isThreadHalt();
    void StopEvents();
    bool StartEvents();
    Logger* getLog();
    void handleScreenEvent(bps_event_t *event, Logger* log, const char* windowGroup);
    void cancelScan();
    char* windowGroup;
    screen_context_t windowContext;
    char* cbId;

private:
    BarcodeScannerJS *m_pParent;
    camera_handle_t mCameraHandle;
    bool threadHalt;
    std::string windowHandle;
};

} // namespace webworks

#endif /* BARCODESCANNERNDK_H_ */
