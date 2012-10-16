/*
 * Copyright (C) 2008 ZXing authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package com.google.zxing.client.android.result;

import com.google.zxing.client.android.R;
import com.google.zxing.client.result.EmailAddressParsedResult;
import com.google.zxing.client.result.ParsedResult;

import android.app.Activity;

/**
 * Handles email addresses.
 *
 * @author dswitkin@google.com (Daniel Switkin)
 */
public final class EmailAddressResultHandler extends ResultHandler {
  private static final int[] buttons = new int[2];

  public EmailAddressResultHandler(Activity activity, ParsedResult result) {
    super(activity, result);
    buttons[0] = getIdentifier("string", "button_email");
    buttons[1] = getIdentifier("string", "button_add_contact");
  }

  @Override
  public int getButtonCount() {
    return buttons.length;
  }

  @Override
  public int getButtonText(int index) {
    return buttons[index];
  }

  @Override
  public void handleButtonPress(int index) {
    EmailAddressParsedResult emailResult = (EmailAddressParsedResult) getResult();
    switch (index) {
      case 0:
        sendEmailFromUri(emailResult.getMailtoURI(),
                         emailResult.getEmailAddress(),
                         emailResult.getSubject(),
                         emailResult.getBody());
        break;
      case 1:
        String[] addresses = new String[1];
        addresses[0] = emailResult.getEmailAddress();
        addContact(null, null, addresses, null, null, null, null);
        break;
    }
  }

  @Override
  public int getDisplayTitle() {
    return getIdentifier("string", "result_email_address");
  }
}
