/**
 * 达成度计算模块
 */
var Calculator = (function() {

  /**
   * 计算全部三级达成度
   * @param {Array} students - 学生数组 [{ name, className, scores: { 语文: 85, ... } }]
   * @param {Object} maxScores - 各科满分 { 语文: 100, ... }
   * @returns {Object} { studentAchievement, classAchievement, gradeAchievement, classList, studentList }
   */
  function calculate(students, maxScores) {
    var result = {
      studentAchievement: {},
      classAchievement: {},
      gradeAchievement: {},
      classList: [],
      studentList: []
    };

    if (!students || students.length === 0) return result;

    var subjects = AppConfig.SUBJECTS_ORDER;
    var classMap = {};      // { 班级名: { 学科: [分数数组], students: [] } }
    var gradeSums = {};     // { 学科: 总分 }
    var gradeCounts = {};   // { 学科: 人数 }

    subjects.forEach(function(s) {
      gradeSums[s] = 0;
      gradeCounts[s] = 0;
    });

    // 遍历学生
    students.forEach(function(stu) {
      var className = stu.className || '未知班级';

      // 初始化班级
      if (!classMap[className]) {
        classMap[className] = { students: [] };
        subjects.forEach(function(s) { classMap[className][s] = []; });
      }

      // 计算学生达成度
      var stuAch = {};
      subjects.forEach(function(s) {
        var score = stu.scores[s];
        var max = maxScores[s] || 100;
        var ach = (score != null && !isNaN(score) && max > 0) ? (score / max) : 0;
        stuAch[s] = ach;

        // 累加到班级和年级
        if (score != null && !isNaN(score)) {
          classMap[className][s].push(score);
          gradeSums[s] += score;
          gradeCounts[s]++;
        }
      });

      result.studentAchievement[stu.name + '|' + className] = stuAch;
      classMap[className].students.push(stu);
      result.studentList.push({ name: stu.name, className: className });
    });

    // 计算班级达成度
    Object.keys(classMap).forEach(function(className) {
      var classData = classMap[className];
      var classAch = {};
      subjects.forEach(function(s) {
        var scores = classData[s];
        var max = maxScores[s] || 100;
        if (scores.length > 0 && max > 0) {
          var sum = scores.reduce(function(a, b) { return a + b; }, 0);
          var avg = sum / scores.length;
          classAch[s] = avg / max;
        } else {
          classAch[s] = 0;
        }
      });
      result.classAchievement[className] = classAch;
    });

    // 计算年级达成度
    subjects.forEach(function(s) {
      var max = maxScores[s] || 100;
      if (gradeCounts[s] > 0 && max > 0) {
        var avg = gradeSums[s] / gradeCounts[s];
        result.gradeAchievement[s] = avg / max;
      } else {
        result.gradeAchievement[s] = 0;
      }
    });

    // 班级列表排序
    result.classList = Object.keys(classMap).sort(function(a, b) {
      // 尝试按数字排序
      var numA = parseInt(a);
      var numB = parseInt(b);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.localeCompare(b, 'zh');
    });

    return result;
  }

  /**
   * 获取学生达成度数据（按雷达图轴顺序）
   */
  function getStudentValues(studentKey) {
    var ach = AppData.studentAchievement[studentKey];
    if (!ach) return AppConfig.SUBJECTS_ORDER.map(function() { return 0; });
    return AppConfig.SUBJECTS_ORDER.map(function(s) { return ach[s] || 0; });
  }

  /**
   * 获取班级达成度数据（按雷达图轴顺序）
   */
  function getClassValues(className) {
    var ach = AppData.classAchievement[className];
    if (!ach) return AppConfig.SUBJECTS_ORDER.map(function() { return 0; });
    return AppConfig.SUBJECTS_ORDER.map(function(s) { return ach[s] || 0; });
  }

  /**
   * 获取年级达成度数据（按雷达图轴顺序）
   */
  function getGradeValues() {
    return AppConfig.SUBJECTS_ORDER.map(function(s) {
      return AppData.gradeAchievement[s] || 0;
    });
  }

  /**
   * 格式化百分比
   */
  function formatPercent(val) {
    return (val * 100).toFixed(1) + '%';
  }

  /**
   * 格式化差值（带正负号）
   */
  function formatDiff(val) {
    var diff = val * 100;
    var sign = diff >= 0 ? '+' : '';
    return sign + diff.toFixed(1) + '%';
  }

  return {
    calculate: calculate,
    getStudentValues: getStudentValues,
    getClassValues: getClassValues,
    getGradeValues: getGradeValues,
    formatPercent: formatPercent,
    formatDiff: formatDiff
  };
})();
