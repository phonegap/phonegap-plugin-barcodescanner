IMPORT util
IMPORT os
IMPORT FGL fgldialog
DEFINE options RECORD
    preferFrontCamera BOOLEAN,
    showFlipCameraButton BOOLEAN,
    showTorchButton BOOLEAN,
    disableAnimations BOOLEAN,
    disableSuccessBeep BOOLEAN,
    formats STRING
END RECORD
DEFINE encodeOptions RECORD
    data STRING
END RECORD
DEFINE encodeResult RECORD
    format STRING,
    file STRING
END RECORD
MAIN
  DEFINE result,cb,file STRING
  DEFINE dummy INT
  MENU "Scan Test"
    COMMAND "Scan"
      LET options.showTorchButton=TRUE
      LET options.showFlipCameraButton=TRUE
      LET options.formats="PDF_417"
      CALL ui.Interface.frontCall("cordova","call",
            ["BarcodeScanner","scan",options],[result])
      CALL fgldialog.fgl_winMessage("Result",result,"info")
      DISPLAY "result:",result
    COMMAND "Encode" --encodes a text as QR code
      LET encodeOptions.data="ABC"
      CALL ui.Interface.frontCall("cordova","call",
        ["BarcodeScanner","encode", encodeOptions],[result])
      CALL util.JSON.parse(result,encodeResult)
      LET file=encodeResult.file
      DISPLAY "format:",encodeResult.format,",file:",file
      CALL fgldialog.fgl_winMessage("Result",sfmt("File:%1,exists:%2",
                                                   file,os.Path.exists(file)),"info")
      OPEN WINDOW result WITH FORM "encoding"
      IF NOT base.Application.isMobile() THEN
        CALL fgl_getfile(file,"test.jpg")
        DISPLAY "test.jpg" TO file
      ELSE
        DISPLAY file TO file
      END IF
      MENU 
        ON ACTION cancel
           EXIT MENU
      END MENU
      CLOSE WINDOW result
      IF base.Application.isMobile() THEN
        CALL os.Path.delete(file) RETURNING dummy
      ELSE
        --we can't delete the file in the sand box if we are remote...
        CALL os.Path.delete("test.jpg") RETURNING dummy
      END IF
    COMMAND "Exit"
      EXIT MENU
  END MENU
END MAIN
