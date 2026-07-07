/**
 * 全局配置与常量
 */
var AppConfig = {
  // 雷达图维度顺序（顺时针固定）
  SUBJECTS_ORDER: ['语文', '数学', '英语', '物理', '历史', '道德与法治'],

  // Excel模板中的列顺序
  EXCEL_COLUMNS: ['姓名', '班级', '语文', '数学', '英语', '物理', '道德与法治', '历史'],

  // 基础设置字段
  SETTINGS_FIELDS: ['学校名称', '年级', '学期', '考试类型'],

  // 颜色配置
  COLORS: {
    primary: '#165DFF',       // 深蓝主色
    error: '#F53F3F',         // 错误红
    success: '#00B42A',       // 成功绿
    student: '#FF7D00',       // 学生橙
    gray: '#86909C',          // 次要灰
    gradeBlue: '#165DFF',     // 年级蓝
    classBlue: '#165DFF',     // 班级蓝
    classRed: '#F53F3F',      // 班级图年级对比红
    studentOrange: '#FF7D00', // 学生橙
    studentGreen: '#00B42A',  // 学生图班级绿
    studentBlue: '#165DFF'    // 学生图年级蓝
  },

  // 本地存储Key
  STORAGE_KEYS: {
    auth: 'radar_auth_state',
    rememberAccount: 'radar_remember_account',
    appData: 'radar_app_data',
    accounts: 'radar_accounts',           // 账号列表
    currentUser: 'radar_current_user'     // 当前登录用户名
  },

  // 默认管理员账号（首次使用时初始化到 localStorage）
  DEFAULT_ACCOUNT: {
    username: 'admin',
    password: '123456'
  },

  // 默认账号列表（首次初始化）
  DEFAULT_ACCOUNTS: [
    {
      username: 'admin',
      password: '123456',
      displayName: '系统管理员',
      role: 'admin',
      status: 'active',
      createdAt: '2024-09-01',
      remark: '内置超级管理员'
    }
  ],

  // 满分默认值
  DEFAULT_MAX_SCORES: {
    '语文': 100,
    '数学': 100,
    '英语': 100,
    '物理': 100,
    '道德与法治': 100,
    '历史': 100
  }
};

/**
 * 全局应用状态
 */
var AppData = {
  settings: {
    schoolName: '',
    grade: '',
    semester: '',
    examType: ''
  },
  maxScores: {},
  students: [],
  // 计算结果
  studentAchievement: {},  // { 学生名: { 语文: 0.85, ... } }
  classAchievement: {},    // { 班级名: { 语文: 0.82, ... } }
  gradeAchievement: {},    // { 语文: 0.80, ... }
  classList: [],           // ['1班', '2班', ...]
  studentList: [],         // [{ name, className }, ...]
  // 当前UI状态
  currentTab: 'grade',     // 'grade' | 'class' | 'student'
  currentClass: '',
  currentStudent: ''
};
