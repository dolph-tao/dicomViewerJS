const testUri = {
    'protocol': 'http',
    'host': '127.0.0.1',
    'port': '8080',
    'path': '/dicom-viewer'
};

const uri = {
    'protocol': 'https',
    'host': 'miva.vico-lab.com',
    'path': '/dicom-viewerAPI'
};

// 本地调试
const localUri = testUri.protocol + '://' + testUri.host + ':' + testUri.port + testUri.path;
const localwsUri = 'ws://' + testUri.host + ':' + testUri.port + testUri.path;

// 发布服务器
const locationUri = location.protocol + '//' + location.host + '/dicom-viewerAPI';
const locationwsUri =  'wss://' + location.host + '/dicom-viewerAPI';


const restapiserveruri = locationUri;
const restapiserverWSuri = locationwsUri;
const apiPrefix = '/api';
const data = '/data';

config = {
    "PATIENT_URL":restapiserveruri + apiPrefix + data + '/PatientInfoGetServlet',
    "IMGLABEL_URL":restapiserveruri + apiPrefix + data + '/ImageLabelServlet',
    "IMAGE3DLABEL_URL":restapiserveruri + apiPrefix + data + '/Image3DLabelServlet',
    "IMAGEWEBSOCKETURL":restapiserverWSuri + apiPrefix + data + '/ImageByteGet'
}

function loadURL(URL){
    URL.PATIENT_URL = config.PATIENT_URL;
    URL.IMGLABEL_URL = config.IMGLABEL_URL;
    URL.IMAGE3DLABEL_URL = config.IMAGE3DLABEL_URL;
    URL.IMAGEWEBSOCKETURL = config.IMAGEWEBSOCKETURL;

    return URL;
}

