/**
 * 雷达图生成模块
 * 标题/副标题/图例全部内置于ECharts，确保下载图片完整包含所有元素
 */
var ChartManager = (function() {
  var chartInstance = null;
  var currentChartType = null;
  var noAnimation = false; // 离屏渲染时禁用动画

  /**
   * 初始化图表实例
   */
  function init(container) {
    if (chartInstance) {
      chartInstance.dispose();
    }
    chartInstance = echarts.init(container, null, { renderer: 'canvas' });
    return chartInstance;
  }

  function getInstance() { return chartInstance; }

  function resize() {
    if (chartInstance) chartInstance.resize();
  }

  function getCurrentType() { return currentChartType; }

  // ========== 公共构建函数 ==========

  /**
   * 构建带数值标注的指示器
   */
  function buildIndicators(labelValues) {
    return AppConfig.SUBJECTS_ORDER.map(function(subject, i) {
      var val = labelValues[i] || '0.0%';
      return {
        name: '{name|' + subject + '}\n{val|' + val + '}',
        max: 1
      };
    });
  }

  /**
   * 轴名称富文本样式
   */
  function getAxisNameConfig() {
    return {
      padding: [4, 6],
      rich: {
        name: {
          color: '#1D2129',
          fontSize: 14,
          fontWeight: 'bold',
          lineHeight: 22,
          padding: [0, 0, 4, 0]
        },
        val: {
          backgroundColor: '#fff',
          borderColor: '#1D2129',
          borderWidth: 2,
          color: '#1D2129',
          fontWeight: 'bold',
          fontSize: 12,
          padding: [2, 8],
          borderRadius: 4,
          lineHeight: 20
        }
      }
    };
  }

  /**
   * 构建雷达坐标系配置
   * @param {Array} indicators - 指示器数组
   * @param {boolean} hasLegend - 是否有图例（影响布局偏移）
   */
  function buildRadarConfig(indicators, hasLegend) {
    // 有图例时往下偏移更多
    var centerY = hasLegend ? '56%' : '54%';
    return {
      indicator: indicators,
      center: ['50%', centerY],
      radius: '58%',
      shape: 'polygon',
      splitNumber: 5,
      axisName: getAxisNameConfig(),
      splitLine: {
        lineStyle: {
          color: '#E5E6EB',
          type: 'dashed',
          width: 1
        }
      },
      splitArea: { show: false },
      axisLine: {
        lineStyle: {
          color: '#E5E6EB',
          width: 1
        }
      }
    };
  }

  /**
   * 构建标题配置
   */
  function buildTitleConfig(title, subtitle) {
    return {
      text: title,
      subtext: subtitle,
      left: 'center',
      top: 16,
      textStyle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1D2129'
      },
      subtextStyle: {
        fontSize: 13,
        color: '#86909C'
      },
      itemGap: 6
    };
  }

  /**
   * 构建副标题文本
   */
  function buildSubtitle() {
    var s = AppData.settings;
    var parts = [];
    if (s.schoolName) parts.push(s.schoolName);
    if (s.grade) parts.push(s.grade);
    if (s.semester) parts.push(s.semester);
    if (s.examType) parts.push(s.examType);
    return parts.join('  ·  ');
  }

  /**
   * 同时更新页面HTML标题区域（便于页面展示）
   */
  function updateHtmlTitle(title, subtitle) {
    var titleArea = document.getElementById('chartTitleArea');
    if (titleArea) {
      titleArea.innerHTML =
        '<div class="chart-main-title">' + escapeHtml(title) + '</div>' +
        '<div class="chart-sub-title">' + escapeHtml(subtitle) + '</div>';
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // ========== 三级雷达图渲染 ==========

  /**
   * 年级雷达图（单系列）
   */
  function renderGradeChart(container) {
    init(container);
    currentChartType = 'grade';

    var gradeValues = Calculator.getGradeValues();
    var labelValues = gradeValues.map(function(v) { return Calculator.formatPercent(v); });
    var indicators = buildIndicators(labelValues);

    var title = (AppData.settings.grade || '年级') + '各学科年级整体达成度雷达图';
    var subtitle = buildSubtitle();
    updateHtmlTitle(title, subtitle);

    var option = {
      animation: !noAnimation,
      animationDuration: 600,
      animationEasing: 'cubicOut',
      title: buildTitleConfig(title, subtitle),
      radar: buildRadarConfig(indicators, false),
      series: [{
        type: 'radar',
        data: [{
          value: gradeValues,
          name: '年级整体达成度',
          symbol: 'circle',
          symbolSize: 8,
          lineStyle: { color: '#165DFF', width: 3 },
          areaStyle: { color: 'rgba(22, 93, 255, 0.15)' },
          itemStyle: { color: '#165DFF', borderColor: '#fff', borderWidth: 2 },
          label: { show: false }
        }]
      }]
    };

    chartInstance.setOption(option, true);
    return chartInstance;
  }

  /**
   * 班级雷达图（双系列对比）
   */
  function renderClassChart(container, className) {
    init(container);
    currentChartType = 'class';

    var gradeValues = Calculator.getGradeValues();
    var classValues = Calculator.getClassValues(className);

    // 标注为班级与年级的差值
    var labelValues = AppConfig.SUBJECTS_ORDER.map(function(s, i) {
      var diff = classValues[i] - gradeValues[i];
      return Calculator.formatDiff(diff);
    });
    var indicators = buildIndicators(labelValues);

    var title = className + '各科达成度与年级平均达成度对比雷达图';
    var subtitle = buildSubtitle();
    updateHtmlTitle(title, subtitle);

    var option = {
      animation: !noAnimation,
      animationDuration: 600,
      animationEasing: 'cubicOut',
      title: buildTitleConfig(title, subtitle),
      legend: {
        data: ['年级平均达成度', '当前班级达成度'],
        right: 20,
        top: 48,
        itemWidth: 16,
        itemHeight: 10,
        itemGap: 16,
        textStyle: { fontSize: 13, color: '#4E5969' }
      },
      radar: buildRadarConfig(indicators, true),
      series: [{
        type: 'radar',
        data: [
          {
            // 年级平均 - 弱化显示
            value: gradeValues,
            name: '年级平均达成度',
            symbol: 'circle',
            symbolSize: 5,
            lineStyle: { color: 'rgba(245, 63, 63, 0.45)', width: 1.5, type: 'dashed' },
            areaStyle: { color: 'rgba(245, 63, 63, 0.06)' },
            itemStyle: { color: 'rgba(245, 63, 63, 0.5)' },
            z: 1
          },
          {
            // 班级 - 高亮显示
            value: classValues,
            name: '当前班级达成度',
            symbol: 'circle',
            symbolSize: 8,
            lineStyle: { color: '#165DFF', width: 3 },
            areaStyle: { color: 'rgba(22, 93, 255, 0.15)' },
            itemStyle: { color: '#165DFF', borderColor: '#fff', borderWidth: 2 },
            z: 2
          }
        ]
      }]
    };

    chartInstance.setOption(option, true);
    return chartInstance;
  }

  /**
   * 学生雷达图（三系列对比）
   */
  function renderStudentChart(container, studentName, className) {
    init(container);
    currentChartType = 'student';

    var studentKey = studentName + '|' + className;
    var gradeValues = Calculator.getGradeValues();
    var classValues = Calculator.getClassValues(className);
    var studentValues = Calculator.getStudentValues(studentKey);

    // 标注为学生个人的绝对达成度
    var labelValues = studentValues.map(function(v) { return Calculator.formatPercent(v); });
    var indicators = buildIndicators(labelValues);

    var title = studentName + '各学科达成度与班级/年级对比雷达图';
    var subtitle = buildSubtitle();
    updateHtmlTitle(title, subtitle);

    var option = {
      animation: !noAnimation,
      animationDuration: 600,
      animationEasing: 'cubicOut',
      title: buildTitleConfig(title, subtitle),
      legend: {
        data: ['年级达成度', '班级达成度', '学生个人达成度'],
        right: 20,
        top: 48,
        itemWidth: 16,
        itemHeight: 10,
        itemGap: 16,
        textStyle: { fontSize: 13, color: '#4E5969' }
      },
      radar: buildRadarConfig(indicators, true),
      series: [{
        type: 'radar',
        data: [
          {
            // 年级 - 最弱化
            value: gradeValues,
            name: '年级达成度',
            symbol: 'circle',
            symbolSize: 4,
            lineStyle: { color: 'rgba(22, 93, 255, 0.3)', width: 1, type: 'dashed' },
            areaStyle: { color: 'rgba(22, 93, 255, 0.03)' },
            itemStyle: { color: 'rgba(22, 93, 255, 0.35)' },
            z: 1
          },
          {
            // 班级 - 次弱化
            value: classValues,
            name: '班级达成度',
            symbol: 'circle',
            symbolSize: 5,
            lineStyle: { color: 'rgba(0, 180, 42, 0.5)', width: 1.5 },
            areaStyle: { color: 'rgba(0, 180, 42, 0.06)' },
            itemStyle: { color: 'rgba(0, 180, 42, 0.55)' },
            z: 2
          },
          {
            // 学生 - 高亮
            value: studentValues,
            name: '学生个人达成度',
            symbol: 'circle',
            symbolSize: 8,
            lineStyle: { color: '#FF7D00', width: 3 },
            areaStyle: { color: 'rgba(255, 125, 0, 0.15)' },
            itemStyle: { color: '#FF7D00', borderColor: '#fff', borderWidth: 2 },
            z: 3
          }
        ]
      }]
    };

    chartInstance.setOption(option, true);
    return chartInstance;
  }

  // ========== 离屏渲染（批量下载用） ==========

  /**
   * 离屏渲染图表
   * @param {string} type - 'grade' | 'class' | 'student'
   * @param {Object} params - { className, studentName }
   * @returns {{ chart: Object, container: HTMLElement }}
   */
  function renderOffscreen(type, params) {
    var offContainer = document.createElement('div');
    offContainer.style.width = '900px';
    offContainer.style.height = '680px';
    offContainer.style.position = 'absolute';
    offContainer.style.left = '-9999px';
    offContainer.style.top = '0';
    document.body.appendChild(offContainer);

    // 保存当前可见图表实例，设为null避免被dispose
    var savedInstance = chartInstance;
    var savedNoAnim = noAnimation;
    chartInstance = null;
    noAnimation = true;

    var chart = null;
    if (type === 'grade') {
      chart = renderGradeChart(offContainer);
    } else if (type === 'class') {
      chart = renderClassChart(offContainer, params.className);
    } else if (type === 'student') {
      chart = renderStudentChart(offContainer, params.studentName, params.className);
    }

    // 恢复
    chartInstance = savedInstance;
    noAnimation = savedNoAnim;

    return { chart: chart, container: offContainer };
  }

  /**
   * 清理离屏图表
   */
  function cleanupOffscreen(offscreen) {
    if (offscreen.chart) {
      try { offscreen.chart.dispose(); } catch (e) {}
    }
    if (offscreen.container && offscreen.container.parentNode) {
      offscreen.container.parentNode.removeChild(offscreen.container);
    }
  }

  return {
    renderGradeChart: renderGradeChart,
    renderClassChart: renderClassChart,
    renderStudentChart: renderStudentChart,
    getInstance: getInstance,
    resize: resize,
    getCurrentType: getCurrentType,
    renderOffscreen: renderOffscreen,
    cleanupOffscreen: cleanupOffscreen
  };
})();
