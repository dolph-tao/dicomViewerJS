/**
 * Created by yyh on 2017/3/15 0015.
 */
function getDicom(){
    var DicomHeader = {
        "Patient": {
            //"PatientName": "Chen Hua Guo",
            "PatientID": "ECT0102549",
            "PatientSex": "Male",
            "PatientBirthDate": "19690502",
            "PatientAge": "45"
        },
        "Station": {
            "Manufacturer": "GE_MEDICAL_SYSTEMS",
            "ManufacturerModelName":"VARICAM",
            "StationName":"ENTEGRA"
        },
        "Study": {
            "StudyInstanceUID":"1.2.840.113704.3.1.35141231.93059.63",
            "StudyDate":"20141231",
            "StudyTime":"094726",
            "StudyID":"GENERAL TC99M Xr",
            "StudyDescription":"GENERAL TC99M Xray ECT",
            "AccessionNumber":"26849"
        },
        "Series": {
            "SeriesInstanceUID":"1.2.840.113704.3.1.35141231.94751.56.1",
            "SeriesDate":"20141231",
            "SeriesTime":"094712",
            "SeriesNumber":"3",
            "Modality":"NM",
            "InstitutionName":"1ST HOSPITAL ZJU",
            "InstitutionalDepartment Name":"ID_DEPARTMENT",
            "SeriesDescription":"ECT Hd1"
        },
        "DICOMObject": {
            "SOPInstanceUID": "1.2.840.113619.2.112.25202.192.1.1.10.1420013641.42.12587",
            "ImageType": "ORIGINAL\PRIMARY\RECON TOMO\EMISSION",
            "TransferSyntaxUID": "1.2.840.10008.1.2.1",
            "InstanceNumber": "1",
            "ImageComments": "CTA\SEGMENT",
            "PhotometricInterpretation": "MONOCHROME2",
            "SamplesperPixel": "1",
            "PixelRepresentation": "1",
            "Columns": "128",
            "Rows": "128",
            "BitsAllocated": "16",
            "BitsStored": "16",
            "WindowCenter":"100",
            "WindowWidth":"800",
            "NumberOfSlices": "128"
        },
        "ImagePlane": {
            "PixelSpacing": "4.42",
            "SliceLocation": "86.75",
            "SliceThickness": "4.42",
            "ImagePositionPatient": "-76.68701\-96.06201\1867.25",
            "ImageOrientationPatient": "1.0\0.0\0.0\0.0\1.0\0.0"
        },
        "ImageAcquisition":{
            "KVP": "120",
            "ContrastBolusAgent": "CE"
        },
        "seriesAddress":{
            "address":"./image/Chen Hua Guo/2014-12-31/NM ECT Hd1-75c27ed9/"
        }
    };
    return DicomHeader;
}