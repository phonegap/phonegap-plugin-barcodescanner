/*
* Copyright 2013-2014 BlackBerry Limited.
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

#ifndef BARCODESCANNERJS_HPP_
#define BARCODESCANNERJS_HPP_

#include "../public/plugin.h"
#include "barcodescanner_ndk.hpp"
#include "Logger.hpp"
#include <string>

class BarcodeScannerJS: public JSExt {

public:
    explicit BarcodeScannerJS(const std::string& id);
    virtual ~BarcodeScannerJS();
    virtual bool CanDelete();
    virtual std::string InvokeMethod(const std::string& command);
    void NotifyEvent(const std::string& event);
    webworks::Logger* getLog();
    webworks::BarcodeScannerNDK *m_pBarcodeScannerController;
private:
    std::string m_id;
    // Definition of a pointer to the actual native extension code
    webworks::Logger *m_pLogger;
};

#endif /* BarcodeScannerJS_HPP_ */
