/**
 * 下载导出模块
 */
var DownloadManager = (function() {

  var downloadOptions = {
    format: 'png',
    scale: 2,
    background: 'white'
  };

  /**
   * 更新下载选项
   */
  function setOption(key, value) {
    downloadOptions[key] = value;
  }

  function getOption(key) {
    return downloadOptions[key];
  }

  /**
   * 获取背景色
   */
  function getBgColor() {
    return downloadOptions.background === 'white' ? '#ffffff' : 'rgba(0,0,0,0)';
  }

  /**
   * 从chart实例获取DataURL
   */
  function chartToDataURL(chart, scale) {
    return chart.getDataURL({
      type: 'png',
      pixelRatio: scale || downloadOptions.scale,
      backgroundColor: getBgColor()
    });
  }

  /**
   * DataURL转Blob
   */
  function dataURLtoBlob(dataURL) {
    var arr = dataURL.split(',');
    var mime = arr[0].match(/:(.*?);/)[1];
    var bstr = atob(arr[1]);
    var n = bstr.length;
    var u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  }

  /**
   * 保存文件
   */
  function saveFile(blob, filename) {
    saveAs(blob, filename);
  }

  /**
   * 下载单张图表（当前显示的）
   */
  function downloadCurrent() {
    var chart = ChartManager.getInstance();
    if (!chart) {
      AppController.showToast('请先生成图表');
      return;
    }

    var type = ChartManager.getCurrentType();
    var filename = getFilename(type);
    var dataURL = chartToDataURL(chart);

    if (downloadOptions.format === 'png') {
      var blob = dataURLtoBlob(dataURL);
      saveFile(blob, filename + '.png');
    } else if (downloadOptions.format === 'pdf') {
      exportPDF(dataURL, filename);
    }
  }

  /**
   * 导出PDF
   */
  function exportPDF(dataURL, filename) {
    var img = new Image();
    img.onload = function() {
      var imgWidth = img.width;
      var imgHeight = img.height;

      // A4横向，根据图片比例适配
      var pdfWidth = 297;  // A4横向宽度mm
      var pdfHeight = 210; // A4横向高度mm
      var margin = 15;
      var availWidth = pdfWidth - margin * 2;
      var availHeight = pdfHeight - margin * 2;

      var ratio = Math.min(availWidth / imgWidth, availHeight / imgHeight);
      var finalWidth = imgWidth * ratio;
      var finalHeight = imgHeight * ratio;
      var offsetX = (pdfWidth - finalWidth) / 2;
      var offsetY = (pdfHeight - finalHeight) / 2;

      var pdf = new jspdf.jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });
      pdf.addImage(dataURL, 'PNG', offsetX, offsetY, finalWidth, finalHeight);
      pdf.save(filename + '.pdf');
    };
    img.src = dataURL;
  }

  /**
   * 生成文件名
   */
  function getFilename(type) {
    var settings = AppData.settings;
    if (type === 'grade') {
      return (settings.grade || '年级') + '-年级整体达成度雷达图';
    } else if (type === 'class') {
      return (AppData.currentClass || '班级') + '-达成度雷达图';
    } else if (type === 'student') {
      return (AppData.currentStudent || '学生') + '-达成度雷达图';
    }
    return '雷达图';
  }

  /**
   * 批量下载所有班级雷达图
   */
  function batchDownloadClasses() {
    if (!AppData.classList || AppData.classList.length === 0) {
      AppController.showToast('请先导入数据');
      return;
    }

    AppController.showLoading('正在批量生成班级雷达图...');

    setTimeout(function() {
      try {
        var zip = new JSZip();
        var count = 0;
        var total = AppData.classList.length;

        AppData.classList.forEach(function(className) {
          var offscreen = ChartManager.renderOffscreen('class', { className: className });
          // 等待动画完成后获取图片
          var chart = offscreen.chart;

          // 直接获取DataURL（禁用动画的情况下的静态图）
          var dataURL = chart.getDataURL({
            type: 'png',
            pixelRatio: parseInt(downloadOptions.scale),
            backgroundColor: '#ffffff'
          });

          var base64 = dataURL.split(',')[1];
          var safeName = className.replace(/[\\/:*?"<>|]/g, '_');
          zip.file(safeName + '-达成度雷达图.png', base64, { base64: true });

          ChartManager.cleanupOffscreen(offscreen);
          count++;
        });

        zip.generateAsync({ type: 'blob' }).then(function(content) {
          saveAs(content, '全部班级雷达图.zip');
          AppController.hideLoading();
          AppController.showToast('已导出 ' + total + ' 个班级雷达图');
        });
      } catch (err) {
        AppController.hideLoading();
        AppController.showToast('批量导出失败：' + err.message);
      }
    }, 100);
  }

  /**
   * 批量下载所有学生雷达图
   */
  function batchDownloadStudents() {
    if (!AppData.studentList || AppData.studentList.length === 0) {
      AppController.showToast('请先导入数据');
      return;
    }

    AppController.showLoading('正在批量生成学生雷达图...');

    setTimeout(function() {
      try {
        var zip = new JSZip();
        var total = AppData.studentList.length;
        var count = 0;

        // 按班级分文件夹
        AppData.studentList.forEach(function(stu) {
          var offscreen = ChartManager.renderOffscreen('student', {
            studentName: stu.name,
            className: stu.className
          });
          var chart = offscreen.chart;

          var dataURL = chart.getDataURL({
            type: 'png',
            pixelRatio: parseInt(downloadOptions.scale),
            backgroundColor: '#ffffff'
          });

          var base64 = dataURL.split(',')[1];
          var safeClassName = stu.className.replace(/[\\/:*?"<>|]/g, '_');
          var safeStudentName = stu.name.replace(/[\\/:*?"<>|]/g, '_');
          var folder = zip.folder(safeClassName);
          folder.file(safeStudentName + '-达成度雷达图.png', base64, { base64: true });

          ChartManager.cleanupOffscreen(offscreen);
          count++;
        });

        zip.generateAsync({ type: 'blob' }).then(function(content) {
          saveAs(content, '全部学生雷达图.zip');
          AppController.hideLoading();
          AppController.showToast('已导出 ' + total + ' 个学生雷达图');
        });
      } catch (err) {
        AppController.hideLoading();
        AppController.showToast('批量导出失败：' + err.message);
      }
    }, 100);
  }

  return {
    setOption: setOption,
    getOption: getOption,
    downloadCurrent: downloadCurrent,
    batchDownloadClasses: batchDownloadClasses,
    batchDownloadStudents: batchDownloadStudents
  };
})();
