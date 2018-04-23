/**
 * create by Tao 2018.4.8
 */
function getDicomm(patientRes,studyNum,SeriesNum){

    patientInfo = new Object;
    patientInfo.PatientID = patientRes.PatientID;
    patientInfo.PatientAge = patientRes.Age;
    patientInfo.PatientSex = patientRes.Sex;
    patientInfo.PatientBirthDate =  patientRes.BirthDate;

    patientInfo.HospitalName = patientRes.HospitalDescription;
    patientInfo.StudyDate = patientRes.Study[studyNum].StudyDate;
    patientInfo.StudyTime = patientRes.Study[studyNum].StudyTime;
    patientInfo.StudyType = patientRes.Study[studyNum].StudyType;
    patientInfo.AccessionNumber = patientRes.Study[studyNum].AccessionNumber;

    patientInfo.Modality = patientRes.Series[SeriesNum].Modality;
    patientInfo.BodyPartExamined = patientRes.Series[SeriesNum].BodyPartExamined;
    patientInfo.SeriesDate = patientRes.Series[SeriesNum].SeriesDate;
    patientInfo.SeriesTime = patientRes.Series[SeriesNum].SeriesTime;
    patientInfo.SeriesNumber = patientRes.Series[SeriesNum].SeriesNumber;
    patientInfo.SeriesUID = patientRes.Series[SeriesNum].SeriesUID;

    patientInfo.WindowCenter = patientRes.Series[SeriesNum].WindowCenter;
    patientInfo.WindowWidth = patientRes.Series[SeriesNum].WindowWidth;
    patientInfo.Columns = patientRes.Series[SeriesNum].Columns;
    patientInfo.Rows = patientRes.Series[SeriesNum].Rows;
    patientInfo.PixelSpacing = patientRes.Series[SeriesNum].PixelSpacing;
    patientInfo.SliceThickness = patientRes.Series[SeriesNum].SliceThickness;
    patientInfo.NumberOfSlices = patientRes.Series[SeriesNum].NumberOfSlices;
   
    
    return patientInfo;
}