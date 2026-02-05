// ============================================
// GRADLY - Main JavaScript
// AI-Powered College Admission Platform
// ============================================

// Configuration
const GOOGLE_CLIENT_ID = "913767102068-5a9m5phgec10gc2uvreqkeum8pskjbu0.apps.googleusercontent.com";

// Admin credentials
const ADMIN_CREDENTIALS = {
  username: "admin",
  password: "Gradly@Admin2026"
};

let selectedRole = "student";

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', function() {
  console.log('Gradly v2.0 - Modern Professional Design Loaded ✓');
  
  // Initialize scroll animations
  initScrollAnimations();
  
  // Initialize counter animations
  initCounterAnimations();
  
  // Check for auto-redirect on login page
  checkAutoRedirect();
  
  // Initialize mobile menu
  initMobileMenu();
});

// ============================================
// SCROLL ANIMATIONS
// ============================================

function initScrollAnimations() {
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, observerOptions);

  const fadeElements = document.querySelectorAll('[data-aos]');
  fadeElements.forEach(el => observer.observe(el));
}

// ============================================
// COUNTER ANIMATIONS
// ============================================

function initCounterAnimations() {
  const statValues = document.querySelectorAll('.stat-value[data-count]');
  
  if (statValues.length === 0) return;
  
  const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !entry.target.classList.contains('counted')) {
        const target = parseInt(entry.target.getAttribute('data-count'));
        animateCounter(entry.target, target);
        entry.target.classList.add('counted');
      }
    });
  }, { threshold: 0.5 });

  statValues.forEach(stat => counterObserver.observe(stat));
}

function animateCounter(element, target, duration = 2000) {
  let start = 0;
  const increment = target / (duration / 16);
  
  const timer = setInterval(() => {
    start += increment;
    if (start >= target) {
      element.textContent = Math.floor(target).toLocaleString();
      clearInterval(timer);
    } else {
      element.textContent = Math.floor(start).toLocaleString();
    }
  }, 16);
}

// ============================================
// MOBILE MENU
// ============================================

function initMobileMenu() {
  const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
  const mobileMenu = document.getElementById('mobileMenu');
  
  if (mobileMenuBtn && mobileMenu) {
    mobileMenuBtn.addEventListener('click', () => {
      mobileMenu.classList.toggle('active');
    });
  }
}

function toggleMobileMenu() {
  const mobileMenu = document.getElementById('mobileMenu');
  if (mobileMenu) {
    mobileMenu.classList.toggle('active');
  }
}

// ============================================
// ROLE SELECTION
// ============================================

function selectRole(role) {
  selectedRole = role;
  
  // Update button states
  const buttons = document.querySelectorAll(".role-tab");
  buttons.forEach(btn => btn.classList.remove("active"));
  event.target.closest('.role-tab').classList.add("active");
  
  // Show/hide Google login based on role
  const socialContainer = document.getElementById('socialLoginContainer');
  if (socialContainer) {
    socialContainer.style.display = (role === 'admin') ? 'none' : 'flex';
  }
}

// ============================================
// GOOGLE SIGN-IN HANDLER
// ============================================

function handleGoogleSignIn(response) {
  if (selectedRole !== 'student') {
    showNotification("Google Sign-In is only available for students", "error");
    return;
  }

  try {
    const userInfo = parseJwt(response.credential);
    
    console.log("Google Sign-In Success:", userInfo.email);

    // Save to session
    sessionStorage.setItem('userRole', 'student');
    sessionStorage.setItem('userName', userInfo.name);
    sessionStorage.setItem('userEmail', userInfo.email);
    sessionStorage.setItem('userPicture', userInfo.picture || '');
    
    showNotification(`Welcome, ${userInfo.given_name || userInfo.name}!`, "success");
    showLoadingOverlay();
    
    setTimeout(() => {
      window.location.href = 'student-dashboard.html';
    }, 1500);
    
  } catch (error) {
    console.error('Google Sign-In Error:', error);
    showNotification("Authentication failed. Please try again.", "error");
  }
}

// Helper to decode JWT
function parseJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64).split('').map(c => {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error('JWT Parse Error:', e);
    return null;
  }
}

// ============================================
// TRADITIONAL LOGIN
// ============================================

