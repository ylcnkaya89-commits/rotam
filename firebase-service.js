// ==========================================
// ROTAM FIREBASE CLOUD MEMBERSHIP & SYNC SERVICE
// Cloud Authentication & Cross-Device Route Sync (Firestore)
// ==========================================

const RotamCloud = {
  auth: null,
  db: null,
  currentUser: null,
  isConfigured: false,

  // Default / Stored Firebase Configuration
  getConfig() {
    try {
      const saved = localStorage.getItem('rotam_firebase_config');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('RotamCloud config parse error:', e);
    }
    return null;
  },

  saveConfig(config) {
    if (!config || !config.apiKey || !config.projectId) {
      throw new Error('Geçersiz Firebase yapılandırması. apiKey ve projectId gereklidir.');
    }
    localStorage.setItem('rotam_firebase_config', JSON.stringify(config));
    this.init();
    return true;
  },

  init() {
    if (typeof firebase === 'undefined') {
      console.warn('Firebase SDK henüz yüklenmedi.');
      return;
    }

    const config = this.getConfig();
    if (!config || !config.apiKey) {
      this.isConfigured = false;
      this.updateHeaderUI();
      return;
    }

    try {
      if (!firebase.apps.length) {
        firebase.initializeApp(config);
      }
      this.auth = firebase.auth();
      this.db = firebase.firestore();
      this.isConfigured = true;

      // Listen for authentication changes
      this.auth.onAuthStateChanged((user) => {
        this.currentUser = user;
        this.updateHeaderUI();
        if (user) {
          console.log('RotamCloud: Kullanıcı aktif:', user.email);
          this.syncCloudRoutesToLocal();
        }
      });
    } catch (err) {
      console.error('RotamCloud başlatma hatası:', err);
      this.isConfigured = false;
    }
  },

  // Update Top Header User Button UI
  updateHeaderUI() {
    const btnLabel = document.getElementById('user-auth-btn-label');
    const btnTrigger = document.getElementById('btn-user-auth-trigger');
    const userBadge = document.getElementById('user-auth-status-indicator');

    if (!btnLabel) return;

    if (this.currentUser) {
      const displayName = this.currentUser.displayName || this.currentUser.email?.split('@')[0] || 'Kullanıcı';
      btnLabel.textContent = displayName;
      if (btnTrigger) {
        btnTrigger.classList.remove('text-amber-300', 'border-amber-500/30');
        btnTrigger.classList.add('text-emerald-300', 'border-emerald-500/40', 'bg-emerald-950/40');
      }
      if (userBadge) {
        userBadge.classList.remove('hidden');
      }
    } else {
      btnLabel.textContent = 'Giriş Yap';
      if (btnTrigger) {
        btnTrigger.classList.remove('text-emerald-300', 'border-emerald-500/40', 'bg-emerald-950/40');
        btnTrigger.classList.add('text-amber-300', 'border-amber-500/30');
      }
      if (userBadge) {
        userBadge.classList.add('hidden');
      }
    }
    if (typeof initIcons === 'function') initIcons();
  },

  // E-Posta & Şifre ile Giriş
  async loginWithEmail(email, password) {
    if (!this.checkConfig()) return false;
    try {
      const cred = await this.auth.signInWithEmailAndPassword(email, password);
      showToast(`Hoş geldiniz, ${cred.user.displayName || cred.user.email} 👋`, 'success');
      this.closeModal();
      return true;
    } catch (err) {
      this.showAuthError(this.formatError(err));
      return false;
    }
  },

  // E-Posta & Şifre ile Yeni Kayıt
  async registerWithEmail(name, email, password) {
    if (!this.checkConfig()) return false;
    try {
      const cred = await this.auth.createUserWithEmailAndPassword(email, password);
      if (name && cred.user) {
        await cred.user.updateProfile({ displayName: name });
      }
      showToast(`Hesabınız başarıyla oluşturuldu! Hoş geldiniz 🎉`, 'success');
      this.closeModal();
      return true;
    } catch (err) {
      this.showAuthError(this.formatError(err));
      return false;
    }
  },

  // Google ile Tek Tık Giriş (OAuth Popup)
  async loginWithGoogle() {
    if (!this.checkConfig()) return false;
    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      const result = await this.auth.signInWithPopup(provider);
      showToast(`Google ile giriş yapıldı: ${result.user.displayName || result.user.email} 🚀`, 'success');
      this.closeModal();
      return true;
    } catch (err) {
      this.showAuthError(this.formatError(err));
      return false;
    }
  },

  // Şifremi Unuttum (Sıfırlama E-postası)
  async resetPassword(email) {
    if (!this.checkConfig()) return false;
    try {
      await this.auth.sendPasswordResetEmail(email);
      showToast('Şifre sıfırlama bağlantısı e-posta adresinize gönderildi ✉️', 'info');
      return true;
    } catch (err) {
      this.showAuthError(this.formatError(err));
      return false;
    }
  },

  // Oturumu Kapat
  async logout() {
    if (!this.auth) return;
    try {
      await this.auth.signOut();
      this.currentUser = null;
      this.updateHeaderUI();
      showToast('Bulut oturumu kapatıldı. Yerel moddasınız.', 'info');
      this.closeModal();
    } catch (err) {
      showToast('Çıkış yapılırken hata oluştu.', 'error');
    }
  },

  // Firestore: Rota Kaydetme
  async saveCloudRoute(routeData) {
    if (!this.currentUser || !this.db) return false;
    try {
      const docRef = this.db.collection('users').doc(this.currentUser.uid).collection('routes').doc(routeData.id || String(Date.now()));
      await docRef.set({
        ...routeData,
        userId: this.currentUser.uid,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      console.log('RotamCloud: Rota buluta kaydedildi:', routeData.id);
      return true;
    } catch (err) {
      console.warn('RotamCloud: Buluta kaydetme hatası (yerelde saklandı):', err);
      return false;
    }
  },

  // Firestore: Rota Silme
  async deleteCloudRoute(routeId) {
    if (!this.currentUser || !this.db) return false;
    try {
      await this.db.collection('users').doc(this.currentUser.uid).collection('routes').doc(routeId).delete();
      console.log('RotamCloud: Rota buluttan silindi:', routeId);
      return true;
    } catch (err) {
      console.warn('RotamCloud: Buluttan silme hatası:', err);
      return false;
    }
  },

  // Firestore: Buluttaki Rotaları Çek ve Yerel Hafıza ile Birleştir
  async syncCloudRoutesToLocal() {
    if (!this.currentUser || !this.db) return;
    try {
      const snap = await this.db.collection('users').doc(this.currentUser.uid).collection('routes').get();
      if (snap.empty) return;

      const cloudRoutes = [];
      snap.forEach(doc => cloudRoutes.push(doc.data()));

      let localRoutes = [];
      try {
        const raw = localStorage.getItem('rotam_saved_routes');
        if (raw) localRoutes = JSON.parse(raw);
      } catch (e) {}

      // Birleştir (Cloud + Local, ID'ye göre tekil)
      const mergedMap = new Map();
      localRoutes.forEach(r => mergedMap.set(r.id, r));
      cloudRoutes.forEach(r => mergedMap.set(r.id, r));

      const mergedList = Array.from(mergedMap.values());
      localStorage.setItem('rotam_saved_routes', JSON.stringify(mergedList));

      console.log(`RotamCloud: ${cloudRoutes.length} bulut rotası eşitlendi.`);
      if (typeof renderSavedRoutesList === 'function') {
        renderSavedRoutesList();
      }
    } catch (err) {
      console.warn('RotamCloud eşitleme hatası:', err);
    }
  },

  checkConfig() {
    if (!this.isConfigured || !this.auth) {
      this.openConfigTab();
      this.showAuthError('Firebase henüz yapılandırılmamış. Lütfen proje anahtarlarınızı girin.');
      return false;
    }
    return true;
  },

  showAuthError(msg) {
    const errEl = document.getElementById('user-auth-error-text');
    const errBox = document.getElementById('user-auth-error-box');
    if (errEl && errBox) {
      errEl.textContent = msg;
      errBox.classList.remove('hidden');
    } else {
      showToast(msg, 'error');
    }
  },

  clearAuthError() {
    const errBox = document.getElementById('user-auth-error-box');
    if (errBox) errBox.classList.add('hidden');
  },

  formatError(err) {
    const code = err.code || '';
    switch (code) {
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'E-posta veya şifre hatalı.';
      case 'auth/email-already-in-use':
        return 'Bu e-posta adresi zaten kullanımda.';
      case 'auth/weak-password':
        return 'Şifre çok zayıf. En az 6 karakter girin.';
      case 'auth/invalid-email':
        return 'Geçerli bir e-posta adresi yazın.';
      case 'auth/popup-closed-by-user':
        return 'Google giriş penceresi kapatıldı.';
      default:
        return err.message || 'Giriş işlemi başarısız oldu.';
    }
  },

  closeModal() {
    const modal = document.getElementById('modal-user-auth');
    if (modal) modal.classList.add('hidden');
    this.clearAuthError();
  },

  openConfigTab() {
    switchUserAuthTab('config');
  }
};

window.RotamCloud = RotamCloud;

// UI Modal Controller Functions
function openUserAuthModal() {
  const modal = document.getElementById('modal-user-auth');
  if (!modal) return;
  modal.classList.remove('hidden');
  RotamCloud.clearAuthError();

  if (RotamCloud.currentUser) {
    switchUserAuthTab('profile');
  } else if (!RotamCloud.isConfigured) {
    switchUserAuthTab('config');
  } else {
    switchUserAuthTab('login');
  }

  // Pre-fill existing config if available
  const existingConfig = RotamCloud.getConfig();
  const configInput = document.getElementById('firebase-config-json-input');
  if (configInput && existingConfig) {
    configInput.value = JSON.stringify(existingConfig, null, 2);
  }

  if (typeof initIcons === 'function') initIcons();
}

function closeUserAuthModal() {
  RotamCloud.closeModal();
}

function switchUserAuthTab(tab) {
  RotamCloud.clearAuthError();
  const tabLogin = document.getElementById('auth-tab-login');
  const tabRegister = document.getElementById('auth-tab-register');
  const tabConfig = document.getElementById('auth-tab-config');
  const tabProfile = document.getElementById('auth-tab-profile');

  const paneLogin = document.getElementById('auth-pane-login');
  const paneRegister = document.getElementById('auth-pane-register');
  const paneConfig = document.getElementById('auth-pane-config');
  const paneProfile = document.getElementById('auth-pane-profile');

  // Hide all
  [paneLogin, paneRegister, paneConfig, paneProfile].forEach(p => p?.classList.add('hidden'));

  // Reset tab button styles
  const btnClassInactive = 'px-3 py-1.5 rounded-xl font-semibold text-xs text-slate-400 hover:text-white transition-all';
  const btnClassActive = 'px-3 py-1.5 rounded-xl font-bold text-xs bg-amber-500/20 text-amber-300 border border-amber-500/40 transition-all';

  [tabLogin, tabRegister, tabConfig, tabProfile].forEach(t => {
    if (t) t.className = btnClassInactive;
  });

  if (tab === 'profile' && RotamCloud.currentUser) {
    paneProfile?.classList.remove('hidden');
    if (tabProfile) tabProfile.className = btnClassActive;

    const nameEl = document.getElementById('user-profile-name');
    const emailEl = document.getElementById('user-profile-email');
    if (nameEl) nameEl.textContent = RotamCloud.currentUser.displayName || 'Sürücü';
    if (emailEl) emailEl.textContent = RotamCloud.currentUser.email || '';
  } else if (tab === 'register') {
    paneRegister?.classList.remove('hidden');
    if (tabRegister) tabRegister.className = btnClassActive;
  } else if (tab === 'config') {
    paneConfig?.classList.remove('hidden');
    if (tabConfig) tabConfig.className = btnClassActive;
  } else {
    paneLogin?.classList.remove('hidden');
    if (tabLogin) tabLogin.className = btnClassActive;
  }

  if (typeof initIcons === 'function') initIcons();
}

function handleUserLoginSubmit(e) {
  e.preventDefault();
  const email = document.getElementById('auth-login-email')?.value.trim();
  const pass = document.getElementById('auth-login-pass')?.value;
  if (!email || !pass) {
    RotamCloud.showAuthError('Lütfen e-posta ve şifrenizi girin.');
    return;
  }
  RotamCloud.loginWithEmail(email, pass);
}

function handleUserRegisterSubmit(e) {
  e.preventDefault();
  const name = document.getElementById('auth-reg-name')?.value.trim();
  const email = document.getElementById('auth-reg-email')?.value.trim();
  const pass = document.getElementById('auth-reg-pass')?.value;
  if (!email || !pass) {
    RotamCloud.showAuthError('Lütfen tüm zorunlu alanları doldurun.');
    return;
  }
  if (pass.length < 6) {
    RotamCloud.showAuthError('Şifre en az 6 karakter olmalıdır.');
    return;
  }
  RotamCloud.registerWithEmail(name, email, pass);
}

function handleUserPasswordReset() {
  const email = document.getElementById('auth-login-email')?.value.trim();
  if (!email) {
    RotamCloud.showAuthError('Lütfen şifre sıfırlama linki göndermek istediğiniz e-posta adresini yazın.');
    return;
  }
  RotamCloud.resetPassword(email);
}

function handleFirebaseConfigSave(e) {
  e.preventDefault();
  const rawJson = document.getElementById('firebase-config-json-input')?.value.trim();
  if (!rawJson) {
    RotamCloud.showAuthError('Lütfen Firebase yapılandırma nesnesini (JSON) yapıştırın.');
    return;
  }

  try {
    // Tolerant parser (allows JS object literal format or JSON)
    let parsed;
    try {
      parsed = JSON.parse(rawJson);
    } catch {
      // If user pasted const firebaseConfig = { ... }
      const cleaned = rawJson.replace(/^(const|var|let)\s+[a-zA-Z0-9_]+\s*=\s*/, '').replace(/;$/, '');
      parsed = Function(`"use strict"; return (${cleaned});`)();
    }

    if (!parsed || !parsed.apiKey || !parsed.projectId) {
      throw new Error('Geçersiz nesne: "apiKey" ve "projectId" alanları bulunamadı.');
    }

    RotamCloud.saveConfig(parsed);
    showToast('Firebase başarıyla bağlandı! Şimdi giriş yapabilirsiniz 🎉', 'success');
    switchUserAuthTab('login');
  } catch (err) {
    RotamCloud.showAuthError('Yapılandırma ayrıştırılamadı: ' + err.message);
  }
}

// Global scope bindings
window.openUserAuthModal = openUserAuthModal;
window.closeUserAuthModal = closeUserAuthModal;
window.switchUserAuthTab = switchUserAuthTab;
window.handleUserLoginSubmit = handleUserLoginSubmit;
window.handleUserRegisterSubmit = handleUserRegisterSubmit;
window.handleUserPasswordReset = handleUserPasswordReset;
window.handleFirebaseConfigSave = handleFirebaseConfigSave;

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  RotamCloud.init();
});
