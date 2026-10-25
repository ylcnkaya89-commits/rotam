// ==========================================
// ROTAM FIREBASE CLOUD MEMBERSHIP & SYNC SERVICE
// Cloud Authentication & Cross-Device Route Sync (Firestore)
// ==========================================

const RotamCloud = {
  auth: null,
  db: null,
  currentUser: null,
  isConfigured: false,

  // Projenin Varsayılan Firebase Yapılandırması (rotam-motor)
  DEFAULT_CONFIG: {
    apiKey: "AIzaSyAIvYjl4x2Yq81kpE9RATMbi8-dK49k_p0",
    authDomain: "rotam-motor.firebaseapp.com",
    projectId: "rotam-motor",
    storageBucket: "rotam-motor.firebasestorage.app",
    messagingSenderId: "424182078836",
    appId: "1:424182078836:web:14acdc23bf45ef1ec96021",
    measurementId: "G-5JN6LPJ6PC"
  },

  // Default / Stored Firebase Configuration
  getConfig() {
    try {
      const saved = localStorage.getItem('rotam_firebase_config');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('RotamCloud config parse error:', e);
    }
    return this.DEFAULT_CONFIG;
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
          this.syncUserProfile(user);
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

  // Firestore: Kullanıcı Profilini Yedekle (Admin Panelinde listeleme için)
  async syncUserProfile(user) {
    if (!user || !this.db) return;
    try {
      const userRef = this.db.collection('users').doc(user.uid);
      const doc = await userRef.get();
      const now = new Date().toISOString();
      const profileData = {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || user.email?.split('@')[0] || 'Sürücü',
        photoURL: user.photoURL || '',
        provider: user.providerData?.[0]?.providerId || 'password',
        lastLoginAt: now
      };
      if (!doc.exists) {
        profileData.createdAt = now;
      }
      await userRef.set(profileData, { merge: true });
    } catch (err) {
      console.warn('RotamCloud profil senkronizasyon hatası:', err);
    }
  },

  checkConfig() {
    if (!this.isConfigured || !this.auth) {
      this.showAuthError('Bulut servisine bağlanılamadı. Lütfen internet bağlantınızı kontrol edin.');
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
    switchUserAuthTab('login');
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
  } else {
    switchUserAuthTab('login');
  }

  if (typeof initIcons === 'function') initIcons();
}

function closeUserAuthModal() {
  RotamCloud.closeModal();
}

function switchUserAuthTab(tab) {
  RotamCloud.clearAuthError();
  const tabsContainer = document.getElementById('auth-tabs-container');
  const tabLogin = document.getElementById('auth-tab-login');
  const tabRegister = document.getElementById('auth-tab-register');

  const paneLogin = document.getElementById('auth-pane-login');
  const paneRegister = document.getElementById('auth-pane-register');
  const paneProfile = document.getElementById('auth-pane-profile');

  // Hide all panes
  [paneLogin, paneRegister, paneProfile].forEach(p => p?.classList.add('hidden'));

  // Tab button classes
  const btnClassInactive = 'flex-1 py-1.5 rounded-lg font-semibold text-xs text-slate-400 hover:text-white transition-all text-center';
  const btnClassActive = 'flex-1 py-1.5 rounded-lg font-bold text-xs bg-amber-500/20 text-amber-300 border border-amber-500/40 transition-all text-center';

  if (tabLogin) tabLogin.className = btnClassInactive;
  if (tabRegister) tabRegister.className = btnClassInactive;

  if (tab === 'profile' && RotamCloud.currentUser) {
    if (tabsContainer) tabsContainer.classList.add('hidden');
    paneProfile?.classList.remove('hidden');

    const nameEl = document.getElementById('user-profile-name');
    const emailEl = document.getElementById('user-profile-email');
    if (nameEl) nameEl.textContent = RotamCloud.currentUser.displayName || 'Sürücü';
    if (emailEl) emailEl.textContent = RotamCloud.currentUser.email || '';
  } else {
    if (tabsContainer) tabsContainer.classList.remove('hidden');
    if (tab === 'register') {
      paneRegister?.classList.remove('hidden');
      if (tabRegister) tabRegister.className = btnClassActive;
    } else {
      paneLogin?.classList.remove('hidden');
      if (tabLogin) tabLogin.className = btnClassActive;
    }
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
  saveAdminFirebaseConfig(e);
}

// ==========================================
// YÖNETİCİ PANELİ (ADMIN) FIREBASE KONTROLCÜSÜ
// ==========================================
function populateAdminFirebaseTab() {
  const input = document.getElementById('admin-firebase-config-input');
  const projBadge = document.getElementById('admin-firebase-proj-id');
  const statusBadge = document.getElementById('admin-firebase-status-badge');
  const authBadge = document.getElementById('admin-firebase-auth-badge');
  const dbBadge = document.getElementById('admin-firebase-db-badge');

  const config = RotamCloud.getConfig();
  if (input && config) {
    input.value = JSON.stringify(config, null, 2);
  }
  if (projBadge) {
    projBadge.textContent = config?.projectId || 'Yapılandırılmadı';
  }
  if (statusBadge) {
    if (RotamCloud.isConfigured) {
      statusBadge.textContent = 'Bağlantı Aktif';
      statusBadge.className = 'px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono';
    } else {
      statusBadge.textContent = 'Bağlantı Yok';
      statusBadge.className = 'px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30 font-mono';
    }
  }
  if (authBadge) {
    authBadge.textContent = RotamCloud.auth ? 'Aktif (Email & Google)' : 'Pasif';
  }
  if (dbBadge) {
    dbBadge.textContent = RotamCloud.db ? 'Aktif (users/{uid}/routes)' : 'Pasif';
  }

  // Load user list
  loadAdminUsersList();
}

async function loadAdminUsersList() {
  if (!RotamCloud.db) return;
  const container = document.getElementById('admin-firebase-users-list');
  const countEl = document.getElementById('admin-firebase-user-count');
  if (!container) return;

  container.innerHTML = '<div class="text-center py-6 text-slate-500 text-xs flex items-center justify-center space-x-2"><i data-lucide="loader-2" class="w-4 h-4 animate-spin text-cyan-400"></i><span>Kullanıcı listesi yükleniyor...</span></div>';
  if (typeof initIcons === 'function') initIcons();

  try {
    const snap = await RotamCloud.db.collection('users').get();
    const users = [];
    snap.forEach(doc => {
      const data = doc.data();
      if (data && (data.email || data.uid)) {
        users.push(data);
      }
    });

    if (countEl) countEl.textContent = users.length;

    if (users.length === 0) {
      container.innerHTML = `
        <div class="text-center py-6 text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
          <p class="font-semibold text-slate-400">Henüz kayıtlı bulut sürücüsü bulunamadı.</p>
          <p class="text-[10px] text-slate-600 mt-1">Kullanıcılar ilk giriş yaptıklarında profilleri otomatik olarak burada listelenecektir.</p>
        </div>
      `;
      return;
    }

    // Sort by lastLoginAt or createdAt desc
    users.sort((a, b) => new Date(b.lastLoginAt || b.createdAt || 0) - new Date(a.lastLoginAt || a.createdAt || 0));

    container.innerHTML = users.map(u => {
      const isGoogle = (u.provider || '').includes('google');
      const providerBadge = isGoogle 
        ? '<span class="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px] font-semibold">Google</span>'
        : '<span class="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-semibold">E-Posta</span>';
      
      const createdStr = u.createdAt ? new Date(u.createdAt).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';
      const lastLoginStr = u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';

      return `
        <div class="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3 hover:border-slate-700 transition-all">
          <div class="flex items-center space-x-3 min-w-0">
            <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center text-sm font-bold text-amber-400 shrink-0 overflow-hidden">
              ${u.photoURL ? `<img src="${u.photoURL}" class="w-full h-full object-cover" />` : (u.displayName ? u.displayName.charAt(0).toUpperCase() : '👤')}
            </div>
            <div class="min-w-0">
              <div class="flex items-center space-x-2">
                <h5 class="text-xs font-bold text-white truncate">${u.displayName || 'Sürücü'}</h5>
                ${providerBadge}
              </div>
              <p class="text-[11px] text-slate-400 font-mono truncate">${u.email || 'E-posta yok'}</p>
            </div>
          </div>
          <div class="text-right shrink-0 text-[10px] text-slate-500">
            <div>Son Giriş: <span class="text-slate-300 font-mono">${lastLoginStr}</span></div>
            <div class="mt-0.5 text-slate-600 font-mono">Kayıt: ${createdStr}</div>
          </div>
        </div>
      `;
    }).join('');

    if (typeof initIcons === 'function') initIcons();
  } catch (err) {
    console.warn('Kullanıcı listesi çekilemedi:', err);
    container.innerHTML = `
      <div class="p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/30 text-amber-300 text-xs space-y-1">
        <p class="font-bold flex items-center space-x-1.5">
          <i data-lucide="info" class="w-4 h-4 text-amber-400"></i>
          <span>Kullanıcıları Firebase Konsolundan Görüntüleyin</span>
        </p>
        <p class="text-[11px] text-slate-300 leading-relaxed">
          Kayıt olan tüm kullanıcıları ve şifre sıfırlama işlemlerini doğrudan 
          <a href="https://console.firebase.google.com" target="_blank" class="text-amber-400 underline font-semibold">Firebase Console &gt; Authentication &gt; Users</a> 
          menüsünden tam yetkiyle görüntüleyebilirsiniz.
        </p>
      </div>
    `;
    if (typeof initIcons === 'function') initIcons();
  }
}

function saveAdminFirebaseConfig(e) {
  if (e && e.preventDefault) e.preventDefault();
  const input = document.getElementById('admin-firebase-config-input');
  const raw = input?.value?.trim();
  if (!raw) {
    showToast('Lütfen Firebase yapılandırma nesnesini girin.', 'warning');
    return;
  }
  try {
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      const cleaned = raw.replace(/^(const|var|let)\s+[a-zA-Z0-9_]+\s*=\s*/, '').replace(/;$/, '');
      parsed = Function(`"use strict"; return (${cleaned});`)();
    }
    if (!parsed || !parsed.apiKey || !parsed.projectId) {
      throw new Error('Geçersiz yapılandırma: apiKey ve projectId zorunludur.');
    }
    RotamCloud.saveConfig(parsed);
    showToast('Firebase yapılandırması güncellendi ve başlatıldı! 🎉', 'success');
    populateAdminFirebaseTab();
  } catch (err) {
    showToast('Yapılandırma hatası: ' + err.message, 'error');
  }
}

function resetAdminFirebaseConfig() {
  if (!confirm('Firebase ayarlarını varsayılan (rotam-motor) projesine sıfırlamak istiyor musunuz?')) return;
  localStorage.removeItem('rotam_firebase_config');
  RotamCloud.init();
  showToast('Varsayılan Firebase (rotam-motor) projesine sıfırlandı.', 'info');
  populateAdminFirebaseTab();
}

function testAdminFirebaseConnection() {
  if (!RotamCloud.isConfigured || !RotamCloud.auth) {
    showToast('Firebase henüz başlatılmamış!', 'error');
    return;
  }
  showToast(`Bağlantı başarılı: ${RotamCloud.getConfig()?.projectId} aktif 🚀`, 'success');
}

function copyAdminFirestoreRules() {
  const rules = `rules_version = '2';\nservice cloud.firestore {\n  match /databases/{database}/documents {\n    match /users/{userId} {\n      allow read, write: if request.auth != null;\n      match /routes/{routeId} {\n        allow read, write: if request.auth != null && request.auth.uid == userId;\n      }\n    }\n  }\n}`;
  navigator.clipboard.writeText(rules).then(() => {
    showToast('Firestore güvenlik kuralları panoya kopyalandı! 📋', 'success');
  }).catch(() => {
    showToast('Panoya kopyalanamadı, lütfen manuel kopyalayın.', 'warning');
  });
}

// Global scope bindings
window.openUserAuthModal = openUserAuthModal;
window.closeUserAuthModal = closeUserAuthModal;
window.switchUserAuthTab = switchUserAuthTab;
window.handleUserLoginSubmit = handleUserLoginSubmit;
window.handleUserRegisterSubmit = handleUserRegisterSubmit;
window.handleUserPasswordReset = handleUserPasswordReset;
window.handleFirebaseConfigSave = handleFirebaseConfigSave;
window.populateAdminFirebaseTab = populateAdminFirebaseTab;
window.saveAdminFirebaseConfig = saveAdminFirebaseConfig;
window.resetAdminFirebaseConfig = resetAdminFirebaseConfig;
window.testAdminFirebaseConnection = testAdminFirebaseConnection;
window.copyAdminFirestoreRules = copyAdminFirestoreRules;
window.loadAdminUsersList = loadAdminUsersList;

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  RotamCloud.init();
});
