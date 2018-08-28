/**
 * Created by yyh on 2017/3/12 0012.
 * Updated by sd on 2017/3/20.
 * Updated by yyh on 2018/01/20
 * updated by yt on 2018/08/06
 * DicomViewer.js
 */
//封闭作用域
(function () {
  //注入主函数到全局
  window.loadDicomViewer = function () {
    initializeJqueryCache();
    createCanvasResizeEvent();
    initializeAnimation();
    resizeCanvasContainer();
    resizeCanvas();
    stopBrowserEvent();
    initializeContainersEvent();
    layoutEventBinding();
  };

  //绑定窗口resize事件
  window.addEventListener("canvasResize", function () {
    resizeCanvasContainer();
    resizeCanvas();
  });

  //全局变量定义
  //===========

  //接收后台数据后，所有变量定义与初始化分离
  var _this = this,
    currentPatientInfo,
    currentDicomHeader,
    deg = Math.PI / 180;

  //URL
  var URL = {
    PATIENT_URL: "",
    IMGLABEL_URL: "",
    IMAGE3DLABEL_URL: "",
    IMAGEWEBSOCKETURL: ""
  }
  loadURL(URL);
  var PatientUIDfromHTML = GetQueryString("patientUID");
  



  //当前容器和画布ID""
  //保留命名，预计支持两种模式，1.不同canvas显示同一序列多张图。2.不同canvas显示不同序列
  var containerIDs = [
    "viewer-canvas-container-1",
    "viewer-canvas-container-2",
    "viewer-canvas-container-3",
    "viewer-canvas-container-4"
  ];
  var currentContainerID = containerIDs[0],
    currentCanvasID = "viewer-canvas1",
    currentPatientUID = null,
    containerInfo = {};
  var croppedImage = {
    seriesUID: "",
    frameNum: "",
    disease: "",
    path: [],
    userId: ""
  };
  //用于3D标注 (两张不连续的同一序列图片标记，拟合成为一系列标记))
  var mark3DcroppedImage = {
    mark3DcroppedImage1: {
      seriesUID: "",
      frameNum: "",
      disease: "",
      path: [],
      userId: ""
    },
    mark3DcroppedImage2: {
      seriesUID: "",
      frameNum: "",
      disease: "",
      path: [],
      userId: ""
    },
    //标志用于 交替存放
    saveFlag: 0
  };

  containerInfo.loadContainerInfo = function (containerId) {
    this[containerId] = {
      currentSeriesUID: currentDicomHeader.SeriesUID,
      currentInsanceFrame: 0,
      //容器ID
      $container: $("#" + containerId),
      containerHeader: currentDicomHeader,
      //容器图片加载状态
      isload: false,
      //容器预加载图片缓存
      adImg: [],
      //容器当前显示图像数据
      currentImg: "",
      //当前容器内鼠标坐标
      posReal: [0, 0],
      posY: null,
      posX: null,
      //反色标志
      opStatus: 0,
      //反转标志
      ioStatus: 0,
      //窗位窗宽
      windowCenter: parseInt(currentDicomHeader.WindowCenter),
      oriWindowCenter: parseInt(currentDicomHeader.WindowCenter),
      windowWidth: parseInt(currentDicomHeader.WindowWidth),
      oriWindowWidth: parseInt(currentDicomHeader.WindowWidth),
      //图像序列宽高属性
      imgWidth: parseInt(currentDicomHeader.Columns),
      imgHeight: parseInt(currentDicomHeader.Rows),
      //图像序列帧计数
      totalImageCount: parseInt(currentDicomHeader.NumberOfSlices),
      currentImageCount: 1,
      //Canvas缩放比例
      scalelevel: 1,
      exscale: 1,
      scalelevelR: 0,
      exscaleR: 0,
      scaleX: 1,
      scaleY: 1,
      rotateTheta: 0,
      zoom: "",
      //当前序列标注信息
      currentLabelInfos: null
    };
  };

  //websocket获取图片参数
  var webSocket,
    ImgSeriesUID,
    SeriesUID,
    //初始化请求的序列当前帧 和请求的图片数量 默认为10
    ImgIntanceFrame = "0",
    ImgPageNum = "10",
    PatientImageInfoIndex = '{"SeriesUID":"' + ImgSeriesUID + '","InstanceFrame":"' + ImgIntanceFrame + '","Pages":"' + ImgPageNum + '"}',
    //滚轮锁定
    wheelBlock = 0,
    //Canvas初始化

    cPart = document.getElementById("partCanvas1"),
    ctxPart = cPart.getContext("2d"),
    currentCanvas = $("#" + currentCanvasID)[0],
    currentctx = currentCanvas.getContext("2d"),

    $currentCanvasa = $("#" + currentCanvasID + "a"),
    currentCanvasa = $currentCanvasa[0],
    currentctxa = currentCanvasa.getContext("2d");

  var myPaper = new paper.PaperScope();
  paper = myPaper;

  var pathFlag = 0,
    pointFlag = 0,
    timer = null,
    //点击状态
    clickStatus = 0,
    //按下标志
    mousedown = 0,
    windowNum = [];

  //指示canvas显示模式
  var LayoutType = {
    one: 1,
    two: 2,
    three: 3,
    four: 4
  };
  var layoutType = LayoutType.four,
    //jquery选择器缓存
    //容器变量
    $viewerContainer = null,
    $canvass = null,
    $canvassa = null,
    $canvasContainers = null,
    $currentCanvas = null,
    $currentContainer = null,
    $partDiv = null,
    $seriesContent = null,
    //动态刷新变量，初始化放到其父节点渲染函数中
    //var $frameInfo = null;
    $Axial = null, //待定
    tempCount = null;



  if(typeof(PatientUIDfromHTML)=="string"){
      loadPatient(PatientUIDfromHTML);
      ImageWebsocketInit();
  } 
  function GetQueryString(name)   {    
    var reg = new RegExp("(^|&)" + name + "=([^&]*)(&|$)");    
    var r = window.location.search.substr(1).match(reg);    
    if (r != null) return  unescape(r[2]);
    return null;   
  }

  //获取病人信息
  function getPatientInfo(patientUID) {
    currentPatientUID = patientUID;
    $.ajax({
      url: URL.PATIENT_URL + "?PatientUID=" + patientUID,
      type: "get",
      xhrFields: {
        withCredentials: true,
      },
      success: function (response) {
        currentPatientInfo = response.data;
        renderPatientInfo();
      },
      error: function (response) {
        alert("请求病人信息失败");
      }
    });
  }
  //获取新的序列标记
  function frameLabelGetNew(SeriesUID) {
    $.ajax({
      url: URL.IMGLABEL_URL + "?SeriesUID=" + SeriesUID,
      type: "get",
      contentType: "application/json;charset=utf-8",
      xhrFields: {
        withCredentials: true,
      },
      dataType: "json",
      success: function (response) {
        containerInfo[currentContainerID].currentLabelInfos = response.data;

        //初始化标注canvasa排版大小，避免标注出现偏移
        var containerHeight = $currentCanvas[0].style.width.slice(0, 3);
        currentCanvasa.width = containerHeight; //canvas 的 style.width和width属性作用不同，注意区别，这里是调整排版大小而非画布大小
        currentCanvasa.height = containerHeight;

        loadCurrentLabel();



      },
      error: function (response) {
        alert("请求序列标记错误");
      }
    });
  }
  //渲染病人信息
  //添加遍历病人信息中序列信息并在html列表中插入相关信息的逻辑
  function renderPatientInfo() {
    $seriesContent.find(".series-patientID").html(currentPatientUID);
    for (let j = 0; j < currentPatientInfo.patient.length; j++) {
      for (let i = 0; i < currentPatientInfo.patient[j].Series.length; i++) {
        SeriesRow = currentPatientInfo.patient[j].Series[i];
        addModelName(SeriesRow, i);
        $("#" + SeriesRow.SeriesUID + "").bind('click', function () {
          loadPatientSeriesImg(this.id);
          $("#viewer-series-content").addClass("hidden");
          $("#viewer-background").addClass("hidden");

          for (let l = 0; l < currentPatientInfo.patient.length; l++) {
            for (let k = 0; k < currentPatientInfo.patient[l].Series.length; k++) {
              if (currentPatientInfo.patient[l].Series[k].SeriesUID == this.id) {
                currentDicomHeader = getDicomm(currentPatientInfo.patient[l], l, k);
              }
            }
          }
        });
      }
    }
  }

  function addModelName(SeriesRow, i) {
    $seriesContent.find(".modal-row")
    var temp = "<tr>" +
      "<td class='yh-col-1 model-framework'>" + SeriesRow.SeriesNumber + "</td>" +
      "<td class='yh-col-7 model-name text-primary'>" + SeriesRow.SeriesDescription + "</td>" +
      "<td class='yh-col-1 model-framework'>" +
      " <image></image>" +
      "</td>" +
      "<td class='yh-col-1 model-status'>" + SeriesRow.Modality + "</td>" +
      "<td class='yh-col-1'>" + SeriesRow.SeriesDate + "</td>" +
      "<td class='yh-col-1 model-submitted'>" +
      "<button class='btn btn-xs btn-primary seriesLoadingBTN' id = '" + SeriesRow.SeriesUID + "''>load</button>" +
      "</td>" +
      "</tr>";
    $seriesContent.find(".modal-row").append(temp);
  }



  //加载病人
  function loadPatient(patientUID) {
    getPatientInfo(patientUID);
  }
  //加载序列
  function loadSeries(containerId) {
    paperInit(1, $currentCanvasa, tempCount);

    containerInfo.loadContainerInfo(containerId);
    frameLabelGetNew(containerInfo[currentContainerID].currentSeriesUID);
    currentContainerID = containerId;
    canvasContainerRendering();

    adLoad();


    //更新全局container相关参数
    refreshAngle()
    loadCurrentImage();
    containerFocus();


    //初始化画布大小
    currentCanvas.width = containerInfo[currentContainerID].imgWidth + 40;
    currentCanvas.height = containerInfo[currentContainerID].imgHeight + 40;
    currentctx.translate(
      (containerInfo[currentContainerID].imgWidth + 40) / 2,
      (containerInfo[currentContainerID].imgHeight + 40) / 2
    );
    currentCanvasa.width = containerInfo[currentContainerID].imgWidth + 40;
    currentCanvasa.height = containerInfo[currentContainerID].imgHeight + 40;

    //绑定图像处理按钮事件
    processEventUnbinding();
    processEventBinding();

    //绑定图像操作事件到画布
    canvasEventUnbinding();
    canvasEventBinding();

    containerInfo[currentContainerID].zoom = parseInt(
      $currentCanvas[0].style.width.slice(0, 3) * 100 / $currentCanvas[0].width
    );
    $currentContainer.find(".zoom").each(function () {
      $(this)[0].innerHTML = parseInt(
        $currentCanvas[0].style.width.slice(0, 3) * 100 / $currentCanvas[0].width
      );
    });

  }



  //初始化jquery variable cache
  //==========================

  function initializeJqueryCache() {
    $viewerContainer = $("#dicom-viewer-container");
    $canvass = $viewerContainer.find(".viewer-canvas");
    $canvassa = $viewerContainer.find(".markCanvas");
    $canvasContainers = $viewerContainer.find(".viewer-canvas-container");
    $currentCanvas = $("#" + currentCanvasID);
    $currentContainer = $("#" + currentContainerID);
    $partDiv = $("#viewer-partDiv" + currentCanvasID.substr(currentCanvasID.length - 1, 1));
    $seriesContent = $("#viewer-series-content");
    tempCount = currentContainerID.substr(-1);
    timer = setInterval(function () {
      if (clickStatus == 4 || clickStatus == 5 || clickStatus == 7) {
        if (pointFlag) $currentCanvasa.addClass("cursorPointer");
        if (pathFlag) $currentCanvasa.addClass("cursorMove");
        if (!pathFlag && !pointFlag) $currentCanvasa.addClass("cursorCross");
        if (!pointFlag) $currentCanvasa.removeClass("cursorPointer");
        if (!pathFlag) $currentCanvasa.removeClass("cursorMove");
        if (pathFlag || pointFlag) $currentCanvasa.removeClass("cursorCross");
      }
    }, 100);
  }

  //初始化按钮动画及其悬停提示动画效果
  //=============

  function initializeAnimation() {
    //jquery对象预缓存
    var $iconContainer = $("#viewer-icon-container");

    //initialize tooltip,工具提示
    $iconContainer.find(".tooltips").tooltip();

    //initialize viewer-icon mouse event,按钮效果
    $iconContainer
      .find(".viewer-icon")
      .mousedown(function () {
        $(this)
          .removeClass("viewer-icon-mouseup")
          .addClass("viewer-icon-mousedown");
      })
      .mouseup(function () {
        $(this)
          .removeClass("viewer-icon-mousedown")
          .addClass("viewer-icon-mouseup");
      }); //这个是鼠标键，是你鼠标左击按下的的效果
  }

  //窗口及按钮交互事件初始化
  //====================
  function initializeContainersEvent() {
    //initialize viewer-canvas-container,画布选中
    $canvasContainers.click(function () {
      if ($(this).attr("id") != currentContainerID) {
        //重置paperCanvas
        clickStatus = 0;
        clickStatusChange();
        //激活新容器事件
        $currentContainer = $(this);
        containerFocus();
        canvasEventUnbinding();
        processEventUnbinding();

        if (containerInfo[currentContainerID]) {
          canvasEventBinding();
          processEventBinding();
          if (containerInfo[currentContainerID].currentLabelInfos != undefined) {

            loadCurrentLabel();

          }
        }
      }
    });
    $("#viewer-series-list").click(function () {
      $("#viewer-series-content").removeClass("hidden");
      $("#viewer-background").removeClass("hidden");
      //获取病人图片

      // loadSeries(currentContainerID);
    });
    $("#viewer-search").click(function () {
      //清空上一次记录
      var div = document.getElementById("SeriesTbody");
      while (div.hasChildNodes()) //当div下还存在子节点时 循环继续
      {
        div.removeChild(div.firstChild);
      }
      loadPatient($("#search-patientid").val());
      ImageWebsocketInit();
    });
    $("#viewer-background").click(function () {
      $("#viewer-series-content").addClass("hidden");
      $("#viewer-background").addClass("hidden");
    });
    $seriesContent.find(".viewer-series-close").click(function () {
      $("#viewer-series-content").addClass("hidden");
      $("#viewer-background").addClass("hidden");
    })
  }

  //容器事件激活
  function containerFocus() {
    //change viewer-canvas-active,激活状态改变
    $canvasContainers.each(function () {
      $(this).removeClass("viewer-canvas-active");
    });
    $currentContainer.addClass("viewer-canvas-active");

    //获取外部变量当前canvasContainer和当前canvas的ID，相应选择器进入缓存
    $currentCanvas = $currentContainer.find(".viewer-canvas");
    $currentCanvasa = $currentContainer.find(".markCanvas");
    currentContainerID = $currentContainer.attr("id");
    currentCanvasID = $currentCanvas.attr("id");
    currentCanvas = $("#" + currentCanvasID)[0];
    currentctx = currentCanvas.getContext("2d");

    $currentCanvasa = $("#" + currentCanvasID + "a");
    currentCanvasa = $currentCanvasa[0];
    currentctxa = currentCanvasa.getContext("2d");


  }

  //窗口大小改变事件初始化
  //====================

  function createCanvasResizeEvent() {
    //添加窗口事件imageBoxResize为resize
    var throttle = function (type, name, obj) {
      obj = obj || window;
      var running = false;
      var func = function () {
        if (running) {
          return;
        }
        running = true;
        requestAnimationFrame(function () {
          obj.dispatchEvent(new CustomEvent(name));
          running = false;
        });
      };
      obj.addEventListener(type, func);
    };
    /* init - you can init any event */
    throttle("resize", "canvasResize"); //绑定窗口resize事件为canvasResize事件
  }

  //canvas-container自适应大小调节
  //=============================

  function resizeCanvasContainer() {
    //position标识位置设定
    var canvasContainer = $currentContainer[0];
    var tops = document.getElementsByClassName("viewer-top");
    var lefts = document.getElementsByClassName("viewer-left");
    for (var top in tops) {
      //top是属性名，对于数组而言就是索引值，子元素使用tops[top]来索引
      if (tops.hasOwnProperty(top))
        //forin会遍历非原始属性以外的属性，使用hasOwnProperty()来限制仅仅遍历原始属性.从调试的过程来看该函数可以屏蔽掉数组中的length属性,注意该方法对jquery对象无效
        tops[top].style.left = canvasContainer.clientWidth / 2 - 7 + "px";
    }
    for (var left in lefts) {
      if (lefts.hasOwnProperty(left))
        lefts[left].style.top = canvasContainer.clientHeight / 2 - 14 + "px";
    }
  }

  //canvas自适应大小调节函数
  //======================

  function resizeCanvas() {
    var canvasContainer = $currentContainer[0];
    var containerHeight = canvasContainer.clientHeight - 2; //边框减去2px
    var containerWidth = canvasContainer.clientWidth - 2;
    var letfBlockWidth = (containerWidth - containerHeight) / 2;
    $canvass.each(function () {
      this.style.width = containerHeight + "px"; //canvas 的 style.width和width属性作用不同，注意区别，这里是调整排版大小而非画布大小
      this.style.height = containerHeight + "px";
      this.style.left = letfBlockWidth + "px";
    });
    $canvassa.each(function () {
      this.style.width = containerHeight + "px"; //canvas 的 style.width和width属性作用不同，注意区别，这里是调整排版大小而非画布大小
      this.style.height = containerHeight + "px";
      this.style.left = letfBlockWidth + "px";
    });
    $(".dicomInfoHeader")[0].style.lineHeight =
      $(".dicomInfoHeader")[0].clientHeight + "px";
    refreshZoom();
  }

  function resizeCanvasa() {
    var canvasContainer = $canvasContainers[0];
    var containerHeight = canvasContainer.clientHeight;
    var containerWidth = canvasContainer.clientWidth;
    var letfBlockWidth = (containerWidth - containerHeight) / 2;
    $canvassa.each(function () {
      this.style.width = containerHeight + "px"; //canvas 的 style.width和width属性作用不同，注意区别，这里是调整排版大小而非画布大小
      this.style.height = containerHeight + "px";
      this.style.left = letfBlockWidth + "px";
    });
  }

  function refreshZoom() {
    if (
      containerInfo[currentContainerID] &&
      containerInfo[currentContainerID].zoom
    ) {
      containerInfo[currentContainerID].zoom = parseInt(
        $currentCanvas[0].style.width.slice(0, 3) * 100 / $currentCanvas[0].width
      );
      $currentContainer.find(".zoom")[0].innerHTML =
        containerInfo[currentContainerID].zoom;
    }
  }

  function loadCurrentLabel() {

    if (containerInfo[currentContainerID].currentLabelInfos) {
      var canvasContainer = $canvasContainers[0];


      paper.project && paper.project.clear();

      paper.setup(currentCanvasa);


      var pathss = [];
      for (var i = 0; i < containerInfo[currentContainerID].currentLabelInfos.length; i++) {
        if (Number(containerInfo[currentContainerID].currentLabelInfos[i].frameNum) === containerInfo[currentContainerID].currentImageCount) {
          pathss.push(containerInfo[currentContainerID].currentLabelInfos[i]);

        }
      }

      (function () {
        if (!pathss || pathss.length == 0)
          return;

        //paper.project.activeLayer.removeChildren();
        //paper.project && paper.project.clear();
        var dataLayer = new paper.Layer();
        let transformRate = ($currentCanvas[0].style.width.slice(0, 3)) / $currentCanvas[0].width;

        var drawbias = 20;
        var drawingLayer = paper.project.activeLayer;

        function copy(obj) {
          // JSON解析之类的其实如果给定格式不对很容易出错滴，自己做好检验~
          if (!obj)
            return null;
          return JSON.parse(JSON.stringify(obj));
        };
        dataLayer.activate();

        //开始绘制
        for (let _i = 0, paths_1 = pathss; _i < paths_1.length; _i++) {
          let path = paths_1[_i];
          //定义路径
          var thisPath = new paper.Path();

          if (path.pathType === "RECTANGLE") {
            //普通矩形绘制
            for (var _a = 0, _b = path.path; _a < _b.length; _a++) {
              var point = _b[_a];
              var thisPoint = copy(point);
              thisPoint.x += drawbias;
              thisPoint.x *= transformRate;
              thisPoint.y += drawbias;
              thisPoint.y *= transformRate;

              thisPath.add(thisPoint);
            }

            thisPath.data.type = "disease";
            thisPath.data.areaId = path.areaId;
            thisPath.data.mainTag = path.dDisease.mainDiseaseTag;
            thisPath.data.subTag = path.dDisease.subDiseaseTag;
            thisPath.strokeColor = "Yellow";

            //定义基本属性
            thisPath.strokeWidth = 2;
            thisPath.closed = true;
            thisPath.remove();
            drawingLayer.addChild(thisPath);
            drawingLayer.activate();
          } else if (path.pathType === "HAND") {
            var points = path.path;
            for (var i = 0; i < points.length - 2; i += 3) {
              var thisPoint = copy(points[i]);
              var handleIn = copy(points[i + 1]);
              var handleOut = copy(points[i + 2]);
              thisPoint.x += drawbias;
              thisPoint.x *= transformRate;
              thisPoint.y += drawbias;
              thisPoint.y *= transformRate;
              handleIn.x *= transformRate;
              handleIn.y *= transformRate;
              handleOut.x *= transformRate;
              handleOut.y *= transformRate;
              thisPath.add(new paper.Segment(thisPoint, handleIn, handleOut));
            }

            thisPath.data.type = "disease";
            thisPath.data.areaId = path.areaId;
            thisPath.data.mainTag = path.dDisease.mainDiseaseTag;
            thisPath.data.subTag = path.dDisease.subDiseaseTag;
            thisPath.strokeColor = "Green";
            //定义基本属性
            thisPath.strokeWidth = 2;
            thisPath.closed = true;
            thisPath.remove();
            drawingLayer.addChild(thisPath);
          }


        }
        //返回绘画图层
        $currentCanvasa.removeClass("hidden");
        drawingLayer.activate();
        //canvasEventUnbinding();
        canvasLabelUnbiding();
        canvasLabelBinding();
        var parameters = {
          isDrawing: false,
          isSaved: true,
          isDragPath: false,
          isDragPoint: false,
          isDrawingSecondLine: false,
          canvasElement: currentCanvasa[0],
          canvasJqueryElement: currentCanvasa
        };
        startPaperCanvasMainWindow(parameters);
      }())
    }
  };

  //获取接收的图片bytebuffer
  var ImgByteBuffer = new Array();

  function ImageWebsocketInit() {
    webSocket = new WebSocket(URL.IMAGEWEBSOCKETURL);
    webSocket.onerror = function (event) {
      alert(event.data);
    };
    //与WebSocket建立连接
    webSocket.onopen = function (event) {

    };

    //处理服务器返回的信息
    webSocket.onmessage = function (event) {
      var reader = new FileReader();

      reader.onload = function (eve) {
        if (eve.target.readyState == FileReader.DONE) {

          var nameFrame1 = $.base64.decode(this.result.split(",")[1]);
          var nameFrame = nameFrame1.split("---")[0];
          var temp = "data:" + nameFrame + ";base64,"
          var dicomFrame = temp + $.base64.encode(nameFrame1.split("---")[1]);
          nameFrame = nameFrame.split("--")[1];
          ImgByteBuffer[nameFrame] = dicomFrame;
        }
        if ((nameFrame % 10 === 0) || (ImgByteBuffer.length - 1) === currentDicomHeader.NumberOfSlices) {
          if (containerInfo[currentContainerID] != null) {

            adLoad();
          } else loadSeries(currentContainerID);

        } else if (nameFrame == (currentDicomHeader.NumberOfSlices)) {
          loadSeries(currentContainerID);
        }
      };
      reader.readAsDataURL(event.data);
    }

    webSocket.onclose = function () {}
  }


  function loadPatientSeriesImg(instantSeriesUID) {
    PatientImageInfoIndex = '{"SeriesUID":"' + instantSeriesUID + '","InstanceFrame":"' + ImgIntanceFrame + '","Pages":"' + ImgPageNum + '"}';
    webSocket.send(PatientImageInfoIndex);
  }

  function loadRestSeriesImg() {
    //var a = containerInfo[currentContainerID];
    PatientImageInfoIndex = '{"SeriesUID":"' + containerInfo[currentContainerID].currentSeriesUID + '","InstanceFrame":"' + containerInfo[currentContainerID].currentInsanceFrame + '","Pages":"' + ImgPageNum + '"}';
    webSocket.send(PatientImageInfoIndex);
  }


  //加载图片数据
  //===============

  function loadCurrentImage() {

    containerInfo[currentContainerID].scalelevel = 1;

    if (
      containerInfo[currentContainerID].currentImageCount <=
      containerInfo[currentContainerID].totalImageCount
    ) {
      containerInfo[currentContainerID].currentImg =
        containerInfo[currentContainerID].adImg[
          containerInfo[currentContainerID].currentImageCount - 1
        ];
    }

    currentCanvas = $("#" + currentCanvasID)[0];
    currentctx = currentCanvas.getContext("2d");
    drawImg();
    loadCurrentLabel();


  }

  //预加载图片对象
  function adLoad() {

    var img = new Image();
    img.src = ImgByteBuffer[containerInfo[currentContainerID].currentInsanceFrame + 1];
    containerInfo[currentContainerID].adImg[containerInfo[currentContainerID].currentInsanceFrame] = img;
    containerInfo[currentContainerID].currentInsanceFrame = containerInfo[currentContainerID].adImg.length;
    var isLoad = false;

    img.onload = function () {
      if (!isLoad) {
        refreshAngle()
        loadCurrentImage();
        isLoad = true;
      }
      var countCurrentFrame = 11;
      for (
        var i = 2; i < countCurrentFrame; i++
      ) {
        var img = new Image();
        img.src = ImgByteBuffer[containerInfo[currentContainerID].currentInsanceFrame + i - 1];
        containerInfo[currentContainerID].adImg[containerInfo[currentContainerID].currentInsanceFrame + i - 2] = img;

      }
      containerInfo[currentContainerID].currentInsanceFrame = containerInfo[currentContainerID].adImg.length;
    };

  }

  //显示图片数据到canvas
  //===================

  function drawImg() {
    if (!containerInfo[currentContainerID].currentImg) return;
    var x = 20 - (containerInfo[currentContainerID].imgWidth + 40) / 2;
    var y = 20 - (containerInfo[currentContainerID].imgHeight + 40) / 2;
    var thisImage = containerInfo[currentContainerID].currentImg;
    currentctx.clearRect(-(containerInfo[currentContainerID].imgWidth + 40) / 2, -(containerInfo[currentContainerID].imgHeight + 40) / 2,
      currentCanvas.width,
      currentCanvas.height
    );
    currentctx.transform(
      containerInfo[currentContainerID].scalelevel /
      containerInfo[currentContainerID].exscale,
      0,
      0,
      containerInfo[currentContainerID].scalelevel /
      containerInfo[currentContainerID].exscale,
      0,
      0
    );
    if (clickStatus == 1) {
      containerInfo[currentContainerID].exscale =
        containerInfo[currentContainerID].scalelevel;
      $currentContainer.find(".zoom")[0].innerHTML = parseInt(
        containerInfo[currentContainerID].zoom * containerInfo[currentContainerID].scalelevel
      );
    } else if (clickStatus == 3) {
      currentctx.transform(
        Math.cos(containerInfo[currentContainerID].exscaleR * deg),
        Math.sin(containerInfo[currentContainerID].exscaleR * deg), -Math.sin(containerInfo[currentContainerID].exscaleR * deg),
        Math.cos(containerInfo[currentContainerID].exscaleR * deg),
        0,
        0
      );
      currentctx.clearRect(-(containerInfo[currentContainerID].imgWidth + 40) / 2, -(containerInfo[currentContainerID].imgHeight + 40) / 2,
        currentCanvas.width,
        currentCanvas.height
      );
      currentctx.transform(
        Math.cos(containerInfo[currentContainerID].scalelevelR * deg),
        Math.sin(containerInfo[currentContainerID].scalelevelR * deg), -Math.sin(containerInfo[currentContainerID].scalelevelR * deg),
        Math.cos(containerInfo[currentContainerID].scalelevelR * deg),
        0,
        0
      );
      containerInfo[currentContainerID].exscaleR = -containerInfo[
        currentContainerID
      ].scalelevelR;
      refreshAngle();
    }
    currentctx.drawImage(thisImage, x, y, containerInfo[currentContainerID].imgWidth, containerInfo[currentContainerID].imgHeight);
    if (containerInfo[currentContainerID].opStatus) {
      colorOpposite();
    }
    if (containerInfo[currentContainerID].ioStatus) {
      imageOpposite();
    }
    windowLevel();
    //绘制标尺，没有解决缩放下的标尺信息变化逻辑以及旋转下的标尺定位逻辑，暂时隐藏
    //drawScale();
  }



  function refreshAngle() {
    var angle =
      containerInfo[currentContainerID].rotateTheta +
      containerInfo[currentContainerID].scalelevelR;
    angle = angle - parseInt(angle / 360) * 360;
    if (angle < 0) angle += 360;
    if (angle == 0) {
      $currentContainer.find(".viewer-top")[0].innerHTML = "A";
      $currentContainer.find(".viewer-left")[0].innerHTML = "R";
    } else if (angle <= 45 && angle > 0) {
      $currentContainer.find(".viewer-top")[0].innerHTML = "A<sub>R</sub>";
      $currentContainer.find(".viewer-left")[0].innerHTML = "R<sub>P</sub>";
    } else if (angle <= 85 && angle > 45) {
      $currentContainer.find(".viewer-top")[0].innerHTML = "R<sub>A</sub>";
      $currentContainer.find(".viewer-left")[0].innerHTML = "P<sub>R</sub>";
    } else if (angle <= 95 && angle > 85) {
      $currentContainer.find(".viewer-top")[0].innerHTML = "R";
      $currentContainer.find(".viewer-left")[0].innerHTML = "P";
    } else if (angle <= 135 && angle > 95) {
      $currentContainer.find(".viewer-top")[0].innerHTML = "R<sub>P</sub>";
      $currentContainer.find(".viewer-left")[0].innerHTML = "P<sub>L</sub>";
    } else if (angle <= 175 && angle > 135) {
      $currentContainer.find(".viewer-top")[0].innerHTML = "P<sub>R</sub>";
      $currentContainer.find(".viewer-left")[0].innerHTML = "L<sub>P</sub>";
    } else if (angle <= 185 && angle > 175) {
      $currentContainer.find(".viewer-top")[0].innerHTML = "P";
      $currentContainer.find(".viewer-left")[0].innerHTML = "L";
    } else if (angle <= 225 && angle > 185) {
      $currentContainer.find(".viewer-top")[0].innerHTML = "P<sub>L</sub>";
      $currentContainer.find(".viewer-left")[0].innerHTML = "L<sub>A</sub>";
    } else if (angle <= 265 && angle > 225) {
      $currentContainer.find(".viewer-top")[0].innerHTML = "L<sub>P</sub>";
      $currentContainer.find(".viewer-left")[0].innerHTML = "A<sub>L</sub>";
    } else if (angle <= 275 && angle > 265) {
      $currentContainer.find(".viewer-top")[0].innerHTML = "L";
      $currentContainer.find(".viewer-left")[0].innerHTML = "A";
    } else if (angle <= 315 && angle > 275) {
      $currentContainer.find(".viewer-top")[0].innerHTML = "L<sub>A</sub>";
      $currentContainer.find(".viewer-left")[0].innerHTML = "A<sub>R</sub>";
    } else if (angle < 360 && angle > 315) {
      $currentContainer.find(".viewer-top")[0].innerHTML = "A<sub>L</sub>";
      $currentContainer.find(".viewer-left")[0].innerHTML = "R<sub>A</sub>";
    }
  }
  //绘制标尺
  //========

  function drawScale() {
    //绘制标尺
    var canvasWidth = currentCanvas.width;
    var canvasHeight = currentCanvas.height;
    if (currentDicomHeader.PixelSpacing <= 2) {
      var scaleLength = 100 / parseFloat(currentDicomHeader.PixelSpacing); //0.5195根据dicom信息中的Pixel Scaling确定
      var edgeHeight = 15;
      var smallScaleHeight = 10;
      var bottom = 5;
      currentctx.beginPath();
      currentctx.moveTo(
        (canvasWidth - scaleLength) / 2 -
        (containerInfo[currentContainerID].imgWidth + 40) / 2,
        canvasHeight -
        edgeHeight -
        bottom -
        (containerInfo[currentContainerID].imgWidth + 40) / 2
      );
      currentctx.lineTo(
        (canvasWidth - scaleLength) / 2 -
        (containerInfo[currentContainerID].imgWidth + 40) / 2,
        canvasHeight -
        bottom -
        (containerInfo[currentContainerID].imgWidth + 40) / 2
      );
      currentctx.lineTo(
        (canvasWidth + scaleLength) / 2 -
        (containerInfo[currentContainerID].imgWidth + 40) / 2,
        canvasHeight -
        bottom -
        (containerInfo[currentContainerID].imgWidth + 40) / 2
      );
      currentctx.lineTo(
        (canvasWidth + scaleLength) / 2 -
        (containerInfo[currentContainerID].imgWidth + 40) / 2,
        canvasHeight -
        edgeHeight -
        bottom -
        (containerInfo[currentContainerID].imgWidth + 40) / 2
      );
      for (var i = 1; i < 10; i++) {
        currentctx.moveTo(
          (canvasWidth - scaleLength) / 2 +
          scaleLength * 0.1 * i -
          (containerInfo[currentContainerID].imgWidth + 40) / 2,
          canvasHeight -
          smallScaleHeight -
          bottom -
          (containerInfo[currentContainerID].imgWidth + 40) / 2
        );
        currentctx.lineTo(
          (canvasWidth - scaleLength) / 2 +
          scaleLength * 0.1 * i -
          (containerInfo[currentContainerID].imgWidth + 40) / 2,
          canvasHeight -
          bottom -
          (containerInfo[currentContainerID].imgWidth + 40) / 2
        );
      }
      currentctx.lineWidth = 1.5;
      currentctx.closePath(); //闭合路径
      currentctx.strokeStyle = "rgba(255,255,255,1)";
      currentctx.stroke();
      //scale标尺数字信息位置
      var canvasContainer = $canvasContainers[0];
      var canvasProportion = canvasContainer.clientHeight / $canvass[0].height;
      var scales = document.getElementsByClassName("viewer-scale");
      for (var scale in scales) {
        if (scales.hasOwnProperty(scale)) {
          scales[scale].style.left =
            (canvasContainer.clientWidth + 266 * canvasProportion) / 2 +
            35 * canvasProportion +
            "px"; //266位标尺长度，计算自dicom中的像素比例信息
          scales[scale].style.bottom =
            canvasContainer.clientHeight * 0.005 + "px"; //266位标尺长度，计算自dicom中的像素比例信息
          scales[scale].style.fontSize =
            canvasContainer.clientHeight * 0.03 + "px"; //266位标尺长度，计算自dicom中的像素比例信息
        }
      }
    } else if (currentDicomHeader.PixelSpacing > 2) {
      var scaleLength = 500 / parseInt(currentDicomHeader.PixelSpacing); //0.5195根据dicom信息中的Pixel Scaling确定
      var edgeHeight = 15;
      var smallScaleHeight = 10;
      var bottom = 5;
      currentctx.beginPath();
      currentctx.moveTo(
        (canvasWidth - scaleLength) / 2 -
        (containerInfo[currentContainerID].imgWidth + 40) / 2,
        canvasHeight -
        edgeHeight -
        bottom -
        (containerInfo[currentContainerID].imgWidth + 40) / 2
      );
      currentctx.lineTo(
        (canvasWidth - scaleLength) / 2 -
        (containerInfo[currentContainerID].imgWidth + 40) / 2,
        canvasHeight -
        bottom -
        (containerInfo[currentContainerID].imgWidth + 40) / 2
      );
      currentctx.lineTo(
        (canvasWidth + scaleLength) / 2 -
        (containerInfo[currentContainerID].imgWidth + 40) / 2,
        canvasHeight -
        bottom -
        (containerInfo[currentContainerID].imgWidth + 40) / 2
      );
      currentctx.lineTo(
        (canvasWidth + scaleLength) / 2 -
        (containerInfo[currentContainerID].imgWidth + 40) / 2,
        canvasHeight -
        edgeHeight -
        bottom -
        (containerInfo[currentContainerID].imgWidth + 40) / 2
      );
      for (var i = 1; i < 10; i++) {
        currentctx.moveTo(
          (canvasWidth - scaleLength) / 2 +
          scaleLength * 0.1 * i -
          (containerInfo[currentContainerID].imgWidth + 40) / 2,
          canvasHeight -
          smallScaleHeight -
          bottom -
          (containerInfo[currentContainerID].imgWidth + 40) / 2
        );
        currentctx.lineTo(
          (canvasWidth - scaleLength) / 2 +
          scaleLength * 0.1 * i -
          (containerInfo[currentContainerID].imgWidth + 40) / 2,
          canvasHeight -
          bottom -
          (containerInfo[currentContainerID].imgWidth + 40) / 2
        );
      }
      currentctx.lineWidth = 0.5;
      currentctx.closePath(); //闭合路径
      currentctx.strokeStyle = "rgba(255,255,255,1)";
      currentctx.stroke();
      //scale标尺数字信息位置
      var canvasContainer = $canvasContainers[0];
      var canvasProportion = canvasContainer.clientHeight / $canvass[0].height;
      var scales = document.getElementsByClassName("viewer-scale");
      for (var scale in scales) {
        if (scales.hasOwnProperty(scale)) {
          scales[scale].innerHTML = "5cm";
          scales[scale].style.left =
            (canvasContainer.clientWidth + 56 * canvasProportion) / 2 +
            35 * canvasProportion +
            "px"; //266位标尺长度，计算自dicom中的像素比例信息
          scales[scale].style.bottom =
            canvasContainer.clientHeight * 0.005 + "px"; //266位标尺长度，计算自dicom中的像素比例信息
          scales[scale].style.fontSize =
            canvasContainer.clientHeight * 0.03 + "px"; //266位标尺长度，计算自dicom中的像素比例信息
        }
      }
    }
  }

  //改变排版显示，1*1与4*4交换显示
  //============================

  function layoutEventBinding() {
    //初始化布局
    changeCanvasDisplay();
    resizeCanvasContainer();
    resizeCanvas();

    //绑定排版按钮事件
    $("#viewer-layout").click(function () {
      switch (layoutType) {
        case LayoutType.one:
          layoutType = LayoutType.four;
          break;
        case LayoutType.four:
          layoutType = LayoutType.one;
          break;
      }
      changeCanvasDisplay();
      resizeCanvasContainer();
      resizeCanvas();
    });
  }

  //改变canvas-container的可见性，排版支持函数
  //========================================

  function changeCanvasDisplay() {
    switch (layoutType) {
      case LayoutType.one:
        $canvasContainers
          .removeClass("viewer-four-image")
          .addClass("viewer-one-image");
        $canvasContainers.addClass("hidden");
        $currentContainer.removeClass("hidden");
        layoutType = LayoutType.one;
        break;
      case LayoutType.four:
        $canvasContainers
          .removeClass("viewer-one-image")
          .addClass("viewer-four-image");
        $canvasContainers.removeClass("hidden");
        layoutType = LayoutType.four;
        break;
    }
  }

  //template rendering,模板渲染
  //==========================

  function canvasContainerRendering() {
    leftTopRendering();
    leftBottomRendering();
    rightTopRendering();
    rightBottomRendering();
    dicomInfoRendering();
  }

  function dicomInfoRendering() {
    var dicomD = $currentContainer.find(".dicomInfoDetail")[0];
    dicomD.innerHTML = "<p>";
    for (dicom in currentDicomHeader) {
      dicomD.innerHTML +=
        dicom + ":" + currentDicomHeader[dicom] + "<br/>";
    }
    dicomD.innerHTML += "</p>";
  }

  function leftTopRendering() {
    $currentContainer.find(".viewer-left-top").each(function () {
      this.innerHTML =
        "<p>" +
        currentDicomHeader.PatientName +
        "</p>" +
        "<p>ID：" +
        currentDicomHeader.PatientID +
        "</p>" +
        "<p>" +
        currentDicomHeader.PatientSex +
        "</p>" +
        "<p>" +
        currentDicomHeader.PatientAge +
        " Years</p>" +
        "<p class='viewer-length'></p>";
    });
  }

  function leftBottomRendering() {
    $currentContainer.find(".viewer-left-bottom").each(function () {
      this.innerHTML =
        "<p class='frame-info'></p>" +
        "<p>Zoom：<span class='zoom'>100</span>%</p>" +
        "<p>Window/Level：<span class='windowLevel'>800/100</span></p>" +
        "<p>Pixel：109HU-(<span class='pixel'>0,0</span>)</p>" +
        "<p>CT(" +
        currentDicomHeader.Columns +
        "*" +
        currentDicomHeader.Rows +
        ")-AXIAL</p>";
    });
    //动态刷新变量初始化
    refreshFrameInfo();
    refreshWindowLevel();
  }

  function rightTopRendering() {
    $currentContainer.find(".viewer-right-top").each(function () {
      this.innerHTML =
        "<p>" +
        currentDicomHeader.HospitalName +
        "</p>" +
        "<p>Ac.Nb：" +
        currentDicomHeader.AccessionNumber +
        "</p>" +
        "<p>Acq：" +
        currentDicomHeader.StudyDate.substring(0, 4) +

        currentDicomHeader.StudyDate.substring(4, 6) +

        currentDicomHeader.StudyDate.substring(6) +
        "</p>" +
        "<p>Acq：" +
        currentDicomHeader.StudyTime.substring(0, 2) +
        ":" +
        currentDicomHeader.StudyTime.substring(2, 4) +
        ":" +
        currentDicomHeader.StudyTime.substring(4) +
        "</p>";
    });
  }

  function rightBottomRendering() {
    $currentContainer.find(".viewer-right-bottom").each(function () {
      this.innerHTML =
        "<p>Series Nb：" +
        currentDicomHeader.SeriesNumber +
        "</p>" +
        "<p>Thickness：" +
        currentDicomHeader.SliceThickness +
        "</p>";
    });
  }

  function refreshFrameInfo() {
    var displaySeriesNum = containerInfo[currentContainerID].currentImageCount;
    if (displaySeriesNum > containerInfo[currentContainerID].totalImageCount)
      displaySeriesNum = containerInfo[currentContainerID].totalImageCount;
    $currentContainer.find(".frame-info")[0].innerHTML =
      "Frame:" +
      parseInt(displaySeriesNum) +
      "/" +
      containerInfo[currentContainerID].totalImageCount;
  }

  //获取鼠标所在位置的坐标，相对于Canvas

  function getCanvasPos(canvas, e) {
    var rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height)
    };
  }

  //解绑图像处理按钮事件绑定
  function processEventUnbinding() {
    $("#viewer-return").off("click");
    $("#viewer-scale").off("click");
    $("#viewer-part").off("click");
    $("#viewer-rotate").off("click");
    $("#viewer-colorOpposite").off("click");
    $("#viewer-imageOpposite").off("click");
    $("#viewer-length").off("click");
    $("#viewer-mark").off("click");
    $("#viewer-saveMark").off("click");
    $("#viewer-windowLevel").off("click");
    $("#viewer-angle").off("click");
    $("#viewer-dicomInfo").off("click");
    $("#viewer-3Dmark").off("click");

  }

  //绑定图像处理按钮事件
  function processEventBinding() {
    //重绘
    $("#viewer-return").click(function () {
      currentctx.setTransform(1, 0, 0, 1, 0, 0);

      cPart = document.getElementById("partCanvas" + currentCanvasID.substr(currentCanvasID.length - 1, 1));
      ctxPart = cPart.getContext("2d");
      ctxPart.setTransform(1, 0, 0, 1, 0, 0);
      currentctx.translate(
        (containerInfo[currentContainerID].imgWidth + 40) / 2,
        (containerInfo[currentContainerID].imgHeight + 40) / 2
      );
      currentctx.clearRect(-(containerInfo[currentContainerID].imgWidth + 40) / 2, -(containerInfo[currentContainerID].imgHeight + 40) / 2,
        currentCanvas.width,
        currentCanvas.height
      );
      containerInfo[currentContainerID].scalelevelR = 0;
      containerInfo[currentContainerID].exscale = 1;
      containerInfo[currentContainerID].rotateTheta = 0;
      containerInfo[currentContainerID].opStatus = 0;
      containerInfo[currentContainerID].ioStatus = 0;
      containerInfo[currentContainerID].windowCenter = parseInt(
        currentDicomHeader.WindowCenter
      );
      containerInfo[currentContainerID].windowWidth = parseInt(
        currentDicomHeader.WindowWidth
      );
      $currentContainer.find(".zoom").each(function () {
        $(this)[0].innerHTML = parseInt(
          $currentCanvas[0].style.width.slice(0, 3) *
          100 /
          $currentCanvas[0].width
        );
      });
      containerInfo[currentContainerID].zoom = parseInt(
        $currentCanvas[0].style.width.slice(0, 3) *
        100 /
        $currentCanvas[0].width
      );

      clickStatus = 0;
      loadCurrentImage();
      refreshAngle();
      clickStatusChange();
    });
    //滚动缩放
    $("#viewer-scale").click(function () {
      clickStatus = 1;
      clickStatusChange();
    });
    //局部放大
    $("#viewer-part").click(function () {
      $("#viewer-partDiv" + currentCanvasID.substr(currentCanvasID.length - 1, 1)).removeClass("hidden");
      cPart = document.getElementById("partCanvas" + currentCanvasID.substr(currentCanvasID.length - 1, 1));
      ctxPart = cPart.getContext("2d");
      clickStatus = 2;
      partDisplay();
      partMove();
      clickStatusChange();
    });
    //图像旋转
    $("#viewer-rotate").click(function () {
      clickStatus = 3;
      clickStatusChange();
    });
    //图像颜色反色
    $("#viewer-colorOpposite").click(function () {
      if (containerInfo[currentContainerID].opStatus) {
        containerInfo[currentContainerID].opStatus = 0;
      } else if (!containerInfo[currentContainerID].opStatus) {
        containerInfo[currentContainerID].opStatus = 1;
      }
      clickStatus = 0;
      colorOpposite();
    });
    //图像水平翻转
    $("#viewer-imageOpposite").click(function () {
      if (containerInfo[currentContainerID].ioStatus) {
        containerInfo[currentContainerID].ioStatus = 0;
      } else if (!containerInfo[currentContainerID].ioStatus) {
        containerInfo[currentContainerID].ioStatus = 1;
      }
      clickStatus = 0;
      imageOpposite();
    });
    //长度测量
    $("#viewer-length").click(function () {
      // if (layoutType == LayoutType.one)
      $currentCanvasa.removeClass("hidden");
      // if (layoutType == LayoutType.four)
      //   $canvassa.each(function() {
      //     $(this).removeClass("hidden");
      //   });
      var canvasContainer = $canvasContainers[0],
        containerHeight = canvasContainer.clientHeight,
        containerWidth = canvasContainer.clientWidth,
        letfBlockWidth = (containerWidth - containerHeight) / 2;
      $canvassa.each(function () {
        this.style.width = containerHeight + "px"; //canvas 的 style.width和width属性作用不同，注意区别，这里是调整排版大小而非画布大小
        this.style.height = containerHeight + "px";
        this.style.left = letfBlockWidth + "px";
      });

      paperInit(4, $currentCanvasa, tempCount);

      //measureLength();
      clickStatus = 4;
      clickStatusChange();
    });
    //标注操作
    $("#viewer-mark-rectangle").click(function () {
      $currentCanvasa.removeClass("hidden");

      resizeCanvasa();
      paperInit(5, $currentCanvasa, tempCount);
      clickStatus = 5;
      clickStatusChange();
    });
    $("#viewer-mark-hand").click(function () {
      $currentCanvasa.removeClass("hidden");

      resizeCanvasa();
      paperInit(6, $currentCanvasa, tempCount);
      clickStatus = 6;
      clickStatusChange();
    });
    $("#viewer-saveMark").click(function () {
      if (!croppedImage.seriesUID) {
        alert("错误");
      } else {
        $.ajax({
          url: URL.IMGLABEL_URL,
          type: "post",
          contentType: "application/json;charset=utf-8",
          xhrFields: {
            withCredentials: true,
          },
          data: JSON.stringify({
            croppedImage
          }),
          dataType: "json",
          success: function (response) {
            containerInfo[currentContainerID].currentLabelInfos = response.data;
            //frameLabelGet(croppedImage.seriesUID);
          },
          error: function (response) {
            alert("请求保存标注失败");
          }
        });

      }
    });
    $("#viewer-3Dmark").click(function () {
      if (mark3DcroppedImage.mark3DcroppedImage1 === null || mark3DcroppedImage.mark3DcroppedImage2 === null) {
        alert("未选定首尾标注");
        return;
      }
      if (mark3DcroppedImage.mark3DcroppedImage1.seriesUID != mark3DcroppedImage.mark3DcroppedImage2.seriesUID) {
        alert("请重新选定首尾标注");
        return;
      }
      let frameDif = Math.abs(mark3DcroppedImage.mark3DcroppedImage1.frameNum - mark3DcroppedImage.mark3DcroppedImage2.frameNum);
      if (frameDif <= 1) {
        switch (frameDif) {
          case 0:
            alert("无法为同一frame建立3D标注");
            break;

          case 1:
            alert("无法为相邻frame建立3D标注");
            break;

          default:
            break;
        }

        return;
      }
      $.ajax({
        url: URL.IMAGE3DLABEL_URL,
        type: "post",
        contentType: "application/json;charset=utf-8",
        xhrFields: {
          withCredentials: true,
        },
        data: JSON.stringify({
          mark3DcroppedImage
        }),
        dataType: "json",
        success: function (response) {
          containerInfo[currentContainerID].currentLabelInfos = response.data;

          alert("success!");
        },
        error: function (response) {
          alert("请求保存3D标注失败");
        }
      });
    });

    //窗位窗宽调整
    $("#viewer-windowLevel").click(function () {
      clickStatus = 6;
      clickStatusChange();
    });
    //角度测量
    $("#viewer-angle").click(function () {
      // if (layoutType == LayoutType.one)
      $currentCanvasa.removeClass("hidden");
      // if (layoutType == LayoutType.four)
      //   $canvassa.each(function() {
      //     $(this).removeClass("hidden");
      //   });
      var canvasContainer = $canvasContainers[0];
      var containerHeight = canvasContainer.clientHeight;
      var containerWidth = canvasContainer.clientWidth;
      var letfBlockWidth = (containerWidth - containerHeight) / 2;
      $canvassa.each(function () {
        this.style.width = containerHeight + "px"; //canvas 的 style.width和width属性作用不同，注意区别，这里是调整排版大小而非画布大小
        this.style.height = containerHeight + "px";
        this.style.left = letfBlockWidth + "px";
      });
      paperInit(7, $currentCanvasa, tempCount, myPaper);
      //measureLength();
      clickStatus = 7;
      clickStatusChange();
    });
    //Dicom头信息显示
    $("#viewer-dicomInfo").click(function () {
      clickStatus = 8;
      var dicomInfo = $currentContainer.find(".dicomInfo");
      var dicomH = $(".dicomInfoHeader")[currentCanvasID.slice(-1) - 1];
      dicomInfo.modal("toggle");
      clickStatusChange();
    });
  }

  function clickStatusChange() {
    if (clickStatus != 2) {
      $partDiv = $("#viewer-partDiv" + currentCanvasID.substr(currentCanvasID.length - 1, 1));
      if (!$partDiv.hasClass("hidden")) {
        $partDiv.addClass("hidden");

      }
    }
    if (
      clickStatus != 4 &&
      clickStatus != 5 &&
      clickStatus != 6 &&
      clickStatus != 7 &&
      !$currentCanvasa.hasClass("hidden")
    ) {
      $canvassa.addClass("hidden");
    }
    paper.project && paper.project.clear();
  }

  function partDisplay() {
    var partDiv = document.getElementById("viewer-partDiv" + currentCanvasID.substr(currentCanvasID.length - 1, 1));
    var currentcanvas = document.getElementById(currentCanvasID);
    var rect = currentcanvas.getBoundingClientRect();
    var rectp = partDiv.getBoundingClientRect();
    var x =
      (parseInt(rectp.left) - 10 - rect.left) *
      (currentcanvas.width / rect.width);
    var y =
      (parseInt(rectp.top) - 5 - rect.top) *
      (currentcanvas.height / rect.height);
    //console.log(x, y);
    cPart.width = 100;
    cPart.height = 100;
    ctxPart.translate(50, 50);
    var sx =
      parseInt(x) /
      (containerInfo[currentContainerID].imgWidth + 40) *
      containerInfo[currentContainerID].currentImg.width;
    var sy =
      parseInt(y) /
      (containerInfo[currentContainerID].imgHeight + 40) *
      containerInfo[currentContainerID].currentImg.height;
    ctxPart.drawImage(
      containerInfo[currentContainerID].currentImg,
      sx,
      sy,
      67,
      67, -50, -50,
      cPart.width,
      cPart.height
    );
  }

  function canvasEventUnbinding() {
    //解绑前一个聚焦窗口绑定的事件
    $canvasContainers.each(function () {
      $(this).off("mouseout mouseup");
    });
    $canvass.each(function () {
      $(this)
        .off("mousewheel DOMMouseScroll")
        .off("mousedown")
        .off("mousemove mouseout");
    });
  }


  function canvasLabelUnbiding() {
    $currentCanvasa.each(function () {
      $(this)
        .off("mousewheel DOMMouseScroll");
    });
  }

  function canvasLabelBinding() {
    $currentCanvasa.on("mousewheel DOMMouseScroll", function (e) {
      if (!wheelBlock) {
        var delta =
          (e.originalEvent.wheelDelta &&
            (e.originalEvent.wheelDelta > 0 ? 1 : -1)) || // chrome & ie
          (e.originalEvent.detail && (e.originalEvent.detail > 0 ? -1 : 1)); // firefox

        if (delta > 0) {
          // 向上滚

          containerInfo[currentContainerID].currentImageCount > 1 &&
            containerInfo[currentContainerID].currentImageCount--;

        } else if (delta < 0) {
          // 向下滚

          containerInfo[currentContainerID].currentImageCount <
            containerInfo[currentContainerID].currentInsanceFrame &&
            containerInfo[currentContainerID].currentImageCount++;

          if (containerInfo[currentContainerID].currentImageCount === (containerInfo[currentContainerID].currentInsanceFrame - 5) &&
            containerInfo[currentContainerID].currentInsanceFrame < containerInfo[currentContainerID].totalImageCount) {
            loadRestSeriesImg();

          }
        }
        $currentCanvasa.addClass("hidden");
        $canvassa.addClass("hidden");

        refreshFrameInfo();
        containerInfo[currentContainerID].exscale = 1;
        containerInfo[currentContainerID].scalelevel = 1;
        loadCurrentImage();

      }
    });
    $currentCanvasa.on("mousemove", function (e) {
      var $pixel = $currentContainer.find(".pixel")[0];
      var c = $(this)[0];
      currentctx = c.getContext("2d");
      var x = getCanvasPos(c, e).x;
      var y = getCanvasPos(c, e).y;
      x = Math.round(x);
      y = Math.round(y);
      containerInfo[currentContainerID].posReal = [x, y];
      $pixel.innerHTML =
        containerInfo[currentContainerID].posReal[0] +
        "," +
        containerInfo[currentContainerID].posReal[1];
    });



  }


  function canvasEventBinding() {
    $currentCanvas.on("mousewheel DOMMouseScroll", function (e) {
      if (!wheelBlock) {
        var delta =
          (e.originalEvent.wheelDelta &&
            (e.originalEvent.wheelDelta > 0 ? 1 : -1)) || // chrome & ie
          (e.originalEvent.detail && (e.originalEvent.detail > 0 ? -1 : 1)); // firefox

        if (delta > 0) {
          // 向上滚
          containerInfo[currentContainerID].currentImageCount > 1 &&
            containerInfo[currentContainerID].currentImageCount--;


        } else if (delta < 0) {
          // 向下滚
          containerInfo[currentContainerID].currentImageCount <
            containerInfo[currentContainerID].currentInsanceFrame &&
            containerInfo[currentContainerID].currentImageCount++;

          if (containerInfo[currentContainerID].currentImageCount === (containerInfo[currentContainerID].currentInsanceFrame - 5) &&
            containerInfo[currentContainerID].currentInsanceFrame < containerInfo[currentContainerID].totalImageCount) {
            loadRestSeriesImg();
          }
        }
        refreshFrameInfo();
        containerInfo[currentContainerID].exscale = 1;
        containerInfo[currentContainerID].scalelevel = 1;
        loadCurrentImage();
      }
    });
    $currentCanvas.on("mousedown", function (e) {
      //var oevent = ev || event;
      switch (clickStatus) {
        case 1: //滚动缩放
          containerInfo[currentContainerID].posY = e.offsetY;
          if (containerInfo[currentContainerID].scalelevel != 1) {
            containerInfo[currentContainerID].zoom =
              containerInfo[currentContainerID].zoom *
              containerInfo[currentContainerID].scalelevel;
            containerInfo[currentContainerID].exscale = 1;
            containerInfo[currentContainerID].scalelevel = 1;
          }
          break;
        case 3:
          containerInfo[currentContainerID].posY = e.offsetY;
          if (containerInfo[currentContainerID].scalelevelR != 0) {
            containerInfo[currentContainerID].exscaleR = 0;
            containerInfo[currentContainerID].rotateTheta +=
              containerInfo[currentContainerID].scalelevelR;
            containerInfo[currentContainerID].scalelevelR = 0;
          }
          break;
        case 6:
          containerInfo[currentContainerID].posY = e.offsetY;
          containerInfo[currentContainerID].posX = e.offsetX;
          if (containerInfo[currentContainerID].windowCenter != 100) {
            containerInfo[currentContainerID].scaleY = 0;
          }
          if (containerInfo[currentContainerID].windowWidth != 800) {
            containerInfo[currentContainerID].scaleX = 0;
          }
          break;
        default:
      }
      mousedown = 1;
    });
    $currentContainer
      .on("mouseup", function () {
        mousedown = 0;
      })
      .on("mouseout", function () {
        if (clickStatus != 2) {
          mousedown = 0;
        }
      });
    $currentCanvas
      .on("mousemove", function (e) {
        //var oevent = ev || event;
        var $pixel = $currentContainer.find(".pixel")[0];
        var c = $(this)[0];
        currentctx = c.getContext("2d");
        var x = getCanvasPos(c, e).x;
        var y = getCanvasPos(c, e).y;
        x = Math.round(x);
        y = Math.round(y);
        containerInfo[currentContainerID].posReal = [x, y];
        $pixel.innerHTML =
          containerInfo[currentContainerID].posReal[0] +
          "," +
          containerInfo[currentContainerID].posReal[1];

        //滚动缩放
        if (mousedown == 1) {
          if (clickStatus == 1) {
            var dif = e.offsetY - containerInfo[currentContainerID].posY;
            if (dif > 0) {
              containerInfo[currentContainerID].scalelevel =
                1 + 0.25 / containerInfo[currentContainerID].imgHeight * dif;
            } else if (dif < 0) {
              containerInfo[currentContainerID].scalelevel =
                1 - -0.25 / containerInfo[currentContainerID].imgHeight * dif;
            } else {
              containerInfo[currentContainerID].scalelevel = 1;
            }
          } else if (clickStatus == 3) {
            var dif = e.offsetY - containerInfo[currentContainerID].posY;
            if (containerInfo[currentContainerID].ioStatus) {
              dif = -dif;
            }
            if (dif > 0) {
              containerInfo[currentContainerID].scalelevelR =
                50 / containerInfo[currentContainerID].imgHeight * dif;
            } else if (dif < 0) {
              containerInfo[currentContainerID].scalelevelR =
                50 / containerInfo[currentContainerID].imgHeight * dif;
            } else {
              containerInfo[currentContainerID].scalelevelR = 0;
            }
          } else if (clickStatus == 6) {
            var difX = e.offsetY - containerInfo[currentContainerID].posY;
            var difY = e.offsetX - containerInfo[currentContainerID].posX;
            if (difY > 0) {
              containerInfo[currentContainerID].scaleY =
                1250 / containerInfo[currentContainerID].imgHeight * difY;
            } else if (difY < 0) {
              containerInfo[currentContainerID].scaleY =
                1250 / containerInfo[currentContainerID].imgHeight * difY;
            } else {
              containerInfo[currentContainerID].scaleY = 0;
            }
            if (difX > 0) {
              containerInfo[currentContainerID].scaleX =
                1250 / containerInfo[currentContainerID].imgHeight * difX;
            } else if (difX < 0) {
              containerInfo[currentContainerID].scaleX =
                1250 / containerInfo[currentContainerID].imgHeight * difX;
            } else {
              containerInfo[currentContainerID].scaleX = 0;
            }
            containerInfo[currentContainerID].windowCenter =
              containerInfo[currentContainerID].oriWindowCenter +
              containerInfo[currentContainerID].scaleX;
            containerInfo[currentContainerID].windowWidth =
              containerInfo[currentContainerID].oriWindowWidth +
              containerInfo[currentContainerID].scaleY;
          }
          drawImg();
        }
      })
      .on("mouseout", function () {});
    $currentCanvasa
      .on("mousemove", function (e) {
        //var oevent = ev || event;
        var c = $(this)[0];
        currentctx = c.getContext("2d");
        var x = getCanvasPos(c, e).x;
        var y = getCanvasPos(c, e).y;
        x = Math.round(x);
        y = Math.round(y);
        containerInfo[currentContainerID].posReal = [x, y];
      })
      .on("mouseout", function () {
        $currentContainer.find(".viewer-left-top").each(function () {});
      });
  }

  function partMove() {
    var mousepart = 0;
    $canvaspart = $("#viewer-partDiv" + currentCanvasID.substr(currentCanvasID.length - 1, 1) + ",#" + currentCanvasID);
    $("#viewer-partDiv" + currentCanvasID.substr(currentCanvasID.length - 1, 1))
      .mousedown(function (ev) {
        mousedown = 1;
        if (clickStatus == 2 && mousedown == 1) {
          var partDiv = document.getElementById("viewer-partDiv" + currentCanvasID.substr(currentCanvasID.length - 1, 1));
          var oevent = ev || event;
          var distanceX = oevent.clientX - partDiv.offsetLeft;
          var distanceY = oevent.clientY - partDiv.offsetTop;
          $canvaspart
            .on("mousemove", function (ev) {
              var partDiv = document.getElementById("viewer-partDiv" + currentCanvasID.substr(currentCanvasID.length - 1, 1));
              var oevent = ev || event;
              var endx = oevent.clientX - distanceX;
              var endy = oevent.clientY - distanceY;
              if (clickStatus == 2 && mousedown == 1) {
                if (
                  endx >= parseInt($currentCanvas[0].offsetLeft) + 20 &&
                  endy >= parseInt($currentCanvas[0].offsetTop) + 20 &&
                  endx <=
                  parseInt($currentCanvas[0].offsetWidth) +
                  parseInt($currentCanvas[0].offsetLeft) -
                  120 &&
                  endy <=
                  parseInt($currentCanvas[0].offsetHeight) +
                  parseInt($currentCanvas[0].offsetTop) -
                  120
                ) {
                  partDiv.style.left = endx + "px";
                  partDiv.style.top = endy + "px";
                  partDisplay();
                }
              }
            })
            .on("mouseup", function () {
              mousedown = 0;
            });
          $currentCanvas.on("mouseout", function () {
            if ((mousepart = 0)) {
              mousedown = 0;
            }
          });
        }
      })
      .mousemove(function () {
        if (clickStatus == 2 && mousepart != 1) {
          mousepart = 1;
        }
      });
  }

  function colorOpposite(j) {
    var cT = currentctx.getImageData(
      0,
      0,
      $currentCanvas[0].width,
      $currentCanvas[0].height
    );
    for (var i = 0; i < cT.data.length; i += 4) {
      cT.data[i] = 255 - cT.data[i];
      cT.data[i + 1] = 255 - cT.data[i + 1];
      cT.data[i + 2] = 255 - cT.data[i + 2];
      cT.data[i + 3] = 255;
    }
    currentctx.clearRect(-(containerInfo[currentContainerID].imgWidth + 40) / 2, -(containerInfo[currentContainerID].imgHeight + 40) / 2,
      (containerInfo[currentContainerID].imgWidth + 40) / 2,
      (containerInfo[currentContainerID].imgHeight + 40) / 2
    );
    currentctx.putImageData(cT, 0, 0);
  }

  function imageOpposite(j) {
    var cT = currentctx.getImageData(
      0,
      0,
      $currentCanvas[0].width,
      $currentCanvas[0].height
    );
    var x,
      y,
      p,
      i,
      i2,
      t,
      h = cT.height;
    var w = cT.width,
      w_2 = w / 2;
    for (y = 0; y < h; y++) {
      for (x = 0; x < w_2; x++) {
        i = (y << 2) * w + (x << 2);
        i2 = ((y + 1) << 2) * w - ((x + 1) << 2);
        for (p = 0; p < 4; p++) {
          t = cT.data[i + p];
          cT.data[i + p] = cT.data[i2 + p];
          cT.data[i2 + p] = t;
        }
      }
    }
    currentctx.clearRect(-(containerInfo[currentContainerID].imgWidth + 40) / 2, -(containerInfo[currentContainerID].imgHeight + 40) / 2,
      (containerInfo[currentContainerID].imgWidth + 40) / 2,
      (containerInfo[currentContainerID].imgHeight + 40) / 2
    );
    currentctx.putImageData(cT, 0, 0);
  }

  function windowLevel(m) {
    var min =
      (2 * containerInfo[currentContainerID].oriWindowCenter -
        containerInfo[currentContainerID].oriWindowWidth) /
      2.0;
    var max =
      (2 * containerInfo[currentContainerID].oriWindowCenter +
        containerInfo[currentContainerID].oriWindowWidth) /
      2.0;
    var minN =
      (2 * containerInfo[currentContainerID].windowCenter -
        containerInfo[currentContainerID].windowWidth) /
      2.0;
    var maxN =
      (2 * containerInfo[currentContainerID].windowCenter +
        containerInfo[currentContainerID].windowWidth) /
      2.0;

    var cT = currentctx.getImageData(
      0,
      0,
      $currentCanvas[0].width,
      $currentCanvas[0].height
    );
    for (var i = 0; i < cT.data.length; i += 4) {
      windowNum[i] = parseInt(cT.data[i] * (max - min) / 255.0 + min);

      cT.data[i] = parseInt((windowNum[i] - minN) * 255.0 / (maxN - minN));
      cT.data[i + 1] = cT.data[i];
      cT.data[i + 2] = cT.data[i];
      cT.data[i + 3] = 255;
    }
    currentctx.clearRect(-$currentCanvas[0].width / 2, -$currentCanvas[0].height / 2,
      $currentCanvas[0].width,
      $currentCanvas[0].height
    );
    currentctx.putImageData(cT, 0, 0);
    refreshWindowLevel();
  }

  function refreshWindowLevel() {
    $currentContainer.find(".windowLevel")[0].innerHTML =
      parseInt(containerInfo[currentContainerID].windowWidth) +
      "/" +
      parseInt(containerInfo[currentContainerID].windowCenter);
  }

  function stopBrowserEvent() {
    document.oncontextmenu = function () {
      return false;
    };
  }

  /**
   * Created by Wilson V on 2017/4/20.
   * this js is used to run paper functions on canvas"canvas1a".
   */

  function emitOnCropped(path) {
    //转换标记数据
    var segments = path.segments;
    var points = [];
    let transformRate = $currentCanvas[0].width / ($currentCanvas[0].style.width.slice(0, 3));
    var bias = 20;
    if (path.pathType === "hand") {
      croppedImage.pathType = "HAND";
      for (var i = 0; i < segments.length; i++) {
        var xTemp = (Math.round(segments[i].point.x * transformRate * 100) / 100) - bias;
        var yTemp = (Math.round(segments[i].point.y * transformRate * 100) / 100) - bias
        //边界限制x
        if (xTemp > containerInfo[currentContainerID].imgWidth) {
          xTemp = containerInfo[currentContainerID].imgWidth
        } else if (xTemp < 0) {
          xTemp = 0
        }
        //边界限制y
        if (yTemp > containerInfo[currentContainerID].imgHeight) {
          yTemp = containerInfo[currentContainerID].imgHeight
        } else if (yTemp < 0) {
          yTemp = 0
        }
        var point = {
          x: xTemp,
          y: yTemp
        };
        var handleIn = {
          x: (Math.round(segments[i].handleIn.x * transformRate * 100) / 100),
          y: (Math.round(segments[i].handleIn.y * transformRate * 100) / 100)
        };
        var handleOut = {
          x: (Math.round(segments[i].handleOut.x * transformRate * 100) / 100),
          y: (Math.round(segments[i].handleOut.y * transformRate * 100) / 100)
        };
        points.push(point);
        points.push(handleIn);
        points.push(handleOut);
      }

    } else if (path.pathType === "rectangle") {
      //正常点转储，不包含handleIn和handleOut
      for (var i = 0; i < segments.length; i++) {
        croppedImage.pathType = "RECTANGLE";
        var xTemp = (Math.round(segments[i].point.x * transformRate * 100) / 100) - bias;
        var yTemp = (Math.round(segments[i].point.y * transformRate * 100) / 100) - bias
        //边界限制x
        if (xTemp > containerInfo[currentContainerID].imgWidth) {
          xTemp = containerInfo[currentContainerID].imgWidth
        } else if (xTemp < 0) {
          xTemp = 0
        }
        //边界限制y
        if (yTemp > containerInfo[currentContainerID].imgHeight) {
          yTemp = containerInfo[currentContainerID].imgHeight
        } else if (yTemp < 0) {
          yTemp = 0
        }

        var point = {
          x: xTemp,
          y: yTemp
        };
        points.push(point);
      }
    }

    croppedImage.seriesUID = containerInfo[currentContainerID].currentSeriesUID;
    croppedImage.frameNum = containerInfo[currentContainerID].currentImageCount;
    croppedImage.path = points;
    croppedImage.disease = "冠状动脉痉挛";



  };

  function paperInit(status, canvasJquery, count) {
    var canvasJ = canvasJquery;
    var canvas = canvasJ[0];
    var parameters = {
      isDrawing: false,
      isSaved: true,
      isDragPath: false,
      isDragPoint: false,
      isDrawingSecondLine: false,
      canvasElement: canvas,
      canvasJqueryElement: canvasJ
    };
    paper = myPaper;
    paper.project && paper.project.clear();
    //timer && clearInterval(timer);
    paper.setup(currentCanvasa);

    //this.paperScope.settings.hitTolerance = 5000;
    paper.settings.handleSize = 8;
    if (status == 4) {
      startPaperCanvasMeasure(parameters);
    }
    if (status == 5) {
      startPaperCanvasMarkRectangle(parameters);
    }
    if (status == 6) {
      startPaperCanvasMarkHand(parameters);
    }
    if (status == 7) {
      startPaperCanvasAngle(parameters);
    }


  }
  //矩形线
  function startPaperCanvasMarkRectangle(parameters) {
    // 绑定canvasItem到paperjs
    var currentPath;
    //var points = [];
    var segment;
    var hitOptions = {
      segments: true,
      stroke: true,
      fill: true,
      tolerance: 5
    };
    var hitResult;
    var exPath;

    paper.view.onMouseMove = function (event) {
      if (!parameters.isDrawing) {
        hitResult = paper.project.hitTest(event.point, hitOptions);
        parameters.isDragPoint = hitResult && hitResult.type == "segment";
        parameters.isDragPath = hitResult && hitResult.type == "stroke";
      }
      if (parameters.isDragPath) {
        pathFlag = 1;
        pointFlag = 0;
      } else if (parameters.isDragPoint) {
        pointFlag = 1;
        pathFlag = 0;
      } else {
        pathFlag = 0;
        pointFlag = 0;
      }
    };
    paper.view.onMouseDown = function (event) {

      if (event.event.which === 1 &&
        !parameters.isDragPoint &&
        !parameters.isDragPath) {
        if (!parameters.isDrawing && parameters.isSaved) {
          parameters.isDrawing = true;
          parameters.isSaved = false;
          if (currentPath) exPath = currentPath;
          currentPath = new paper.Path.Rectangle(event.point.subtract(1), new paper.Size(1, 1));
          currentPath.strokeColor = "#cdcd00";
          currentPath.strokeWidth = 2;
          segment = currentPath.lastSegment;
          parameters.isDragPoint = true;
          currentPath.fillColor = new paper.Color(1, 1, 0, 0.01);
        }
        //拖动前更新一次绘制变量

      } else if (hitResult) {
        currentPath.selected = false;
        currentPath = hitResult.item;
        currentPath.selected = true;
        parameters.isDragPoint && (segment = hitResult.segment);
        parameters.isDragPath && (currentPath = hitResult.item);
      }



    };
    paper.view.onMouseUp = function () {
      parameters.isDrawing = false;
      //绘制完成后保存前响应，发布当前的绘制区域
      if (!parameters.isDrawing && !parameters.isSaved) {
        currentPath.selected = true;

        parameters.isSaved = true;
        if (exPath) exPath.selected = false;
        currentPath.pathType = "rectangle";
        emitOnCropped(currentPath);
        mark3DImageLstener();
      }
    };
    paper.view.onMouseDrag = function (event) {
      if (event.event.which === 1) {
        var deltaX = event.delta.x;
        var deltaY = event.delta.y;
        //响应拖动事件
        if (parameters.isDragPoint) {
          //修改矩形的三个点坐标使其一致变化
          if (segment.next.point.x === segment.point.x) {
            segment.next.point.x += deltaX;
            segment.previous.point.y += deltaY;
          } else {
            segment.next.point.y += deltaY;
            segment.previous.point.x += deltaX;
          }
          segment.point.set(segment.point.add(event.delta));
        }
        if (parameters.isDragPath) {
          currentPath.position = currentPath.position.add(event.delta);
        }
      }

    };
    paper.view.onKeyDown = function (event) {
      if (event.key == "delete") {
        currentPath.removeSegments();
      }
    };
  }

  //手绘线
  function startPaperCanvasMarkHand(parameters) {
    // 绑定canvasItem到paperjs
    var currentPath;
    //var points = [];
    var segment;
    var hitOptions = {
      segments: true,
      stroke: true,
      fill: true,
      tolerance: 5
    };
    var hitResult;
    var exPath;
    this.curveTool = new paper.Tool();
    this.curveTool.activate();
    var curveTool = this.curveTool;

    curveTool.onMouseMove = function (event) {
      if (parameters.isDrawing) {
        currentPath.lastSegment.remove();
        currentPath.add(event.point);
        //绘制完成后保存前响应，判断当前鼠标位置并更新绘制控制变量
      }
      if (!parameters.isDrawing) {
        hitResult = paper.project.hitTest(event.point, hitOptions);
        parameters.isDragPoint = hitResult && hitResult.type == "segment";
        parameters.isDragPath = hitResult && hitResult.type == "stroke";
      }
      if (parameters.isDragPath) {
        pathFlag = 1;
        pointFlag = 0;
      } else if (parameters.isDragPoint) {
        pointFlag = 1;
        pathFlag = 0;
      } else {
        pathFlag = 0;
        pointFlag = 0;
      }
    };
    curveTool.onMouseDown = function (event) {
      if (event.event.which === 1) {
        if (!parameters.isDrawing && parameters.isSaved) {
          parameters.isDrawing = true;
          parameters.isSaved = false;
          if (currentPath) exPath = currentPath;
          currentPath = new paper.Path();
          currentPath.strokeColor = "#69BEFF";
          currentPath.strokeWidth = 2;
          currentPath.fillColor = new paper.Color(1, 1, 0, 0.01);
          currentPath.add(event.point);
          currentPath.add(event.point);
        } else if (this.isDrawing && !this.isSaved) {
          currentPath.add(event.point);
        } else if (!parameters.isDrawing && !parameters.isSaved) {
          if (hitResult) {
            currentPath.selected = false;
            currentPath = hitResult.item;
            currentPath.selected = true;
            parameters.isDragPoint && (segment = hitResult.segment);
            parameters.isDragPath && (currentPath = hitResult.item);
          }

        }
      } else if (event.event.which === 3) {
        //结束绘制，闭合路径
        if (parameters.isDrawing && !parameters.isSaved) {
          currentPath.lastSegment.remove();
          currentPath.closePath();
          currentPath.simplify(1);

          parameters.isDrawing = false;
          //选择路径并绑定拖拽函数
          currentPath.selected = true;
          //发布轨迹坐标
          currentPath.pathType = "hand";
          emitOnCropped(currentPath);
        }

        //   if (parameters.isDrawing && !parameters.isSaved) {
        //     currentPath.lastSegment.remove();
        //     currentPath.closePath();
        //     currentPath.simplify(1);
        //     parameters.isDrawing = false;
        //     //选择路径并绑定拖拽函数
        //     currentPath.selected = true;
        //     //currentPath.data.pathType = drawType;
        //     //发布轨迹坐标
        //     emitOnCropped(currentPath);
        // }
      }
    };
    curveTool.onMouseUp = function () {

    };
    curveTool.onMouseDrag = function (event) {
      if (parameters.isDrawing && !parameters.isSaved) {
        currentPath.add(event.point);
      }
      if (event.event.which === 1) {
        //响应拖动事件
        if (parameters.isDragPoint) {
          segment.point.set(segment.point.add(event.delta));
        }
        if (parameters.isDragPath) {
          currentPath.position = currentPath.position.add(event.delta);
        }
      }

    };
    curveTool.onKeyDown = function (event) {
      if (event.key == "delete") {
        currentPath.removeSegments();
      }
    };
  }

  function startPaperCanvasMeasure(parameters) {
    // 绑定canvasItem到paperjs
    var currentPath;
    var currentGroup;
    var points = [];
    var segment;
    var hitOptions = {
      segments: true,
      stroke: true,
      fill: true,
      tolerance: 5
    };
    var hitResult;
    var exPath;
    //paper.view.draw();
    //绑定案件
    paper.view.onClick = function (event) {
      //0 : No button 1 : Left mouse button 2 : Wheel button or middle button (if present) 3 : Right mouse button
      //响应鼠标左键
      if (
        event.event.which === 1 &&
        !parameters.isDragPoint &&
        !parameters.isDragPath
      ) {
        if (!parameters.isDrawing && parameters.isSaved) {
          parameters.isDrawing = true;
          parameters.isSaved = false;
          if (currentPath) exPath = currentPath;
          currentPath = new paper.Path();
          currentGroup = new paper.Group();
          currentPath.strokeColor = "#cdcd00";
          currentPath.strokeWidth = 2;
          currentPath.fillColor = new paper.Color(1, 1, 0, 0.01);
          currentPath.add(event.point);
          currentPath.add(event.point);
        } else if (parameters.isDrawing && !parameters.isSaved) {
          //currentPath.add(event.point);
          var text = new paper.PointText(event.point);
          text.fillColor = "#cdcd00";
          text.position.x += 15;
          text.position.y += 15;
          currentGroup.addChild(currentPath);
          currentGroup.addChild(text);
          parameters.isDrawing = false;
          //选择路径并绑定拖拽函数
          currentPath.selected = true;
          parameters.isSaved = true;
          if (exPath) exPath.selected = false;
          text.content =
            (currentPath.segments[1].point.x -
              currentPath.segments[0].point.x) *
            (currentPath.segments[1].point.x -
              currentPath.segments[0].point.x) +
            (currentPath.segments[1].point.y -
              currentPath.segments[0].point.y) *
            (currentPath.segments[1].point.y -
              currentPath.segments[0].point.y);
          text.content =
            parseInt(
              Math.sqrt(text.content) *
              0.376 *
              $currentCanvas[0].width /
              $currentCanvas[0].style.width.slice(0, 3)
            ) + "mm";
        }

      }


    };
    paper.view.onMouseMove = function (event) {
      //仅仅移动而无点击时响应
      if (parameters.isDrawing) {
        if (event.event.which === 0) {
          currentPath.lastSegment.remove();
          currentPath.add(event.point);
        }
      } else if (!parameters.isDrawing) {
        hitResult = paper.project.hitTest(event.point, hitOptions);
        parameters.isDragPoint = hitResult && hitResult.type == "segment";
        parameters.isDragPath = hitResult && hitResult.type == "stroke";
      }
      if (parameters.isDragPath) {
        pathFlag = 1;
        pointFlag = 0;
      } else if (parameters.isDragPoint) {
        pointFlag = 1;
        pathFlag = 0;
      } else {
        pathFlag = 0;
        pointFlag = 0;
      }
    };
    paper.view.onMouseDown = function () {
      //拖动前更新一次绘制变量
      if (hitResult) {
        currentPath.selected = false;
        currentPath = hitResult.item;
        currentPath.selected = true;
        currentGroup = currentPath.parent;
      } else {
        //if(currentPath)currentPath.selected = false;
      }
      parameters.isDragPoint && (segment = hitResult.segment);
      parameters.isDragPath && (_this.currentPath = hitResult.item);
    };
    paper.view.onMouseUp = function () {
      //绘制完成后保存前响应，发布当前的绘制区域
      if (!parameters.isDrawing && !parameters.isSaved) {
        //_this.emitOnCropped(_this.currentPath);
      }
    };
    paper.view.onMouseDrag = function (event) {
      //响应拖动事件
      if (parameters.isDragPoint) {
        segment.point.set(segment.point.add(event.delta));
        if (segment == currentPath.segments[1])
          currentGroup.lastChild.position = currentGroup.lastChild.position.add(
            event.delta
          );
        currentGroup.lastChild.content =
          (currentPath.segments[1].point.x - currentPath.segments[0].point.x) *
          (currentPath.segments[1].point.x -
            currentPath.segments[0].point.x) +
          (currentPath.segments[1].point.y - currentPath.segments[0].point.y) *
          (currentPath.segments[1].point.y - currentPath.segments[0].point.y);
        currentGroup.lastChild.content =
          parseInt(
            Math.sqrt(currentGroup.lastChild.content) *
            0.376 *
            $currentCanvas[0].width /
            $currentCanvas[0].style.width.slice(0, 3)
          ) + "mm";
      }
      if (parameters.isDragPath) {
        currentPath.parent.position = currentPath.parent.position.add(
          event.delta
        );
      }
    };
    paper.view.onKeyDown = function (event) {
      if (event.key == "delete") {
        currentGroup.remove();
      }
    };
  }

  function startPaperCanvasAngle(parameters) {
    // 绑定canvasItem到paperjs
    var currentPath;
    var currentGroup;
    var points = [];
    var segment;
    var hitOptions = {
      segments: true,
      stroke: true,
      fill: true,
      tolerance: 5
    };
    var hitResult;
    var exPath;
    //paper.view.draw();
    //绑定案件
    paper.view.onClick = function (event) {
      //0 : No button 1 : Left mouse button 2 : Wheel button or middle button (if present) 3 : Right mouse button
      //响应鼠标左键
      if (
        event.event.which === 1 &&
        !parameters.isDragPoint &&
        !parameters.isDragPath
      ) {
        if (!parameters.isDrawing && parameters.isSaved) {
          parameters.isDrawing = true;
          parameters.isSaved = false;
          if (currentPath) exPath = currentPath;
          currentPath = new paper.Path();
          currentGroup = new paper.Group();
          currentPath.strokeColor = "#cdcd00";
          currentPath.strokeWidth = 2;
          currentPath.fillColor = new paper.Color(1, 1, 0, 0.01);
          currentPath.add(event.point);
          currentPath.add(event.point);
        } else if (!parameters.isDrawingSecondLine && parameters.isDrawing) {
          currentPath.add(event.point);
          parameters.isDrawingSecondLine = true;
        } else if (
          parameters.isDrawing &&
          !parameters.isSaved &&
          parameters.isDrawingSecondLine
        ) {
          //currentPath.add(event.point);
          var text = new paper.PointText(currentPath.segments[1].point);
          text.fillColor = "#cdcd00";
          currentGroup.addChild(currentPath);
          currentGroup.addChild(text);
          parameters.isDrawing = false;
          //选择路径并绑定拖拽函数
          currentPath.selected = true;
          parameters.isSaved = true;
          parameters.isDrawingSecondLine = false;
          if (exPath) exPath.selected = false;
          var vector1 = [
            currentPath.segments[0].point.x - currentPath.segments[1].point.x,
            currentPath.segments[0].point.y - currentPath.segments[1].point.y
          ];
          var vector2 = [
            currentPath.segments[2].point.x - currentPath.segments[1].point.x,
            currentPath.segments[2].point.y - currentPath.segments[1].point.y
          ];
          var vector3 = [vector1[0] + vector2[0], vector1[1] + vector2[1]];
          var moA = Math.sqrt(
            vector1[0] * vector1[0] + vector1[1] * vector1[1]
          );
          var moB = Math.sqrt(
            vector2[0] * vector2[0] + vector2[1] * vector2[1]
          );
          var moC = Math.sqrt(
            vector3[0] * vector3[0] + vector3[1] * vector3[1]
          );
          var vector4 = [
            vector1[0] / moA + vector2[0] / moB,
            vector1[1] / moA + vector2[1] / moB
          ];
          var moD = Math.sqrt(
            vector4[0] * vector4[0] + vector4[1] * vector4[1]
          );
          var pointC = new paper.Point(
            vector3[0] * 20 / moC + currentPath.segments[1].point.x,
            vector3[1] * 20 / moC + currentPath.segments[1].point.y
          );
          var pointA = new paper.Point(
            vector1[0] * 20 / moA + currentPath.segments[1].point.x,
            vector1[1] * 20 / moA + currentPath.segments[1].point.y
          );
          var pointB = new paper.Point(
            vector2[0] * 20 / moB + currentPath.segments[1].point.x,
            vector2[1] * 20 / moB + currentPath.segments[1].point.y
          );
          var pathArc = new paper.Path.Arc(pointA, pointC, pointB);
          pathArc.strokeColor = "#cdcd00";
          pathArc.strokeWidth = 2;
          pathArc.data.Arc = true;
          currentGroup.addChild(pathArc);
          var theta =
            (vector1[0] * vector2[0] + vector1[1] * vector2[1]) /
            Math.sqrt(
              (vector1[0] * vector1[0] + vector1[1] * vector1[1]) *
              (vector2[0] * vector2[0] + vector2[1] * vector2[1])
            );
          theta = Math.acos(theta);
          theta = theta / 2 / Math.PI * 360;
          text.content = parseInt(theta) + "°";
          text.bounds.centerX =
            currentPath.segments[1].point.x + vector4[0] * 40 / moD;
          text.bounds.centerY =
            currentPath.segments[1].point.y + vector4[1] * 40 / moD;
          //text.position.x = text.position.x - text.bounds.width/2;// + vector3[0]*20/moC;
          //text.position.y = text.position.y + text.bounds.height/2;// + vector3[1]*20/moC;
        }

      }


    };
    paper.view.onMouseMove = function (event) {
      //仅仅移动而无点击时响应
      if (parameters.isDrawing) {
        if (event.event.which === 0) {
          currentPath.lastSegment.remove();
          currentPath.add(event.point);
        }
      } else if (!parameters.isDrawing) {
        hitResult = paper.project.hitTest(event.point, hitOptions);
        if (hitResult) {
          if (hitResult.item.data.Arc) hitResult = null;
        }
        parameters.isDragPoint = hitResult && hitResult.type == "segment";
        parameters.isDragPath = hitResult && hitResult.type == "stroke";
      }
      if (parameters.isDragPath) {
        pathFlag = 1;
        pointFlag = 0;
      } else if (parameters.isDragPoint) {
        pointFlag = 1;
        pathFlag = 0;
      } else {
        pathFlag = 0;
        pointFlag = 0;
      }
    };
    paper.view.onMouseDown = function () {
      //拖动前更新一次绘制变量
      if (hitResult) {
        currentPath.selected = false;
        currentPath = hitResult.item;
        currentPath.selected = true;
        currentGroup = currentPath.parent;
      } else {
        //if(currentPath)currentPath.selected = false;
      }
      parameters.isDragPoint && (segment = hitResult.segment);
      parameters.isDragPath && (_this.currentPath = hitResult.item);
    };
    paper.view.onMouseUp = function () {
      //绘制完成后保存前响应，发布当前的绘制区域
      // if (!parameters.isDrawing && !parameters.isSaved) {
      //_this.emitOnCropped(_this.currentPath);
      // }
    };
    paper.view.onMouseDrag = function (event) {
      //响应拖动事件
      if (parameters.isDragPoint) {
        segment.point.set(segment.point.add(event.delta));
        var vector1 = [
          currentPath.segments[0].point.x - currentPath.segments[1].point.x,
          currentPath.segments[0].point.y - currentPath.segments[1].point.y
        ];
        var vector2 = [
          currentPath.segments[2].point.x - currentPath.segments[1].point.x,
          currentPath.segments[2].point.y - currentPath.segments[1].point.y
        ];
        var vector3 = [vector1[0] + vector2[0], vector1[1] + vector2[1]];
        var moA = Math.sqrt(vector1[0] * vector1[0] + vector1[1] * vector1[1]);
        var moB = Math.sqrt(vector2[0] * vector2[0] + vector2[1] * vector2[1]);
        var moC = Math.sqrt(vector3[0] * vector3[0] + vector3[1] * vector3[1]);
        var vector4 = [
          vector1[0] / moA + vector2[0] / moB,
          vector1[1] / moA + vector2[1] / moB
        ];
        var moD = Math.sqrt(vector4[0] * vector4[0] + vector4[1] * vector4[1]);
        var pointC = new paper.Point(
          vector3[0] * 20 / moC + currentPath.segments[1].point.x,
          vector3[1] * 20 / moC + currentPath.segments[1].point.y
        );
        var pointA = new paper.Point(
          vector1[0] * 20 / moA + currentPath.segments[1].point.x,
          vector1[1] * 20 / moA + currentPath.segments[1].point.y
        );
        var pointB = new paper.Point(
          vector2[0] * 20 / moB + currentPath.segments[1].point.x,
          vector2[1] * 20 / moB + currentPath.segments[1].point.y
        );
        currentGroup.children[2].remove();
        currentGroup.children[2] = new paper.Path.Arc(pointA, pointC, pointB);
        currentGroup.children[2].strokeColor = "#cdcd00";
        currentGroup.children[2].strokeWidth = 2;
        var theta =
          (vector1[0] * vector2[0] + vector1[1] * vector2[1]) /
          Math.sqrt(
            (vector1[0] * vector1[0] + vector1[1] * vector1[1]) *
            (vector2[0] * vector2[0] + vector2[1] * vector2[1])
          );
        theta = Math.acos(theta);
        theta = theta / 2 / Math.PI * 360;
        currentGroup.children[1].content = parseInt(theta) + "°";
        currentGroup.children[1].bounds.centerX =
          currentGroup.children[0].segments[1].point.x + vector4[0] * 40 / moD;
        currentGroup.children[1].bounds.centerY =
          currentGroup.children[0].segments[1].point.y + vector4[1] * 40 / moD;
      }
      if (parameters.isDragPath) {
        currentPath.parent.position = currentPath.parent.position.add(
          event.delta
        );
      }
    };
    paper.view.onKeyDown = function (event) {
      if (event.key == "delete") {
        currentGroup.remove();
      }
    };
  }

  function startPaperCanvasMainWindow(parameters) {
    // 绑定canvasItem到paperjs
    var currentPath;
    //var points = [];
    var segment;
    var hitOptions = {
      segments: true,
      stroke: true,
      fill: true,
      tolerance: 5
    };
    var hitResult;
    paper.view.onMouseMove = function (event) {
      if (!parameters.isDrawing) {
        hitResult = paper.project.hitTest(event.point, hitOptions);
        parameters.isDragPoint = hitResult && hitResult.type == "segment";
        parameters.isDragPath = hitResult && hitResult.type == "stroke";
      }

    };
    paper.view.onDoubleClick = function (event) {
      //hitResult = paper.project.hitTest(event.point, hitOptions);
      //parameters.isDragPath = hitResult && hitResult.type == "stroke";
      if (hitResult) {
        currentPath = hitResult.item;
        if (currentPath.segments.length > 4) {
          return;
        }
        currentPath.selected = true;
        currentPath.strokeColor = "#2d96ff";
        emitOnCropped(currentPath);
        mark3DImageLstener();
      }



    };


  }

  function mark3DImageLstener() {
    if (mark3DcroppedImage.saveFlag === 0) {
      mark3DcroppedImage.mark3DcroppedImage1.seriesUID = croppedImage.seriesUID;
      mark3DcroppedImage.mark3DcroppedImage1.path = croppedImage.path;
      mark3DcroppedImage.mark3DcroppedImage1.frameNum = croppedImage.frameNum;
      mark3DcroppedImage.mark3DcroppedImage1.disease = croppedImage.disease;
      mark3DcroppedImage.mark3DcroppedImage1.userId = croppedImage.userId;
      mark3DcroppedImage.saveFlag = 1;
    } else {
      mark3DcroppedImage.mark3DcroppedImage2.seriesUID = croppedImage.seriesUID;
      mark3DcroppedImage.mark3DcroppedImage2.path = croppedImage.path;
      mark3DcroppedImage.mark3DcroppedImage2.frameNum = croppedImage.frameNum;
      mark3DcroppedImage.mark3DcroppedImage2.disease = croppedImage.disease;
      mark3DcroppedImage.mark3DcroppedImage2.userId = croppedImage.userId;
      mark3DcroppedImage.saveFlag = 0;
    }
  }

})();

loadDicomViewer();