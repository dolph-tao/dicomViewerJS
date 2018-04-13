/**
 * Created by Wilson V on 2017/4/20.
 * this js is used to run paper functions on canvas"canvas1a".
 */

    function paperInit(status,canvasJquery,count,myPaper) {
        var canvasJ = canvasJquery;
        var canvas = canvasJ[0];
        var parameters = {
            "isDrawing": false,
            "isSaved": true,
            "isDragPath": false,
            "isDragPoint": false,
            "isDrawingSecondLine": false,
            "canvasElement": canvas,
            "canvasJqueryElement": canvasJ
        };
        paper = myPaper;
        paper.project&&paper.project.clear();
        //timer && clearInterval(timer);
        paper.setup(thisCanvasa);
        //this.paperScope.settings.hitTolerance = 5000;
        paper.settings.handleSize = 8;
        if (status == 4) {
            startPaperCanvasMeasure(parameters);
        }
        if (status == 5) {
            startPaperCanvasMark(parameters);
        }
        if(status == 7){
            startPaperCanvasAngle(parameters);
        }
    }

    function startPaperCanvasMark(parameters) {
        // 绑定canvasItem到paperjs
        var currentPath;
        var points = [];
        var segment;
        var hitOptions = {
            segments: true,
            stroke: true,
            fill: true,
            tolerance: 10
        };
        var hitResult;
        var exPath ;
        //paper.view.draw();
        //绑定案件
        paper.view.onClick = function (event) {
            //0 : No button 1 : Left mouse button 2 : Wheel button or middle button (if present) 3 : Right mouse button
            //响应鼠标左键
            if (event.event.which === 1 && !parameters.isDragPoint && !parameters.isDragPath) {
                if (!parameters.isDrawing && parameters.isSaved) {
                    parameters.isDrawing = true;
                    parameters.isSaved = false;
                    if(currentPath)exPath = currentPath;
                    currentPath = new paper.Path();
                    currentPath.strokeColor = '#cdcd00';
                    currentPath.strokeWidth = 2;
                    currentPath.fillColor = new paper.Color(1, 1, 0, 0.01);
                    currentPath.add(event.point);
                    currentPath.add(event.point);
                }
                else if (parameters.isDrawing && !parameters.isSaved) {
                    currentPath.add(event.point);
                }
                /*else if (!parameters.isDrawing && !parameters.isSaved) {
                 //绘制完成后，若鼠标点击路径外则清除路径
                 if (!parameters.isDragPath && !parameters.isDragPoint) {
                 currentPath.removeSegments();
                 parameters.isSaved = true;
                 currentPath.closed = false;
                 currentPath.fullySelected = false;
                 }
                 }*/
            }
            else if (event.event.which === 3) {
                if (parameters.isDrawing && !_this.isSaved) {
                    currentPath.lastSegment.remove();
                    currentPath.closePath();
                    parameters.isDrawing = false;
                    //选择路径并绑定拖拽函数
                    currentPath.selected = true;
                    parameters.isSaved = true;
                    if(exPath)exPath.selected = false;
                    //发布轨迹坐标
                    //_this.emitOnCropped(_this.currentPath);
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
            }
            else if (!parameters.isDrawing) {
                hitResult = paper.project.hitTest(event.point, hitOptions);
                parameters.isDragPoint = hitResult && hitResult.type == 'segment';
                parameters.isDragPath = hitResult && hitResult.type == 'stroke';
            }
            if(parameters.isDragPath){
                pathFlag = 1;
                pointFlag = 0;
            }else if(parameters.isDragPoint){
                pointFlag = 1;
                pathFlag = 0;
            }else{
                pathFlag = 0;
                pointFlag = 0;
            }
        };
        paper.view.onMouseDown = function () {
            //拖动前更新一次绘制变量
            if(hitResult){
                currentPath.selected = false;
                currentPath = hitResult.item;
                currentPath.selected = true;
            }else{
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
            }
            if (parameters.isDragPath) {
                currentPath.position = currentPath.position.add(event.delta);
            }
        };
        paper.view.onKeyDown = function (event) {
            if (event.key == 'delete') {
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
        var exPath ;
        //paper.view.draw();
        //绑定案件
        paper.view.onClick = function (event) {
            //0 : No button 1 : Left mouse button 2 : Wheel button or middle button (if present) 3 : Right mouse button
            //响应鼠标左键
            if (event.event.which === 1 && !parameters.isDragPoint && !parameters.isDragPath) {
                if (!parameters.isDrawing && parameters.isSaved) {
                    parameters.isDrawing = true;
                    parameters.isSaved = false;
                    if(currentPath)exPath = currentPath;
                    currentPath = new paper.Path();
                    currentGroup = new paper.Group();
                    currentPath.strokeColor = '#cdcd00';
                    currentPath.strokeWidth = 2;
                    currentPath.fillColor = new paper.Color(1, 1, 0, 0.01);
                    currentPath.add(event.point);
                    currentPath.add(event.point);
                }
                else if (parameters.isDrawing && !parameters.isSaved) {
                    //currentPath.add(event.point);
                    var text = new paper.PointText(event.point);
                    text.fillColor = '#cdcd00';
                    text.position.x+=15;
                    text.position.y+=15;
                    currentGroup.addChild(currentPath);
                    currentGroup.addChild(text);
                    parameters.isDrawing = false;
                    //选择路径并绑定拖拽函数
                    currentPath.selected = true;
                    parameters.isSaved = true;
                    if(exPath)exPath.selected = false;
                    text.content = (currentPath.segments[1].point.x-currentPath.segments[0].point.x)*(currentPath.segments[1].point.x-currentPath.segments[0].point.x) + (currentPath.segments[1].point.y-currentPath.segments[0].point.y)*(currentPath.segments[1].point.y-currentPath.segments[0].point.y);
                    text.content = parseInt(Math.sqrt(text.content)*0.376*$currentCanvas[0].width/$currentCanvas[0].style.width.slice(0,3))+"mm";
                }
                /*else if (!parameters.isDrawing && !parameters.isSaved) {
                 //绘制完成后，若鼠标点击路径外则清除路径
                 if (!parameters.isDragPath && !parameters.isDragPoint) {
                 currentPath.removeSegments();
                 parameters.isSaved = true;
                 currentPath.closed = false;
                 currentPath.fullySelected = false;
                 }
                 }*/
            }
            /*else if (event.event.which === 3) {
             if (parameters.isDrawing && !_this.isSaved) {
             currentPath.lastSegment.remove();
             currentPath.closePath();
             parameters.isDrawing = false;
             //选择路径并绑定拖拽函数
             currentPath.selected = true;
             parameters.isSaved = true;
             if(exPath)exPath.selected = false;
             //发布轨迹坐标
             //_this.emitOnCropped(_this.currentPath);
             }
             }*/
        };
        paper.view.onMouseMove = function (event) {
            //仅仅移动而无点击时响应
            if (parameters.isDrawing) {
                if (event.event.which === 0) {
                    currentPath.lastSegment.remove();
                    currentPath.add(event.point);
                }
            }
            else if (!parameters.isDrawing) {
                hitResult = paper.project.hitTest(event.point, hitOptions);
                parameters.isDragPoint = hitResult && hitResult.type == 'segment';
                parameters.isDragPath = hitResult && hitResult.type == 'stroke';
            }
            if(parameters.isDragPath){
                pathFlag = 1;
                pointFlag = 0;
            }else if(parameters.isDragPoint){
                pointFlag = 1;
                pathFlag = 0;
            }else{
                pathFlag = 0;
                pointFlag = 0;
            }
        };
        paper.view.onMouseDown = function () {
            //拖动前更新一次绘制变量
            if(hitResult){
                currentPath.selected = false;
                currentPath = hitResult.item;
                currentPath.selected = true;
                currentGroup = currentPath.parent;
            }else{
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
                if(segment == currentPath.segments[1])currentGroup.lastChild.position = currentGroup.lastChild.position.add(event.delta);
                currentGroup.lastChild.content = (currentPath.segments[1].point.x-currentPath.segments[0].point.x)*(currentPath.segments[1].point.x-currentPath.segments[0].point.x) + (currentPath.segments[1].point.y-currentPath.segments[0].point.y)*(currentPath.segments[1].point.y-currentPath.segments[0].point.y);
                currentGroup.lastChild.content = parseInt(Math.sqrt(currentGroup.lastChild.content)*0.376*$currentCanvas[0].width/$currentCanvas[0].style.width.slice(0,3))+"mm"
            }
            if (parameters.isDragPath) {
                currentPath.parent.position = currentPath.parent.position.add(event.delta);
            }
        };
        paper.view.onKeyDown = function (event) {
            if (event.key == 'delete') {
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
        var exPath ;
        //paper.view.draw();
        //绑定案件
        paper.view.onClick = function (event) {
            //0 : No button 1 : Left mouse button 2 : Wheel button or middle button (if present) 3 : Right mouse button
            //响应鼠标左键
            if (event.event.which === 1 && !parameters.isDragPoint && !parameters.isDragPath) {
                if (!parameters.isDrawing && parameters.isSaved) {
                    parameters.isDrawing = true;
                    parameters.isSaved = false;
                    if(currentPath)exPath = currentPath;
                    currentPath = new paper.Path();
                    currentGroup = new paper.Group();
                    currentPath.strokeColor = '#cdcd00';
                    currentPath.strokeWidth = 2;
                    currentPath.fillColor = new paper.Color(1, 1, 0, 0.01);
                    currentPath.add(event.point);
                    currentPath.add(event.point);
                }
                else if(!parameters.isDrawingSecondLine && parameters.isDrawing){
                    currentPath.add(event.point);
                    parameters.isDrawingSecondLine = true;
                }
                else if (parameters.isDrawing && !parameters.isSaved && parameters.isDrawingSecondLine) {
                    //currentPath.add(event.point);
                    var text = new paper.PointText(currentPath.segments[1].point);
                    text.fillColor = '#cdcd00';
                    currentGroup.addChild(currentPath);
                    currentGroup.addChild(text);
                    parameters.isDrawing = false;
                    //选择路径并绑定拖拽函数
                    currentPath.selected = true;
                    parameters.isSaved = true;
                    parameters.isDrawingSecondLine = false;
                    if(exPath)exPath.selected = false;
                    var vector1 = [(currentPath.segments[0].point.x-currentPath.segments[1].point.x),(currentPath.segments[0].point.y-currentPath.segments[1].point.y)];
                    var vector2 = [(currentPath.segments[2].point.x-currentPath.segments[1].point.x),(currentPath.segments[2].point.y-currentPath.segments[1].point.y)];
                    var vector3 = [vector1[0]+vector2[0],vector1[1]+vector2[1]];
                    var moA = Math.sqrt(vector1[0]*vector1[0]+vector1[1]*vector1[1]);
                    var moB = Math.sqrt(vector2[0]*vector2[0]+vector2[1]*vector2[1]);
                    var moC = Math.sqrt(vector3[0]*vector3[0]+vector3[1]*vector3[1]);
                    var vector4 = [vector1[0]/moA+vector2[0]/moB,vector1[1]/moA+vector2[1]/moB];
                    var moD = Math.sqrt(vector4[0]*vector4[0]+vector4[1]*vector4[1]);
                    var pointC = new paper.Point(vector3[0]*20/moC+currentPath.segments[1].point.x, vector3[1]*20/moC+currentPath.segments[1].point.y);
                    var pointA = new paper.Point(vector1[0]*20/moA+currentPath.segments[1].point.x, vector1[1]*20/moA+currentPath.segments[1].point.y);
                    var pointB = new paper.Point(vector2[0]*20/moB+currentPath.segments[1].point.x, vector2[1]*20/moB+currentPath.segments[1].point.y);
                    var pathArc = new paper.Path.Arc(pointA, pointC, pointB);
                    pathArc.strokeColor = '#cdcd00';
                    pathArc.strokeWidth = 2;
                    pathArc.data.Arc = true;
                    currentGroup.addChild(pathArc);
                    var theta = (vector1[0]*vector2[0]+vector1[1]*vector2[1])/Math.sqrt((vector1[0]*vector1[0]+vector1[1]*vector1[1])*(vector2[0]*vector2[0]+vector2[1]*vector2[1]));
                    theta = Math.acos(theta);
                    theta = ((theta/2)/Math.PI)*360;
                    text.content = parseInt(theta)+"°";
                    text.bounds.centerX = currentPath.segments[1].point.x + vector4[0]*40/moD;
                    text.bounds.centerY = currentPath.segments[1].point.y + vector4[1]*40/moD;
                    //text.position.x = text.position.x - text.bounds.width/2;// + vector3[0]*20/moC;
                    //text.position.y = text.position.y + text.bounds.height/2;// + vector3[1]*20/moC;
                }
                /*else if (!parameters.isDrawing && !parameters.isSaved) {
                 //绘制完成后，若鼠标点击路径外则清除路径
                 if (!parameters.isDragPath && !parameters.isDragPoint) {
                 currentPath.removeSegments();
                 parameters.isSaved = true;
                 currentPath.closed = false;
                 currentPath.fullySelected = false;
                 }
                 }*/
            }
            /*else if (event.event.which === 3) {
             if (parameters.isDrawing && !_this.isSaved) {
             currentPath.lastSegment.remove();
             currentPath.closePath();
             parameters.isDrawing = false;
             //选择路径并绑定拖拽函数
             currentPath.selected = true;
             parameters.isSaved = true;
             if(exPath)exPath.selected = false;
             //发布轨迹坐标
             //_this.emitOnCropped(_this.currentPath);
             }
             }*/
        };
        paper.view.onMouseMove = function (event) {
            //仅仅移动而无点击时响应
            if (parameters.isDrawing) {
                if (event.event.which === 0) {
                    currentPath.lastSegment.remove();
                    currentPath.add(event.point);
                }
            }
            else if (!parameters.isDrawing) {
                hitResult = paper.project.hitTest(event.point, hitOptions);
                if(hitResult){
                    if(hitResult.item.data.Arc)
                        hitResult = null;
                }
                parameters.isDragPoint = hitResult && hitResult.type == 'segment';
                parameters.isDragPath = hitResult && hitResult.type == 'stroke';
            }
            if(parameters.isDragPath){
                pathFlag = 1;
                pointFlag = 0;
            }else if(parameters.isDragPoint){
                pointFlag = 1;
                pathFlag = 0;
            }else{
                pathFlag = 0;
                pointFlag = 0;
            }
        };
        paper.view.onMouseDown = function () {
            //拖动前更新一次绘制变量
            if(hitResult){
                currentPath.selected = false;
                currentPath = hitResult.item;
                currentPath.selected = true;
                currentGroup = currentPath.parent;
            }else{
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
                var vector1 = [(currentPath.segments[0].point.x-currentPath.segments[1].point.x),(currentPath.segments[0].point.y-currentPath.segments[1].point.y)];
                var vector2 = [(currentPath.segments[2].point.x-currentPath.segments[1].point.x),(currentPath.segments[2].point.y-currentPath.segments[1].point.y)];
                var vector3 = [vector1[0]+vector2[0],vector1[1]+vector2[1]];
                var moA = Math.sqrt(vector1[0]*vector1[0]+vector1[1]*vector1[1]);
                var moB = Math.sqrt(vector2[0]*vector2[0]+vector2[1]*vector2[1]);
                var moC = Math.sqrt(vector3[0]*vector3[0]+vector3[1]*vector3[1]);
                var vector4 = [vector1[0]/moA+vector2[0]/moB,vector1[1]/moA+vector2[1]/moB];
                var moD = Math.sqrt(vector4[0]*vector4[0]+vector4[1]*vector4[1]);
                var pointC = new paper.Point(vector3[0]*20/moC+currentPath.segments[1].point.x, vector3[1]*20/moC+currentPath.segments[1].point.y);
                var pointA = new paper.Point(vector1[0]*20/moA+currentPath.segments[1].point.x, vector1[1]*20/moA+currentPath.segments[1].point.y);
                var pointB = new paper.Point(vector2[0]*20/moB+currentPath.segments[1].point.x, vector2[1]*20/moB+currentPath.segments[1].point.y);
                currentGroup.children[2].remove();
                currentGroup.children[2] = new paper.Path.Arc(pointA, pointC, pointB);
                currentGroup.children[2].strokeColor = '#cdcd00';
                currentGroup.children[2].strokeWidth = 2;
                var theta = (vector1[0]*vector2[0]+vector1[1]*vector2[1])/Math.sqrt((vector1[0]*vector1[0]+vector1[1]*vector1[1])*(vector2[0]*vector2[0]+vector2[1]*vector2[1]));
                theta = Math.acos(theta);
                theta = ((theta/2)/Math.PI)*360;
                currentGroup.children[1].content = parseInt(theta)+"°";
                currentGroup.children[1].bounds.centerX = currentGroup.children[0].segments[1].point.x + vector4[0]*40/moD;
                currentGroup.children[1].bounds.centerY = currentGroup.children[0].segments[1].point.y + vector4[1]*40/moD;
            }
            if (parameters.isDragPath) {
                currentPath.parent.position = currentPath.parent.position.add(event.delta);
            }
        };
        paper.view.onKeyDown = function (event) {
            if (event.key == 'delete') {
                currentGroup.remove();
            }
        };
    }

    function loadSegments(points) {

    }


