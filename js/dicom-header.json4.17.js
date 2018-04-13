/**
 * Created by yyh on 2017/3/15 0015.
 */
function getDicom() {
  var json = {
    data: {
      patient: [
        {
          Age: "055Y",
          BirthDate: "八月 15, 1962",
          CCTA: 1,
          HospitalDescription: "Jinan Military Hospital",
          HospitalID: "0000000009",
          PatientID: "00965773",
          PatientName: "LI HONG",
          PatientUID: "0900965773",
          Sex: "M",
          Study: [
            {
              AccessionNumber: "X201710130104",
              HospitalDescription: "Jinan Military Hospital",
              HospitalID: 9,
              StudyDate: "十月 13, 2017",
              StudyID: "00965773",
              StudyTime: "09:40:19 上午",
              StudyType: "CCTA",
              StudyUID: "e7456bc11c4a40ffa4698dddbbb62ff2"
            }
          ],
          Series: [
            {
              BodyPartExamined: "CHEST",
              Modality: "CT",
              PatientUID: "0900965773",
              SeriesDate: "十月 13, 2017",
              SeriesDescription: "2.0",
              SeriesPath: "09\\CCTA\\00965773\\X201710130104\\2",
              SeriesTime: "09:42:44 上午",
              SeriesUID: "a9e613bb5350426b9fa68d3f44fef14c",
              StudyID: "00965773",
              StudyType: "CCTA",
              StudyUID: "e7456bc11c4a40ffa4698dddbbb62ff2"
            },
            {
              BodyPartExamined: "CHEST",
              Modality: "CT",
              PatientUID: "0900965773",
              SeriesDate: "十月 13, 2017",
              SeriesDescription: "Cardiac 3.0",
              SeriesPath: "09\\CCTA\\00965773\\X201710130104\\4",
              SeriesTime: "09:43:39 上午",
              SeriesUID: "b88994bac9b54ef3925ae58076f0d648",
              StudyID: "00965773",
              StudyType: "CCTA",
              StudyUID: ""
            },
            {
              BodyPartExamined: "CHEST",
              Modality: "CT",
              PatientUID: "0900965773",
              SeriesDate: "十月 13, 2017",
              SeriesDescription: "SEGMENT 75% 0.92s Cardiac 0.5 CE",
              SeriesPath: "09\\CCTA\\00965773\\X201710130104\\6",
              SeriesTime: "09:45:23 上午",
              SeriesUID: "1846a65edf6f4f049215a7ee8ac7d5df",
              StudyID: "00965773",
              StudyType: "CCTA",
              StudyUID: ""
            },
            {
              BodyPartExamined: "CHEST",
              Modality: "CT",
              PatientUID: "0900965773",
              SeriesDate: "十月 13, 2017",
              SeriesDescription: "SEGMENT 756ms 0.92s Cardiac 0.5 CE",
              SeriesPath: "09\\CCTA\\00965773\\X201710130104\\7",
              SeriesTime: "09:45:23 上午",
              SeriesUID: "290fbf13c34f4896aa7d311f1804787c",
              StudyID: "00965773",
              StudyType: "CCTA",
              StudyUID: ""
            }
          ]
        }
      ]
    }
  };
  var DicomHeader = {
    Patient: {
      //"PatientName": "lin shu wen",
      PatientID: "ct4-2623585",
      PatientSex: "Male",
      PatientAge: "55"
    },
    Station: {
      Manufacturer: "TOSHIBA",
      ManufacturerModelName: "Aquilion ONE",
      StationName: "ID_STATION"
    },
    Study: {
      StudyInstanceUID:
        "1.2.392.200036.9116.2.5.1.48.1220972159.1407218065.368534",
      StudyDate: "20140805",
      StudyTime: "145425",
      StudyID: "26849",
      AccessionNumber: "26849"
    },
    Series: {
      SeriesInstanceUID:
        "1.2.392.200036.9116.2.1220972159.1407218258.4.1050800001.1",
      SeriesDate: "20140805",
      SeriesTime: "145605",
      "Series Number": "3",
      Modality: "CT",
      InstitutionName: "ANZHEN HOSPITAL",
      "InstitutionalDepartment Name": "ID_DEPARTMENT",
      SeriesDescription: "SEGMENT 75% 1.01s Cardiac 0.5 CE"
    },
    DICOMObject: {
      SOPInstanceUID:
        "1.2.392.200036.9116.2.1220972159.1407218258.113778.1.174",
      ImageType: "ORIGINALPRIMARYAXIAL",
      TransferSyntaxUID: "1.2.840.10008.1.2",
      "Instance Number": "174",
      "Image Comments": "CTASEGMENT",
      PhotometricInterpretation: "MONOCHROME2",
      SamplesperPixel: "1",
      PixelRepresentation: "1",
      Columns: "512",
      Rows: "512",
      BitsAllocated: "16",
      BitsStored: "16",
      WindowCenter: "100",
      WindowWidth: "800",
      NumberOfSlices: "280"
    },
    ImagePlane: {
      PixelSpacing: "0.376",
      SliceLocation: "86.75",
      SliceThickness: "0.5",
      ImagePositionPatient: "-76.68701-96.06201\1867.25",
      ImageOrientationPatient: "1.0\0.0\0.0\0.0\1.0\0.0"
    },
    ImageAcquisition: {
      KVP: "120",
      ContrastBolusAgent: "CE"
    },
    seriesAddress: {
      address: "./image/lin shu wen/2014-8-5/"
    }
  };
  return DicomHeader;
}
