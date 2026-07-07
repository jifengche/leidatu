/**
 * 后台管理 - 账号管理逻辑
 */
(function() {
  'use strict';

  var editMode = '';        // 'add' | 'edit'
  var editUsername = '';    // 编辑时的原始用户名
  var delUsername = '';     // 待删除的用户名
  var pwdResetUsername = '';// 重置密码的用户名
  var currentUser = '';

  // ========== 初始化 ==========

  function init() {
    // 鉴权检查
    if (!AuthHelper.isAuthenticated()) {
      window.location.href = 'index.html';
      return;
    }
    if (!AuthHelper.isAdmin()) {
      window.location.href = 'main.html';
      return;
    }

    // 确保账号列表已初始化
    AccountManager.init();

    currentUser = AuthHelper.getCurrentUser();
    var acct = AccountManager.find(currentUser);
    document.getElementById('headerUser').textContent = acct ? (acct.displayName || acct.username) : '管理员';

    bindEvents();
    renderTable();
  }

  // ========== 事件绑定 ==========

  function bindEvents() {
    // 返回主页
    document.getElementById('btnBackMain').addEventListener('click', function() {
      window.location.href = 'main.html';
    });

    // 退出登录
    document.getElementById('btnLogout').addEventListener('click', function() {
      AuthHelper.logout();
    });

    // 新增账号
    document.getElementById('btnAddAccount').addEventListener('click', function() {
      openAccountModal('add');
    });

    // 账号弹窗 - 关闭
    document.getElementById('modalClose').addEventListener('click', closeAccountModal);
    document.getElementById('modalCancel').addEventListener('click', closeAccountModal);
    document.getElementById('accountModal').addEventListener('click', function(e) {
      if (e.target === this) closeAccountModal();
    });

    // 账号弹窗 - 确认
    document.getElementById('modalConfirm').addEventListener('click', handleAccountConfirm);

    // 密码弹窗
    document.getElementById('pwdModalClose').addEventListener('click', closePwdModal);
    document.getElementById('pwdModalCancel').addEventListener('click', closePwdModal);
    document.getElementById('pwdModal').addEventListener('click', function(e) {
      if (e.target === this) closePwdModal();
    });
    document.getElementById('pwdModalConfirm').addEventListener('click', handlePwdConfirm);

    // 删除弹窗
    document.getElementById('delModalClose').addEventListener('click', closeDelModal);
    document.getElementById('delModalCancel').addEventListener('click', closeDelModal);
    document.getElementById('delModal').addEventListener('click', function(e) {
      if (e.target === this) closeDelModal();
    });
    document.getElementById('delModalConfirm').addEventListener('click', handleDelConfirm);
  }

  // ========== 渲染表格 ==========

  function renderTable() {
    var accounts = AccountManager.getAll();
    var tbody = document.getElementById('accountTableBody');
    var countEl = document.getElementById('accountCount');
    countEl.textContent = '共 ' + accounts.length + ' 个账号';

    if (accounts.length === 0) {
      tbody.innerHTML = '<tr class="empty-row"><td colspan="8">暂无账号数据</td></tr>';
      return;
    }

    var html = '';
    accounts.forEach(function(acct, idx) {
      var roleText = acct.role === 'admin' ? '管理员' : '教师';
      var roleClass = acct.role === 'admin' ? 'admin' : 'teacher';
      var statusText = acct.status === 'active' ? '启用' : '停用';
      var statusClass = acct.status === 'active' ? 'active' : 'disabled';
      var isSelf = acct.username === currentUser;
      var isAdminAcct = acct.role === 'admin';

      // 操作按钮
      var actions = '';
      actions += '<button class="action-btn" onclick="AdminUI.edit(\'' + escapeAttr(acct.username) + '\')">编辑</button>';
      actions += '<button class="action-btn btn-reset" onclick="AdminUI.resetPwd(\'' + escapeAttr(acct.username) + '\')">重置密码</button>';

      // 停用/启用按钮
      if (acct.status === 'active') {
        actions += '<button class="action-btn btn-toggle" onclick="AdminUI.toggleStatus(\'' + escapeAttr(acct.username) + '\')">停用</button>';
      } else {
        actions += '<button class="action-btn btn-toggle" onclick="AdminUI.toggleStatus(\'' + escapeAttr(acct.username) + '\')">启用</button>';
      }

      // 删除按钮 - 不能删除自己
      if (!isSelf) {
        actions += '<button class="action-btn btn-delete" onclick="AdminUI.del(\'' + escapeAttr(acct.username) + '\')">删除</button>';
      }

      html += '<tr>';
      html += '<td>' + (idx + 1) + '</td>';
      html += '<td><b>' + escapeHtml(acct.username) + '</b>' + (isSelf ? ' <span style="color:#165DFF;font-size:11px;">（当前登录）</span>' : '') + '</td>';
      html += '<td>' + escapeHtml(acct.displayName || '-') + '</td>';
      html += '<td><span class="role-tag ' + roleClass + '">' + roleText + '</span></td>';
      html += '<td><span class="status-tag ' + statusClass + '">' + statusText + '</span></td>';
      html += '<td>' + escapeHtml(acct.createdAt || '-') + '</td>';
      html += '<td>' + escapeHtml(acct.remark || '-') + '</td>';
      html += '<td class="col-actions">' + actions + '</td>';
      html += '</tr>';
    });

    tbody.innerHTML = html;
  }

  // ========== 账号弹窗 ==========

  function openAccountModal(mode, username) {
    editMode = mode;
    editUsername = username || '';

    var title = document.getElementById('modalTitle');
    var usernameInput = document.getElementById('modalUsername');

    if (mode === 'edit') {
      title.textContent = '编辑账号';
      var acct = AccountManager.find(username);
      if (!acct) { showToast('账号不存在'); return; }
      usernameInput.value = acct.username;
      usernameInput.disabled = true;
      document.getElementById('modalDisplayName').value = acct.displayName || '';
      document.getElementById('modalPassword').value = acct.password || '';
      document.getElementById('modalRole').value = acct.role || 'teacher';
      document.getElementById('modalStatus').value = acct.status || 'active';
      document.getElementById('modalRemark').value = acct.remark || '';
      // 编辑模式下密码非必填（不修改则保留原密码）
      document.getElementById('modalPassword').placeholder = '不修改请保留原密码';
    } else {
      title.textContent = '新增账号';
      usernameInput.value = '';
      usernameInput.disabled = false;
      document.getElementById('modalDisplayName').value = '';
      document.getElementById('modalPassword').value = '';
      document.getElementById('modalRole').value = 'teacher';
      document.getElementById('modalStatus').value = 'active';
      document.getElementById('modalRemark').value = '';
      document.getElementById('modalPassword').placeholder = '请输入登录密码';
    }

    clearFormErrors();
    document.getElementById('accountModal').style.display = 'flex';
    if (!usernameInput.disabled) setTimeout(function() { usernameInput.focus(); }, 100);
  }

  function closeAccountModal() {
    document.getElementById('accountModal').style.display = 'none';
    editMode = '';
    editUsername = '';
  }

  function handleAccountConfirm() {
    clearFormErrors();

    var username = document.getElementById('modalUsername').value.trim();
    var displayName = document.getElementById('modalDisplayName').value.trim();
    var password = document.getElementById('modalPassword').value.trim();
    var role = document.getElementById('modalRole').value;
    var status = document.getElementById('modalStatus').value;
    var remark = document.getElementById('modalRemark').value.trim();

    var hasError = false;

    if (!username) {
      showFormError('modalUsernameError', '请输入账号');
      hasError = true;
    }
    if (!displayName) {
      showFormError('modalDisplayNameError', '请输入姓名');
      hasError = true;
    }
    if (!password) {
      showFormError('modalPasswordError', '请输入密码');
      hasError = true;
    }
    if (password && password.length < 4) {
      showFormError('modalPasswordError', '密码至少4位');
      hasError = true;
    }
    if (hasError) return;

    if (editMode === 'add') {
      var err = AccountManager.add({
        username: username,
        password: password,
        displayName: displayName,
        role: role,
        status: status,
        remark: remark
      });
      if (err) {
        showFormError('modalUsernameError', err);
        return;
      }
      showToast('账号创建成功');
    } else {
      var updates = {
        displayName: displayName,
        role: role,
        status: status,
        remark: remark
      };
      // 编辑模式下密码不为空才更新
      if (password) {
        updates.password = password;
      }
      var err2 = AccountManager.update(editUsername, updates);
      if (err2) {
        showToast(err2);
        return;
      }
      showToast('账号更新成功');
    }

    closeAccountModal();
    renderTable();
  }

  // ========== 重置密码 ==========

  function openPwdModal(username) {
    pwdResetUsername = username;
    document.getElementById('pwdModalUsername').textContent = username;
    document.getElementById('newPassword').value = '';
    clearFormError('newPasswordError');
    document.getElementById('pwdModal').style.display = 'flex';
    setTimeout(function() {
      document.getElementById('newPassword').focus();
    }, 100);
  }

  function closePwdModal() {
    document.getElementById('pwdModal').style.display = 'none';
    pwdResetUsername = '';
  }

  function handlePwdConfirm() {
    var newPwd = document.getElementById('newPassword').value.trim();
    if (!newPwd) {
      showFormError('newPasswordError', '请输入新密码');
      return;
    }
    if (newPwd.length < 4) {
      showFormError('newPasswordError', '密码至少4位');
      return;
    }

    var err = AccountManager.resetPassword(pwdResetUsername, newPwd);
    if (err) {
      showToast(err);
      return;
    }

    showToast('密码重置成功');
    closePwdModal();
  }

  // ========== 切换状态 ==========

  function handleToggleStatus(username) {
    var err = AccountManager.toggleStatus(username);
    if (err) {
      showToast(err);
      return;
    }
    var acct = AccountManager.find(username);
    showToast(acct.status === 'active' ? '账号已启用' : '账号已停用');
    renderTable();
  }

  // ========== 删除账号 ==========

  function openDelModal(username) {
    delUsername = username;
    document.getElementById('delModalUsername').textContent = username;
    document.getElementById('delModal').style.display = 'flex';
  }

  function closeDelModal() {
    document.getElementById('delModal').style.display = 'none';
    delUsername = '';
  }

  function handleDelConfirm() {
    var err = AccountManager.delete(delUsername);
    if (err) {
      showToast(err);
      closeDelModal();
      return;
    }
    showToast('账号已删除');
    closeDelModal();
    renderTable();
  }

  // ========== 表单辅助 ==========

  function showFormError(id, msg) {
    var el = document.getElementById(id);
    if (el) el.textContent = msg;
    var inputId = id.replace('Error', '');
    var input = document.getElementById(inputId);
    if (input) input.classList.add('error');
  }

  function clearFormError(id) {
    var el = document.getElementById(id);
    if (el) el.textContent = '';
    var inputId = id.replace('Error', '');
    var input = document.getElementById(inputId);
    if (input) input.classList.remove('error');
  }

  function clearFormErrors() {
    clearFormError('modalUsernameError');
    clearFormError('modalDisplayNameError');
    clearFormError('modalPasswordError');
    clearFormError('newPasswordError');
  }

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

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, function(c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function escapeAttr(str) {
    if (!str) return '';
    return String(str).replace(/'/g, "\\'");
  }

  // ========== 暴露给 onclick 调用 ==========

  window.AdminUI = {
    edit: function(username) { openAccountModal('edit', username); },
    resetPwd: function(username) { openPwdModal(username); },
    toggleStatus: function(username) { handleToggleStatus(username); },
    del: function(username) { openDelModal(username); }
  };

  // 启动
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
