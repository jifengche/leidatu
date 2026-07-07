/**
 * 主应用控制器
 */
var AppController = (function() {
  'use strict';

  var chartContainer = null;
  var chartEmpty = null;
  var chartWrapper = null;
  var hasData = false;

  /**
   * 初始化
   */
  function init() {
    // 鉴权检查
    if (!AuthHelper.isAuthenticated()) {
      window.location.href = 'index.html';
      return;
    }

    // 获取DOM
    chartContainer = document.getElementById('chartContainer');
    chartEmpty = document.getElementById('chartEmpty');
    chartWrapper = document.getElementById('chartWrapper');

    // 设置用户信息
    var isDemo = localStorage.getItem('radar_is_demo') === 'true';
    var currentUser = AuthHelper.getCurrentUser();
    var headerUser = document.getElementById('headerUser');
    var btnAdmin = document.getElementById('btnAdmin');
    if (isDemo) {
      // 演示模式：显示"演示模式"文字，不显示后台管理
      headerUser.textContent = '演示模式';
      headerUser.style.display = 'inline-block';
      btnAdmin.style.display = 'none';
    } else if (AuthHelper.isAdmin()) {
      // 管理员：隐藏用户名文字，显示后台管理按钮（占据演示模式的位置）
      headerUser.style.display = 'none';
      btnAdmin.style.display = 'inline-flex';
    } else {
      // 普通教师：显示姓名，不显示后台管理
      var acct = AccountManager.find(currentUser);
      headerUser.textContent = acct ? (acct.displayName || acct.username) : '用户';
      headerUser.style.display = 'inline-block';
      btnAdmin.style.display = 'none';
    }

    // 绑定事件
    bindTabNav();
    bindSidebar();
    bindDownloadOptions();
    bindResize();

    // 尝试恢复已保存的数据
    if (loadSavedData()) {
      hasData = true;
      renderCurrentChart();
    }
  }

  // ========== 事件绑定 ==========

  /**
   * Tab导航
   */
  function bindTabNav() {
    var tabs = document.querySelectorAll('.tab-item');
    tabs.forEach(function(tab) {
      tab.addEventListener('click', function() {
        var tabName = this.getAttribute('data-tab');
        switchTab(tabName);
      });
    });
  }

  /**
   * 侧边栏操作
   */
  function bindSidebar() {
    // 退出登录
    document.getElementById('btnLogout').addEventListener('click', function() {
      AuthHelper.logout();
    });

    // 后台管理
    document.getElementById('btnAdmin').addEventListener('click', function() {
      window.location.href = 'admin.html';
    });

    // 下载模板
    document.getElementById('btnDownloadTemplate').addEventListener('click', function() {
      ExcelHandler.downloadTemplate();
      showToast('模板已开始下载');
    });

    // 文件上传 - 点击
    var uploadArea = document.getElementById('uploadArea');
    var fileInput = document.getElementById('fileInput');
    uploadArea.addEventListener('click', function() {
      fileInput.click();
    });

    // 文件上传 - 选择文件
    fileInput.addEventListener('change', function(e) {
      if (e.target.files.length > 0) {
        handleFileUpload(e.target.files[0]);
      }
    });

    // 文件上传 - 拖拽
    uploadArea.addEventListener('dragover', function(e) {
      e.preventDefault();
      this.classList.add('dragover');
    });
    uploadArea.addEventListener('dragleave', function(e) {
      this.classList.remove('dragover');
    });
    uploadArea.addEventListener('drop', function(e) {
      e.preventDefault();
      this.classList.remove('dragover');
      if (e.dataTransfer.files.length > 0) {
        handleFileUpload(e.dataTransfer.files[0]);
      }
    });

    // 班级选择器
    document.getElementById('classSelect').addEventListener('change', function() {
      AppData.currentClass = this.value;
      if (AppData.currentTab === 'class') {
        renderCurrentChart();
      }
    });

    // 学生班级筛选
    document.getElementById('studentClassSelect').addEventListener('change', function() {
      updateStudentList(this.value);
    });

    // 学生搜索
    document.getElementById('studentSearch').addEventListener('input', function() {
      filterStudentList(this.value);
    });

    // 学生选择
    document.getElementById('studentSelect').addEventListener('change', function() {
      var val = this.value;
      if (val) {
        var parts = val.split('|');
        AppData.currentStudent = parts[0];
        AppData.currentClass = parts[1];
        renderCurrentChart();
      }
    });

    // 加载示例数据
    document.getElementById('btnLoadDemo').addEventListener('click', function() {
      loadDemoData();
    });

    // 下载当前图表
    document.getElementById('btnDownloadSingle').addEventListener('click', function() {
      DownloadManager.downloadCurrent();
    });

    // 批量下载班级
    document.getElementById('btnBatchClass').addEventListener('click', function() {
      DownloadManager.batchDownloadClasses();
    });

    // 批量下载学生
    document.getElementById('btnBatchStudent').addEventListener('click', function() {
      DownloadManager.batchDownloadStudents();
    });
  }

  /**
   * 下载选项按钮组
   */
  function bindDownloadOptions() {
    bindOptionGroup('formatBtns', 'format');
    bindOptionGroup('scaleBtns', 'scale');
    bindOptionGroup('bgBtns', 'background');
  }

  function bindOptionGroup(containerId, optionKey) {
    var container = document.getElementById(containerId);
    var btns = container.querySelectorAll('.opt-btn');
    btns.forEach(function(btn) {
      btn.addEventListener('click', function() {
        btns.forEach(function(b) { b.classList.remove('active'); });
        this.classList.add('active');
        DownloadManager.setOption(optionKey, this.getAttribute('data-value'));
      });
    });
  }

  /**
   * 窗口大小变化
   */
  function bindResize() {
    var resizeTimer = null;
    window.addEventListener('resize', function() {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function() {
        ChartManager.resize();
      }, 200);
    });
  }

  // ========== Tab切换 ==========

  function switchTab(tabName) {
    AppData.currentTab = tabName;

    // 更新Tab样式
    document.querySelectorAll('.tab-item').forEach(function(tab) {
      tab.classList.toggle('active', tab.getAttribute('data-tab') === tabName);
    });

    // 更新选择器区域
    updateSelectorArea(tabName);

    // 更新批量下载按钮
    updateBatchButtons(tabName);

    // 重新渲染图表
    if (hasData) {
      renderCurrentChart();
    }
  }

  /**
   * 更新选择器区域显示
   */
  function updateSelectorArea(tabName) {
    document.getElementById('classSelectorGroup').style.display = 'none';
    document.getElementById('studentSelectorGroup').style.display = 'none';
    document.getElementById('noSelectorGroup').style.display = 'none';

    if (tabName === 'class') {
      document.getElementById('classSelectorGroup').style.display = 'flex';
    } else if (tabName === 'student') {
      document.getElementById('studentSelectorGroup').style.display = 'flex';
    } else {
      document.getElementById('noSelectorGroup').style.display = 'block';
    }
  }

  /**
   * 更新批量下载按钮显示
   */
  function updateBatchButtons(tabName) {
    var btnBatchClass = document.getElementById('btnBatchClass');
    var btnBatchStudent = document.getElementById('btnBatchStudent');
    btnBatchClass.style.display = 'none';
    btnBatchStudent.style.display = 'none';

    if (!hasData) return;

    if (tabName === 'class') {
      btnBatchClass.style.display = 'flex';
    } else if (tabName === 'student') {
      btnBatchStudent.style.display = 'flex';
    }
  }

  // ========== 图表渲染 ==========

  function renderCurrentChart() {
    if (!hasData) {
      chartEmpty.style.display = 'flex';
      chartWrapper.style.display = 'none';
      return;
    }

    chartEmpty.style.display = 'none';
    chartWrapper.style.display = 'flex';

    var canvas = document.getElementById('chartCanvas');

    // 确保canvas有尺寸
    if (canvas.offsetWidth === 0 || canvas.offsetHeight === 0) {
      setTimeout(renderCurrentChart, 50);
      return;
    }

    var tab = AppData.currentTab;

    if (tab === 'grade') {
      ChartManager.renderGradeChart(canvas);
    } else if (tab === 'class') {
      if (!AppData.currentClass && AppData.classList.length > 0) {
        AppData.currentClass = AppData.classList[0];
        document.getElementById('classSelect').value = AppData.currentClass;
      }
      if (AppData.currentClass) {
        ChartManager.renderClassChart(canvas, AppData.currentClass);
      }
    } else if (tab === 'student') {
      if (AppData.studentList.length > 0) {
        // 确保有选中的学生
        if (!AppData.currentStudent) {
          var first = AppData.studentList[0];
          AppData.currentStudent = first.name;
          AppData.currentClass = first.className;
        }
        if (AppData.currentStudent && AppData.currentClass) {
          ChartManager.renderStudentChart(canvas, AppData.currentStudent, AppData.currentClass);
        }
      }
    }
  }

  // ========== 数据导入 ==========

  function handleFileUpload(file) {
    var statusEl = document.getElementById('importStatus');
    statusEl.style.display = 'block';
    statusEl.className = 'import-status';
    statusEl.textContent = '正在解析文件...';

    ExcelHandler.parseExcel(file, function(err, result) {
      if (err) {
        statusEl.className = 'import-status error';
        statusEl.textContent = '导入失败：' + err;
        return;
      }

      // 更新数据
      AppData.settings = result.settings;
      AppData.maxScores = result.maxScores;
      AppData.students = result.students;

      // 计算达成度
      var calcResult = Calculator.calculate(result.students, result.maxScores);
      AppData.studentAchievement = calcResult.studentAchievement;
      AppData.classAchievement = calcResult.classAchievement;
      AppData.gradeAchievement = calcResult.gradeAchievement;
      AppData.classList = calcResult.classList;
      AppData.studentList = calcResult.studentList;

      // 重置当前选择
      AppData.currentClass = AppData.classList[0] || '';
      AppData.currentStudent = AppData.studentList.length > 0 ? AppData.studentList[0].name : '';

      hasData = true;

      // 更新UI
      updateSelectors();
      statusEl.className = 'import-status success';
      statusEl.innerHTML = '导入成功！共识别 <b>' + AppData.classList.length + '</b> 个班级、<b>' +
        AppData.students.length + '</b> 名学生';

      // 保存数据
      saveData();

      // 渲染图表
      renderCurrentChart();
      updateBatchButtons(AppData.currentTab);

      showToast('数据导入成功，已生成三级达成度');
    });
  }

  /**
   * 加载示例数据
   */
  function loadDemoData() {
    var demo = ExcelHandler.generateDemoData();

    AppData.settings = demo.settings;
    AppData.maxScores = demo.maxScores;
    AppData.students = demo.students;

    var calcResult = Calculator.calculate(demo.students, demo.maxScores);
    AppData.studentAchievement = calcResult.studentAchievement;
    AppData.classAchievement = calcResult.classAchievement;
    AppData.gradeAchievement = calcResult.gradeAchievement;
    AppData.classList = calcResult.classList;
    AppData.studentList = calcResult.studentList;

    AppData.currentClass = AppData.classList[0] || '';
    AppData.currentStudent = AppData.studentList.length > 0 ? AppData.studentList[0].name : '';

    hasData = true;

    // 更新UI
    updateSelectors();

    var statusEl = document.getElementById('importStatus');
    statusEl.style.display = 'block';
    statusEl.className = 'import-status success';
    statusEl.innerHTML = '示例数据已加载！共 <b>' + AppData.classList.length + '</b> 个班级、<b>' +
      AppData.students.length + '</b> 名学生';

    saveData();
    renderCurrentChart();
    updateBatchButtons(AppData.currentTab);

    showToast('示例数据已加载');
  }

  // ========== 选择器更新 ==========

  function updateSelectors() {
    // 班级下拉
    var classSelect = document.getElementById('classSelect');
    classSelect.innerHTML = '';
    AppData.classList.forEach(function(cls) {
      var opt = document.createElement('option');
      opt.value = cls;
      opt.textContent = cls;
      classSelect.appendChild(opt);
    });
    if (AppData.currentClass) classSelect.value = AppData.currentClass;

    // 学生班级筛选
    var studentClassSelect = document.getElementById('studentClassSelect');
    studentClassSelect.innerHTML = '';
    AppData.classList.forEach(function(cls) {
      var opt = document.createElement('option');
      opt.value = cls;
      opt.textContent = cls;
      studentClassSelect.appendChild(opt);
    });

    // 学生列表
    if (AppData.classList.length > 0) {
      updateStudentList(AppData.classList[0]);
    }
  }

  /**
   * 更新学生列表
   */
  function updateStudentList(className) {
    var studentSelect = document.getElementById('studentSelect');
    studentSelect.innerHTML = '';

    var students = AppData.studentList.filter(function(s) {
      return s.className === className;
    });

    students.forEach(function(stu) {
      var opt = document.createElement('option');
      opt.value = stu.name + '|' + stu.className;
      opt.textContent = stu.name;
      studentSelect.appendChild(opt);
    });

    // 选中第一个学生
    if (students.length > 0) {
      studentSelect.selectedIndex = 0;
      AppData.currentStudent = students[0].name;
      AppData.currentClass = className;
      if (AppData.currentTab === 'student') {
        renderCurrentChart();
      }
    }
  }

  /**
   * 搜索过滤学生列表
   */
  function filterStudentList(keyword) {
    keyword = (keyword || '').trim().toLowerCase();
    var studentSelect = document.getElementById('studentSelect');
    var currentClassFilter = document.getElementById('studentClassSelect').value;

    var students;
    if (currentClassFilter) {
      students = AppData.studentList.filter(function(s) {
        return s.className === currentClassFilter;
      });
    } else {
      students = AppData.studentList;
    }

    if (keyword) {
      students = students.filter(function(s) {
        return s.name.toLowerCase().indexOf(keyword) >= 0;
      });
    }

    studentSelect.innerHTML = '';
    students.forEach(function(stu) {
      var opt = document.createElement('option');
      opt.value = stu.name + '|' + stu.className;
      opt.textContent = stu.name + ' (' + stu.className + ')';
      studentSelect.appendChild(opt);
    });
  }

  // ========== 数据持久化 ==========

  function saveData() {
    try {
      var dataToSave = {
        settings: AppData.settings,
        maxScores: AppData.maxScores,
        students: AppData.students,
        studentAchievement: AppData.studentAchievement,
        classAchievement: AppData.classAchievement,
        gradeAchievement: AppData.gradeAchievement,
        classList: AppData.classList,
        studentList: AppData.studentList
      };
      localStorage.setItem(AppConfig.STORAGE_KEYS.appData, JSON.stringify(dataToSave));
    } catch (e) {
      // localStorage可能超出限制，忽略
      console.warn('数据保存失败:', e);
    }
  }

  function loadSavedData() {
    try {
      var saved = localStorage.getItem(AppConfig.STORAGE_KEYS.appData);
      if (!saved) return false;

      var data = JSON.parse(saved);
      AppData.settings = data.settings || {};
      AppData.maxScores = data.maxScores || {};
      AppData.students = data.students || [];
      AppData.studentAchievement = data.studentAchievement || {};
      AppData.classAchievement = data.classAchievement || {};
      AppData.gradeAchievement = data.gradeAchievement || {};
      AppData.classList = data.classList || [];
      AppData.studentList = data.studentList || [];

      AppData.currentClass = AppData.classList[0] || '';
      AppData.currentStudent = AppData.studentList.length > 0 ? AppData.studentList[0].name : '';

      updateSelectors();
      return true;
    } catch (e) {
      return false;
    }
  }

  // ========== UI 辅助 ==========

  function showToast(msg) {
    var toast = document.getElementById('globalToast');
    var text = document.getElementById('globalToastText');
    text.textContent = msg;
    toast.style.display = 'block';
    toast.style.animation = 'none';
    toast.offsetHeight;
    toast.style.animation = '';

    clearTimeout(toast._timer);
    toast._timer = setTimeout(function() {
      toast.style.display = 'none';
    }, 2500);
  }

  function showLoading(msg) {
    var overlay = document.getElementById('loadingOverlay');
    var text = document.getElementById('loadingText');
    text.textContent = msg || '正在处理...';
    overlay.style.display = 'flex';
  }

  function hideLoading() {
    document.getElementById('loadingOverlay').style.display = 'none';
  }

  return {
    init: init,
    showToast: showToast,
    showLoading: showLoading,
    hideLoading: hideLoading
  };
})();

// 启动应用
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', AppController.init);
} else {
  AppController.init();
}
