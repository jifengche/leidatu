/**
 * 登录认证逻辑 + 账号管理器
 */
(function() {
  'use strict';

  // ========== 账号管理器 ==========

  /**
   * 初始化默认账号列表（仅首次执行）
   */
  function initAccounts() {
    var stored = localStorage.getItem(AppConfig.STORAGE_KEYS.accounts);
    if (!stored) {
      localStorage.setItem(
        AppConfig.STORAGE_KEYS.accounts,
        JSON.stringify(AppConfig.DEFAULT_ACCOUNTS)
      );
    }
  }

  /**
   * 获取全部账号
   */
  function getAccounts() {
    initAccounts();
    try {
      return JSON.parse(localStorage.getItem(AppConfig.STORAGE_KEYS.accounts)) || [];
    } catch (e) {
      return AppConfig.DEFAULT_ACCOUNTS.slice();
    }
  }

  /**
   * 保存账号列表
   */
  function saveAccounts(accounts) {
    localStorage.setItem(AppConfig.STORAGE_KEYS.accounts, JSON.stringify(accounts));
  }

  /**
   * 根据用户名查找账号
   */
  function findAccount(username) {
    var accounts = getAccounts();
    for (var i = 0; i < accounts.length; i++) {
      if (accounts[i].username === username) return accounts[i];
    }
    return null;
  }

  /**
   * 添加账号
   * @returns {string|null} 错误信息，null 表示成功
   */
  function addAccount(account) {
    var accounts = getAccounts();
    if (findAccount(account.username)) {
      return '该账号已存在';
    }
    account.createdAt = new Date().toISOString().slice(0, 10);
    accounts.push(account);
    saveAccounts(accounts);
    return null;
  }

  /**
   * 更新账号
   */
  function updateAccount(username, updates) {
    var accounts = getAccounts();
    for (var i = 0; i < accounts.length; i++) {
      if (accounts[i].username === username) {
        for (var key in updates) {
          if (updates.hasOwnProperty(key)) {
            accounts[i][key] = updates[key];
          }
        }
        saveAccounts(accounts);
        return null;
      }
    }
    return '账号不存在';
  }

  /**
   * 删除账号
   */
  function deleteAccount(username) {
    var accounts = getAccounts();
    // 不允许删除最后一个管理员
    var adminCount = accounts.filter(function(a) { return a.role === 'admin'; }).length;
    var target = findAccount(username);
    if (target && target.role === 'admin' && adminCount <= 1) {
      return '系统至少需要保留一个管理员账号';
    }
    accounts = accounts.filter(function(a) { return a.username !== username; });
    saveAccounts(accounts);
    return null;
  }

  /**
   * 重置密码
   */
  function resetPassword(username, newPwd) {
    return updateAccount(username, { password: newPwd });
  }

  /**
   * 切换账号状态
   */
  function toggleStatus(username) {
    var acct = findAccount(username);
    if (!acct) return '账号不存在';
    var newStatus = acct.status === 'active' ? 'disabled' : 'active';
    return updateAccount(username, { status: newStatus });
  }

  // ========== 鉴权逻辑 ==========

  /**
   * 检查是否已登录
   */
  function isAuthenticated() {
    var auth = localStorage.getItem(AppConfig.STORAGE_KEYS.auth);
    return auth === 'true';
  }

  /**
   * 检查是否为管理员
   */
  function isAdmin() {
    var currentUser = localStorage.getItem(AppConfig.STORAGE_KEYS.currentUser);
    if (!currentUser) return false;
    var acct = findAccount(currentUser);
    return acct && acct.role === 'admin';
  }

  /**
   * 设置登录状态
   */
  function setAuth(value) {
    if (value) {
      localStorage.setItem(AppConfig.STORAGE_KEYS.auth, 'true');
    } else {
      localStorage.removeItem(AppConfig.STORAGE_KEYS.auth);
    }
  }

  // ========== 登录页UI辅助 ==========

  function showFieldError(fieldId, msg) {
    var el = document.getElementById(fieldId);
    if (el) el.textContent = msg;
    var wrap = el ? el.previousElementSibling : null;
    if (wrap) wrap.classList.add('error');
  }

  function clearFieldError(fieldId) {
    var el = document.getElementById(fieldId);
    if (el) el.textContent = '';
    var wrap = el ? el.previousElementSibling : null;
    if (wrap) wrap.classList.remove('error');
  }

  function showAlert(msg) {
    var alert = document.getElementById('loginAlert');
    var text = document.getElementById('loginAlertText');
    if (alert && text) {
      text.textContent = msg;
      alert.style.display = 'flex';
      alert.style.animation = 'none';
      alert.offsetHeight;
      alert.style.animation = '';
    }
  }

  function hideAlert() {
    var alert = document.getElementById('loginAlert');
    if (alert) alert.style.display = 'none';
  }

  // ========== 登录 ==========

  function doLogin(username, password) {
    var btn = document.getElementById('btnLogin');
    btn.classList.add('loading');
    btn.disabled = true;

    setTimeout(function() {
      var account = findAccount(username);
      var valid = false;
      var errMsg = '账号或密码错误，请重试';

      if (account) {
        if (account.status === 'disabled') {
          errMsg = '该账号已被停用，请联系管理员';
        } else if (account.password === password) {
          valid = true;
        }
      }

      if (valid) {
        setAuth(true);
        localStorage.setItem(AppConfig.STORAGE_KEYS.currentUser, username);
        localStorage.removeItem('radar_is_demo');
        window.location.href = 'main.html';
      } else {
        btn.classList.remove('loading');
        btn.disabled = false;
        showAlert(errMsg);
      }
    }, 600);
  }

  // 演示登录
  function demoLogin() {
    setAuth(true);
    localStorage.setItem('radar_is_demo', 'true');
    localStorage.removeItem(AppConfig.STORAGE_KEYS.currentUser);
    window.location.href = 'main.html';
  }

  // ========== 登录页初始化 ==========

  function init() {
    // 确保账号列表已初始化（所有页面都需要）
    initAccounts();

    // 仅在登录页（存在 loginForm 元素时）执行登录页逻辑
    var loginForm = document.getElementById('loginForm');
    if (!loginForm) return;

    if (isAuthenticated()) {
      window.location.href = 'main.html';
      return;
    }

    var savedAccount = localStorage.getItem(AppConfig.STORAGE_KEYS.rememberAccount);
    if (savedAccount) {
      document.getElementById('username').value = savedAccount;
      document.getElementById('rememberMe').checked = true;
    }

    var toggleBtn = document.getElementById('togglePassword');
    var passwordInput = document.getElementById('password');
    var eyeOpen = document.getElementById('eyeOpen');
    var eyeClose = document.getElementById('eyeClose');

    toggleBtn.addEventListener('click', function() {
      var isPassword = passwordInput.type === 'password';
      passwordInput.type = isPassword ? 'text' : 'password';
      eyeOpen.style.display = isPassword ? 'none' : 'block';
      eyeClose.style.display = isPassword ? 'block' : 'none';
    });

    document.getElementById('forgotLink').addEventListener('click', function() {
      document.getElementById('toastOverlay').style.display = 'flex';
    });
    document.getElementById('toastClose').addEventListener('click', function() {
      document.getElementById('toastOverlay').style.display = 'none';
    });
    document.getElementById('toastOverlay').addEventListener('click', function(e) {
      if (e.target === this) this.style.display = 'none';
    });

    document.getElementById('username').addEventListener('input', function() {
      clearFieldError('usernameError');
      hideAlert();
    });
    document.getElementById('password').addEventListener('input', function() {
      clearFieldError('passwordError');
      hideAlert();
    });

    document.getElementById('username').addEventListener('blur', function() {
      var val = this.value.trim();
      if (!val) showFieldError('usernameError', '请输入账号');
    });
    document.getElementById('password').addEventListener('blur', function() {
      var val = this.value.trim();
      if (!val) showFieldError('passwordError', '请输入密码');
    });

    passwordInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        document.getElementById('loginForm').dispatchEvent(new Event('submit'));
      }
    });

    document.getElementById('loginForm').addEventListener('submit', function(e) {
      e.preventDefault();
      var username = document.getElementById('username').value.trim();
      var password = document.getElementById('password').value.trim();
      var hasError = false;

      if (!username) { showFieldError('usernameError', '请输入账号'); hasError = true; }
      if (!password) { showFieldError('passwordError', '请输入密码'); hasError = true; }
      if (hasError) return;

      var remember = document.getElementById('rememberMe').checked;
      if (remember) {
        localStorage.setItem(AppConfig.STORAGE_KEYS.rememberAccount, username);
      } else {
        localStorage.removeItem(AppConfig.STORAGE_KEYS.rememberAccount);
      }

      doLogin(username, password);
    });

    document.getElementById('btnDemo').addEventListener('click', demoLogin);
  }

  // ========== 暴露接口 ==========

  window.AuthHelper = {
    isAuthenticated: isAuthenticated,
    isAdmin: isAdmin,
    setAuth: setAuth,
    getCurrentUser: function() {
      return localStorage.getItem(AppConfig.STORAGE_KEYS.currentUser) || '';
    },
    logout: function() {
      setAuth(false);
      localStorage.removeItem('radar_is_demo');
      localStorage.removeItem(AppConfig.STORAGE_KEYS.currentUser);
      localStorage.removeItem(AppConfig.STORAGE_KEYS.appData);
      window.location.href = 'index.html';
    }
  };

  window.AccountManager = {
    init: initAccounts,
    getAll: getAccounts,
    find: findAccount,
    add: addAccount,
    update: updateAccount,
    delete: deleteAccount,
    resetPassword: resetPassword,
    toggleStatus: toggleStatus
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