function login() {
  const usernameInput = document.getElementById("username");
  const passwordInput = document.getElementById("password");
  
  if (!usernameInput || !passwordInput) return;
  
  const user = usernameInput.value.trim();
  const pass = passwordInput.value.trim();

  if (!user || !pass) {
    showNotification("Please enter both username and password", "error");
    return;
  }

  const loginBtn = document.querySelector('.login-btn');
  if (!loginBtn) return;
  
  const originalContent = loginBtn.innerHTML;
  loginBtn.innerHTML = '<span>Signing in...</span>';
  loginBtn.disabled = true;

  setTimeout(() => {
    if (selectedRole === 'admin') {
      // Admin login
      if (user === ADMIN_CREDENTIALS.username && pass === ADMIN_CREDENTIALS.password) {
        sessionStorage.setItem('userRole', 'admin');
        sessionStorage.setItem('userName', 'Admin');
        
        showNotification("Welcome Admin!", "success");
        showLoadingOverlay();
        
        setTimeout(() => {
          window.location.href = 'admin-dashboard.html';
        }, 1000);
      } else {
        showNotification("Invalid admin credentials", "error");
        resetButton(loginBtn, originalContent);
      }
    } else {
      // Student login - accept any credentials with proper length
      if (user.length >= 3 && pass.length >= 6) {
        sessionStorage.setItem('userRole', 'student');
        sessionStorage.setItem('userName', user);
        
        showNotification(`Welcome ${user}!`, "success");
        showLoadingOverlay();
        
        setTimeout(() => {
          window.location.href = 'student-dashboard.html';
        }, 1000);
      } else {
        showNotification("Username min 3 chars, password min 6 chars", "error");
        resetButton(loginBtn, originalContent);
      }
    }
  }, 800);
}

function resetButton(btn, content) {
  if (btn) {
    btn.innerHTML = content;
    btn.disabled = false;
  }
}

// ============================================
// ENTER KEY SUPPORT
// ============================================

document.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    const username = document.getElementById('username');
    const password = document.getElementById('password');
    
    if (username && password && 
        (document.activeElement === username || document.activeElement === password)) {
      e.preventDefault();
      login();
    }
  }
});

// ============================================
// AUTO REDIRECT
// ============================================

function checkAutoRedirect() {
  // Only check on login page
  if (!window.location.pathname.includes('login.html')) return;
  
  const userRole = sessionStorage.getItem('userRole');
  if (userRole === 'admin') {
    window.location.href = 'admin-dashboard.html';
  } else if (userRole === 'student') {
    window.location.href = 'student-dashboard.html';
  }
}

// ============================================
// LOGOUT
// ============================================

function logout() {
  sessionStorage.clear();
  showNotification("Logged out successfully", "success");
  setTimeout(() => {
    window.location.href = 'login.html';
  }, 1000);
}

// ============================================
// NOTIFICATION SYSTEM
// ============================================

function showNotification(message, type = "info") {
  // Remove existing notification
  const existing = document.querySelector('.notification');
  if (existing) existing.remove();

  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.animation = 'slideOutRight 0.3s ease-out';
    setTimeout(() => notification.remove(), 300);
  }, 3500);
}

// ============================================
// LOADING OVERLAY
// ============================================

function showLoadingOverlay() {
  const overlay = document.createElement('div');
  overlay.className = 'loading-overlay';
  overlay.innerHTML = `
    <div class="loading-spinner"></div>
    <p>Loading your dashboard...</p>
  `;
  
  // Add styles
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(5, 10, 10, 0.95);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    color: white;
  `;
  
  const spinner = document.createElement('style');
  spinner.textContent = `
    .loading-spinner {
      width: 50px;
      height: 50px;
      border: 4px solid rgba(46, 196, 182, 0.2);
      border-top: 4px solid #2ec4b6;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-bottom: 20px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  `;
  document.head.appendChild(spinner);
  
  document.body.appendChild(overlay);
}

// ============================================
// SMOOTH SCROLLING
// ============================================

function scrollToFeatures() {
  const featuresSection = document.getElementById('features');
  if (featuresSection) {
    featuresSection.scrollIntoView({ 
      behavior: 'smooth',
      block: 'start'
    });
  }
}

console.log('Gradly v2.0 - All Systems Ready ✓');
