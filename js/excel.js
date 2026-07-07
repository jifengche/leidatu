/**
 * Excel导入与模板下载模块
 */
var ExcelHandler = (function() {

  /**
   * 下载标准模板
   */
  function downloadTemplate() {
    var wb = XLSX.utils.book_new();

    // Sheet 1: 基础设置
    var settingsData = [
      ['项目', '内容'],
      ['学校名称', ''],
      ['年级', ''],
      ['学期', ''],
      ['考试类型', '']
    ];
    var ws1 = XLSX.utils.aoa_to_sheet(settingsData);
    ws1['!cols'] = [{ wch: 16 }, { wch: 30 }];
    // 合并标题行
    ws1['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }];
    XLSX.utils.book_append_sheet(wb, ws1, '基础设置');

    // Sheet 2: 基础数据
    var dataHeader = AppConfig.EXCEL_COLUMNS; // ['姓名','班级','语文','数学','英语','物理','道德与法治','历史']
    // 添加示例行
    var dataRows = [
      dataHeader,
      ['张三', '1班', 85, 92, 78, 88, 90, 82],
      ['李四', '1班', 76, 85, 92, 70, 85, 78],
      ['王五', '2班', 90, 78, 85, 92, 76, 88]
    ];
    var ws2 = XLSX.utils.aoa_to_sheet(dataRows);
    ws2['!cols'] = [
      { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
      { wch: 10 }, { wch: 10 }, { wch: 14 }, { wch: 10 }
    ];
    XLSX.utils.book_append_sheet(wb, ws2, '基础数据');

    // Sheet 3: 学科满分
    var maxScoreData = [
      ['学科', '总分'],
      ['语文', 100],
      ['数学', 100],
      ['英语', 100],
      ['物理', 100],
      ['道德与法治', 100],
      ['历史', 100]
    ];
    var ws3 = XLSX.utils.aoa_to_sheet(maxScoreData);
    ws3['!cols'] = [{ wch: 16 }, { wch: 10 }];
    XLSX.utils.book_append_sheet(wb, ws3, '学科满分');

    XLSX.writeFile(wb, '成绩数据模板.xlsx');
  }

  /**
   * 解析Excel文件
   */
  function parseExcel(file, callback) {
    var reader = new FileReader();
    reader.onload = function(e) {
      try {
        var data = new Uint8Array(e.target.result);
        var wb = XLSX.read(data, { type: 'array' });
        var result = parseWorkbook(wb);
        callback(null, result);
      } catch (err) {
        callback(err.message || '文件解析失败');
      }
    };
    reader.onerror = function() {
      callback('文件读取失败');
    };
    reader.readAsArrayBuffer(file);
  }

  /**
   * 解析工作簿
   */
  function parseWorkbook(wb) {
    var errors = [];

    // 检查必须的工作表
    var requiredSheets = ['基础设置', '基础数据', '学科满分'];
    requiredSheets.forEach(function(name) {
      if (!wb.SheetNames.includes(name)) {
        errors.push('缺少工作表「' + name + '」');
      }
    });
    if (errors.length > 0) {
      throw new Error(errors.join('；'));
    }

    // 解析基础设置
    var ws1 = wb.Sheets['基础设置'];
    var settingsRows = XLSX.utils.sheet_to_json(ws1, { header: 1 });
    var settings = parseSettings(settingsRows);

    // 解析学科满分
    var ws3 = wb.Sheets['学科满分'];
    var maxScoreRows = XLSX.utils.sheet_to_json(ws3, { header: 1 });
    var maxScores = parseMaxScores(maxScoreRows);

    // 解析基础数据
    var ws2 = wb.Sheets['基础数据'];
    var dataRows = XLSX.utils.sheet_to_json(ws2, { header: 1 });
    var students = parseStudents(dataRows, maxScores, errors);

    if (errors.length > 0) {
      throw new Error(errors.join('；'));
    }

    return {
      settings: settings,
      maxScores: maxScores,
      students: students
    };
  }

  /**
   * 解析基础设置
   */
  function parseSettings(rows) {
    var settings = { schoolName: '', grade: '', semester: '', examType: '' };
    var fieldMap = {
      '学校名称': 'schoolName',
      '年级': 'grade',
      '学期': 'semester',
      '考试类型': 'examType'
    };

    // 跳过标题行，从第2行开始
    for (var i = 1; i < rows.length; i++) {
      var row = rows[i];
      if (!row || !row[0]) continue;
      var key = String(row[0]).trim();
      var val = row[1] ? String(row[1]).trim() : '';
      if (fieldMap[key]) {
        settings[fieldMap[key]] = val;
      }
    }
    return settings;
  }

  /**
   * 解析学科满分
   */
  function parseMaxScores(rows) {
    var maxScores = {};
    // 跳过标题行
    for (var i = 1; i < rows.length; i++) {
      var row = rows[i];
      if (!row || !row[0]) continue;
      var subject = String(row[0]).trim();
      var score = parseFloat(row[1]);
      if (subject && !isNaN(score) && score > 0) {
        maxScores[subject] = score;
      }
    }
    // 补充默认值
    AppConfig.SUBJECTS_ORDER.forEach(function(s) {
      if (!maxScores[s]) {
        maxScores[s] = AppConfig.DEFAULT_MAX_SCORES[s];
      }
    });
    return maxScores;
  }

  /**
   * 解析学生数据
   */
  function parseStudents(rows, maxScores, errors) {
    var students = [];
    if (rows.length < 2) {
      errors.push('基础数据表无数据行');
      return students;
    }

    // 检查表头
    var header = rows[0].map(function(h) { return String(h).trim(); });
    var expectedCols = AppConfig.EXCEL_COLUMNS;
    for (var c = 0; c < expectedCols.length; c++) {
      if (header[c] !== expectedCols[c]) {
        errors.push('基础数据表第' + (c + 1) + '列应为「' + expectedCols[c] + '」，实际为「' + (header[c] || '空') + '」');
      }
    }

    // 解析数据行
    for (var i = 1; i < rows.length; i++) {
      var row = rows[i];
      if (!row || !row[0]) continue; // 跳过空行

      var name = String(row[0]).trim();
      var className = String(row[1] || '').trim();
      if (!name || !className) {
        errors.push('第' + (i + 1) + '行：姓名或班级为空');
        continue;
      }

      var scores = {};
      var hasError = false;
      for (var j = 2; j < expectedCols.length; j++) {
        var subject = expectedCols[j];
        var rawVal = row[j];
        var score = parseFloat(rawVal);

        if (rawVal === undefined || rawVal === null || rawVal === '') {
          errors.push('第' + (i + 1) + '行「' + name + '」的' + subject + '成绩为空');
          hasError = true;
          continue;
        }
        if (isNaN(score)) {
          errors.push('第' + (i + 1) + '行「' + name + '」的' + subject + '成绩不是有效数字');
          hasError = true;
          continue;
        }
        if (score < 0) {
          errors.push('第' + (i + 1) + '行「' + name + '」的' + subject + '成绩不能为负数');
          hasError = true;
          continue;
        }
        var max = maxScores[subject] || 100;
        if (score > max) {
          errors.push('第' + (i + 1) + '行「' + name + '」的' + subject + '成绩' + score + '超过满分' + max);
          hasError = true;
          continue;
        }
        scores[subject] = score;
      }

      if (!hasError) {
        students.push({ name: name, className: className, scores: scores });
      }
    }

    return students;
  }

  /**
   * 生成示例数据
   */
  function generateDemoData() {
    var settings = {
      schoolName: '阳光中学',
      grade: '八年级',
      semester: '2024-2025学年第一学期',
      examType: '期中考试'
    };

    var maxScores = {
      '语文': 100, '数学': 100, '英语': 100,
      '物理': 100, '道德与法治': 100, '历史': 100
    };

    // 3个班级，每班15-18人
    var students = [];
    var classes = ['1班', '2班', '3班'];
    var surnames = ['张', '王', '李', '赵', '刘', '陈', '杨', '黄', '周', '吴', '徐', '孙', '马', '朱', '胡', '林', '郭', '何'];
    var givenNames = ['浩然', '梓涵', '欣怡', '俊杰', '雨桐', '思远', '佳怡', '宇轩', '可馨', '子墨', '若曦', '嘉豪', '梦琪', '博文', '雅静', '浩宇', '婉清', '晨阳'];

    classes.forEach(function(cls, classIdx) {
      var count = 15 + classIdx * 2;
      for (var i = 0; i < count; i++) {
        var name = surnames[(classIdx * 7 + i) % surnames.length] + givenNames[(classIdx * 5 + i) % givenNames.length];
        // 确保名字不重复
        var suffix = '';
        var checkName = name;
        while (students.some(function(s) { return s.name === checkName; })) {
          suffix = (suffix || 1) + 1;
          checkName = name + suffix;
        }
        name = checkName;

        var scores = {};
        AppConfig.SUBJECTS_ORDER.forEach(function(subject, sIdx) {
          // 不同班级有不同整体水平，不同学科有不同波动
          var base = 70 + classIdx * 5; // 1班基础高，3班低
          var subjectBonus = [5, 3, 0, -3, -5, 2][sIdx] || 0; // 学科偏移
          var variance = (Math.random() - 0.5) * 30; // 随机波动
          var score = Math.round(base + subjectBonus + variance);
          score = Math.max(30, Math.min(100, score));
          scores[subject] = score;
        });

        students.push({ name: name, className: cls, scores: scores });
      }
    });

    return {
      settings: settings,
      maxScores: maxScores,
      students: students
    };
  }

  return {
    downloadTemplate: downloadTemplate,
    parseExcel: parseExcel,
    generateDemoData: generateDemoData
  };
})();
